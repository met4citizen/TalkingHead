/**
* MIT License
*
* Copyright (c) 2025 Mika Suominen
*
* Permission is hereby granted, free of charge, to any person obtaining a copy
* of this software and associated documentation files (the "Software"), to deal
* in the Software without restriction, including without limitation the rights
* to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
* copies of the Software, and to permit persons to whom the Software is
* furnished to do so, subject to the following conditions:
*
* The above copyright notice and this permission notice shall be included in all
* copies or substantial portions of the Software.
*
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
* IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
* FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
* AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
* LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
* OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
* SOFTWARE.
*/

import { StyleTextToSpeech2Model, AutoTokenizer, Tensor, RawAudio } from "@huggingface/transformers";
import { phonemize as espeakng } from "phonemizer";


class KokoroTTS {

  /**
  * @constructor
  * @param {Object} [opt=null] Global/default options
  */
  constructor( opt = null ) {
    this.opt = Object.assign({
      styleDim: 256,
      sampleRate: 24000,
      frameRate: 40,
      model: "onnx-community/Kokoro-82M-v1.0-ONNX-timestamped",
      dtype: "fp32", // "fp32" | "fp16" | "q8" | "q4" | "q4f16"
      device: "webgpu", // "wasm" | "webgpu" | "cpu"
      voiceURL: "https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/main/voices",
      voice: "af_heart",
      speed: 1,
      language: "en-us",
      deltaStart: -10,
      deltaEnd: 0
    }, opt || {});

    // IPA phonemes to Oculus visemes
    this.espeakToOculusViseme = {
      // Vowels
      "i:": "I", "ɪ": "I", "e": "E", "æ": "aa", "aː": "aa", "ɒ": "O",
      "ɔː": "O", "ʊ": "U", "uː": "U", "ʌ": "aa", "ə": "E",

      // Diphthongs
      "eɪ": "E", "aɪ": "I", "ɔɪ": "O", "aʊ": "O", "oʊ": "O", "ɪə": "I",
      "eə": "E", "ʊə": "U",

      // Consonants
      "p": "PP", "b": "PP", "t": "DD", "d": "DD", "k": "kk", "g": "kk",
      "tʃ": "CH", "dʒ": "CH", "f": "FF", "v": "FF", "θ": "TH", "ð": "TH",
      "s": "SS", "z": "SS", "ʃ": "SS", "ʒ": "SS", "h": "sil", "m": "PP",
      "n": "nn", "ŋ": "nn", "l": "DD", "r": "RR", "ɹ": "RR", "ɾ": "RR",
      "w": "U", "j": "I",

      // Additional phonemes for other languages
      "ɑ": "aa", "ɑː": "aa", "ɐ": "aa", "ɜ": "E", "ø": "E", "y": "I",
      "eː": "E", "œ": "E", "ɶ": "aa", "ɒ̃": "O", "ã": "aa", "õ": "O", "ɲ": "nn",
      "ʎ": "nn", "ʍ": "U", "ç": "SS", "x": "kk", "ɣ": "kk", "β": "FF",
      "ʔ": "sil", "ʕ": "sil", "ɬ": "SS", "ɮ": "SS", "ʢ": "sil", "ʡ": "sil",
      "ɖ": "DD", "ɗ": "DD", "ʄ": "DD", "ɟ": "DD", "ɠ": "kk", "ʛ": "kk",

      // Additional stress and tone markers (ignore)
      /* "ˈ": "sil", "ˌ": "sil", "ː": "sil", "ˑ": "sil", "˞": "sil",
      "ˠ": "sil", "ʰ": "sil", "ʷ": "sil", "ʲ": "sil", "ˤ": "sil", "ⁿ":
      "sil", "ˡ": "sil" */

      // Other markers (ignore)
      /* "'": "sil", ",": "sil", ":": "sil", "=": "sil", */
    };

    // Punctuation to be preserved
    this.punctuation = {
      ";": 1, ":": 1, ",": 1, ".": 1, "!": 1, "?": 1, "¡": 1, "¿": 1, "—": 1,
      '"': 1, "…": 1, "«": 1, "»": 1, "“": 1, "”": 1, "(": 1, ")": 1, "{": 1,
      "}": 1, "[": 1, "]": 1
    };

    this.model = null;
    this.tokenizer = null;
    this.voice = null;
    this.loadedModelTokenizer = false;
    this.loadedVoice = false;
    this.queue = [];
    this.processing = false;
  }

  /**
  * Load the speech model, tokenizer, and default voice.
  * @param {function} [onready=null] Callback function for ready
  * @param {function} [onprogress=null] Callback function for progress
  */
  async load( onready = null, onprogress = null) {
    this.loadedModelTokenizer = false;
    this.loadedVoice = false;
    [ this.model, this.tokenizer, this.voice ] = await Promise.all([
      StyleTextToSpeech2Model.from_pretrained( this.opt.model, {
        progress_callback: onprogress,
        dtype: this.opt.dtype,
        device: this.opt.device
      }),
      AutoTokenizer.from_pretrained( this.opt.model, {
        progress_callback: onprogress
      }),
      (async () => {
        const url = `${this.opt.voiceURL}/${this.opt.voice}.bin`;
        const response = await fetch(url);
        const buffer = await response.arrayBuffer();
        return buffer;
      })()
    ]);
    this.loadedModelTokenizer = true;
    this.loadedVoice = true;
    if ( onready ) onready();
    this.process();
  }

  /**
  * Add text to process queue.
  * @param {string} text Text
  * @param {function} ondata Callback that returns the TalkingHead audio object
  */
  generate(text, ondata) {
    this.queue.push({
      text: text.slice(),
      ondata: ondata
    });
    this.process();
  }

  /**
  * Change the default voice.
  * @param {string} [voice=null] Voice name
  * @param {string} [language=null] Language
  * @param {number} [number=null] Speed
  */
  async setVoice( voice=null, language=null, speed=null ) {
    const isVoiceChanged = voice && voice !== this.opt.voice;
    this.opt.voice = voice || this.opt.voice;
    this.opt.language = language || this.opt.voice;
    this.opt.speed = speed || this.opt.speed;

    if ( isVoiceChanged ) {
      this.loadedVoice = false;
      [ this.voice ] = await Promise.all([
        (async () => {
          const url = `${this.opt.voiceURL}/${this.opt.voice}.bin`;
          const response = await fetch(url);
          const buffer = await response.arrayBuffer();
          return buffer;
        })()
      ]);
      this.loadedVoice = true;
      this.process();
    }
  }

  /**
  * Get phonemes from the text.
  * @param {string} s Text string
  * @return {string} Phonemes
  */
  async getPhonemes(s) {

    // TODO: Pre-process

    // Preserve punctuation
    let phonemes = "";
    let words = "";
    const letters = [...s];
    for(let i=0; i<letters.length; i++ ) {
      const isLast = i === (letters.length-1);
      const letter = letters[i];
      const isDivider = this.punctuation.hasOwnProperty(letter);
      if ( !isDivider ) {
        words += letter;
      }
      if ( isLast || isDivider ) {
        if ( words ) {
          phonemes += " " + (await espeakng(words.trim(), this.opt.language)).join(" ");
          words = "";
        }
      }
      if ( isDivider ) {
        phonemes += letter;
      }
    }

    // Post-process
    phonemes = phonemes.replace(/ʲ/g, "j")
      .replace(/r/g, "ɹ")
      .replace(/x/g, "k")
      .replace(/ɬ/g, "l")
      .trim();

    return phonemes;
  }

  /**
  * Initialize audio object for the TalkingHead class.
  * @param {string} s Text string
  * @param {string} t Tokens string
  */
  initAudioObject(s,t) {

    // TalkingHead audio object template
    const o = {
      words: [], wtimes: [], wdurations: [],
      visemes: [], vtimes: [], vdurations: []
    };

    const dividers = { " ": 1 };
    const words = s.match(/\S+\s*/g);
    const wordsLength = words.length;
    let wordIndex = 0;
    const tokens = [...t];
    const tokensLength = tokens.length;
    let tokenIndex = 0;
    let startWordIndex = 1;

    while ( tokenIndex < tokensLength ) {
      const isLast = tokenIndex === (tokensLength-1);
      const token = tokens[tokenIndex];
      const isDivider = dividers.hasOwnProperty(token);
      const phoneme = isDivider ? null : token;
      const phonemeTwo = (isLast || isDivider) ? null : (token + tokens[tokenIndex+1]);

      // Add visemes
      if ( phonemeTwo && this.espeakToOculusViseme.hasOwnProperty(phonemeTwo) ) {
        const viseme = this.espeakToOculusViseme[phonemeTwo];
        o.visemes.push(viseme);
        o.vtimes.push([tokenIndex+1,tokenIndex+3]);
        o.vdurations.push(0);
        tokenIndex++;
      } else if ( phoneme && this.espeakToOculusViseme.hasOwnProperty(phoneme) ) {
        const viseme = this.espeakToOculusViseme[phoneme];
        o.visemes.push(viseme);
        o.vtimes.push([tokenIndex+1,tokenIndex+2]);
        o.vdurations.push(0);
      }

      // Add words
      if ( isLast || isDivider ) {
        if ( wordIndex < wordsLength ) {
          const word = words[wordIndex];
          o.words.push(word);
          o.wtimes.push([startWordIndex,tokenIndex+1]);
          o.wdurations.push(0);
          wordIndex++;
          startWordIndex = tokenIndex+2;
        }
      }

      tokenIndex++;
    }

    // Workaround:
    // TODO: eSpeak sometimes merges words to together so add remaining words
    for( let i=wordIndex; i<wordsLength; i++ ) {
      const word = words[i];
      o.words.push(word);
      o.wtimes.push([startWordIndex,startWordIndex]);
      o.wdurations.push(0);
    }

    return o;
  }

  /**
  * Calculate starting times and durations for TalkingHead words and visemes.
  * @param {Object} o TalkingHead audio object
  * @param {number[]} ds Token durations in frames
  */
  setTimestamps(o,ds) {

    // Calculate starting times in milliseconds
    const scaler = 1000 / this.opt.frameRate; // From frames to milliseconds
    const times = [];
    let t = 0;
    for( let i=0; i<ds.length; i++ ) {
      times.push( Math.round(t) );
      t += scaler * ds[i];
    }

    // Calculate word times and durations
    for( let i=0; i<o.words.length; i++ ) {
      const start = times[o.wtimes[i][0]] + this.opt.deltaStart;
      const end = times[o.wtimes[i][1]] + this.opt.deltaEnd;
      const duration = end - start;
      o.wtimes[i] = start;
      o.wdurations[i] = duration;
    }

    // Calculate visemes times and durations
    for( let i=0; i<o.visemes.length; i++ ) {
      const start = times[o.vtimes[i][0]] + this.opt.deltaStart;
      const end = times[o.vtimes[i][1]] + this.opt.deltaEnd;
      const duration = end - start;
      o.vtimes[i] = start;
      o.vdurations[i] = duration;
    }

  }

  /**
  * Process the queue.
  */
  async process() {
    if ( !this.loadedModelTokenizer || !this.loadedVoice || this.processing ) return;
    this.processing = true;
    while( this.queue.length ) {
      const item = this.queue[0];
      this.queue.shift();

      // Generate tokens/phonemes and initialize TalkingHead audio object
      const phonemes = await this.getPhonemes(item.text);
      const o = this.initAudioObject(item.text, phonemes);

      // Generate input IDs and run the model
      const { input_ids } = this.tokenizer(phonemes, {
        truncation: true
      });
      const num_tokens = Math.min(Math.max(input_ids.size - 2, 0), 509);
      const data = new Float32Array(this.voice);
      const offset = num_tokens * this.opt.styleDim;
      const voiceData = data.slice(offset, offset + this.opt.styleDim);
      const inputs = {
        input_ids,
        style: new Tensor("float32", voiceData, [1, this.opt.styleDim]),
        speed: new Tensor("float32", [this.opt.speed], [1]),
      };
      const { waveform, durations } = await this.model(inputs);

      // Calculate durations
      const durationsFrames = Array.from(durations.data);
      this.setTimestamps( o, durationsFrames );

      // Set WAV audio
      const audio = new RawAudio(waveform.data, this.opt.sampleRate);
      o.audio = audio.toWav();

      // Sent the TalkingHead audio object to the original caller
      item.ondata(o);
    }
    this.processing = false;
  }

}

export { KokoroTTS };
