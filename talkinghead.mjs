import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import dompurify from 'dompurify';
import { marked } from 'marked';

/**
* @class Talking Head speaking Finnish
* @author Mika Suominen
*/
class TalkingHead {

  /**
  * Callback when the avatar was loaded succesfully.
  * @callback successfn
  */

  /**
  * Callback if there was en error while loading the avatar.
  * @callback errorfn
  * @param {string} error Error message
  */

  /**
  * Callback when new subtitles were written.
  * @callback subtitlesfn
  * @param {Object} node DOM node
  */



  /**
  * @constructor
  * @param {string} url Avatar URL
  * @param {Object} node DOM element of the avatar
  * @param {Object} [opt=null] Options
  * @param {successfn} [onsuccess=null] Callback when the Avatar has been succesfully loaded
  * @param {errorfn} [onerror=null] Callback when there was an error in initialization
  */
  constructor(url, node, opt = null, onsuccess = null, onerror = null ) {
    this.nodeAvatar = node;
    opt = opt || {};
    this.opt = {
      ttsEndpoint: null,
      ttsApikey: null,
      ttsLang: "fi-FI",
      ttsVoice: "fi-FI-Standard-A",
      ttsRate: 0.95,
      ttsPitch: 0,
      ttsVolume: 0,
      ttsTrimStart: 0,
      ttsTrimEnd: 200,
      modelPixelRatio: 1,
      cameraView: 'closeup',
      cameraX: 0,
      cameraY: 0,
      cameraZ: 0,
      cameraRotateEnable: true,
      cameraPanEnable: false,
      cameraZoomEnable: false,
      avatarMood: "neutral",
      avatarMute: false,
      avatarSkip: null,
      markedOptions: { mangle:false, headerIds:false, breaks: true }
    };
    Object.assign( this.opt, opt );


    // Animation templates for moods
    this.animMoods = {
      'neutral' : {
        baseline: { eyesLookDown: 0.1 },
        speech: { deltaRate: 0, deltaPitch: 0, deltaVolume: 0 },
        anims: [
          { name: 'breathing', delay: 1500, dt: [ 1200,500,1000 ], vs: { chest: [0.5,0.5,0] } },
          { name: 'legs', delay: [4000,10000], dt: [ 1000 ], vs: { weight: [[-2,2]] } },
          { name: 'hands', delay: [500,10000], dt: [ 2000,4000 ], vs: {} },
          { name: 'head', delay: [0,1000], dt: [ [200,5000] ], vs: { headRotateX: [[-0.04,0.10]], headRotateY: [[-0.3,0.3]], headRotateZ: [[-0.08,0.08]] } },
          { name: 'eyes', delay: [200,5000], dt: [ [100,500],[100,5000,2] ], vs: { eyesRotateY: [[-0.6,0.6]], eyesRotateX: [[-0.2,0.6]] } },
          { name: 'blink', delay: [2000,10000], dt: [50,[100,300],100], vs: { eyeBlinkLeft: [1,1,0], eyeBlinkRight: [1,1,0] } },
          { name: 'mouth', delay: [1000,5000], dt: [ [100,500],[100,5000,2] ], vs : { mouthRollLower: [[0,0.3,2]], mouthRollUpper: [[0,0.3,2]], mouthStretchLeft: [[0,0.3]], mouthStretchRight: [[0,0.3]], mouthPucker: [[0,0.3]] } },
          { name: 'misc', delay: [100,5000], dt: [ [100,500],[100,5000,2] ], vs : { eyeSquintLeft: [[0,0.3,3]], eyeSquintRight: [[0,0.3,3]], browInnerUp: [[0,0.3]], browOuterUpLeft: [[0,0.3]], browOuterUpRight: [[0,0.3]] } }
        ]
      },
      'happy' : {
        baseline: { mouthSmile: 0.3, eyesLookDown: 0.1 },
        speech: { deltaRate: 0, deltaPitch: 0.1, deltaVolume: 0 },
        anims: [
          { name: 'breathing', delay: 1500, dt: [ 1200,500,1000 ], vs: { chest: [0.5,0.5,0] } },
          { name: 'legs', delay: [4000,10000], dt: [ 1000 ], vs: { weight: [[-2,2]] } },
          { name: 'hands', delay: [500,10000], dt: [ 2000,4000 ], vs: {} },
          { name: 'head', dt: [ [1000,5000] ], vs: { headRotateX: [[-0.04,0.10]], headRotateY: [[-0.3,0.3]], headRotateZ: [[-0.08,0.08]] } },
          { name: 'eyes', delay: [100,5000], dt: [ [100,500],[100,5000,2] ], vs: { eyesRotateY: [[-0.6,0.6]], eyesRotateX: [[-0.2,0.6]] } },
          { name: 'blink', delay: [2000,10000], dt: [50,[100,300],100], vs: { eyeBlinkLeft: [1,1,0], eyeBlinkRight: [1,1,0] } },
          { name: 'mouth', delay: [1000,5000], dt: [ [100,500],[100,5000,2] ], vs : { mouthLeft: [[0,0.3,2]], mouthSmile: [[0,0.2,3]], mouthRollLower: [[0,0.3,2]], mouthRollUpper: [[0,0.3,2]], mouthStretchLeft: [[0,0.3]], mouthStretchRight: [[0,0.3]], mouthPucker: [[0,0.3]] } },
          { name: 'misc', delay: [100,5000], dt: [ [100,500],[100,5000,2] ], vs : { eyeSquintLeft: [[0,0.3,3]], eyeSquintRight: [[0,0.3,3]], browInnerUp: [[0,0.3]], browOuterUpLeft: [[0,0.3]], browOuterUpRight: [[0,0.3]] } }
        ]
      },
      'angry' : {
        baseline: { eyesLookDown: 0.1, browDownLeft: 0.7, browDownRight: 0.7, jawForward: 0.3, mouthFrownLeft: 0.8, mouthFrownRight: 0.8, mouthRollLower: 0.3, mouthShrugLower: 0.4 },
        speech: { deltaRate: -0.2, deltaPitch: 0.2, deltaVolume: 0 },
        anims: [
          { name: 'breathing', delay: 500, dt: [ 1000,500,1000 ], vs: { chest: [0.7,0.7,0] } },
          { name: 'legs', delay: [4000,10000], dt: [ 1000 ], vs: { weight: [[-2,2]] } },
          { name: 'hands', delay: [500,10000], dt: [ 2000,4000 ], vs: {} },
          { name: 'head', delay: [100,500], dt: [ [200,5000] ], vs: { headRotateX: [[-0.04,0.10]], headRotateY: [[-0.2,0.2]], headRotateZ: [[-0.08,0.08]] } },
          { name: 'eyes', delay: [100,5000], dt: [ [100,500],[100,5000,2] ], vs: { eyesRotateY: [[-0.6,0.6]], eyesRotateX: [[-0.2,0.6]] } },
          { name: 'blink', delay: [2000,10000], dt: [50,[100,300],100], vs: { eyeBlinkLeft: [1,1,0], eyeBlinkRight: [1,1,0] } },
          { name: 'mouth', delay: [1000,5000], dt: [ [100,500],[100,5000,2] ], vs : { mouthRollLower: [[0,0.3,2]], mouthRollUpper: [[0,0.3,2]], mouthStretchLeft: [[0,0.3]], mouthStretchRight: [[0,0.3]], mouthPucker: [[0,0.3]] } },
          { name: 'misc', delay: [100,5000], dt: [ [100,500],[100,5000,2] ], vs : { eyeSquintLeft: [[0,0.3,3]], eyeSquintRight: [[0,0.3,3]], browInnerUp: [[0,0.3]], browOuterUpLeft: [[0,0.3]], browOuterUpRight: [[0,0.3]] } }
        ]
      },
      'sad' : {
        baseline: { eyesLookDown: 0.2, browDownRight: 0.1, browInnerUp: 0.7, browOuterUpRight: 0.2, eyeSquintLeft: 0.8, eyeSquintRight: 0.8, mouthFrownLeft: 1, mouthFrownRight: 1, mouthLeft: 0.2, mouthPucker: 0.5, mouthRollLower: 0.2, mouthRollUpper: 0.2, mouthShrugLower: 0.2, mouthShrugUpper: 0.2, mouthStretchLeft: 0.5 },
        speech: { deltaRate: -0.2, deltaPitch: -0.2, deltaVolume: 0 },
        anims: [
          { name: 'breathing', delay: 1500, dt: [ 1000,500,1000 ], vs: { chest: [0.3,0.3,0] } },
          { name: 'legs', delay: [4000,10000], dt: [ 1000 ], vs: { weight: [[-2,2]] } },
          { name: 'hands', delay: [500,10000], dt: [ 2000,4000 ], vs: {} },
          { name: 'head', delay: [100,500], dt: [ [200,5000] ], vs: { headRotateX: [[-0.04,0.10]], headRotateY: [[-0.2,0.2]], headRotateZ: [[-0.08,0.08]] } },
          { name: 'eyes', delay: [100,5000], dt: [ [100,500],[100,5000,2] ], vs: { eyesRotateY: [[-0.6,0.6]], eyesRotateX: [[-0.2,0.6]] } },
          { name: 'blink', delay: [2000,10000], dt: [50,[100,300],100], vs: { eyeBlinkLeft: [1,1,0], eyeBlinkRight: [1,1,0] } },
          { name: 'mouth', delay: [1000,5000], dt: [ [100,500],[100,5000,2] ], vs : { mouthRollLower: [[0,0.3,2]], mouthRollUpper: [[0,0.3,2]], mouthStretchLeft: [[0,0.3]], mouthStretchRight: [[0,0.3]], mouthPucker: [[0,0.3]] } },
          { name: 'misc', delay: [100,5000], dt: [ [100,500],[100,5000,2] ], vs : { eyeSquintLeft: [[0,0.3,3]], eyeSquintRight: [[0,0.3,3]], browInnerUp: [[0,0.3]], browOuterUpLeft: [[0,0.3]], browOuterUpRight: [[0,0.3]] } }
        ]
      },
      'fear' : {
        baseline: { browInnerUp: 0.8, eyeSquintLeft: 0.5, eyeSquintRight: 0.5, eyeWideLeft: 0.7, eyeWideRight: 0.7, mouthClose: 0.1, mouthFunnel: 0.3, mouthShrugLower: 0.6, mouthShrugUpper: 0.6 },
        speech: { deltaRate: -0.2, deltaPitch: 0, deltaVolume: 0 },
        anims: [
          { name: 'breathing', delay: 500, dt: [ 1000,500,1000 ], vs: { chest: [0.7,0.7,0] } },
          { name: 'legs', delay: [2000,5000], dt: [ 1000 ], vs: { weight: [[-2,2]] } },
          { name: 'hands', delay: [500,10000], dt: [ 2000,4000 ], vs: {} },
          { name: 'head', delay: [100,500], dt: [ [200,5000] ], vs: { headRotateX: [[-0.06,0.12]], headRotateY: [[-0.5,0.5]], headRotateZ: [[-0.1,0.1]] } },
          { name: 'eyes', delay: [100,2000], dt: [ [100,500],[100,5000,2] ], vs: { eyesRotateY: [[-1,1]], eyesRotateX: [[-0.2,0.6]] } },
          { name: 'blink', delay: [4000,10000], dt: [50,[100,300],100], vs: { eyeBlinkLeft: [1,1,0], eyeBlinkRight: [1,1,0] } },
          { name: 'mouth', delay: [1000,5000], dt: [ [100,500],[100,5000,2] ], vs : { mouthRollLower: [[0,0.3,2]], mouthRollUpper: [[0,0.3,2]], mouthStretchLeft: [[0,0.3]], mouthStretchRight: [[0,0.3]], mouthPucker: [[0,0.3]] } },
          { name: 'misc', delay: [100,5000], dt: [ [100,500],[100,5000,2] ], vs : { eyeSquintLeft: [[0,0.3,3]], eyeSquintRight: [[0,0.3,3]], browInnerUp: [[0,0.3]], browOuterUpLeft: [[0,0.3]], browOuterUpRight: [[0,0.3]] } }
        ]
      },
      'disgust' : {
        baseline: { browDownLeft: 0.9, browDownRight: 0.1, browInnerUp: 0.3, eyeSquintLeft: 1, eyeSquintRight: 1, eyeWideLeft: 0.5, eyeWideRight: 0.5, eyesRotateX: 0.05, mouthLeft: 0.4, mouthPressLeft: 0.3, mouthRollLower: 0.4, mouthShrugLower: 0.4, mouthShrugUpper: 1, mouthUpperUpLeft: 0.3, noseSneerLeft: 1, noseSneerRight: 0.7 },
        speech: { deltaRate: -0.2, deltaPitch: 0, deltaVolume: 0 },
        anims: [
          { name: 'breathing', delay: 1500, dt: [ 1000,500,1000 ], vs: { chest: [0.5,0.5,0] } },
          { name: 'legs', delay: [4000,10000], dt: [ 1000 ], vs: { weight: [[-2,2]] } },
          { name: 'hands', delay: [500,10000], dt: [ 2000,4000 ], vs: {} },
          { name: 'head', delay: [100,500], dt: [ [200,5000] ], vs: { headRotateX: [[-0.04,0.10]], headRotateY: [[-0.2,0.2]], headRotateZ: [[-0.08,0.08]] } },
          { name: 'eyes', delay: [100,5000], dt: [ [100,500],[100,5000,2] ], vs: { eyesRotateY: [[-0.6,0.6]], eyesRotateX: [[-0.2,0.6]] } },
          { name: 'blink', delay: [2000,10000], dt: [50,[100,300],100], vs: { eyeBlinkLeft: [1,1,0], eyeBlinkRight: [1,1,0] } },
          { name: 'mouth', delay: [1000,5000], dt: [ [100,500],[100,5000,2] ], vs : { mouthRollLower: [[0,0.3,2]], mouthRollUpper: [[0,0.3,2]], mouthStretchLeft: [[0,0.3]], mouthStretchRight: [[0,0.3]], mouthPucker: [[0,0.3]] } },
          { name: 'misc', delay: [100,5000], dt: [ [100,500],[100,5000,2] ], vs : { eyeSquintLeft: [[0,0.3,3]], eyeSquintRight: [[0,0.3,3]], browInnerUp: [[0,0.3]], browOuterUpLeft: [[0,0.3]], browOuterUpRight: [[0,0.3]] } }
        ]
      },
      'love' : {
        baseline: { browInnerUp: 0.5, browOuterUpLeft: 0.2, browOuterUpRight: 0.2, mouthSmile: 0.2, eyeBlinkLeft: 0.6, eyeBlinkRight: 0.6, eyeWideLeft: 0.8, eyeWideRight: 0.8, headRotateX: 0.1, mouthDimpleLeft: 0.1, mouthDimpleRight: 0.1, mouthPressLeft: 0.2, mouthShrugUpper: 0.2, mouthUpperUpLeft: 0.1, mouthUpperUpRight: 0.1 },
        speech: { deltaRate: -0.1, deltaPitch: -0.7, deltaVolume: 0 },
        anims: [
          { name: 'breathing', delay: 1500, dt: [ 1500,500,1500 ], vs: { chest: [0.8,0.8,0] } },
          { name: 'legs', delay: [4000,10000], dt: [ 1000 ], vs: { weight: [[-2,2]] } },
          { name: 'hands', delay: [500,10000], dt: [ 2000,4000 ], vs: {} },
          { name: 'head', dt: [ [1000,5000] ], vs: { headRotateX: [[-0.04,0.10]], headRotateY: [[-0.3,0.3]], headRotateZ: [[-0.08,0.08]] } },
          { name: 'eyes', delay: [300,5000], dt: [ [100,500],[100,5000,2] ], vs: { eyesRotateY: [[-0.6,0.6]], eyesRotateX: [[-0.2,0.6]] } },
          { name: 'blink', delay: [2000,10000], dt: [50,[200,300],100], vs: { eyeBlinkLeft: [0.6,0.6,0], eyeBlinkRight: [0.6,0.6,0] } },
          { name: 'mouth', delay: [1000,5000], dt: [ [100,500],[100,5000,2] ], vs : { mouthLeft: [[0,0.3,2]], mouthRollLower: [[0,0.3,2]], mouthRollUpper: [[0,0.3,2]], mouthStretchLeft: [[0,0.3]], mouthStretchRight: [[0,0.3]], mouthPucker: [[0,0.3]] } },
          { name: 'misc', delay: [100,5000], dt: [ [500,1000],[1000,5000,2] ], vs : { eyeSquintLeft: [[0,0.3,3]], eyeSquintRight: [[0,0.3,3]], browInnerUp: [[0.3,0.6]], browOuterUpLeft: [[0.1,0.3]], browOuterUpRight: [[0.1,0.3]] } }
        ]
      },
      'sleep' : {
        baseline: { eyesClosed: 1, eyeBlinkLeft: 1, eyeBlinkRight: 1 },
        speech: { deltaRate: 0, deltaPitch: -0.2, deltaVolume: 0 },
        anims: [
          { name: 'breathing', delay: 1500, dt: [ 1000,500,1000 ], vs: { chest: [0.6,0.6,0] } },
          { name: 'legs', delay: [10000,20000], dt: [ 2000 ], vs: { weight: [[-1,1]] } },
          { name: 'hands', delay: [500,10000], dt: [ 2000,4000 ], vs: {} },
          { name: 'head', delay: [1000,5000], dt: [ [2000,10000] ], vs: { headRotateX: [[0,0.4]], headRotateY: [[-0.1,0.1]], headRotateZ: [[-0.04,0.04]] } },
          { name: 'eyes', delay: 1000, dt: [], vs: {} },
          { name: 'blink', delay: 1000, dt: [], vs: {} },
          { name: 'mouth', delay: 1000, dt: [], vs: {} },
          { name: 'misc', delay: 1000, dt: [], vs: {} }
        ]
      }
    };
    this.mood = this.animMoods[ this.opt.avatarMood ] || this.animMoods["neutral"];

    // Animation templates for emojis
    this.animEmojis = {

      '😐': { mood: 'neutral', dt: [300,2000], vs: { browInnerUp: [0.4], eyeWideLeft: [0.7], eyeWideRight: [0.7], mouthPressLeft: [0.6], mouthPressRight: [0.6], mouthRollLower: [0.3], mouthStretchLeft: [1], mouthStretchRight: [1] } },
      '😶': { link:  '😐' },
      '😏': { mood: 'happy', dt: [300,2000], vs: { browDownRight: [0.1], browInnerUp: [0.7], browOuterUpRight: [0.2], eyeLookInRight: [0.7], eyeLookOutLeft: [0.7], eyeSquintLeft: [1], eyeSquintRight: [0.8], eyesRotateY: [0.7], mouthLeft: [0.4], mouthPucker: [0.4], mouthShrugLower: [0.3], mouthShrugUpper: [0.2], mouthSmile: [0.2], mouthSmileLeft: [0.4], mouthSmileRight: [0.2], mouthStretchLeft: [0.5], mouthUpperUpLeft: [0.6], noseSneerLeft: [0.7] } },
      '🙂': { mood: 'happy', dt: [300,2000], vs: { mouthSmile: [0.5] } },
      '🙃': { link:  '🙂' },
      '😊': { mood: 'happy', dt: [300,2000], vs: { browInnerUp: [0.6], eyeSquintLeft: [1], eyeSquintRight: [1], mouthSmile: [0.7], noseSneerLeft: [0.7], noseSneerRight: [0.7] } },
      '😇': { link:  '😊' },
      '😀': { mood: 'happy', dt: [300,2000], vs: { browInnerUp: [0.6], jawOpen: [0.1], mouthDimpleLeft: [0.2], mouthDimpleRight: [0.2], mouthOpen: [0.3], mouthPressLeft: [0.3], mouthPressRight: [0.3], mouthRollLower: [0.4], mouthShrugUpper: [0.4], mouthSmile: [0.7], mouthUpperUpLeft: [0.3], mouthUpperUpRight: [0.3], noseSneerLeft: [0.4], noseSneerRight: [0.4] }},
      '😃': { mood: 'happy', dt: [300,2000], vs: { browInnerUp: [0.6], eyeWideLeft: [0.7], eyeWideRight: [0.7], jawOpen: [0.1], mouthDimpleLeft: [0.2], mouthDimpleRight: [0.2], mouthOpen: [0.3], mouthPressLeft: [0.3], mouthPressRight: [0.3], mouthRollLower: [0.4], mouthShrugUpper: [0.4], mouthSmile: [0.7], mouthUpperUpLeft: [0.3], mouthUpperUpRight: [0.3], noseSneerLeft: [0.4], noseSneerRight: [0.4] } },
      '😄': { mood: 'happy', dt: [300,2000], vs: { browInnerUp: [0.3], eyeSquintLeft: [1], eyeSquintRight: [1], jawOpen: [0.2], mouthDimpleLeft: [0.2], mouthDimpleRight: [0.2], mouthOpen: [0.3], mouthPressLeft: [0.3], mouthPressRight: [0.3], mouthRollLower: [0.4], mouthShrugUpper: [0.4], mouthSmile: [0.7], mouthUpperUpLeft: [0.3], mouthUpperUpRight: [0.3], noseSneerLeft: [0.4], noseSneerRight: [0.4] } },
      '😁': { mood: 'happy', dt: [300,2000], vs: { browInnerUp: [0.3], eyeSquintLeft: [1], eyeSquintRight: [1], jawOpen: [0.3], mouthDimpleLeft: [0.2], mouthDimpleRight: [0.2], mouthPressLeft: [0.5], mouthPressRight: [0.5], mouthShrugUpper: [0.4], mouthSmile: [0.7], mouthUpperUpLeft: [0.3], mouthUpperUpRight: [0.3], noseSneerLeft: [0.4], noseSneerRight: [0.4] } },
      '😆': { mood: 'happy', dt: [300,2000], vs: { browInnerUp: [0.3], eyeSquintLeft: [1], eyeSquintRight: [1], eyesClosed: [0.6], jawOpen: [0.3], mouthDimpleLeft: [0.2], mouthDimpleRight: [0.2], mouthPressLeft: [0.5], mouthPressRight: [0.5], mouthShrugUpper: [0.4], mouthSmile: [0.7], mouthUpperUpLeft: [0.3], mouthUpperUpRight: [0.3], noseSneerLeft: [0.4], noseSneerRight: [0.4] } },
      '😝': { mood: 'happy', dt: [300,100,1500,500,500], vs: { browInnerUp: [0.8], eyesClosed: [1], jawOpen: [0.7], mouthFunnel: [0.5], mouthSmile: [1], tongueOut: [0,1,1,0] } },
      '😋': { link:  '😝' }, '😛': { link:  '😝' }, '😛': { link:  '😝' }, '😜': { link:  '😝' }, '🤪': { link:  '😝' },
      '😂': { mood: 'happy', dt: [300,2000], vs: { browInnerUp: [0.3], eyeSquintLeft: [1], eyeSquintRight: [1], eyesClosed: [0.6], jawOpen: [0.3], mouthDimpleLeft: [0.2], mouthDimpleRight: [0.2], mouthPressLeft: [0.5], mouthPressRight: [0.5], mouthShrugUpper: [0.4], mouthSmile: [0.7], mouthUpperUpLeft: [0.3], mouthUpperUpRight: [0.3], noseSneerLeft: [0.4], noseSneerRight: [0.4] } },
      '🤣': { link:  '😂' }, '😅': { link:  '😂' },
      '😉': { mood: 'happy', dt: [500,200,500,500], vs: { mouthSmile: [0.5], mouthOpen: [0.2], mouthSmileLeft: [0,0.5,0], eyeBlinkLeft: [0,0.7,0], eyeBlinkRight: [0,0,0], headRotateX: [0.05,0.05,0.05,0], headRotateZ: [-0.05,-0.05,-0.05,0], browDownLeft: [0,0.7,0], cheekSquintLeft: [0,0.7,0], eyeSquintLeft: [0,1,0], eyesClosed: [0] } },

      '😭': { mood: 'sad', dt: [1000,1000], vs: { browInnerUp: [1], eyeSquintLeft: [1], eyeSquintRight: [1], eyesClosed: [0.1], jawOpen: [0], mouthFrownLeft: [1], mouthFrownRight: [1], mouthOpen: [0.5], mouthPucker: [0.5], mouthUpperUpLeft: [0.6], mouthUpperUpRight: [0.6] } },
      '🥺': { mood: 'sad', dt: [1000,1000], vs: { browDownLeft: [0.2], browDownRight: [0.2], browInnerUp: [1], eyeWideLeft: [0.9], eyeWideRight: [0.9], eyesClosed: [0.1], mouthClose: [0.2], mouthFrownLeft: [1], mouthFrownRight: [1], mouthPressLeft: [0.4], mouthPressRight: [0.4], mouthPucker: [1], mouthRollLower: [0.6], mouthRollUpper: [0.2], mouthUpperUpLeft: [0.8], mouthUpperUpRight: [0.8] } },
      '😞': { mood: 'sad', dt: [1000,1000], vs: { browInnerUp: [0.7], eyeSquintLeft: [1], eyeSquintRight: [1], eyesClosed: [0.5], headRotateX: [0.3], mouthClose: [0.2], mouthFrownLeft: [1], mouthFrownRight: [1], mouthPucker: [1], mouthRollLower: [1], mouthShrugLower: [0.2], mouthUpperUpLeft: [0.8], mouthUpperUpRight: [0.8] } },
      '😔': { mood: 'sad', dt: [1000,1000], vs: { browInnerUp: [1], eyeSquintLeft: [1], eyeSquintRight: [1], eyesClosed: [0.5], headRotateX: [0.3], mouthClose: [0.2], mouthFrownLeft: [1], mouthFrownRight: [1], mouthPressLeft: [0.4], mouthPressRight: [0.4], mouthPucker: [1], mouthRollLower: [0.6], mouthRollUpper: [0.2], mouthUpperUpLeft: [0.8], mouthUpperUpRight: [0.8] } },
      '😳': { mood: 'sad', dt: [1000,1000], vs: { browInnerUp: [1], eyeWideLeft: [0.5], eyeWideRight: [0.5], eyesRotateY: [0.05], eyesRotateX: [0.05], mouthClose: [0.2], mouthFunnel: [0.5], mouthPucker: [0.4], mouthRollLower: [0.4], mouthRollUpper: [0.4] } },
      '☹️': { mood: 'sad', dt: [500,1500], vs: { mouthFrownLeft: [1], mouthFrownRight: [1], mouthPucker: [0.1], mouthRollLower: [0.8] } },

      '😚': { mood: 'love', dt: [500,1000,1000], vs: { browInnerUp: [0.6], eyeBlinkLeft: [1], eyeBlinkRight: [1], eyeSquintLeft: [1], eyeSquintRight: [1], mouthPucker: [0,0.5], noseSneerLeft: [0,0.7], noseSneerRight: [0,0.7], viseme_U: [0,1] } },
      '😘': { mood: 'love', dt: [500,500,200,500], vs: { browInnerUp: [0.6], eyeBlinkLeft: [0,0,1,0], eyeBlinkRight: [0], eyesRotateY: [0], headRotateY: [0], headRotateX: [0,0.05,0.05,0], headRotateZ: [0,-0.05,-0.05,0], eyeSquintLeft: [1], eyeSquintRight: [1], mouthPucker: [0,0.5,0], noseSneerLeft: [0,0.7], noseSneerRight: [0.7], viseme_U: [0,1] } },
      '🥰': { mood: 'love', dt: [1000,1000], vs: { browInnerUp: [0.6], eyeSquintLeft: [1], eyeSquintRight: [1], mouthSmile: [0.7], noseSneerLeft: [0.7], noseSneerRight: [0.7] } },
      '😍': { mood: 'love', dt: [1000,1000], vs: { browInnerUp: [0.6], jawOpen: [0.1], mouthDimpleLeft: [0.2], mouthDimpleRight: [0.2], mouthOpen: [0.3], mouthPressLeft: [0.3], mouthPressRight: [0.3], mouthRollLower: [0.4], mouthShrugUpper: [0.4], mouthSmile: [0.7], mouthUpperUpLeft: [0.3], mouthUpperUpRight: [0.3], noseSneerLeft: [0.4], noseSneerRight: [0.4] } },
      '🤩': { link:  '😍' },

      '😡': { mood: 'angry', dt: [1000,1500], vs: { browDownLeft: [1], browDownRight: [1], eyesLookUp: [0.2], jawForward: [0.3], mouthFrownLeft: [1], mouthFrownRight: [1], headRotateX: [0.15] } },
      '😠': { mood: 'angry', dt: [1000,1500], vs: { browDownLeft: [1], browDownRight: [1], eyesLookUp: [0.2], jawForward: [0.3], mouthFrownLeft: [1], mouthFrownRight: [1], headRotateX: [0.15] } },
      '🤬': { link:  '😠' },
      '😒': { mood: 'angry', dt: [1000,1000], vs: { browDownRight: [0.1], browInnerUp: [0.7], browOuterUpRight: [0.2], eyeLookInRight: [0.7], eyeLookOutLeft: [0.7], eyeSquintLeft: [1], eyeSquintRight: [0.8], eyesRotateY: [0.7], mouthFrownLeft: [1], mouthFrownRight: [1], mouthLeft: [0.2], mouthPucker: [0.5], mouthRollLower: [0.2], mouthRollUpper: [0.2], mouthShrugLower: [0.2], mouthShrugUpper: [0.2], mouthStretchLeft: [0.5] } },

      '😱': { mood: 'fear', dt: [500,1500], vs: { browInnerUp: [0.8], eyeWideLeft: [0.5], eyeWideRight: [0.5], jawOpen: [0.7], mouthFunnel: [0.5] } },
      '😬': { dt: [500,1500], vs: { browDownLeft: [1], browDownRight: [1], browInnerUp: [1], mouthDimpleLeft: [0.5], mouthDimpleRight: [0.5], mouthLowerDownLeft: [1], mouthLowerDownRight: [1], mouthPressLeft: [0.4], mouthPressRight: [0.4], mouthPucker: [0.5], mouthSmile: [0.1], mouthSmileLeft: [0.2], mouthSmileRight: [0.2], mouthStretchLeft: [1], mouthStretchRight: [1], mouthUpperUpLeft: [1], mouthUpperUpRight: [1] } },
      '🙄': { dt: [500,1500], vs: { browInnerUp: [0.8], eyeWideLeft: [1], eyeWideRight: [1], eyesRotateX: [-0.8], headRotateX: [0.15], mouthPucker: [0.5], mouthRollLower: [0.6], mouthRollUpper: [0.5], mouthShrugLower: [0], mouthSmile: [0] } },
      '🤔': { dt: [500,1500], vs: { browDownLeft: [1], browOuterUpRight: [1], eyeSquintLeft: [0.6], headRotateY: [-0.2], headRotateX: [-0.1], mouthFrownLeft: [0.7], mouthFrownRight: [0.7], mouthLowerDownLeft: [0.3], mouthPressRight: [0.4], mouthPucker: [0.1], mouthRight: [0.5], mouthRollLower: [0.5], mouthRollUpper: [0.2] } },
      '👀': { dt: [500,1500], vs: { eyesRotateY: [-0.8] } },

      '😴': { mood: 'sleep', dt: [5000,5000], vs:{ eyesClosed: [1], eyeBlinkLeft: [1], eyeBlinkRight: [1], headRotateX: [0.2], headRotateZ: [0.1] } },
    };

    // Baseline/fixed morph targets
    this.animBaseline = {};
    this.animFixed = {};

    // Finnish letters to visemes. And yes, it is this SIMPLE in Finnish, more or less.
    this.visemes = {
      'a': 'aa', 'e': 'E', 'i': 'I', 'o': 'O', 'u': 'U', 'y': 'Y', 'ä': 'aa',
      'ö': 'O', 'b': 'PP', 'c': 'SS', 'd': 'DD', 'f': 'FF', 'g': 'kk',
      'h': 'O', 'j': 'I', 'k': 'kk', 'l': 'nn', 'm': 'PP', 'n': 'nn',
      'p': 'PP', 'q': 'kk', 'r': 'RR','s': 'SS', 't': 'DD', 'v': 'FF',
      'w': 'FF', 'x': 'SS', 'z': 'SS', ' ': 'sil', ',': 'sil', '-': 'sil'
    };

    // Pauses in relative units to visemes
    this.pauses = { ',': 3, '-':0.5 };

    // Animation queue
    this.animQueue = [];

    // Animation effects
    this.easing = this.sigmoidFactory(5); // Ease in and out

    // Setup Google text-to-speech
    if ( this.opt.ttsEndpoint ) {
      this.ttsAudio = new Audio();
      if (this.ttsAudio.canPlayType("audio/ogg")) {
        this.ttsAudioEncoding = "OGG-OPUS";
        this.ttsAudioData = "data:audio/ogg;base64,";
      } else if (this.ttsAudio.canPlayType("audio/mp3")) {
        this.ttsAudioEncoding = "MP3";
        this.ttsAudioData = "data:audio/mp3;base64,";
      } else {
        const msg = "There was no support for either OGG or MP3 audio.";
        console.error(msg);
        if ( error && typeof error === 'function' ) error(msg);
        throw new Error(msg);
      }
      this.ttsAudio.oncanplaythrough = this.ttsOnCanPlayThrough.bind(this);
      this.ttsAudio.onended = this.ttsOnEnd.bind(this);
      this.ttsAudio.onerror = this.ttsOnError.bind(this);
    } else {
      const msg = "You must provide some Google-compliant Text-To-Speech Endpoint.";
      console.error(msg);
      if ( error && typeof error === 'function' ) error(msg);
      throw new Error(msg);
    }
    this.ttsQueue = [];
    this.ttsSpeaking = false;

    // Setup 3D Animation
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio( this.opt.modelPixelRatio * window.devicePixelRatio );
    this.renderer.setSize(this.nodeAvatar.clientWidth, this.nodeAvatar.clientHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.useLegacyLights = false;
    this.renderer.shadowMap.enabled = false;
    this.nodeAvatar.appendChild( this.renderer.domElement );
    this.camera = new THREE.PerspectiveCamera( 10, 1, 1, 2000 );
    this.scene = new THREE.Scene();
    const pmremGenerator = new THREE.PMREMGenerator( this.renderer );
    pmremGenerator.compileEquirectangularShader();
    this.scene.environment = pmremGenerator.fromScene( new RoomEnvironment() ).texture;
    new ResizeObserver(this.onResize.bind(this)).observe(this.nodeAvatar);
    this.controls = new OrbitControls( this.camera, this.renderer.domElement );
    this.controls.enableZoom = this.opt.cameraZoomEnable;
    this.controls.enableRotate = this.opt.cameraRotateEnable;
    this.controls.enablePan = this.opt.cameraPanEnable;
    this.controls.minDistance = 2;
    this.controls.maxDistance = 2000;
    this.controls.update();

    // Load 3D Avatar
    this.loadModel(url,onsuccess,onerror);
  }

  /**
  * Clear 3D object.
  * @param {Object} obj Object
  */
  clearThree(obj){
    while( obj.children.length ){
      this.clearThree(obj.children[0]);
      obj.remove(obj.children[0]);
    }
    if ( obj.geometry ) obj.geometry.dispose();

    if ( obj.material ) {
      Object.keys(obj.material).forEach( x => {
        if ( obj.material[x] && obj.material[x] !== null && typeof obj.material[x].dispose === 'function' ) {
          obj.material[x].dispose();
        }
      });
      obj.material.dispose();
    }
  }

  /**
  * Loader for 3D avatar model.
  * @param {string} url URL to GLTF/GLB file.
  * @param {successfn} [onsuccess=null] Callback when the Avatar has been succesfully loaded
  * @param {errorfn} [onerror=null] Callback when there was an error in initialization
  */
  loadModel(url,onsuccess=null,onerror=null) {

    this.stopAnimation();
    const loader = new GLTFLoader();
    loader.load(url, (gltf) => {

      // Clear previous scene, if avatar was previously loaded
      if ( this.avatar ) {
        this.clearThree( this.scene );
      }

      function notfound(x) {
        const msg = 'Avatar ' + x + ' not found';
        console.error(msg);
        if ( onerror && typeof onerror === 'function' ) onerror(msg);
        throw new Error(msg);
      }

      // Avatar full-body
      this.avatar = gltf.scene.getObjectByName("Armature"); // Full-body
      if ( !this.avatar ) notfound("Armature");

      // Rig map
      this.rig = {
        hips: 'Hips',
        spine: 'Spine',
        chest: 'Spine1',
        upperChest: 'Spine2',
        neck: 'Neck',
        head: 'Head',
        leftShoulder: 'LeftShoulder',
        leftUpperArm: 'LeftArm',
        leftLowerArm: 'LeftForeArm',
        leftHand: 'LeftHand',
        rightShoulder: 'RightShoulder',
        rightUpperArm: 'RightArm',
        rightLowerArm: 'RightForeArm',
        rightHand: 'RightHand',
        leftUpperLeg: 'LeftUpLeg',
        leftLowerLeg: 'LeftLeg',
        leftFoot: 'LeftFoot',
        rightUpperLeg: 'RightUpLeg',
        rightLowerLeg: 'RightLeg',
        rightFoot: 'RightFoot'
      };
      Object.keys(this.rig).map( x => {
        let name = this.rig[x];
        let y = this.avatar.getObjectByName( name );
        if ( !y ) notfound(name);
        this.rig[x] = y;
      });

      // Morphs
      this.morphs = ['EyeLeft','EyeRight','Wolf3D_Head','Wolf3D_Teeth'].map( x => {
        let y = this.avatar.getObjectByName( x );
        if ( !y ) notfound(x);
        return y;
      });

      // Add avatar to scene
      this.scene.add(this.avatar);

      // Add lighting
      const light = new THREE.SpotLight( 0x8888FF, 2 );
      light.castShadow = true
      light.position.set(-3, 3, -0.5).normalize();
      light.target = this.avatar;
      this.scene.add( light );

      // Camera helper
      // const helper = new THREE.CameraHelper( light.shadow.camera );
      // this.scene.add( helper );

      // Set pose
      this.rig.leftUpperArm.rotation.set(1.2,0,0);
      this.rig.rightUpperArm.rotation.set(1.2,0,0);
      this.rig.leftLowerArm.rotation.set(0.06,0,0.2);
      this.rig.rightLowerArm.rotation.set(0.06,0,-0.2);
      this.setValue('headRotateX',0);
      this.setValue('headRotateY',0);
      this.setValue('headRotateZ',0);
      this.setValue('chest',0);
      this.setValue('weight',0);
      this.setMood( this.opt.avatarMood );

      // Fit avatar to screen
      this.setView(this.opt.cameraView);

      // Start animations
      this.startAnimation();

      // Callback
      if ( onsuccess && typeof onsuccess === 'function' ) onsuccess();
    },
    null,
    (msg) => {
      console.error(msg);
      if ( onerror && typeof onerror === 'function' ) onerror(msg);
      throw new Error(msg);
    });
  }

  /**
  * Get mood names.
  * @return {string[]} Mood names.
  */
  getViewNames() {
    return ['closeup','left','right','fullbody'];
  }

  /**
  * Fit 3D object to the view.
  * @param {string} view Camera view
  * @param {Object} opt Options
  */
  setView(view, opt = null) {
    if ( !this.avatar ) return;

    opt = opt || {}
    Object.assign( opt, this.opt );

    // Camera position
    const boundingBox = new THREE.Box3();
    boundingBox.setFromObject( this.avatar );
    var size = new THREE.Vector3();
    boundingBox.getSize(size);
    const fov = this.camera.fov * ( Math.PI / 180 );
    let x, y, z;
    let distance = 0.7 * (size.z / 2 + Math.abs( size.x / 2 / Math.tan( fov / 2 ) ));
    let tx = 1, ty = 1, tz = 1;
    if ( view === 'closeup' ) {
      x = - opt.cameraX;
      y = 1.6 - opt.cameraY;
      z = opt.cameraZ + distance;
      tz = 0;
    } else if ( view === 'right' ) {
      x = - opt.cameraZ - distance;
      y = 1.6 - opt.cameraY;
      z = - opt.cameraX + 0.15;
      tx = 0;
    } else if ( view === 'left' ) {
      x = opt.cameraZ + distance;
      y = 1.6 - opt.cameraY;
      z = opt.cameraX + 0.05;
      tx = 0;
    } else if ( view === 'fullbody' ) {
      x = - (3.2 * opt.cameraX);
      y = 1 - opt.cameraY;
      z = 7.7 + opt.cameraZ + distance;
      tz = 0;
    }
    this.controls.reset();
    this.camera.position.set( x, y, z );
    this.controls.target.set( tx * x, ty * y, tz * z );
    this.controls.update();
    this.render();
  }

  /**
  * Render scene.
  */
  render() {
    this.renderer.render( this.scene, this.camera );
  }

  /**
  * Resize avatar.
  */
  onResize() {
    this.camera.aspect = this.nodeAvatar.clientWidth / this.nodeAvatar.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize( this.nodeAvatar.clientWidth, this.nodeAvatar.clientHeight );
    this.controls.update();
    this.render();
  }

  /**
  * Get morph target value.
  * @param {string} mt Morph target
  * @return {number} Value
  */
  getValue(mt) {
    if ( mt === 'headRotateX' ) {
      return this.rig.head.rotation.x + 0.15;
    } else if ( mt === 'headRotateY' ) {
      return this.rig.head.rotation.y;
    } else if ( mt === 'headRotateZ' ) {
      return this.rig.head.rotation.z;
    } else if ( mt === 'chest' ) {
      return (this.rig.chest.scale.x-1)*30;
    } else if ( mt === 'weight' ) {
      return 12 * this.avatar.rotation.y;
    } else {
      return this.morphs[0].morphTargetInfluences[this.morphs[0].morphTargetDictionary[mt]];
    }
  }

  /**
  * Set morph target value.
  * @param {string} mt Morph target
  * @param {number} v Value
  */
  setValue(mt,v) {
    if ( mt === 'headRotateX' ) {
      this.rig.head.rotation.x = v - 0.15;
      this.rig.chest.rotation.x = v/2;
      this.rig.spine.rotation.x = v/12;
      this.rig.hips.rotation.x = v/32 - 0.06;
    } else if ( mt === 'headRotateY' ) {
      let w = this.getValue('weight');
      this.rig.head.rotation.y = v;
      this.rig.chest.rotation.y = v / 2;
      this.rig.spine.rotation.y = v / 2;
      this.rig.hips.rotation.y = v / 4 + w / 12;
      this.rig.leftUpperLeg.rotation.y = ( w > 0 ? 0 : (v / 2 - w / 20) );
      this.rig.leftLowerLeg.rotation.y = v / 2;
      this.rig.rightUpperLeg.rotation.y = ( w < 0 ? 0 : (v / 2 + w / 20) );
      this.rig.rightLowerLeg.rotation.y = v / 2;
    } else if ( mt === 'headRotateZ' ) {
      let w = this.getValue('weight');
      this.rig.head.rotation.z = v;
      this.rig.chest.rotation.z = v/12;
      this.rig.hips.rotation.z = v/24  + w/18;
      this.rig.spine.rotation.z = v/12 - w/12;
    } else if ( mt === 'chest' ) {
      const scale = v/30;
      this.rig.chest.scale.set(1+scale,1+scale/2,1+4*scale);
      this.rig.head.scale.set(1/(1+scale),1/(1+scale/2),1/(1+4*scale));
    } else if ( mt === 'weight' ) {
      // Limit
      let w = Math.max(-1,Math.min(1,v));

      // Body
      let headRotateY = this.getValue('headRotateY');
      let headRotateZ = this.getValue('headRotateZ');
      this.avatar.position.y = -(w*w)/128;
      this.avatar.rotation.x = -0.02;
      this.avatar.rotation.y = w/12;
      this.avatar.rotation.z = 0;

      this.rig.hips.position.x = w/64;
      this.rig.hips.rotation.y = headRotateY / 4 + w / 12;
      this.rig.hips.rotation.z = headRotateZ/24 + w / 18;
      this.rig.spine.rotation.z = headRotateZ/12 - w / 12;

      // Legs
      this.rig.leftUpperLeg.rotation.x = ( w > 0 ? 0.15 : (0.15 + w / 4) );
      this.rig.leftUpperLeg.rotation.y = ( w > 0 ? 0 : headRotateY / 2 - w / 20 );
      this.rig.leftUpperLeg.rotation.z = Math.PI + (headRotateZ/24 - w / 18) - ( w > 0 ? 0 : w/16 );
      this.rig.rightUpperLeg.rotation.x = ( w < 0 ? 0.15 : (0.15 - w / 4) );
      this.rig.rightUpperLeg.rotation.y = ( w < 0 ? 0 : headRotateY / 2 + w / 20 );
      this.rig.rightUpperLeg.rotation.z = Math.PI + (headRotateZ/24 - w / 18) + 0.06 - ( w < 0 ? 0 : w/16 );
      this.rig.leftLowerLeg.rotation.x = ( w > 0 ? -0.1 : -0.1 + (w/4) );
      this.rig.rightLowerLeg.rotation.x = ( w < 0 ? -0.1 : -0.1 - (w/4) );

      // Feet
      this.rig.leftFoot.rotation.x = 1;
      this.rig.leftFoot.rotation.y = ( w > 0 ? -0.3 : -0.3 - w / 20 );
      this.rig.leftFoot.rotation.z = ( w > 0 ? 0.3 : 0.3 - w / 20 );
      this.rig.rightFoot.rotation.x = 1;
      this.rig.rightFoot.rotation.y = ( w < 0 ? 0.3 : 0.3 - w / 20 );
      this.rig.rightFoot.rotation.z = ( w < 0 ? -0.3 : -0.3 - w / 20 );
    } else {
      this.morphs.forEach( x => x.morphTargetInfluences[x.morphTargetDictionary[mt]] = v );
    }
  }


  /**
  * Get mood names.
  * @return {string[]} Mood names.
  */
  getMoodNames() {
    return Object.keys(this.animMoods);
  }

  /**
  * Get mood.
  * @return {string[]} Mood.
  */
  getMood() {
    return this.opt.avatarMood;
  }

  /**
  * Set mood.
  * @param {string} s Mood.
  */
  setMood(s) {
    s = (s || '').trim().toLowerCase();
    if ( !this.animMoods.hasOwnProperty(s) ) throw new Error("Unknown mood.");
    this.opt.avatarMood = s;
    this.mood = this.animMoods[s];

    // Reset morph target baseline to 0
    for( let mt of Object.keys(this.morphs[0].morphTargetDictionary) ) {
      this.setBaselineValue( mt, this.mood.baseline.hasOwnProperty(mt) ? this.mood.baseline[mt] : 0 );
    }

    // Set/replace animations
    this.mood.anims.forEach( x => {
      let o = this.animQueue.find( y => y.template.name === x.name );
      if ( o ) {
        o.template = x;
      } else {
        this.animQueue.push( this.animFactory( x, -1 ) );
      }
    });

  }


  /**
  * Get morph target names.
  * @return {string[]} Morph target names.
  */
  getMorphTargetNames() {
    return [
      'headRotateX', 'headRotateY', 'headRotateZ',
      'eyesRotateX', 'eyesRotateY', 'chest', 'weight',
      ...Object.keys(this.morphs[0].morphTargetDictionary)
    ].sort();
  }

  /**
  * Get baseline value for the morph target.
  * @param {string} mt Morph target name
  * @return {number} Value, undefined if not in baseline
  */
  getBaselineValue( mt ) {
    if ( mt === 'eyesRotateY' ) {
      const ll = this.getBaselineValue('eyeLookOutLeft');
      if ( ll === undefined ) return undefined;
      const lr = this.getBaselineValue('eyeLookInLeft');
      if ( lr === undefined ) return undefined;
      const rl = this.getBaselineValue('eyeLookOurRight');
      if ( rl === undefined ) return undefined;
      const rr = this.getBaselineValue('eyeLookInRight');
      if ( rr === undefined ) return undefined;
      return ll - lr;
    } else if ( mt === 'eyesRotateX' ) {
      const d = this.getBaselineValue('eyesLookDown');
      if ( d === undefined ) return undefined;
      const u = this.getBaselineValue('eyeLookUp');
      if ( u === undefined ) return undefined;
      return d - u;
    } else {
      return (this.animBaseline.hasOwnProperty(mt) ? this.animBaseline[mt].target : undefined);
    }
  }

  /**
  * Set baseline for morph target.
  * @param {string} mt Morph target name
  * @param {number} v Value, null if to be removed from baseline
  */
  setBaselineValue( mt, v ) {
    if ( mt === 'eyesRotateY' ) {
      this.setBaselineValue('eyeLookOutLeft', (v === null) ? null : (v>0 ? v : 0) );
      this.setBaselineValue('eyeLookInLeft', (v === null) ? null : (v>0 ? 0 : -v) );
      this.setBaselineValue('eyeLookOutRight', (v === null) ? null : (v>0 ? 0 : -v) );
      this.setBaselineValue('eyeLookInRight', (v === null) ? null : (v>0 ? v : 0) );
    } else if ( mt === 'eyesRotateX' ) {
      this.setBaselineValue('eyesLookDown', (v === null) ? null : (v>0 ? v : 0) );
      this.setBaselineValue('eyesLookUp', (v === null) ? null : (v>0 ? 0 : -v) );
    } if ( mt === 'eyeLookOutLeft' || mt === 'eyeLookInLeft' ||
            mt === 'eyeLookOutRight' || mt === 'eyeLookInRight' ||
            mt === 'eyesLookDown' || mt === 'eyesLookUp' ) {
      // skip these
    } else {
      if ( this.morphs[0].morphTargetDictionary.hasOwnProperty(mt) ) {
        if ( v === null ) {
          if ( this.animBaseline.hasOwnProperty(mt) ) {
            delete this.animBaseline[mt];
          }
        } else {
          this.animBaseline[mt] = { target: v };
        }
      }
    }
  }

  /**
  * Get fixed value for the morph target.
  * @param {string} mt Morph target name
  * @return {number} Value, undefined if not fixed
  */
  getFixedValue( mt ) {
    if ( mt === 'eyesRotateY' ) {
      const ll = this.getFixedValue('eyeLookOutLeft');
      if ( ll === undefined ) return undefined;
      const lr = this.getFixedValue('eyeLookInLeft');
      if ( lr === undefined ) return undefined;
      const rl = this.getFixedValue('eyeLookOutRight');
      if ( rl === undefined ) return undefined;
      const rr = this.getFixedValue('eyeLookInRight');
      if ( rr === undefined ) return undefined;
      return ll - lr;
    } else if ( mt === 'eyesRotateX' ) {
      const d = this.getFixedValue('eyesLookDown');
      if ( d === undefined ) return undefined;
      const u = this.getFixedValue('eyeLookUp');
      if ( u === undefined ) return undefined;
      return d - u;
    } else {
      return (this.animFixed.hasOwnProperty(mt) ? this.animFixed[mt].target : undefined);
    }
  }

  /**
  * Fix morph target.
  * @param {string} mt Morph target name
  * @param {number} v Value, null if to be removed
  */
  setFixedValue( mt, v ) {
    if ( mt === 'eyesRotateY' ) {
      this.setFixedValue('eyeLookOutLeft', (v === null) ? null : (v>0 ? v : 0 ) );
      this.setFixedValue('eyeLookInLeft', (v === null) ? null : (v>0 ? 0 : -v ) );
      this.setFixedValue('eyeLookOutRight', (v === null) ? null : (v>0 ? 0 : -v ) );
      this.setFixedValue('eyeLookInRight', (v === null) ? null : (v>0 ? v : 0 ) );
    } else if ( mt === 'eyesRotateX' ) {
      this.setFixedValue('eyesLookDown', (v === null) ? null : (v>0 ? v : 0 ) );
      this.setFixedValue('eyesLookUp', (v === null) ? null : (v>0 ? 0 : -v ) );
    } else {
      if ( this.getMorphTargetNames().includes(mt) ) {
        if ( v === null ) {
          if ( this.animFixed.hasOwnProperty(mt) ) {
            delete this.animFixed[mt];
          }
        } else {
          this.animFixed[mt] = { target: v };
        }
      }
    }
  }


  /**
  * Create a new animation based on an animation template.
  * @param {Object} t Animation template
  * @param {number} [loop=false] Number of loops, false if not looped
  * @param {number} [scaleTime=1] Scale template times
  * @param {number} [scaleValue=1] Scale template values
  * @return {Object} New animation object.
  */
  animFactory( t, loop = false, scaleTime = 1, scaleValue = 1 ) {
    const o = { template: t, ts: [0], vs: {} };

    // Time series
    const delay = t.delay ? (Array.isArray(t.delay) ? this.gaussianRandom(t.delay[0],t.delay[1],t.delay[2]) : t.delay ) : 0;
    t.dt.forEach( (x,i) => {
      o.ts[i+1] = o.ts[i] + (Array.isArray(x) ? this.gaussianRandom(x[0],x[1],x[2]) : x);
    });
    o.ts = o.ts.map( x => performance.now() + delay + x * scaleTime );

    // Values
    for( let [mt,vs] of Object.entries(t.vs) ) {
      const base = this.getBaselineValue(mt);
      const v = vs.map( x => (base === undefined ? 0 : base) + scaleValue * (Array.isArray(x) ? this.gaussianRandom(x[0],x[1],x[2]) : x) );

      if ( mt === 'eyesRotateY' ) {
        o.vs['eyeLookOutLeft'] = [null, ...v.map( x => (x>0) ? x : 0 ) ];
        o.vs['eyeLookInLeft'] = [null, ...v.map( x => (x>0) ? 0 : -x ) ];
        o.vs['eyeLookOutRight'] = [null, ...v.map( x => (x>0) ? 0 : -x ) ];
        o.vs['eyeLookInRight'] = [null, ...v.map( x => (x>0) ? x : 0 ) ];
      } else if ( mt === 'eyesRotateX' ) {
        o.vs['eyesLookDown'] = [null, ...v.map( x => (x>0) ? x : 0 ) ];
        o.vs['eyesLookUp'] = [null, ...v.map( x => (x>0) ? 0 : -x ) ];
      } else {
        o.vs[mt] = [null, ...v];
      }
    }
    for( let mt of Object.keys(o.vs) ) {
      while( (o.vs[mt].length-1) < o.ts.length ) o.vs[mt].push( o.vs[mt][ o.vs[mt].length - 1 ]);
    }

    // Mood
    if ( t.hasOwnProperty("mood") ) o.mood = t.mood.slice();

    if ( loop ) o.loop = loop;
    return o;
  }

  /**
  * Calculate the correct value based on a given time using the given function.
  * @param {number[]} ts Time sequence
  * @param {number[]} vs Value sequence
  * @param {number} t Time.
  * @param {function} [fun=null] Ease in and out function, null = use linear function
  * @return {number} Value based on the given time.
  */
  valueAnimationSeq(ts,vs,t,fun = null) {
    let iMin = 0;
    let iMax = ts.length-1;
    if ( t <= ts[iMin] ) return vs[iMin];
    if ( t >= ts[iMax] ) return vs[iMax];
    while( t > ts[iMin+1] ) iMin++;
    iMax = iMin + 1;
    let k = (vs[iMax] - vs[iMin]) / (ts[iMax] - ts[iMin]);
    if ( fun ) k = fun( ( t - ts[iMin] ) / (ts[iMax] - ts[iMin]) ) * k;
    const b = vs[iMin] - (k * ts[iMin]);
    return (k * t + b);
  }

  /**
  * Return gaussian distributed random value between start and end with skew.
  * @param {number} start Start value.
  * @param {number} end End value.
  * @param {number} [skew=1] Skew.
  * @return {number} Gaussian random value.
  */
  gaussianRandom(start,end,skew=1) {
    let r = 0;
    for( let i=0; i<5; i++) r += Math.random();
    return start + Math.pow(r/5,skew) * (end - start);
  }

  /**
  * Create a sigmoid function.
  * @param {number} k Sharpness of ease.
  * @return {function} Sigmoid function.
  */
  sigmoidFactory(k) {
    function base(t) { return (1 / (1 + Math.exp(-k * t))) - 0.5; }
    var corr = 0.5 / base(1);
    return function (t) { return corr * base(2 * Math.max(Math.min(t, 1), 0) - 1) + 0.5; };
  }

  /**
  * Convert value from one range to another.
  * @param {number} value Value
  * @param {number[]} r1 Source range
  * @param {number[]} r2 Target range
  * @return {number} Scaled value
  */
  convertRange( value, r1, r2 ) {
    return (value-r1[0]) * (r2[1]-r2[0]) / (r1[1]-r1[0]) + r2[0];
  }

  /**
  * Animate the avatar.
  * @param {number} t High precision timestamp in ms.
  */
  animate(t) {
    const o = {};

    // Start from baseline
    for( let [mt,x] of Object.entries(this.animBaseline) ) {
      const v = this.getValue(mt);
      if ( v !== x.target ) {
        if ( x.t0 === undefined ) {
          x.t0 = performance.now();
          x.v0 = v;
        }
        o[mt] = this.valueAnimationSeq( [x.t0,x.t0+1000], [x.v0,x.target], t, this.easing );
      } else {
        x.t0 = undefined;
      }
    }

    // Animations
    for( let i = 0; i < this.animQueue.length; i++ ) {
      const x = this.animQueue[i];
      if ( t >= x.ts[0] ) {
        for( let [mt,vs] of Object.entries(x.vs) ) {
          if ( mt === 'subtitles' ) {
            o[mt] = (x.isFirst ? '\n\n' : '') + (o.hasOwnProperty(mt) ? o[mt] + vs : vs);
            delete x.vs[mt];
          } else {
            if ( vs[0] === null ) vs[0] = this.getValue(mt);
            o[mt] = this.valueAnimationSeq( x.ts, vs, t, this.easing );
            if ( this.animBaseline.hasOwnProperty(mt) ) this.animBaseline[mt].t0 = undefined;
            for( let j=0; j<i; j++ ) {
              if ( this.animQueue[j].vs.hasOwnProperty(mt) ) delete this.animQueue[j].vs[mt];
            }
          }
        }
        if ( t >= x.ts[x.ts.length-1] ) {
          if ( x.hasOwnProperty('mood') ) this.setMood(x.mood);
          if ( x.loop ) {
            let restrain = ( this.ttsSpeaking && (x.template.name === 'head' || x.template.name === 'eyes') ) ? 4 : 1;
            this.animQueue[i] = this.animFactory( x.template, (x.loop > 0 ? x.loop - 1 : x.loop), 1, 1/restrain );
          } else {
            this.animQueue.splice(i--, 1);
          }
        }
      }
    }

    // Set fixed
    for( let [mt,x] of Object.entries(this.animFixed) ) {
      const v = this.getValue(mt);
      if ( v !== x.target ) {
        if ( x.t0 === undefined ) {
          x.t0 = performance.now();
          x.v0 = v;
        }
        o[mt] = this.valueAnimationSeq( [x.t0,x.t0+1000], [x.v0,x.target], t, this.easing );
      } else {
        if ( o.hasOwnProperty(mt) ) delete o[mt];
        x.t0 = undefined;
      }
      if ( this.animBaseline.hasOwnProperty(mt) ) this.animBaseline[mt].t0 = undefined;
    }

    // Update values
    let changed = false;
    for( let [mt,target] of Object.entries(o) ) {
      if ( mt === 'subtitles' ) {
        let last = this.nodeSubtitles.lastElementChild;
        target.split('\n\n').forEach( (p,i) => {
          if ( p.length ) {
            if ( i > 0 || !last ) {
              last = this.nodeSubtitles.appendChild( document.createElement('p') );
              last.dataset.markdown = '';
            }
            let markdown = last.dataset.markdown + p;
            last.outerHTML = dompurify.sanitize(marked.parse( markdown, this.opt.markedOptions ));
            last = this.nodeSubtitles.lastElementChild;
            last.dataset.markdown = markdown;
            if ( this.onSubtitles && typeof this.onSubtitles === 'function' ) {
              this.onSubtitles(last);
            }
          }
        });
      } else {
        this.setValue(mt,target);
        changed = true;
      }
    }
    if ( changed ) this.render();

    if ( this.running ) requestAnimationFrame( this.animate.bind(this) );
  }

  /**
  * Reset all the visemes for lips.
  */
  resetLips() {
    Object.values(this.visemes).forEach( x => {
      this.morphs.forEach( y => y.morphTargetInfluences[y.morphTargetDictionary['viseme_'+x]] );
    });
  }

  /**
  * Audio is ready to be played.
  * @param {Object} event Audio event
  */
  ttsOnCanPlayThrough(event) {
    // Durations
    let d = 1000 * this.ttsAudio.duration; // Duration in ms
    if ( d > this.opt.ttsTrimEnd ) d = d - this.opt.ttsTrimEnd;
    const lastElement = this.ttsAudio.anim[ this.ttsAudio.anim.length-1 ];
    let t = lastElement.ts[ lastElement.ts.length-1 ] + 1;

    // Rescale and push to queue
    this.ttsAudio.anim.forEach( x => {
      for(let i=0; i<x.ts.length; i++) {
        x.ts[i] = performance.now() + (x.ts[i] * d/t) + this.opt.ttsTrimStart;
      }
      this.animQueue.push(x);
    });

    // Play
    this.ttsAudio.play();
  }

  /**
  * Audio has ended.
  * @param {Object} event Audio event
  */
  ttsOnEnd(event) {
    this.ttsSpeaking = false;
    this.startSpeaking();
  }

  /**
  * Audio error.
  * @param {Object} event Audio event
  */
  ttsOnError(event) {
    console.log(event);
    this.ttsSpeaking = false;
    this.startSpeaking();
  }

  /**
  * Convert the number string into Finnish words.
  * @param {string} x Number string
  * @return {string} The number in words in Finnish
  */
  numberToWords(x) {
    const w = [];
    const dg = ['nolla', 'yksi', 'kaksi', 'kolme', 'neljä', 'viisi', 'kuusi',
    'seitsemän', 'kahdeksan', 'yhdeksän', "kymmenen","yksitoista","kaksitoista",
    "kolmetoista","neljätoista","viisitoista","kuusitoista",'seitsemäntoista',
    'kahdeksantoista', 'yhdeksäntoista'];
    let n = parseFloat(x);
    if ( n === undefined ) return x;
    let p = (n,z,w0,w1,w2) => {
      if ( n < z ) return n;
      const d = Math.floor(n/z);
      w.push( w0 + ((d === 1) ? w1 : this.numberToWords(d.toString()) + w2) );
      return n - d * z;
    }
    if ( n < 0 ) {
      w.push('miinus ');
      n = Math.abs(n);
    }
    n = p(n,1000000000,' ','miljardi',' miljardia');
    n = p(n,1000000,' ','miljoona',' miljoonaa');
    n = p(n,1000,'', 'tuhat','tuhatta');
    n = p(n,100,' ','sata','sataa');
    if ( n > 20 ) n = p(n,10,'','','kymmentä');
    if ( n >= 1) {
      let d = Math.floor(n);
      w.push( dg[d] );
      n -= d;
    }
    if ( n >= 0 && parseFloat(x) < 1) w.push( 'nolla' );
    if ( n > 0 ) {
      let d = (n % 1).toFixed(1) * 10;
      if ( d > 0 ) w.push( ' pilkku ' + dg[d] );
    }
    return w.join('').trim();
  }


  /**
  * Filter text to include only speech and emojis.
  * @param {string} s String
  */
  speechFilter(s) {
    return s.replace('/[#_*\'\":;]/g','')
        .replaceAll('%',' prosenttia ')
        .replaceAll('€',' euroa ')
        .replaceAll('&',' ja ')
        .replaceAll('+',' plus ')
        .replace(/(\D)\1\1+/g, "$1$1") // max 2 repeating chars
        .replaceAll('  ',' ') // Only one repeating space
        .replace(/(\d)\,(\d)/g, '$1 pilkku $2') // Number separator
        .replace(/\d+/g, this.numberToWords.bind(this)) // Numbers to words
        .trim();
  }

  /**
  * Add text to the speech queue.
  * @param {string} s Text.
  * @param {Options} [opt=null] Text-specific options for TTS language, voice, rate and pitch, mood and mute
  * @param {Object} [nodeSubtitles=null] DOM element of the subtitles
  * @param {subtitlesfn} [onsubtitles=null] Callback when subtitles were added
  * @param {number[][]} [excludes=null] Array of [start, end] index arrays to not speak
  */
  speak(s, opt = null, nodeSubtitles = null, onsubtitles = null, excludes = null ) {
    opt = opt || {};

    // Classifiers
    const dividersSentence = /[!\.\?\n\p{Extended_Pictographic}]/ug;
    const dividersWord = /[ !\.\?\n\p{Extended_Pictographic}]/ug;
    const speakables = /[\p{L}\p{N},]/ug;
    const emojis = /[\p{Extended_Pictographic}]/ug;

    let t = 0; // time counter
    let markdownWord = ''; // markdown word
    let textWord = ''; // text-to-speech word
    let textSentence = ''; // text-to-speech sentence
    let lipsyncAnim = []; // lip-sync animation sequence
    let isFirst = true; // Text begins
    const letters = [...s];
    for( let i=0; i<letters.length; i++ ) {
      const isLast = i === (letters.length-1);

      // Add letter to spoken word
      if ( letters[i].match(speakables) ) {
        if ( !excludes || excludes.every( x => (i < x[0]) || (i > x[1]) ) ) {
          textWord += letters[i];
        }
      }

      // Add letter to subtitles
      if ( nodeSubtitles ) {
        markdownWord += letters[i];
      }

      // Add words to sentence and animations
      if ( letters[i].match(dividersWord) || isLast ) {

        // Add to text-to-speech sentence
        if ( textWord.length ) {
          textWord = this.speechFilter(textWord);
          textSentence += textWord;
        }

        // Push subtitles to animation queue
        if ( markdownWord.length ) {
          lipsyncAnim.push( {
            template: { name: 'subtitles' },
            ts: [t-0.2],
            vs: {
              subtitles: markdownWord
            },
            isFirst: isFirst
          });
          markdownWord = '';
          isFirst = false;
        }

        // Push visemes to animation queue
        if ( textWord.length ) {
          const chars = [...textWord];
          for( let j=0; j<chars.length; j++ ) {
            const viseme = this.visemes[chars[j].toLowerCase()];
            if ( viseme ) {
              lipsyncAnim.push( {
                template: { name: 'viseme' },
                ts: [ t-0.5, t+0.5, t+1.5 ],
                vs: {
                  ['viseme_'+viseme]: [null,(viseme === 'PP' || viseme === 'FF') ? 1 : 0.6,0]
                }
              });
              t += this.pauses[chars[j]] || 1;
            }
          }
          textWord = ' ';
        }
      }

      // Process sentences
      if ( letters[i].match(dividersSentence) || isLast ) {

        // Send sentence to Text-to-speech queue
        textSentence = textSentence.trim();
        if ( textSentence.length || (isLast && lipsyncAnim.length) ) {
          const o = {
            anim: lipsyncAnim
          };
          if ( opt.avatarMood ) o.mood = opt.avatarMood;
          if ( !opt.avatarMute ) o.text = textSentence;
          if ( nodeSubtitles ) o.nodeSubtitles = nodeSubtitles;
          if ( onsubtitles ) o.onSubtitles = onsubtitles;
          if ( opt.ttsLang ) o.lang = opt.ttsLang;
          if ( opt.ttsVoice ) o.voice = opt.ttsVoice;
          if ( opt.ttsRate ) o.rate = opt.ttsRate;
          if ( opt.ttsVoice ) o.pitch = opt.ttsPitch;
          if ( opt.ttsVolume ) o.volume = opt.ttsVolume;
          this.ttsQueue.push(o);

          // Reset sentence and animation sequence
          textSentence = '';
          lipsyncAnim = [];
          t = 0;
        }

        // Send emoji, if the divider was a known emoji
        if ( letters[i].match(emojis) ) {
          let emoji = this.animEmojis[letters[i]];
          if ( emoji && emoji.link ) emoji = this.animEmojis[emoji.link];
          if ( emoji ) {
            this.ttsQueue.push( { emoji: emoji } );
          }
        }

        this.ttsQueue.push( { break: 300 } );
      }

    }

    this.ttsQueue.push( { break: 1000 } );

    // Start speaking (if not already)
    this.startSpeaking();
  }

  /**
  * Take the next queue item from the speech queue, convert it to text, and
  * load the audio file.
  * @param {boolean} [force=false] If true, forces to proceed (e.g. after break)
  */
  async startSpeaking( force = false ) {
    if ( !this.avatar || !this.ttsAudio || (this.ttsSpeaking && !force) ) return;
    this.ttsSpeaking = true;
    if ( this.ttsQueue.length === 0 ) {
      this.ttsSpeaking = false;
      return;
    }
    let line = this.ttsQueue.shift();
    if ( line.emoji ) {
      // Only emoji
      let duration = line.emoji.dt.reduce((a,b) => a+b,0);
      this.animQueue.push( this.animFactory( line.emoji ) );
      setTimeout( this.startSpeaking.bind(this), duration/2, true );
    } else if ( line.break ) {
      // Break
      setTimeout( this.startSpeaking.bind(this), line.break, true );
    } else if ( line.text ) {
      // Spoken text
      try {
        const res = await fetch( this.opt.ttsEndpoint + (this.opt.ttsApikey ? "?key=" + this.opt.ttsApikey : ''), {
          method: "POST",
          headers: {
            "Content-Type": "application/json; charset=utf-8"
          },
          body: JSON.stringify({
            "input": {
              "text": line.text
            },
            "voice": {
              "languageCode": line.lang || this.opt.ttsLang,
              "name": line.voice || this.opt.ttsVoice
            },
            "audioConfig": {
              "audioEncoding": this.ttsAudioEncoding,
              "speakingRate": (line.rate || this.opt.ttsRate) + this.mood.speech.deltaRate,
              "pitch": (line.pitch || this.opt.ttsPitch) + this.mood.speech.deltaPitch,
              "volumeGainDb": (line.volume || this.opt.ttsVolume) + this.mood.speech.deltaVolume
            }
          })
        });

        const data = await res.json();

        if ( res.status === 200 && data && data.audioContent ) {
          this.ttsAudio.pause();
          this.ttsAudio.text = line.text;
          this.ttsAudio.anim = line.anim;
          this.ttsAudio.src = this.ttsAudioData + data.audioContent;
          this.nodeSubtitles = line.nodeSubtitles || null;
          this.onSubtitles = line.onSubtitles || null;
          this.resetLips();
          if ( line.mood ) this.setMood( line.mood );
          this.ttsAudio.load();
        } else {
          this.ttsSpeaking = false;
          this.startSpeaking();
        }
      } catch (error) {
        console.error("Error:", error);
        this.ttsSpeaking = false;
        this.startSpeaking();
      }
    } else if ( line.anim ) {
      // Only subtitles
      this.nodeSubtitles = line.nodeSubtitles || null;
      this.onSubtitles = line.onSubtitles || null;
      this.resetLips();
      if ( line.mood ) this.setMood( line.mood );
      line.anim.forEach( (x,i) => {
        for(let j=0; j<x.ts.length; j++) {
          x.ts[j] = performance.now() + 10 * i;
        }
        this.animQueue.push(x);
      });
      setTimeout( this.startSpeaking.bind(this), 10 * line.anim.length, true );
    } else {
      this.ttsSpeaking = false;
      this.startSpeaking();
    }
  }

  /**
  * Pause speaking.
  */
  pauseSpeaking() {
    if ( this.ttsAudio ) this.ttsAudio.pause();
    this.ttsSpeaking = false;
    this.animQueue = this.animQueue.filter( x  => x.template.name !== 'viseme' );
    if ( this.avatar ) {
      this.resetLips();
      this.render();
    }
  }

  /**
  * Stop speaking and clear the speech queue.
  */
  stopSpeaking() {
    if ( this.ttsAudio ) this.ttsAudio.pause();
    this.ttsQueue.length = 0;
    this.animQueue = this.animQueue.filter( x  => x.template.name !== 'viseme' );
    this.ttsSpeaking = false;
    if ( this.avatar ) {
      this.resetLips();
      this.render();
    }
  }

  /**
  * Turn head and eyes to look at the point (x,y).
  * @param {number} x X-coordinate
  * @param {number} y Y-coordinate
  * @param {number} t Time in milliseconds
  */
  lookAt(x,y,t) {
    const box = this.nodeAvatar.getBoundingClientRect();
    x = Math.min(box.right,Math.max(x,box.left));
    y = Math.min(box.bottom,Math.max(y,box.top));
    if ( t ) {
      const templateLookAt = {
        name: 'lookat',
        dt: [1000,t],
        vs: {
          eyesRotateY: [ this.convertRange(x,[box.left,box.right],[-0.6,0.6]) ],
          eyesRotateX: [ this.convertRange(y,[box.top,box.bottom],[-0.5,0.6]) ],
          headRotateY: [ this.convertRange(x,[box.left,box.right],[-0.3,0.3]) ],
          headRotateX: [ this.convertRange(y,[box.top,box.bottom],[-0.15,0.2]) ],
        }
      };
      this.animQueue.push( this.animFactory( templateLookAt ) );
    }
  }

  /**
  * Start animation cycle.
  */
  startAnimation() {
    if ( this.avatar && this.running === false ) {
      this.running = true;
      requestAnimationFrame( this.animate.bind(this) );
    }
  }

  /**
  * Stop animation cycle.
  */
  stopAnimation() {
    this.running = false;
  }

}

export { TalkingHead };
