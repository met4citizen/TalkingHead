import { TalkingHeadAnimate } from './talkinghead-animate.mjs'

/**
* @class Talking Head Audio
* @author Mika Suominen
* 
* Audio support
* 
*/
export class TalkingHeadAudio extends TalkingHeadAnimate {

  /**
  * @constructor
  * @param {Object} node DOM element of the avatar
  * @param {Object} [opt=null] Global/default options
  */
  constructor(node, opt = {} ) {

    super(node,opt)

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
  * Start raw audio
  * @param {audio} raw audio buffer to play audibly
  * @param {delay} 
  */

  async playAudioBuffer(audio,delay=100,ended=null) {

      // If Web Audio API is suspended, try to resume it
      if ( this.audioCtx.state === "suspended" ) {
        const resume = this.audioCtx.resume();
        const timeout = new Promise((_r, rej) => setTimeout(() => rej("p2"), 1000));
        try {
          await Promise.race([resume, timeout]);
        } catch(e) {
          console.log("Can't play audio. Web Audio API suspended. This is often due to calling some speak method before the first user action, which is typically prevented by the browser.");
          if(ended)ended();
          return;
        }
      }

  	  if(typeof audio === 'AudioBuffer') {
  	  	// use as is
  	  } else if ( Array.isArray(audio) ) {
        // Convert from PCM samples
        let buf = this.concatArrayBuffers(audio);
        audio = this.pcmToAudioBuffer(buf);
      } else if(typeof audio === 'string') {
		  const buf = this.b64ToArrayBuffer(audio)
		  audio = await this.audioCtx.decodeAudioData(buf)
      } else {
      	// unsure what to do in this case
      }

      // Create audio source
      this.audioSpeechSource = this.audioCtx.createBufferSource();
      this.audioSpeechSource.buffer = audio;
      this.audioSpeechSource.playbackRate.value = 1 / this.animSlowdownRate;
      this.audioSpeechSource.connect(this.audioSpeechGainNode);
      this.audioSpeechSource.addEventListener('ended', () => {
        this.audioSpeechSource.disconnect();
        if(ended)ended();
      }, { once: true });

      // Play
      this.audioSpeechSource.start(delay/1000);
  }

}
