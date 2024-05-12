
import { TalkingHeadAudio } from './talkinghead-audio.mjs'

import { lipsyncGetProcessor, lipsyncPreProcessText, lipsyncWordsToVisemes, lipsyncQueue, lipsyncConvert } from './lipsync-queue.mjs'

/**
* @class Talking Head Articulate
* @author Mika Suominen
* 
* Viseme and speech support on top of animation foundation
*/
export class TalkingHeadArticulate extends TalkingHeadAudio {

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
  * Add audio to the speech queue.
  * @param {Audio} r Audio message.
  * @param {Options} [opt=null] Text-specific options for lipsyncLang
  * @param {subtitlesfn} [onsubtitles=null] Callback when a subtitle is written
  */
  speakAudio(r, opt = null, onsubtitles = null ) {
    opt = opt || {};
    const lipsyncLang = opt.lipsyncLang || this.avatar.lipsyncLang || this.opt.lipsyncLang;

    const o = lipsyncConvert(r,lipsyncLang,onsubtitles)

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
      const delay = 100;
      const ended = () => { this.playAudio(true) };
      try {
        await this.playAudioBuffer(item.audio,delay,ended);
        if ( item.anim ) {
          item.anim.forEach( x => {
            for(let i=0; i<x.ts.length; i++) {
              x.ts[i] = this.animClock + x.ts[i] + delay;
            }
            this.animQueue.push(x);
          });
        }
      } catch(err) {
        ended();
        return;
      }
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
