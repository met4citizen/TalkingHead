
import { TalkingHeadAnimate } from './TalkingHead-animate.mjs'

import { lipsyncGetProcessor, lipsyncPreProcessText, lipsyncWordsToVisemes, lipsyncQueue } from './lipsync-queue.mjs'

/**
* @class Talking Head Articulate
* @author Mika Suominen
* 
* Viseme and speech support on top of animation foundation
*/
export class TalkingHeadArticulate extends TalkingHeadAnimate {

  /**
  * @constructor
  * @param {Object} node DOM element of the avatar
  * @param {Object} [opt=null] Global/default options
  */
  constructor(node, opt = {} ) {

    super(node,opt)

    const default_options = {
      jwtGet: null, // Function to get JSON Web Token
      ttsEndpoint: null,
      ttsApikey: null,
      ttsTrimStart: 0,
      ttsTrimEnd: 400,
      ttsLang: "fi-FI",
      ttsVoice: "fi-FI-Standard-A",
      ttsRate: 0.95,
      ttsPitch: 0,
      ttsVolume: 0,
      lipsyncLang: 'fi',
      lipsyncModules: ['fi','en','lt'],
      pcmSampleRate: 22050,
      modelRoot: "Armature",
      modelPixelRatio: 1,
      modelFPS: 30,
      modelMovementFactor: 1,

      avatarMood: "neutral",
      avatarMute: false,
    };

    this.opt = Object.assign( default_options, opt || {} );

    // Lip-sync extensions, import dynamically
    this.lipsync = {};
    this.opt.lipsyncModules.forEach( x => lipsyncGetProcessor(x) );
    this.visemeNames = [
      'aa', 'E', 'I', 'O', 'U', 'PP', 'SS', 'TH', 'DD', 'FF', 'kk',
      'nn', 'RR', 'CH', 'sil'
    ];

    // Audio context and playlist
    this.audioCtx = new AudioContext();
    this.audioSpeechSource = this.audioCtx.createBufferSource();
    this.audioBackgroundSource = this.audioCtx.createBufferSource();
    this.audioBackgroundGainNode = this.audioCtx.createGain();
    this.audioSpeechGainNode = this.audioCtx.createGain();
    this.audioReverbNode = this.audioCtx.createConvolver();
    this.setReverb(null); // Set dry impulse as default
    this.audioBackgroundGainNode.connect(this.audioReverbNode);
    this.audioSpeechGainNode.connect(this.audioReverbNode);
    this.audioReverbNode.connect(this.audioCtx.destination);
    this.audioPlaylist = [];

    // Create a lookup table for base64 decoding
    const b64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    this.b64Lookup = typeof Uint8Array === 'undefined' ? [] : new Uint8Array(256);
    for (let i = 0; i < b64Chars.length; i++) this.b64Lookup[b64Chars.charCodeAt(i)] = i;

    // Speech queue
    this.speechQueue = [];
    this.isSpeaking = false;

    // Setup Google text-to-speech
    if ( this.opt.ttsEndpoint ) {
      let audio = new Audio();
      if (audio.canPlayType("audio/ogg")) {
        this.ttsAudioEncoding = "OGG-OPUS";
      } else if (audio.canPlayType("audio/mp3")) {
        this.ttsAudioEncoding = "MP3";
      } else {
        throw new Error("There was no support for either OGG or MP3 audio.");
      }
    } else {
      // throw new Error("You must provide some Google-compliant Text-To-Speech Endpoint.");
    }

  }

  /**
  * Convert a Base64 MP3 chunk to ArrayBuffer.
  * @param {string} chunk Base64 encoded chunk
  * @return {ArrayBuffer} ArrayBuffer
  */
  b64ToArrayBuffer(chunk) {

    // Calculate the needed total buffer length
    let bufLen = 3 * chunk.length / 4;
    if (chunk[chunk.length - 1] === '=') {
      bufLen--;
      if (chunk[chunk.length - 2] === '=') {
        bufLen--;
      }
    }

    // Create the ArrayBuffer
    const arrBuf = new ArrayBuffer(bufLen);
    const arr = new Uint8Array(arrBuf);
    let i, p = 0, c1, c2, c3, c4;

    // Populate the buffer
    for (i = 0; i < chunk.length; i += 4) {
      c1 = this.b64Lookup[chunk.charCodeAt(i)];
      c2 = this.b64Lookup[chunk.charCodeAt(i+1)];
      c3 = this.b64Lookup[chunk.charCodeAt(i+2)];
      c4 = this.b64Lookup[chunk.charCodeAt(i+3)];
      arr[p++] = (c1 << 2) | (c2 >> 4);
      arr[p++] = ((c2 & 15) << 4) | (c3 >> 2);
      arr[p++] = ((c3 & 3) << 6) | (c4 & 63);
    }

    return arrBuf;
  }

  /**
  * Concatenate an array of ArrayBuffers.
  * @param {ArrayBuffer[]} bufs Array of ArrayBuffers
  * @return {ArrayBuffer} Concatenated ArrayBuffer
  */
  concatArrayBuffers(bufs) {
    let len = 0;
    for( let i=0; i<bufs.length; i++ ) {
      len += bufs[i].byteLength;
    }
    let buf = new ArrayBuffer(len);
    let arr = new Uint8Array(buf);
    let p = 0;
    for( let i=0; i<bufs.length; i++ ) {
      arr.set( new Uint8Array(bufs[i]), p);
      p += bufs[i].byteLength;
    }
    return buf;
  }


  /**
  * Convert PCM buffer to AudioBuffer.
  * NOTE: Only signed 16bit little endian supported.
  * @param {ArrayBuffer} buf PCM buffer
  * @return {AudioBuffer} AudioBuffer
  */
  pcmToAudioBuffer(buf) {
    const arr = new Int16Array(buf);
    const floats = new Float32Array(arr.length);
    for( let i=0; i<arr.length; i++ ) {
      floats[i] = (arr[i] >= 0x8000) ? -(0x10000 - arr[i]) / 0x8000 : arr[i] / 0x7FFF;
    }
    const audio = this.audioCtx.createBuffer(1, floats.length, this.opt.pcmSampleRate );
    audio.copyToChannel( floats, 0 , 0 );
    return audio;
  }

  /**
  * Reset all the visemes
  */
  resetLips() {
    this.visemeNames.forEach( x => {
      this.morphs.forEach( y => {
        const ndx = y.morphTargetDictionary['viseme_'+x];
        if ( ndx !== undefined ) {
          y.morphTargetInfluences[ndx] = 0;
        }
      });
    });
  }

  /**
  * animate speech
  */
  animateSpeech(o) {
    // Update values
    for( let [mt,x] of Object.entries(o) ) {
      if ( mt === 'subtitles' ) {
        if( this.onSubtitles && typeof this.onSubtitles === "function" ) {
          this.onSubtitles(""+x);
        }
      } else if ( mt === 'speak' ) {
        this.speakText(""+x);
      }
    }
  }

  /**
  * Add text to the speech queue.
  * @param {string} s Text.
  * @param {Options} [opt=null] Text-specific options for lipsync/TTS language, voice, rate and pitch, mood and mute
  * @param {subtitlesfn} [onsubtitles=null] Callback when a subtitle is written
  * @param {number[][]} [excludes=null] Array of [start, end] index arrays to not speak
  */
  speakText(s, opt = null, onsubtitles = null, excludes = null ) {
    opt = opt || {};

    const lipsyncLang = opt.lipsyncLang || this.avatar.lipsyncLang || this.opt.lipsyncLang;

    const queue = lipsyncQueue(s,lipsyncLang,onsubtitles,excludes)

    queue.forEach(o=>{
      if(opt.avatarMute) {
        delete o.text
      } else if(o.text) {
        if ( opt.avatarMood ) o.mood = opt.avatarMood;
        if ( opt.ttsLang ) o.lang = opt.ttsLang;
        if ( opt.ttsVoice ) o.voice = opt.ttsVoice;
        if ( opt.ttsRate ) o.rate = opt.ttsRate;
        if ( opt.ttsVoice ) o.pitch = opt.ttsPitch;
        if ( opt.ttsVolume ) o.volume = opt.ttsVolume;    
      }
      this.speechQueue.push(o)
    })

    this.speechQueue.push( { break: 1000 } );

    // Start speaking (if not already)
    this.startSpeaking();
  }

  /**
  * Add emoji to speech queue.
  * @param {string} e Emoji.
  */
  async speakEmoji(e) {
    let emoji = this.animEmojis[e];
    if ( emoji && emoji.link ) emoji = this.animEmojis[emoji.link];
    if ( emoji ) {
      this.speechQueue.push( { emoji: emoji } );
    }
    this.startSpeaking();
  }

  /**
  * Add a break to the speech queue.
  * @param {numeric} t Duration in milliseconds.
  */
  async speakBreak(t) {
    this.speechQueue.push( { break: t } );
    this.startSpeaking();
  }

  /**
  * Callback when speech queue processes this marker.
  * @param {markerfn} onmarker Callback function.
  */
  async speakMarker(onmarker) {
    this.speechQueue.push( { marker: onmarker } );
    this.startSpeaking();
  }

  /**
  * Play background audio.
  * @param {string} url URL for the audio, stop if null.
  */
  async playBackgroundAudio( url ) {

    // Fetch audio
    let response = await fetch(url);
    let arraybuffer = await response.arrayBuffer();

    // Play audio in a loop
    this.stopBackgroundAudio()
    this.audioBackgroundSource = this.audioCtx.createBufferSource();
    this.audioBackgroundSource.loop = true;
    this.audioBackgroundSource.buffer = await this.audioCtx.decodeAudioData(arraybuffer);
    this.audioBackgroundSource.playbackRate.value = 1 / this.animSlowdownRate;
    this.audioBackgroundSource.connect(this.audioBackgroundGainNode);
    this.audioBackgroundSource.start(0);

  }

  /**
  * Stop background audio.
  */
  stopBackgroundAudio() {
    try { this.audioBackgroundSource.stop(); } catch(error) {}
    this.audioBackgroundSource.disconnect();
  }

  /**
  * Setup the convolver node based on an impulse.
  * @param {string} [url=null] URL for the impulse, dry impulse if null
  */
  async setReverb( url=null ) {
    if ( url ) {
      // load impulse response from file
      let response = await fetch(url);
      let arraybuffer = await response.arrayBuffer();
      this.audioReverbNode.buffer = await this.audioCtx.decodeAudioData(arraybuffer);
    } else {
      // dry impulse
      const samplerate = this.audioCtx.sampleRate;
      const impulse = this.audioCtx.createBuffer(2, samplerate, samplerate);
      impulse.getChannelData(0)[0] = 1;
      impulse.getChannelData(1)[0] = 1;
      this.audioReverbNode.buffer = impulse;
    }
  }

  /**
  * Set audio gain.
  * @param {number} speech Gain for speech, if null do not change
  * @param {number} background Gain for background audio, if null do not change
  */
  setMixerGain( speech, background ) {
    if ( speech !== null ) {
      this.audioSpeechGainNode.gain.value = speech;
    }
    if ( background !== null ) {
      this.audioBackgroundGainNode.gain.value = background;
    }
  }

  /**
  * Add audio to the speech queue.
  * @param {Audio} r Audio message.
  * @param {Options} [opt=null] Text-specific options for lipsyncLang
  * @param {subtitlesfn} [onsubtitles=null] Callback when a subtitle is written
  */
  speakAudio(r, opt = null, onsubtitles = null ) {
    opt = opt || {};
    const lipsyncLang = opt.lipsyncLang || this.avatar.lipsyncLang || this.opt.lipsyncLang;
    const o = {};

    if ( r.words ) {
      let lipsyncAnim = [];
      for( let i=0; i<r.words.length; i++ ) {
        const word = r.words[i];
        const time = r.wtimes[i];
        let duration = r.wdurations[i];

        if ( word.length ) {

          // Subtitle
          if ( onsubtitles ) {
            lipsyncAnim.push( {
              template: { name: 'subtitles' },
              ts: [time],
              vs: {
                subtitles: ' ' + word
              }
            });
          }

          // If visemes were not specified, calculate them based on the word
          if ( !r.visemes ) {
            const w = lipsyncPreProcessText(word, lipsyncLang);
            const v = lipsyncWordsToVisemes(w, lipsyncLang);
            if ( v && v.visemes && v.visemes.length ) {
              const dTotal = v.times[ v.visemes.length-1 ] + v.durations[ v.visemes.length-1 ];
              const overdrive = Math.min(duration, Math.max( 0, duration - v.visemes.length * 150));
              let level = 0.6 + this.convertRange( overdrive, [0,duration], [0,0.4]);
              duration = Math.min( duration, v.visemes.length * 200 );
              if ( dTotal > 0 ) {
                for( let j=0; j<v.visemes.length; j++ ) {
                  const t = time + (v.times[j]/dTotal) * duration;
                  const d = (v.durations[j]/dTotal) * duration;
                  lipsyncAnim.push( {
                    template: { name: 'viseme' },
                    ts: [ t - Math.min(60,2*d/3), t + Math.min(25,d/2), t + d + Math.min(60,d/2) ],
                    vs: {
                      ['viseme_'+v.visemes[j]]: [null,(v.visemes[j] === 'PP' || v.visemes[j] === 'FF') ? 0.9 : level, 0]
                    }
                  });
                }
              }
            }
          }
        }
      }

      // If visemes were specifies, use them
      if ( r.visemes ) {
        for( let i=0; i<r.visemes.length; i++ ) {
          const viseme = r.visemes[i];
          const time = r.vtimes[i];
          const duration = r.vdurations[i];
          lipsyncAnim.push( {
            template: { name: 'viseme' },
            ts: [ time - 2 * duration/3, time + duration/2, time + duration + duration/2 ],
            vs: {
              ['viseme_'+viseme]: [null,(viseme === 'PP' || viseme === 'FF') ? 0.9 : 0.6, 0]
            }
          });
        }
      }

      // Timed marker callbacks
      if ( r.markers ) {
        for( let i=0; i<r.markers.length; i++ ) {
          const fn = r.markers[i];
          const time = r.mtimes[i];
          lipsyncAnim.push( {
            template: { name: 'markers' },
            ts: [ time ],
            vs: { "function": [fn] }
          });
        }
      }

      if ( lipsyncAnim.length ) {
        o.anim = lipsyncAnim;
      }

    }

    if ( r.audio ) {
      o.audio = r.audio;
    }

    if ( onsubtitles ) {
      o.onSubtitles = onsubtitles;
    }

    if ( Object.keys(o).length ) {
      this.speechQueue.push(o);
      this.speechQueue.push( { break: 300 } );
      this.startSpeaking();
    }

  }

  /**
  * Play audio playlist using Web Audio API.
  * @param {boolean} [force=false] If true, forces to proceed
  */
  async playAudio(force=false) {

    if ( !this.armature || (this.isAudioPlaying && !force) ) return;
    this.isAudioPlaying = true;
    if ( this.audioPlaylist.length ) {
      const item = this.audioPlaylist.shift();

      // If Web Audio API is suspended, try to resume it
      if ( this.audioCtx.state === "suspended" ) {
        const resume = this.audioCtx.resume();
        const timeout = new Promise((_r, rej) => setTimeout(() => rej("p2"), 1000));
        try {
          await Promise.race([resume, timeout]);
        } catch(e) {
          console.log("Can't play audio. Web Audio API suspended. This is often due to calling some speak method before the first user action, which is typically prevented by the browser.");
          this.playAudio(true);
          return;
        }
      }

      // AudioBuffer
      let audio = item.audio

      if(typeof audio === 'string') {
        try {
          console.log("************ audio is a string = starting decode at",performance.now())
          const buf = this.b64ToArrayBuffer(audio)
          console.log("********* decoded audio buffer successfully",performance.now())
          audio = await this.audioCtx.decodeAudioData(buf)
          console.log("********** audio done decoding",performance.now())
        } catch(err) {
          console.error("*********** cannot decode audio block",item.audio)
          audio = null
          this.playAudio(true);
          return
        }
      }
      else if ( Array.isArray(item.audio) ) {
        // Convert from PCM samples
        let buf = this.concatArrayBuffers( item.audio );
        audio = this.pcmToAudioBuffer(buf);
      }

      // Create audio source
      this.audioSpeechSource = this.audioCtx.createBufferSource();
      this.audioSpeechSource.buffer = audio;
      this.audioSpeechSource.playbackRate.value = 1 / this.animSlowdownRate;
      this.audioSpeechSource.connect(this.audioSpeechGainNode);
      this.audioSpeechSource.addEventListener('ended', () => {
        this.audioSpeechSource.disconnect();
        this.playAudio(true);
      }, { once: true });

      // Rescale lipsync and push to queue
      const delay = 100;
      if ( item.anim ) {
        item.anim.forEach( x => {
          for(let i=0; i<x.ts.length; i++) {
            x.ts[i] = this.animClock + x.ts[i] + delay;
          }
          this.animQueue.push(x);
        });
      }

      // Play
      this.audioSpeechSource.start(delay/1000);

    } else {
      this.isAudioPlaying = false;
      this.startSpeaking(true);
    }
  }

  /**
  * Take the next queue item from the speech queue, convert it to text, and
  * load the audio file.
  * @param {boolean} [force=false] If true, forces to proceed (e.g. after break)
  */
  async startSpeaking( force = false ) {
    if ( !this.armature || (this.isSpeaking && !force) ) return;
    this.stateName = 'talking';
    this.isSpeaking = true;
    if ( this.speechQueue.length ) {
      let line = this.speechQueue.shift();
      if ( line.emoji ) {

        // Look at the camera
        this.lookAtCamera(500);

        // Only emoji
        let duration = line.emoji.dt.reduce((a,b) => a+b,0);
        this.animQueue.push( this.animFactory( line.emoji ) );
        setTimeout( this.startSpeaking.bind(this), duration, true );
      } else if ( line.break ) {
        // Break
        setTimeout( this.startSpeaking.bind(this), line.break, true );
      } else if ( line.audio ) {

        // Look at the camera
        this.lookAtCamera(500);
        this.speakWithHands();

        // Make a playlist
        this.audioPlaylist.push({ anim: line.anim, audio: line.audio });
        this.onSubtitles = line.onSubtitles || null;
        this.resetLips();
        if ( line.mood ) this.setMood( line.mood );
        this.playAudio();

      } else if ( line.text ) {

        // Look at the camera
        this.lookAtCamera(500);

        // Spoken text
        try {
          // Convert text to SSML
          let ssml = "<speak>";
          line.text.forEach( (x,i) => {
            // Add mark
            if (i > 0) {
              ssml += " <mark name='" + x.mark + "'/>";
            }

            // Add word
            ssml += x.word.replaceAll('&','&amp;')
              .replaceAll('<','&lt;')
              .replaceAll('>','&gt;')
              .replaceAll('"','&quot;')
              .replaceAll('\'','&apos;');

          });
          ssml += "</speak>";


          const o = {
            method: "POST",
            headers: {
              "Content-Type": "application/json; charset=utf-8"
            },
            body: JSON.stringify({
              "input": {
                "ssml": ssml
              },
              "voice": {
                "languageCode": line.lang || this.avatar.ttsLang || this.opt.ttsLang,
                "name": line.voice || this.avatar.ttsVoice || this.opt.ttsVoice
              },
              "audioConfig": {
                "audioEncoding": this.ttsAudioEncoding,
                "speakingRate": (line.rate || this.avatar.ttsRate || this.opt.ttsRate) + this.mood.speech.deltaRate,
                "pitch": (line.pitch || this.avatar.ttsPitch || this.opt.ttsPitch) + this.mood.speech.deltaPitch,
                "volumeGainDb": (line.volume || this.avatar.ttsVolume || this.opt.ttsVolume) + this.mood.speech.deltaVolume
              },
              "enableTimePointing": [ 1 ] // Timepoint information for mark tags
            })
          };

          // JSON Web Token
          if ( this.opt.jwtGet && typeof this.opt.jwtGet === "function" ) {
            o.headers["Authorization"] = "Bearer " + await this.opt.jwtGet();
          }

          const res = await fetch( this.opt.ttsEndpoint + (this.opt.ttsApikey ? "?key=" + this.opt.ttsApikey : ''), o);
          const data = await res.json();

          if ( res.status === 200 && data && data.audioContent ) {

            // Audio data
            const buf = this.b64ToArrayBuffer(data.audioContent);
            const audio = await this.audioCtx.decodeAudioData( buf );
            this.speakWithHands();

            // Word-to-audio alignment
            const timepoints = [ { mark: 0, time: 0 } ];
            data.timepoints.forEach( (x,i) => {
              const time = x.timeSeconds * 1000;
              let prevDuration = time - timepoints[i].time;
              if ( prevDuration > 150 ) prevDuration - 150; // Trim out leading space
              timepoints[i].duration = prevDuration;
              timepoints.push( { mark: parseInt(x.markName), time: time });
            });
            let d = 1000 * audio.duration; // Duration in ms
            if ( d > this.opt.ttsTrimEnd ) d = d - this.opt.ttsTrimEnd; // Trim out silence at the end
            timepoints[timepoints.length-1].duration = d - timepoints[timepoints.length-1].time;

            // Re-set animation starting times and rescale durations
            line.anim.forEach( x => {
              const timepoint = timepoints[x.mark];
              if ( timepoint ) {
                for(let i=0; i<x.ts.length; i++) {
                  x.ts[i] = timepoint.time + (x.ts[i] * timepoint.duration) + this.opt.ttsTrimStart;
                }
              }
            });

            // Add to the playlist
            this.audioPlaylist.push({ anim: line.anim, audio: audio });
            this.onSubtitles = line.onSubtitles || null;
            this.resetLips();
            if ( line.mood ) this.setMood( line.mood );
            this.playAudio();

          } else {
            this.startSpeaking(true);
          }
        } catch (error) {
          console.error("Error:", error);
          this.startSpeaking(true);
        }
      } else if ( line.anim ) {
        // Only subtitles
        this.onSubtitles = line.onSubtitles || null;
        this.resetLips();
        if ( line.mood ) this.setMood( line.mood );
        line.anim.forEach( (x,i) => {
          for(let j=0; j<x.ts.length; j++) {
            x.ts[j] = this.animClock  + 10 * i;
          }
          this.animQueue.push(x);
        });
        setTimeout( this.startSpeaking.bind(this), 10 * line.anim.length, true );
      } else if ( line.marker ) {
        if ( typeof line.marker === "function" ) {
          line.marker();
        }
        this.startSpeaking(true);
      } else {
        this.startSpeaking(true);
      }
    } else {
      this.stateName = 'idle';
      this.isSpeaking = false;
    }
  }

}
