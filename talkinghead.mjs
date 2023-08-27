import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/**
* @class Talking Head speaking Finnish
* @author Mika Suominen
*/
class TalkingHead {

  /**
  * Callback when the Avatar has been succesfully loaded
  * @callback successfn
  */

  /**
  * Callback when there was an error in loading the Avatar
  * @callback errorfn
  * @param {string} error Error message
  */

  /**
  * @constructor
  * @param {Object} nodeAvatar DOM element of the avatar
  * @param {Object} nodeSubtitles DOM element of the subtitles
  * @param {string} urlAvatar3D Avatar URL
  * @param {Object} [opt=null] Options
  * @param {successfn} [success=null] Callback when the Avatar has been succesfully loaded
  * @param {errorfn} [error=null] Callback when there was an error in initialization
  */
  constructor(nodeAvatar, nodeSubtitles, urlAvatar3D, opt = null, success = null, error = null) {
    this.nodeAvatar = nodeAvatar;
    this.nodeSubtitles = nodeSubtitles;
    opt = opt || {};
    this.opt = {
      gttsEndpoint: null,
      gttsApikey: null,
      gttsLang: "fi-FI",
      gttsVoice: "fi-FI-Standard-A",
      gttsRate: 0.85,
      gttsPitch: 0,
      gttsTrimStart: -100,
      gttsTrimEnd: 300,
      avatarRootObject: 'AvatarRoot',
      avatarMeshObject: 'Wolf3D_Avatar',
      avatarHeadObject: 'Head',
      avatarHideObjects: ['LeftHand','RightHand'],
      avatarOffset: 0.8,
      avatarMood: "neutral",
      avatarPixelRatio: 1,
      avatarRotateEnable: true,
      avatarPanEnable: false,
      avatarZoomEnable: false
    };
    Object.assign( this.opt, opt );

    // Animation templates for moods
    this.animMoods = {
      'neutral' : {
        baseline: { eyesLookDown: 0.1 },
        speech: { deltaRate: 0, deltaPitch: 0 },
        anims: [
          { name: 'head', delay: [0,1000], dt: [ [200,5000] ], vs: { headRotateX: [[-0.04,0.10]], headRotateY: [[-0.3,0.3]], headRotateZ: [[-0.08,0.08]] } },
          { name: 'eyes', delay: [200,5000], dt: [ [100,500],[100,5000,2] ], vs: { eyesRotateX: [[-0.6,0.6]], eyesRotateY: [[-0.2,0.6]] } },
          { name: 'blink', delay: [2000,10000], dt: [50,[100,300],100], vs: { eyeBlinkLeft: [1,1,0], eyeBlinkRight: [1,1,0] } },
          { name: 'mouth', delay: [1000,5000], dt: [ [100,500],[100,5000,2] ], vs : { mouthRollLower: [[0,0.3,2]], mouthRollUpper: [[0,0.3,2]], mouthStretchLeft: [[0,0.3]], mouthStretchRight: [[0,0.3]], mouthPucker: [[0,0.3]] } },
          { name: 'misc', delay: [100,5000], dt: [ [100,500],[100,5000,2] ], vs : { eyeSquintLeft: [[0,0.3,3]], eyeSquintRight: [[0,0.3,3]], browInnerUp: [[0,0.3]], browOuterUpLeft: [[0,0.3]], browOuterUpRight: [[0,0.3]] } }
        ]
      },
      'happy' : {
        baseline: { mouthSmile: 0.3, eyesLookDown: 0.1 },
        speech: { deltaRate: 0, deltaPitch: 0.1 },
        anims: [
          { name: 'head', dt: [ [1000,5000] ], vs: { headRotateX: [[-0.04,0.10]], headRotateY: [[-0.3,0.3]], headRotateZ: [[-0.08,0.08]] } },
          { name: 'eyes', delay: [100,5000], dt: [ [100,500],[100,5000,2] ], vs: { eyesRotateX: [[-0.6,0.6]], eyesRotateY: [[-0.2,0.6]] } },
          { name: 'blink', delay: [2000,10000], dt: [50,[100,300],100], vs: { eyeBlinkLeft: [1,1,0], eyeBlinkRight: [1,1,0] } },
          { name: 'mouth', delay: [1000,5000], dt: [ [100,500],[100,5000,2] ], vs : { mouthLeft: [[0,0.3,2]], mouthSmile: [[0,0.2,3]], mouthRollLower: [[0,0.3,2]], mouthRollUpper: [[0,0.3,2]], mouthStretchLeft: [[0,0.3]], mouthStretchRight: [[0,0.3]], mouthPucker: [[0,0.3]] } },
          { name: 'misc', delay: [100,5000], dt: [ [100,500],[100,5000,2] ], vs : { eyeSquintLeft: [[0,0.3,3]], eyeSquintRight: [[0,0.3,3]], browInnerUp: [[0,0.3]], browOuterUpLeft: [[0,0.3]], browOuterUpRight: [[0,0.3]] } }
        ]
      },
      'angry' : {
        baseline: { eyesLookDown: 0.1, browDownLeft: 0.7, browDownRight: 0.7, jawForward: 0.3, mouthFrownLeft: 0.8, mouthFrownRight: 0.8, mouthRollLower: 0.3, mouthShrugLower: 0.4 },
        speech: { deltaRate: -0.2, deltaPitch: 0.2 },
        anims: [
          { name: 'head', delay: [100,500], dt: [ [200,5000] ], vs: { headRotateX: [[-0.04,0.10]], headRotateY: [[-0.2,0.2]], headRotateZ: [[-0.08,0.08]] } },
          { name: 'eyes', delay: [100,5000], dt: [ [100,500],[100,5000,2] ], vs: { eyesRotateX: [[-0.6,0.6]], eyesRotateY: [[-0.2,0.6]] } },
          { name: 'blink', delay: [2000,10000], dt: [50,[100,300],100], vs: { eyeBlinkLeft: [1,1,0], eyeBlinkRight: [1,1,0] } },
          { name: 'mouth', delay: [1000,5000], dt: [ [100,500],[100,5000,2] ], vs : { mouthRollLower: [[0,0.3,2]], mouthRollUpper: [[0,0.3,2]], mouthStretchLeft: [[0,0.3]], mouthStretchRight: [[0,0.3]], mouthPucker: [[0,0.3]] } },
          { name: 'misc', delay: [100,5000], dt: [ [100,500],[100,5000,2] ], vs : { eyeSquintLeft: [[0,0.3,3]], eyeSquintRight: [[0,0.3,3]], browInnerUp: [[0,0.3]], browOuterUpLeft: [[0,0.3]], browOuterUpRight: [[0,0.3]] } }
        ]
      },
      'sad' : {
        baseline: { eyesLookDown: 0.2, browDownRight: 0.1, browInnerUp: 0.7, browOuterUpRight: 0.2, eyeSquintLeft: 0.8, eyeSquintRight: 0.8, mouthFrownLeft: 1, mouthFrownRight: 1, mouthLeft: 0.2, mouthPucker: 0.5, mouthRollLower: 0.2, mouthRollUpper: 0.2, mouthShrugLower: 0.2, mouthShrugUpper: 0.2, mouthStretchLeft: 0.5 },
        speech: { deltaRate: -0.2, deltaPitch: -0.2 },
        anims: [
          { name: 'head', delay: [100,500], dt: [ [200,5000] ], vs: { headRotateX: [[-0.04,0.10]], headRotateY: [[-0.2,0.2]], headRotateZ: [[-0.08,0.08]] } },
          { name: 'eyes', delay: [100,5000], dt: [ [100,500],[100,5000,2] ], vs: { eyesRotateX: [[-0.6,0.6]], eyesRotateY: [[-0.2,0.6]] } },
          { name: 'blink', delay: [2000,10000], dt: [50,[100,300],100], vs: { eyeBlinkLeft: [1,1,0], eyeBlinkRight: [1,1,0] } },
          { name: 'mouth', delay: [1000,5000], dt: [ [100,500],[100,5000,2] ], vs : { mouthRollLower: [[0,0.3,2]], mouthRollUpper: [[0,0.3,2]], mouthStretchLeft: [[0,0.3]], mouthStretchRight: [[0,0.3]], mouthPucker: [[0,0.3]] } },
          { name: 'misc', delay: [100,5000], dt: [ [100,500],[100,5000,2] ], vs : { eyeSquintLeft: [[0,0.3,3]], eyeSquintRight: [[0,0.3,3]], browInnerUp: [[0,0.3]], browOuterUpLeft: [[0,0.3]], browOuterUpRight: [[0,0.3]] } }
        ]
      },
      'fear' : {
        baseline: { browInnerUp: 0.8, eyeSquintLeft: 0.5, eyeSquintRight: 0.5, eyeWideLeft: 0.7, eyeWideRight: 0.7, mouthClose: 0.1, mouthFunnel: 0.3, mouthShrugLower: 0.6, mouthShrugUpper: 0.6 },
        speech: { deltaRate: -0.2, deltaPitch: 0 },
        anims: [
          { name: 'head', delay: [100,500], dt: [ [200,5000] ], vs: { headRotateX: [[-0.06,0.12]], headRotateY: [[-0.5,0.5]], headRotateZ: [[-0.1,0.1]] } },
          { name: 'eyes', delay: [100,2000], dt: [ [100,500],[100,5000,2] ], vs: { eyesRotateX: [[-1,1]], eyesRotateY: [[-0.2,0.6]] } },
          { name: 'blink', delay: [4000,10000], dt: [50,[100,300],100], vs: { eyeBlinkLeft: [1,1,0], eyeBlinkRight: [1,1,0] } },
          { name: 'mouth', delay: [1000,5000], dt: [ [100,500],[100,5000,2] ], vs : { mouthRollLower: [[0,0.3,2]], mouthRollUpper: [[0,0.3,2]], mouthStretchLeft: [[0,0.3]], mouthStretchRight: [[0,0.3]], mouthPucker: [[0,0.3]] } },
          { name: 'misc', delay: [100,5000], dt: [ [100,500],[100,5000,2] ], vs : { eyeSquintLeft: [[0,0.3,3]], eyeSquintRight: [[0,0.3,3]], browInnerUp: [[0,0.3]], browOuterUpLeft: [[0,0.3]], browOuterUpRight: [[0,0.3]] } }
        ]
      },
      'disgust' : {
        baseline: { browDownLeft: 0.9, browDownRight: 0.1, browInnerUp: 0.3, eyeSquintLeft: 1, eyeSquintRight: 1, eyeWideLeft: 0.5, eyeWideRight: 0.5, eyesRotateX: 0.05, mouthLeft: 0.4, mouthPressLeft: 0.3, mouthRollLower: 0.4, mouthShrugLower: 0.4, mouthShrugUpper: 1, mouthUpperUpLeft: 0.3, noseSneerLeft: 1, noseSneerRight: 0.7 },
        speech: { deltaRate: -0.2, deltaPitch: 0 },
        anims: [
          { name: 'head', delay: [100,500], dt: [ [200,5000] ], vs: { headRotateX: [[-0.04,0.10]], headRotateY: [[-0.2,0.2]], headRotateZ: [[-0.08,0.08]] } },
          { name: 'eyes', delay: [100,5000], dt: [ [100,500],[100,5000,2] ], vs: { eyesRotateX: [[-0.6,0.6]], eyesRotateY: [[-0.2,0.6]] } },
          { name: 'blink', delay: [2000,10000], dt: [50,[100,300],100], vs: { eyeBlinkLeft: [1,1,0], eyeBlinkRight: [1,1,0] } },
          { name: 'mouth', delay: [1000,5000], dt: [ [100,500],[100,5000,2] ], vs : { mouthRollLower: [[0,0.3,2]], mouthRollUpper: [[0,0.3,2]], mouthStretchLeft: [[0,0.3]], mouthStretchRight: [[0,0.3]], mouthPucker: [[0,0.3]] } },
          { name: 'misc', delay: [100,5000], dt: [ [100,500],[100,5000,2] ], vs : { eyeSquintLeft: [[0,0.3,3]], eyeSquintRight: [[0,0.3,3]], browInnerUp: [[0,0.3]], browOuterUpLeft: [[0,0.3]], browOuterUpRight: [[0,0.3]] } }
        ]
      },
      'love' : {
        baseline: { browInnerUp: 0.5, browOuterUpLeft: 0.2, browOuterUpRight: 0.2, mouthSmile: 0.2, eyeBlinkLeft: 0.6, eyeBlinkRight: 0.6, eyeWideLeft: 0.8, eyeWideRight: 0.8, headRotateX: 0.1, mouthDimpleLeft: 0.1, mouthDimpleRight: 0.1, mouthPressLeft: 0.2, mouthShrugUpper: 0.2, mouthUpperUpLeft: 0.1, mouthUpperUpRight: 0.1 },
        speech: { deltaRate: -0.1, deltaPitch: -0.7 },
        anims: [
          { name: 'head', dt: [ [1000,5000] ], vs: { headRotateX: [[-0.04,0.10]], headRotateY: [[-0.3,0.3]], headRotateZ: [[-0.08,0.08]] } },
          { name: 'eyes', delay: [300,5000], dt: [ [100,500],[100,5000,2] ], vs: { eyesRotateX: [[-0.6,0.6]], eyesRotateY: [[-0.2,0.6]] } },
          { name: 'blink', delay: [2000,10000], dt: [50,[200,300],100], vs: { eyeBlinkLeft: [0.6,0.6,0], eyeBlinkRight: [0.6,0.6,0] } },
          { name: 'mouth', delay: [1000,5000], dt: [ [100,500],[100,5000,2] ], vs : { mouthLeft: [[0,0.3,2]], mouthRollLower: [[0,0.3,2]], mouthRollUpper: [[0,0.3,2]], mouthStretchLeft: [[0,0.3]], mouthStretchRight: [[0,0.3]], mouthPucker: [[0,0.3]] } },
          { name: 'misc', delay: [100,5000], dt: [ [500,1000],[1000,5000,2] ], vs : { eyeSquintLeft: [[0,0.3,3]], eyeSquintRight: [[0,0.3,3]], browInnerUp: [[0.3,0.6]], browOuterUpLeft: [[0.1,0.3]], browOuterUpRight: [[0.1,0.3]] } }
        ]
      },
      'sleep' : {
        baseline: { eyesClosed: 1, eyeBlinkLeft: 1, eyeBlinkRight: 1 },
        speech: { deltaRate: 0, deltaPitch: -0.2 },
        anims: [
          { name: 'head', delay: [1000,5000], dt: [ [2000,10000] ], vs: { headRotateX: [[0,0.4]], headRotateY: [[-0.1,0.1]], headRotateZ: [[-0.04,0.04]] } },
        ]
      }
    };
    this.mood = this.animMoods[ this.opt.avatarMood ] || this.animMoods["neutral"];

    // Animation templates for emojis
    this.animEmojis = {

      '😐': { mood: 'neutral', dt: [300,2000], vs: { browInnerUp: [0.4], eyeWideLeft: [0.7], eyeWideRight: [0.7], mouthPressLeft: [0.6], mouthPressRight: [0.6], mouthRollLower: [0.3], mouthStretchLeft: [1], mouthStretchRight: [1] } },
      '😶': { link:  '😐' },
      '😏': { mood: 'happy', dt: [300,2000], vs: { browDownRight: [0.1], browInnerUp: [0.7], browOuterUpRight: [0.2], eyeLookInRight: [0.7], eyeLookOutLeft: [0.7], eyeSquintLeft: [1], eyeSquintRight: [0.8], eyesRotateX: [0.7], mouthLeft: [0.4], mouthPucker: [0.4], mouthShrugLower: [0.3], mouthShrugUpper: [0.2], mouthSmile: [0.2], mouthSmileLeft: [0.4], mouthSmileRight: [0.2], mouthStretchLeft: [0.5], mouthUpperUpLeft: [0.6], noseSneerLeft: [0.7] } },
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
      '😉': { mood: 'happy', dt: [500,200,200], vs: { mouthSmile: [0.5], mouthOpen: [0.2], mouthSmileLeft: [0,0.5,0], eyeBlinkLeft: [0,0.7,0], browDownLeft: [0,0.7,0], cheekSquintLeft: [0,0.7,0], eyeSquintLeft: [0,1,0], eyesClosed: [0] } },

      '😭': { mood: 'sad', dt: [1000,1000], vs: { browInnerUp: [1], eyeSquintLeft: [1], eyeSquintRight: [1], eyesClosed: [0.1], jawOpen: [0], mouthFrownLeft: [1], mouthFrownRight: [1], mouthOpen: [0.5], mouthPucker: [0.5], mouthUpperUpLeft: [0.6], mouthUpperUpRight: [0.6] } },
      '🥺': { mood: 'sad', dt: [1000,1000], vs: { browDownLeft: [0.2], browDownRight: [0.2], browInnerUp: [1], eyeWideLeft: [0.9], eyeWideRight: [0.9], eyesClosed: [0.1], mouthClose: [0.2], mouthFrownLeft: [1], mouthFrownRight: [1], mouthPressLeft: [0.4], mouthPressRight: [0.4], mouthPucker: [1], mouthRollLower: [0.6], mouthRollUpper: [0.2], mouthUpperUpLeft: [0.8], mouthUpperUpRight: [0.8] } },
      '😞': { mood: 'sad', dt: [1000,1000], vs: { browInnerUp: [0.7], eyeSquintLeft: [1], eyeSquintRight: [1], eyesClosed: [0.5], headRotateX: [0.3], mouthClose: [0.2], mouthFrownLeft: [1], mouthFrownRight: [1], mouthPucker: [1], mouthRollLower: [1], mouthShrugLower: [0.2], mouthUpperUpLeft: [0.8], mouthUpperUpRight: [0.8] } },
      '😔': { mood: 'sad', dt: [1000,1000], vs: { browInnerUp: [1], eyeSquintLeft: [1], eyeSquintRight: [1], eyesClosed: [0.5], headRotateX: [0.3], mouthClose: [0.2], mouthFrownLeft: [1], mouthFrownRight: [1], mouthPressLeft: [0.4], mouthPressRight: [0.4], mouthPucker: [1], mouthRollLower: [0.6], mouthRollUpper: [0.2], mouthUpperUpLeft: [0.8], mouthUpperUpRight: [0.8] } },
      '😳': { mood: 'sad', dt: [1000,1000], vs: { browInnerUp: [1], eyeWideLeft: [0.5], eyeWideRight: [0.5], eyesRotateX: [0.05], eyesRotateY: [0.05], mouthClose: [0.2], mouthFunnel: [0.5], mouthPucker: [0.4], mouthRollLower: [0.4], mouthRollUpper: [0.4] } },
      '☹️': { mood: 'sad', dt: [500,1500], vs: { mouthFrownLeft: [1], mouthFrownRight: [1], mouthPucker: [0.1], mouthRollLower: [0.8] } },

      '😚': { mood: 'love', dt: [500,1000,1000], vs: { browInnerUp: [0.6], eyeBlinkLeft: [1], eyeBlinkRight: [1], eyeSquintLeft: [1], eyeSquintRight: [1], mouthPucker: [0,0.5], noseSneerLeft: [0,0.7], noseSneerRight: [0,0.7], viseme_U: [0,1] } },
      '😘': { mood: 'love', dt: [500,1000,1000,1000], vs: { browInnerUp: [0.6], eyeBlinkLeft: [0,0,1,0], eyeBlinkRight: [0], eyeSquintLeft: [1], eyeSquintRight: [1], mouthPucker: [0,0.5], noseSneerLeft: [0,0.7], noseSneerRight: [0.7], viseme_U: [0,1] } },
      '🥰': { mood: 'love', dt: [1000,1000], vs: { browInnerUp: [0.6], eyeSquintLeft: [1], eyeSquintRight: [1], mouthSmile: [0.7], noseSneerLeft: [0.7], noseSneerRight: [0.7] } },
      '😍': { mood: 'love', dt: [1000,1000], vs: { browInnerUp: [0.6], jawOpen: [0.1], mouthDimpleLeft: [0.2], mouthDimpleRight: [0.2], mouthOpen: [0.3], mouthPressLeft: [0.3], mouthPressRight: [0.3], mouthRollLower: [0.4], mouthShrugUpper: [0.4], mouthSmile: [0.7], mouthUpperUpLeft: [0.3], mouthUpperUpRight: [0.3], noseSneerLeft: [0.4], noseSneerRight: [0.4] } },
      '🤩': { link:  '😍' },

      '😡': { mood: 'angry', dt: [1000,1500], vs: { browDownLeft: [1], browDownRight: [1], eyesLookUp: [0.2], jawForward: [0.3], mouthFrownLeft: [1], mouthFrownRight: [1], headRotateX: [0.15] } },
      '😠': { mood: 'angry', dt: [1000,1500], vs: { browDownLeft: [1], browDownRight: [1], eyesLookUp: [0.2], jawForward: [0.3], mouthFrownLeft: [1], mouthFrownRight: [1], headRotateX: [0.15] } },
      '🤬': { link:  '😠' },
      '😒': { mood: 'angry', dt: [1000,1000], vs: { browDownRight: [0.1], browInnerUp: [0.7], browOuterUpRight: [0.2], eyeLookInRight: [0.7], eyeLookOutLeft: [0.7], eyeSquintLeft: [1], eyeSquintRight: [0.8], eyesRotateX: [0.7], mouthFrownLeft: [1], mouthFrownRight: [1], mouthLeft: [0.2], mouthPucker: [0.5], mouthRollLower: [0.2], mouthRollUpper: [0.2], mouthShrugLower: [0.2], mouthShrugUpper: [0.2], mouthStretchLeft: [0.5] } },

      '😱': { mood: 'fear', dt: [500,1500], vs: { browInnerUp: [0.8], eyeWideLeft: [0.5], eyeWideRight: [0.5], jawOpen: [0.7], mouthFunnel: [0.5] } },
      '😬': { dt: [500,1500], vs: { browDownLeft: [1], browDownRight: [1], browInnerUp: [1], mouthDimpleLeft: [0.5], mouthDimpleRight: [0.5], mouthLowerDownLeft: [1], mouthLowerDownRight: [1], mouthPressLeft: [0.4], mouthPressRight: [0.4], mouthPucker: [0.5], mouthSmile: [0.1], mouthSmileLeft: [0.2], mouthSmileRight: [0.2], mouthStretchLeft: [1], mouthStretchRight: [1], mouthUpperUpLeft: [1], mouthUpperUpRight: [1] } },
      '🙄': { dt: [500,1500], vs: { browInnerUp: [0.8], eyeWideLeft: [1], eyeWideRight: [1], eyesRotateY: [-0.8], headRotateX: [0.15], mouthPucker: [0.5], mouthRollLower: [0.6], mouthRollUpper: [0.5], mouthShrugLower: [0], mouthSmile: [0] } },
      '🤔': { dt: [500,1500], vs: { browDownLeft: [1], browOuterUpRight: [1], eyeSquintLeft: [0.6], headRotateY: [-0.2], headRotateZ: [-0.1], mouthFrownLeft: [0.7], mouthFrownRight: [0.7], mouthLowerDownLeft: [0.3], mouthPressRight: [0.4], mouthPucker: [0.1], mouthRight: [0.5], mouthRollLower: [0.5], mouthRollUpper: [0.2] } },
      '👀': { dt: [500,1500], vs: { eyesRotateX: [-0.8] } },

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
    if ( this.opt.gttsEndpoint ) {
      this.gttsAudio = new Audio();
      if (this.gttsAudio.canPlayType("audio/ogg")) {
        this.gttsAudioEncoding = "OGG-OPUS";
        this.gttsAudioData = "data:audio/ogg;base64,";
      } else if (this.gttsAudio.canPlayType("audio/mp3")) {
        this.gttsAudioEncoding = "MP3";
        this.gttsAudioData = "data:audio/mp3;base64,";
      } else {
        const msg = "There was no support for either OGG or MP3 audio.";
        console.error(msg);
        if ( error && typeof error === 'function' ) error(msg);
        throw new Error(msg);
      }
      this.gttsAudio.oncanplaythrough = this.gttsOnCanPlayThrough.bind(this);
      this.gttsAudio.onended = this.gttsOnEnd.bind(this);
      this.gttsAudio.onerror = this.gttsOnError.bind(this);
    } else {
      const msg = "You must provide some Google-compliant Text-To-Speech Endpoint.";
      console.error(msg);
      if ( error && typeof error === 'function' ) error(msg);
      throw new Error(msg);
    }
    this.gttsQueue = [];
    this.gttsSpeaking = false;

    // Setup 3D Animation
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio( this.opt.avatarPixelRatio * window.devicePixelRatio );
    this.renderer.setSize(this.nodeAvatar.clientWidth, this.nodeAvatar.clientHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.useLegacyLights = false;
    this.renderer.shadowMap.enabled = false;
    this.nodeAvatar.appendChild( this.renderer.domElement );
    this.camera = new THREE.PerspectiveCamera( 10, 1, 1, 10 );
    this.scene = new THREE.Scene();
    const pmremGenerator = new THREE.PMREMGenerator( this.renderer );
    pmremGenerator.compileEquirectangularShader();
    this.scene.environment = pmremGenerator.fromScene( new RoomEnvironment() ).texture;
    new ResizeObserver(this.onResize.bind(this)).observe(this.nodeAvatar);
    this.controls = new OrbitControls( this.camera, this.renderer.domElement );
    this.controls.enableZoom = this.opt.avatarZoomEnable;
    this.controls.enableRotate = this.opt.avatarRotateEnable;
    this.controls.enablePan = this.opt.avatarPanEnable;
    this.controls.minDistance = 2;
    this.controls.maxDistance = 5;
    this.controls.update();

    // Load 3D Avatar
    this.loadModel(urlAvatar3D,success,error);
  }

  /**
  * Clear 3D object.
  * @param {Object} obj Object
  */
  clearThree(obj){
    while(obj.children.length > 0){
      this.clearThree(obj.children[0]);
      obj.remove(obj.children[0]);
    }
    if(obj.geometry) obj.geometry.dispose();

    if(obj.material){
      //in case of map, bumpMap, normalMap, envMap ...
      Object.keys(obj.material).forEach(prop => {
        if(!obj.material[prop])
        return;
        if(obj.material[prop] !== null && typeof obj.material[prop].dispose === 'function')
        obj.material[prop].dispose();
      })
      obj.material.dispose();
    }
  }

  /**
  * Loader for 3D avatar model.
  * @param {string} url URL to GLTF/GLB file.
  * @param {successfn} [success=null] Callback when the Avatar has been succesfully loaded
  * @param {errorfn} [error=null] Callback when there was an error in initialization
  */
  loadModel(url,success=null,error=null) {
    this.stopAnimation();
    const loader = new GLTFLoader();
    loader.load(url, (gltf) => {

      // Clear previous scene, if avatar was previously loaded
      if ( this.avatar ) {
        this.clearThree( this.scene );
      }

      // Add avatar to the scene
      this.avatar = gltf.scene.getObjectByName(this.opt.avatarRootObject);
      if ( !this.avatar ) {
        const msg = "Avatar root not found.";
        console.error(msg);
        if ( error && typeof error === 'function' ) error(msg);
        throw new Error(msg);
      }
      this.mesh = this.avatar.getObjectByName(this.opt.avatarMeshObject);
      if ( !this.mesh ) {
        const msg = "Avatar Mesh not found.";
        console.error(msg);
        if ( error && typeof error === 'function' ) error(msg);
        throw new Error(msg);
      }
      this.head = this.avatar.getObjectByName(this.opt.avatarHeadObject);
      if ( !this.avatar ) {
        const msg = "Avatar head not found.";
        console.error(msg);
        if ( error && typeof error === 'function' ) error(msg);
        throw new Error(msg);
      }
      this.avatar.position.set(0, -0.6, 0);
      this.scene.add(this.avatar);

      // Hide objects
      this.opt.avatarHideObjects.forEach( name => {
        const o = this.avatar.getObjectByName(name);
        if ( o ) o.position.set();
      });

      // Add lighting
      const light = new THREE.SpotLight( 0x8888FF, 2 );
      light.castShadow = true
      light.position.set(-3, 3, -0.5).normalize();
      light.target = this.avatar;
      this.scene.add( light );

      // Camera helper
      // const helper = new THREE.CameraHelper( light.shadow.camera );
      // this.scene.add( helper );

      // Fit avatar to screen
      this.controls.reset();
      this.fitToObject(this.avatar);

      // Start animations
      this.setMood( this.opt.avatarMood );
      this.startAnimation();

      // Callback
      if ( success && typeof success === 'function' ) success();
    },
    null,
    (msg) => {
      console.error(msg);
      if ( error && typeof error === 'function' ) error(msg);
      throw new Error(msg);
    });
  }

  /**
  * Fit 3D object to the view.
  * @param {Object} object 3D object.
  */
  fitToObject(object) {
    const offset = this.opt.avatarOffset;
    const boundingBox = new THREE.Box3();
    boundingBox.setFromObject( object );
    var size = new THREE.Vector3();
    boundingBox.getSize(size);
    const fov = this.camera.fov * ( Math.PI / 180 );
    let cameraZ = offset * ( size.z / 2 + Math.abs( size.y / 2 / Math.tan( fov / 2 ) ));
    this.camera.position.set( 0, 0, cameraZ );
    const minZ = boundingBox.min.z;
    const cameraToFarEdge = ( minZ < 0 ) ? -minZ + cameraZ : cameraZ - minZ;
    this.camera.far = cameraToFarEdge * 3;
    this.camera.updateProjectionMatrix();
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
      return this.head.rotation.x;
    } else if ( mt === 'headRotateY' ) {
      return this.head.rotation.y;
    } else if ( mt === 'headRotateZ' ) {
      return this.head.rotation.z;
    } else {
      return this.mesh.morphTargetInfluences[this.mesh.morphTargetDictionary[mt]];
    }
  }

  /**
  * Set morph target value.
  * @param {string} mt Morph target
  * @param {number} v Value
  */
  setValue(mt,v) {
    if ( mt === 'headRotateX' ) {
      this.head.rotation.x = v;
      this.avatar.rotation.x = v/2;
      this.avatar.position.z = v;
    } else if ( mt === 'headRotateY' ) {
      this.head.rotation.y = v;
      this.avatar.rotation.y = v/2;
      this.avatar.position.x = v/12;
    } else if ( mt === 'headRotateZ' ) {
      this.head.rotation.z = v;
      this.avatar.rotation.z = v/6;
    } else {
      this.mesh.morphTargetInfluences[this.mesh.morphTargetDictionary[mt]] = v;
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
  * Set mood.
  * @param {string} s Mood.
  */
  setMood(s) {
    s = (s || '').trim().toLowerCase();
    if ( !this.animMoods.hasOwnProperty(s) ) throw new Error("Unknown mood.");
    this.mood = this.animMoods[s];

    // Reset morph target baseline to 0
    for( let mt of Object.keys(this.mesh.morphTargetDictionary) ) {
      this.setBaselineValue( mt, this.mood.baseline.hasOwnProperty(mt) ? this.mood.baseline[mt] : 0 );
    }

    // Quit current loops
    this.animQueue.forEach( x => {
      if ( x.hasOwnProperty('loop') ) delete x.loop;
    });

    // Set animations
    this.mood.anims.forEach( x => {
      this.animQueue.push( this.animFactory( x, -1 ) );
    });

  }


  /**
  * Get morph target names.
  * @return {string[]} Morph target names.
  */
  getMorphTargetNames() {
    return [ 'headRotateX', 'headRotateY', 'headRotateZ', 'eyesRotateX', 'eyesRotateY',
    ...Object.keys(this.mesh.morphTargetDictionary)].sort();
  }

  /**
  * Get baseline value for the morph target.
  * @param {string} mt Morph target name
  * @return {number} Value, undefined if not in baseline
  */
  getBaselineValue( mt ) {
    if ( mt === 'eyesRotateX' ) {
      const ll = this.getBaselineValue('eyeLookOutLeft');
      if ( ll === undefined ) return undefined;
      const lr = this.getBaselineValue('eyeLookInLeft');
      if ( lr === undefined ) return undefined;
      const rl = this.getBaselineValue('eyeLookOurRight');
      if ( rl === undefined ) return undefined;
      const rr = this.getBaselineValue('eyeLookInRight');
      if ( rr === undefined ) return undefined;
      return ll - lr;
    } else if ( mt === 'eyesRotateY' ) {
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
    if ( mt === 'eyesRotateX' ) {
      this.setBaselineValue('eyeLookOutLeft', (v === null) ? null : (v>0 ? v : 0) );
      this.setBaselineValue('eyeLookInLeft', (v === null) ? null : (v>0 ? 0 : -v) );
      this.setBaselineValue('eyeLookOutRight', (v === null) ? null : (v>0 ? 0 : -v) );
      this.setBaselineValue('eyeLookInRight', (v === null) ? null : (v>0 ? v : 0) );
    } else if ( mt === 'eyesRotateY' ) {
      this.setBaselineValue('eyesLookDown', (v === null) ? null : (v>0 ? v : 0) );
      this.setBaselineValue('eyesLookUp', (v === null) ? null : (v>0 ? 0 : -v) );
    } else {
      if ( this.mesh.morphTargetDictionary.hasOwnProperty(mt) ) {
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
    if ( mt === 'eyesRotateX' ) {
      const ll = this.getFixedValue('eyeLookOutLeft');
      if ( ll === undefined ) return undefined;
      const lr = this.getFixedValue('eyeLookInLeft');
      if ( lr === undefined ) return undefined;
      const rl = this.getFixedValue('eyeLookOutRight');
      if ( rl === undefined ) return undefined;
      const rr = this.getFixedValue('eyeLookInRight');
      if ( rr === undefined ) return undefined;
      return ll - lr;
    } else if ( mt === 'eyesRotateY' ) {
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
    if ( mt === 'eyesRotateX' ) {
      this.setFixedValue('eyeLookOutLeft', (v === null) ? null : (v>0 ? v : 0 ) );
      this.setFixedValue('eyeLookInLeft', (v === null) ? null : (v>0 ? 0 : -v ) );
      this.setFixedValue('eyeLookOutRight', (v === null) ? null : (v>0 ? 0 : -v ) );
      this.setFixedValue('eyeLookInRight', (v === null) ? null : (v>0 ? v : 0 ) );
    } else if ( mt === 'eyesRotateY' ) {
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

      if ( mt === 'eyesRotateX' ) {
        o.vs['eyeLookOutLeft'] = [null, ...v.map( x => (x>0) ? x : 0 ) ];
        o.vs['eyeLookInLeft'] = [null, ...v.map( x => (x>0) ? 0 : -x ) ];
        o.vs['eyeLookOutRight'] = [null, ...v.map( x => (x>0) ? 0 : -x ) ];
        o.vs['eyeLookInRight'] = [null, ...v.map( x => (x>0) ? x : 0 ) ];
      } else if ( mt === 'eyesRotateY' ) {
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
    for( let i=0; i<6; i++) r += Math.random();
    return start + Math.pow(r/6,skew) * (end - start);
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
    const newanim = [];
    for( let i = 0; i < this.animQueue.length; i++ ) {
      const x = this.animQueue[i];
      if ( t < x.ts[0] ) {
        newanim.push( x );
      } else {
        for( let [mt,vs] of Object.entries(x.vs) ) {
          if ( mt === 'subtitles' ) {
            o[mt] = (o.hasOwnProperty(mt) ? o[mt] + vs : vs);
            delete x.vs[mt];
          } else {
            if ( vs[0] === null ) vs[0] = this.getValue(mt);
            o[mt] = this.valueAnimationSeq( x.ts, vs, t, this.easing );
            if ( this.animBaseline.hasOwnProperty(mt) ) this.animBaseline[mt].t0 = undefined;
            for( let j=0; j<newanim.length; j++ ) {
              if ( newanim[j].vs.hasOwnProperty(mt) ) delete newanim[j].vs[mt];
            }
          }
        }
        if ( t >= x.ts[x.ts.length-1] ) {
          if ( x.hasOwnProperty('mood') ) this.setMood(x.mood);
          if ( x.loop ) {
            let restrain = ( this.gttsSpeaking && (x.template.name === 'head' || x.template.name === 'eyes') ) ? 4 : 1;
            newanim.push( this.animFactory( x.template, (x.loop > 0 ? x.loop - 1 : x.loop), 1, 1/restrain ) );
          }
        } else {
          newanim.push( x );
        }
      }
    }
    this.animQueue = newanim;

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
        if ( this.nodeSubtitles ) {
          this.nodeSubtitles.textContent += target;
          this.nodeSubtitles.parentNode.scrollTop = this.nodeSubtitles.parentNode.scrollHeight;
        }
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
    if ( this.mesh ) {
      const md = this.mesh.morphTargetDictionary;
      const mi = this.mesh.morphTargetInfluences;
      Object.values(this.visemes).forEach( x => mi[md['viseme_'+x]] = 0 );
    }
  }

  /**
  * Audio is ready to be played.
  * @param {Object} event Audio event
  */
  gttsOnCanPlayThrough(event) {
    let d = 1000 * this.gttsAudio.duration; // Duration in ms
    if ( d > this.opt.gttsTrimEnd ) d = d - this.opt.gttsTrimEnd;
    let t = 0;
    const os = [];
    const letters = [...this.gttsAudio.text];
    for( let i=0; i<letters.length; i++ ) {
      const viseme = this.visemes[letters[i].toLowerCase()];
      const o = { template: { name: 'viseme' }, ts: [t-0.2], vs: {} };
      if ( viseme ) {
        o.ts = [ t-0.2, t+0.4, t+1.5 ];
        o.vs['viseme_'+viseme] = [null,0.6,0];
        t += this.pauses[letters[i]] || 1;
      }
      o.vs['subtitles'] = letters[i] + (i===(letters.length-1) ? ' ' : '');
      os.push( o );
    }

    // Reset subtitles
    if ( this.nodeSubtitles ) {
      this.nodeSubtitles.textContent = this.nodeSubtitles.textContent.split('\r\n').slice(-2).join('\r\n');
    }

    // Rescale
    os.forEach( x => {
      for(let i=0; i<x.ts.length; i++) {
        x.ts[i] = performance.now() + (x.ts[i] * d/t) + this.opt.gttsTrimStart;
      }
      this.animQueue.push(x);
    });

    // Play
    this.resetLips();
    this.gttsAudio.play();
  }

  /**
  * Audio has ended.
  * @param {Object} event Audio event
  */
  gttsOnEnd(event) {
    this.gttsSpeaking = false;
    this.startSpeaking();
  }

  /**
  * Audio error.
  * @param {Object} event Audio event
  */
  gttsOnError(event) {
    console.log(event);
    this.gttsSpeaking = false;
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
    return s.replace(/\s*\(.*?\)\s*/g, '') // remove brackets /w content
    .replace(/\s*\[.*?\]\s*/g, '') // remove square brackets /w content
    .replace('/[#_*\'\":;]/g','')
    .replaceAll('%',' prosenttia ')
    .replaceAll('€',' euroa ')
    .replaceAll('&',' ja ')
    .replaceAll('+',' plus ')
    .replace(/(\D)\1\1+/g, "$1$1") // max 2 repeating chars
    .replaceAll('  ',' ') // Only one repeating space
    .replace(/(\d)\,(\d)/g, '$1 pilkku $2') // Number separator
    .replace(/\d+/g, this.numberToWords.bind(this)); // Numbers to words
  }

  /**
  * Add text to the speech queue.
  * @param {string} s Text.
  * @param {Options} [opt=null] Text-specific options for TTS language, voice, rate and pitch.
  */
  // TODO: Limit silence to one.
  speak(s, opt = null) {
    s = this.speechFilter(s);
    opt = opt || {};

    // Split into sentences
    const regex = /[!\.\?\n\p{Extended_Pictographic}]/;
    const regexMatch = new RegExp(regex,'ug');
    const regexSplit = new RegExp(regex,'u');
    const m = s.match(regexMatch) || [];
    let firstSentence = true;
    s.split(regexSplit).forEach( (sentence,i) => {
      sentence = sentence.trim();
      if ( sentence.length ) {
        const pre = ( firstSentence ? '\r\n' : '' );
        const post = (m[i] && '!.?'.indexOf(m[i]) !== -1) ? m[i] : '';
        const o = {
          text: pre + sentence + post,
        };
        if ( opt.gttsLang ) o.lang = opt.gttsLang;
        if ( opt.gttsVoice ) o.voice = opt.gttsVoice;
        if ( opt.gttsRate ) o.rate = opt.gttsRate;
        if ( opt.gttsVoice ) o.pitch = opt.gttsPitch;
        this.gttsQueue.push(o);
        firstSentence = false;
      }
      let emoji = this.animEmojis[m[i]];
      if ( emoji && emoji.link ) emoji = this.animEmojis[emoji.link];
      if ( emoji ) {
        this.gttsQueue.push( { emoji: emoji } );
      }
      this.gttsQueue.push( { break: 300 } );
    });
    this.startSpeaking();
  }

  /**
  * Take the next queue item from the speech queue, convert it to text, and
  * load the audio file.
  * @param {boolean} [force=false] If true, forces to proceed (e.g. after break)
  */
  async startSpeaking( force = false ) {
    if ( !this.avatar || !this.gttsAudio || (this.gttsSpeaking && !force) ) return;
    this.gttsSpeaking = true;
    if ( this.gttsQueue.length === 0 ) {
      this.gttsSpeaking = false;
      return;
    }
    let line = this.gttsQueue.shift();
    if ( line.emoji ) {
      this.animQueue.push( this.animFactory( line.emoji ) );
    }
    if ( line.break ) {
      setTimeout( this.startSpeaking.bind(this), line.break, true );
    } else if ( line.text ) {
      try {
        const res = await fetch( this.opt.gttsEndpoint + (this.opt.gttsApikey ? "?key=" + this.opt.gttsApikey : ''), {
          method: "POST",
          headers: {
            "Content-Type": "application/json; charset=utf-8"
          },
          body: JSON.stringify({
            "input": {
              "text": line.text
            },
            "voice": {
              "languageCode": line.lang || this.opt.gttsLang,
              "name": line.voice || this.opt.gttsVoice
            },
            "audioConfig": {
              "audioEncoding": this.gttsAudioEncoding,
              "speakingRate": (line.rate || this.opt.gttsRate) + this.mood.speech.deltaRate,
              "pitch": (line.pitch || this.opt.gttsPitch) + this.mood.speech.deltaPitch
            }
          })
        });

        const data = await res.json();

        if ( res.status === 200 && data && data.audioContent ) {
          this.gttsAudio.pause();
          this.gttsAudio.text = line.text;
          this.gttsAudio.src = this.gttsAudioData + data.audioContent;
          this.gttsAudio.load();
        } else {
          this.gttsSpeaking = false;
          this.startSpeaking();
        }
      } catch (error) {
        console.error("Error:", error);
        this.gttsSpeaking = false;
        this.startSpeaking();
      }
    } else {
      this.gttsSpeaking = false;
      this.startSpeaking();
    }
  }

  /**
  * Stop speaking and clear the speech queue.
  */
  stopSpeaking() {
    if ( this.gttsAudio ) this.gttsAudio.pause();
    this.gttsQueue.length = 0;
    this.gttsSpeaking = false;
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
        dt: [1000,t],
        vs: {
          eyesRotateX: [ this.convertRange(x,[box.left,box.right],[-0.6,0.6]) ],
          eyesRotateY: [ this.convertRange(y,[box.top,box.bottom],[-0.5,0.6]) ],
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
