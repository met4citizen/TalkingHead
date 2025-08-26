/**
* MIT License
*
* Copyright (c) 2024 Mika Suominen
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

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import Stats from 'three/addons/libs/stats.module.js';

import{ DynamicBones } from './dynamicbones.mjs';
const workletUrl = new URL('./playback-worklet.js', import.meta.url);

// Temporary objects for animation loop
const q = new THREE.Quaternion();
const e = new THREE.Euler();
const v = new THREE.Vector3();
const w = new THREE.Vector3();
const box = new THREE.Box3();
const m = new THREE.Matrix4();
const minv = new THREE.Matrix4();
const origin = new THREE.Vector3();
const forward = new THREE.Vector3(0, 0, 1);
const axisx = new THREE.Vector3(1, 0, 0);
const axisy = new THREE.Vector3(0, 1, 0);
const axisz = new THREE.Vector3(0, 0, 1);

class TalkingHead {

  /**
  * Avatar.
  * @typedef {Object} Avatar
  * @property {string} url URL for the GLB file
  * @property {string} [body] Body form 'M' or 'F'
  * @property {string} [lipsyncLang] Lip-sync language, e.g. 'fi', 'en'
  * @property {string} [ttsLang] Text-to-speech language, e.g. "fi-FI"
  * @property {voice} [ttsVoice] Voice name.
  * @property {numeric} [ttsRate] Voice rate.
  * @property {numeric} [ttsPitch] Voice pitch.
  * @property {numeric} [ttsVolume] Voice volume.
  * @property {string} [avatarMood] Initial mood.
  * @property {boolean} [avatarMute] If true, muted.
  * @property {numeric} [avatarIdleEyeContact] Eye contact while idle [0,1]
  * @property {numeric} [avatarIdleHeadMove] Eye contact while idle [0,1]
  * @property {numeric} [avatarSpeakingEyeContact] Eye contact while speaking [0,1]
  * @property {numeric} [avatarSpeakingHeadMove] Eye contact while speaking [0,1]
  * @property {Object[]} [modelDynamicBones] Config for Dynamic Bones feature
  */

  /**
  * Loading progress.
  * @callback progressfn
  * @param {string} url URL of the resource
  * @param {Object} event Progress event
  * @param {boolean} event.lengthComputable If false, total is not known
  * @param {number} event.loaded Number of loaded items
  * @param {number} event.total Number of total items
  */

  /**
  * Callback when new subtitles have been written to the DOM node.
  * @callback subtitlesfn
  * @param {Object} node DOM node
  */

  /**
  * Callback when the speech queue processes this marker item.
  * @callback markerfn
  */

  /**
  * Audio object.
  * @typedef {Object} Audio
  * @property {ArrayBuffer|ArrayBuffer[]} audio Audio buffer or array of buffers
  * @property {string[]} words Words
  * @property {number[]} wtimes Starting times of words
  * @property {number[]} wdurations Durations of words
  * @property {string[]} [visemes] Oculus lip-sync viseme IDs
  * @property {number[]} [vtimes] Starting times of visemes
  * @property {number[]} [vdurations] Durations of visemes
  * @property {string[]} [markers] Timed callback functions
  * @property {number[]} [mtimes] Starting times of markers
  */

  /**
  * Lip-sync object.
  * @typedef {Object} Lipsync
  * @property {string[]} visemes Oculus lip-sync visemes
  * @property {number[]} times Starting times in relative units
  * @property {number[]} durations Durations in relative units
  */

  /**
  * @constructor
  * @param {Object} node DOM element of the avatar
  * @param {Object} [opt=null] Global/default options
  */
  constructor(node, opt = null ) {
    this.nodeAvatar = node;
    this.opt = {
      jwtGet: null, // Function to get JSON Web Token
      ttsEndpoint: "",
      ttsApikey: null,
      ttsTrimStart: 0,
      ttsTrimEnd: 400,
      ttsLang: "fi-FI",
      ttsVoice: "fi-FI-Standard-A",
      ttsRate: 1,
      ttsPitch: 0,
      ttsVolume: 0,
      mixerGainSpeech: null,
      mixerGainBackground: null,
      lipsyncLang: 'fi',
      lipsyncModules: ['fi','en','lt'],
      pcmSampleRate: 22050,
      modelRoot: "Armature",
      modelPixelRatio: 1,
      modelFPS: 30,
      modelMovementFactor: 1,
      cameraView: 'full',
      dracoEnabled: false,
      dracoDecoderPath: 'https://www.gstatic.com/draco/v1/decoders/',
      cameraDistance: 0,
      cameraX: 0,
      cameraY: 0,
      cameraRotateX: 0,
      cameraRotateY: 0,
      cameraRotateEnable: true,
      cameraPanEnable: false,
      cameraZoomEnable: false,
      lightAmbientColor: 0xffffff,
      lightAmbientIntensity: 2,
      lightDirectColor: 0x8888aa,
      lightDirectIntensity: 30,
      lightDirectPhi: 1,
      lightDirectTheta: 2,
      lightSpotIntensity: 0,
      lightSpotColor: 0x3388ff,
      lightSpotPhi: 0.1,
      lightSpotTheta: 4,
      lightSpotDispersion: 1,
      avatarMood: "neutral",
      avatarMute: false,
      avatarIdleEyeContact: 0.2,
      avatarIdleHeadMove: 0.5,
      avatarSpeakingEyeContact: 0.5,
      avatarSpeakingHeadMove: 0.5,
      avatarIgnoreCamera: false,
      listeningSilenceThresholdLevel: 40,
      listeningSilenceThresholdMs: 2000,
      listeningSilenceDurationMax: 10000,
      listeningActiveThresholdLevel: 75,
      listeningActiveThresholdMs: 300,
      listeningActiveDurationMax: 240000,
      update: null,
      avatarOnly: false,
      avatarOnlyScene: null,
      avatarOnlyCamera: null,
      statsNode: null,
      statsStyle: null
    };
    Object.assign( this.opt, opt || {} );

    // Statistics
    if ( this.opt.statsNode ) {
      this.stats = new Stats();
      if ( this.opt.statsStyle ) {
        this.stats.dom.style.cssText = this.opt.statsStyle;
      }
      this.opt.statsNode.appendChild( this.stats.dom );
    }

    // Pose templates
    // NOTE: The body weight on each pose should be on left foot
    // for most natural result.
    this.poseTemplates = {
      'side': {
        standing: true,
        props: {
          'Hips.position':{x:0, y:1, z:0}, 'Hips.rotation':{x:-0.003, y:-0.017, z:0.1}, 'Spine.rotation':{x:-0.103, y:-0.002, z:-0.063}, 'Spine1.rotation':{x:0.042, y:-0.02, z:-0.069}, 'Spine2.rotation':{x:0.131, y:-0.012, z:-0.065}, 'Neck.rotation':{x:0.027, y:0.006, z:0}, 'Head.rotation':{x:0.077, y:-0.065, z:0}, 'LeftShoulder.rotation':{x:1.599, y:0.084, z:-1.77}, 'LeftArm.rotation':{x:1.364, y:0.052, z:-0.044}, 'LeftForeArm.rotation':{x:0.002, y:-0.007, z:0.331}, 'LeftHand.rotation':{x:0.104, y:-0.067, z:-0.174}, 'LeftHandThumb1.rotation':{x:0.231, y:0.258, z:0.355}, 'LeftHandThumb2.rotation':{x:-0.106, y:-0.339, z:-0.454}, 'LeftHandThumb3.rotation':{x:-0.02, y:-0.142, z:-0.004}, 'LeftHandIndex1.rotation':{x:0.148, y:0.032, z:-0.069}, 'LeftHandIndex2.rotation':{x:0.326, y:-0.049, z:-0.029}, 'LeftHandIndex3.rotation':{x:0.247, y:-0.053, z:-0.073}, 'LeftHandMiddle1.rotation':{x:0.238, y:-0.057, z:-0.089}, 'LeftHandMiddle2.rotation':{x:0.469, y:-0.036, z:-0.081}, 'LeftHandMiddle3.rotation':{x:0.206, y:-0.015, z:-0.017}, 'LeftHandRing1.rotation':{x:0.187, y:-0.118, z:-0.157}, 'LeftHandRing2.rotation':{x:0.579, y:0.02, z:-0.097}, 'LeftHandRing3.rotation':{x:0.272, y:0.021, z:-0.063}, 'LeftHandPinky1.rotation':{x:0.405, y:-0.182, z:-0.138}, 'LeftHandPinky2.rotation':{x:0.613, y:0.128, z:-0.144}, 'LeftHandPinky3.rotation':{x:0.268, y:0.094, z:-0.081}, 'RightShoulder.rotation':{x:1.541, y:0.192, z:1.775}, 'RightArm.rotation':{x:1.273, y:-0.352, z:-0.067}, 'RightForeArm.rotation':{x:-0.011, y:-0.031, z:-0.357}, 'RightHand.rotation':{x:-0.008, y:0.312, z:-0.028}, 'RightHandThumb1.rotation':{x:0.23, y:-0.258, z:-0.355}, 'RightHandThumb2.rotation':{x:-0.107, y:0.339, z:0.454}, 'RightHandThumb3.rotation':{x:-0.02, y:0.142, z:0.004}, 'RightHandIndex1.rotation':{x:0.148, y:-0.031, z:0.069}, 'RightHandIndex2.rotation':{x:0.326, y:0.049, z:0.029}, 'RightHandIndex3.rotation':{x:0.247, y:0.053, z:0.073}, 'RightHandMiddle1.rotation':{x:0.237, y:0.057, z:0.089}, 'RightHandMiddle2.rotation':{x:0.469, y:0.036, z:0.081}, 'RightHandMiddle3.rotation':{x:0.206, y:0.015, z:0.017}, 'RightHandRing1.rotation':{x:0.204, y:0.086, z:0.135}, 'RightHandRing2.rotation':{x:0.579, y:-0.02, z:0.098}, 'RightHandRing3.rotation':{x:0.272, y:-0.021, z:0.063}, 'RightHandPinky1.rotation':{x:0.404, y:0.182, z:0.137}, 'RightHandPinky2.rotation':{x:0.613, y:-0.128, z:0.144}, 'RightHandPinky3.rotation':{x:0.268, y:-0.094, z:0.081}, 'LeftUpLeg.rotation':{x:0.096, y:0.209, z:2.983}, 'LeftLeg.rotation':{x:-0.053, y:0.042, z:-0.017}, 'LeftFoot.rotation':{x:1.091, y:0.15, z:0.026}, 'LeftToeBase.rotation':{x:0.469, y:-0.07, z:-0.015}, 'RightUpLeg.rotation':{x:-0.307, y:-0.219, z:2.912}, 'RightLeg.rotation':{x:-0.359, y:0.164, z:0.015}, 'RightFoot.rotation':{x:1.035, y:0.11, z:0.005}, 'RightToeBase.rotation':{x:0.467, y:0.07, z:0.015}
        }
      },

      'hip':{
        standing: true,
        props: {
          'Hips.position':{x:0,y:1,z:0}, 'Hips.rotation':{x:-0.036,y:0.09,z:0.135}, 'Spine.rotation':{x:0.076,y:-0.035,z:0.01}, 'Spine1.rotation':{x:-0.096,y:0.013,z:-0.094}, 'Spine2.rotation':{x:-0.014,y:0.002,z:-0.097}, 'Neck.rotation':{x:0.034,y:-0.051,z:-0.075}, 'Head.rotation':{x:0.298,y:-0.1,z:0.154}, 'LeftShoulder.rotation':{x:1.694,y:0.011,z:-1.68}, 'LeftArm.rotation':{x:1.343,y:0.177,z:-0.153}, 'LeftForeArm.rotation':{x:-0.049,y:0.134,z:0.351}, 'LeftHand.rotation':{x:0.057,y:-0.189,z:-0.026}, 'LeftHandThumb1.rotation':{x:0.368,y:-0.066,z:0.438}, 'LeftHandThumb2.rotation':{x:-0.156,y:0.029,z:-0.369}, 'LeftHandThumb3.rotation':{x:0.034,y:-0.009,z:0.016}, 'LeftHandIndex1.rotation':{x:0.157,y:-0.002,z:-0.171}, 'LeftHandIndex2.rotation':{x:0.099,y:0,z:0}, 'LeftHandIndex3.rotation':{x:0.1,y:0,z:0}, 'LeftHandMiddle1.rotation':{x:0.222,y:-0.019,z:-0.16}, 'LeftHandMiddle2.rotation':{x:0.142,y:0,z:0}, 'LeftHandMiddle3.rotation':{x:0.141,y:0,z:0}, 'LeftHandRing1.rotation':{x:0.333,y:-0.039,z:-0.174}, 'LeftHandRing2.rotation':{x:0.214,y:0,z:0}, 'LeftHandRing3.rotation':{x:0.213,y:0,z:0}, 'LeftHandPinky1.rotation':{x:0.483,y:-0.069,z:-0.189}, 'LeftHandPinky2.rotation':{x:0.312,y:0,z:0}, 'LeftHandPinky3.rotation':{x:0.309,y:0,z:0}, 'RightShoulder.rotation':{x:1.597,y:0.012,z:1.816}, 'RightArm.rotation':{x:0.618,y:-1.274,z:-0.266}, 'RightForeArm.rotation':{x:-0.395,y:-0.097,z:-1.342}, 'RightHand.rotation':{x:-0.816,y:-0.057,z:-0.976}, 'RightHandThumb1.rotation':{x:0.42,y:0.23,z:-1.172}, 'RightHandThumb2.rotation':{x:-0.027,y:0.361,z:0.122}, 'RightHandThumb3.rotation':{x:0.076,y:0.125,z:-0.371}, 'RightHandIndex1.rotation':{x:-0.158,y:-0.045,z:0.033}, 'RightHandIndex2.rotation':{x:0.391,y:0.051,z:0.025}, 'RightHandIndex3.rotation':{x:0.317,y:0.058,z:0.07}, 'RightHandMiddle1.rotation':{x:0.486,y:0.066,z:0.014}, 'RightHandMiddle2.rotation':{x:0.718,y:0.055,z:0.07}, 'RightHandMiddle3.rotation':{x:0.453,y:0.019,z:0.013}, 'RightHandRing1.rotation':{x:0.591,y:0.241,z:0.11}, 'RightHandRing2.rotation':{x:1.014,y:0.023,z:0.097}, 'RightHandRing3.rotation':{x:0.708,y:0.008,z:0.066}, 'RightHandPinky1.rotation':{x:1.02,y:0.305,z:0.051}, 'RightHandPinky2.rotation':{x:1.187,y:-0.028,z:0.191}, 'RightHandPinky3.rotation':{x:0.872,y:-0.031,z:0.121}, 'LeftUpLeg.rotation':{x:-0.095,y:-0.058,z:-3.338}, 'LeftLeg.rotation':{x:-0.366,y:0.287,z:-0.021}, 'LeftFoot.rotation':{x:1.131,y:0.21,z:0.176}, 'LeftToeBase.rotation':{x:0.739,y:-0.068,z:-0.001}, 'RightUpLeg.rotation':{x:-0.502,y:0.362,z:3.153}, 'RightLeg.rotation':{x:-1.002,y:0.109,z:0.008}, 'RightFoot.rotation':{x:0.626,y:-0.097,z:-0.194}, 'RightToeBase.rotation':{x:1.33,y:0.288,z:-0.078}
        }
      },

      'turn':{
        standing: true,
        props: {
          'Hips.position':{x:0,y:1,z:0}, 'Hips.rotation':{x:-0.07,y:-0.604,z:-0.004}, 'Spine.rotation':{x:-0.007,y:0.003,z:0.071}, 'Spine1.rotation':{x:-0.053,y:0.024,z:-0.06}, 'Spine2.rotation':{x:0.074,y:0.013,z:-0.068}, 'Neck.rotation':{x:0.03,y:0.186,z:-0.077}, 'Head.rotation':{x:0.045,y:0.243,z:-0.086}, 'LeftShoulder.rotation':{x:1.717,y:-0.085,z:-1.761}, 'LeftArm.rotation':{x:1.314,y:0.07,z:-0.057}, 'LeftForeArm.rotation':{x:-0.151,y:0.714,z:0.302}, 'LeftHand.rotation':{x:-0.069,y:0.003,z:-0.118}, 'LeftHandThumb1.rotation':{x:0.23,y:0.258,z:0.354}, 'LeftHandThumb2.rotation':{x:-0.107,y:-0.338,z:-0.455}, 'LeftHandThumb3.rotation':{x:-0.015,y:-0.142,z:0.002}, 'LeftHandIndex1.rotation':{x:0.145,y:0.032,z:-0.069}, 'LeftHandIndex2.rotation':{x:0.323,y:-0.049,z:-0.028}, 'LeftHandIndex3.rotation':{x:0.249,y:-0.053,z:-0.074}, 'LeftHandMiddle1.rotation':{x:0.235,y:-0.057,z:-0.088}, 'LeftHandMiddle2.rotation':{x:0.468,y:-0.036,z:-0.081}, 'LeftHandMiddle3.rotation':{x:0.203,y:-0.015,z:-0.017}, 'LeftHandRing1.rotation':{x:0.185,y:-0.118,z:-0.157}, 'LeftHandRing2.rotation':{x:0.578,y:0.02,z:-0.097}, 'LeftHandRing3.rotation':{x:0.27,y:0.021,z:-0.063}, 'LeftHandPinky1.rotation':{x:0.404,y:-0.182,z:-0.138}, 'LeftHandPinky2.rotation':{x:0.612,y:0.128,z:-0.144}, 'LeftHandPinky3.rotation':{x:0.267,y:0.094,z:-0.081}, 'RightShoulder.rotation':{x:1.605,y:0.17,z:1.625}, 'RightArm.rotation':{x:1.574,y:-0.655,z:0.388}, 'RightForeArm.rotation':{x:-0.36,y:-0.849,z:-0.465}, 'RightHand.rotation':{x:0.114,y:0.416,z:-0.069}, 'RightHandThumb1.rotation':{x:0.486,y:0.009,z:-0.492}, 'RightHandThumb2.rotation':{x:-0.073,y:-0.01,z:0.284}, 'RightHandThumb3.rotation':{x:-0.054,y:-0.006,z:0.209}, 'RightHandIndex1.rotation':{x:0.245,y:-0.014,z:0.052}, 'RightHandIndex2.rotation':{x:0.155,y:0,z:0}, 'RightHandIndex3.rotation':{x:0.153,y:0,z:0}, 'RightHandMiddle1.rotation':{x:0.238,y:0.004,z:0.028}, 'RightHandMiddle2.rotation':{x:0.15,y:0,z:0}, 'RightHandMiddle3.rotation':{x:0.149,y:0,z:0}, 'RightHandRing1.rotation':{x:0.267,y:0.012,z:0.007}, 'RightHandRing2.rotation':{x:0.169,y:0,z:0}, 'RightHandRing3.rotation':{x:0.167,y:0,z:0}, 'RightHandPinky1.rotation':{x:0.304,y:0.018,z:-0.021}, 'RightHandPinky2.rotation':{x:0.192,y:0,z:0}, 'RightHandPinky3.rotation':{x:0.19,y:0,z:0}, 'LeftUpLeg.rotation':{x:-0.001,y:-0.058,z:-3.238}, 'LeftLeg.rotation':{x:-0.29,y:0.058,z:-0.021}, 'LeftFoot.rotation':{x:1.288,y:0.168,z:0.183}, 'LeftToeBase.rotation':{x:0.363,y:-0.09,z:-0.01}, 'RightUpLeg.rotation':{x:-0.100,y:0.36,z:3.062}, 'RightLeg.rotation':{x:-0.67,y:-0.304,z:0.043}, 'RightFoot.rotation':{x:1.195,y:-0.159,z:-0.294}, 'RightToeBase.rotation':{x:0.737,y:0.164,z:-0.002}
        }
      },

      'bend':{
        bend: true, standing: true,
        props: {
          'Hips.position':{x:-0.007, y:0.943, z:-0.001}, 'Hips.rotation':{x:1.488, y:-0.633, z:1.435}, 'Spine.rotation':{x:-0.126, y:0.007, z:-0.057}, 'Spine1.rotation':{x:-0.134, y:0.009, z:0.01}, 'Spine2.rotation':{x:-0.019, y:0, z:-0.002}, 'Neck.rotation':{x:-0.159, y:0.572, z:-0.108}, 'Head.rotation':{x:-0.064, y:0.716, z:-0.257}, 'RightShoulder.rotation':{x:1.625, y:-0.043, z:1.382}, 'RightArm.rotation':{x:0.746, y:-0.96, z:-1.009}, 'RightForeArm.rotation':{x:-0.199, y:-0.528, z:-0.38}, 'RightHand.rotation':{x:-0.261, y:-0.043, z:-0.027}, 'RightHandThumb1.rotation':{x:0.172, y:-0.138, z:-0.445}, 'RightHandThumb2.rotation':{x:-0.158, y:0.327, z:0.545}, 'RightHandThumb3.rotation':{x:-0.062, y:0.138, z:0.152}, 'RightHandIndex1.rotation':{x:0.328, y:-0.005, z:0.132}, 'RightHandIndex2.rotation':{x:0.303, y:0.049, z:0.028}, 'RightHandIndex3.rotation':{x:0.241, y:0.046, z:0.077}, 'RightHandMiddle1.rotation':{x:0.309, y:0.074, z:0.089}, 'RightHandMiddle2.rotation':{x:0.392, y:0.036, z:0.081}, 'RightHandMiddle3.rotation':{x:0.199, y:0.014, z:0.019}, 'RightHandRing1.rotation':{x:0.239, y:0.143, z:0.091}, 'RightHandRing2.rotation':{x:0.275, y:-0.02, z:0.097}, 'RightHandRing3.rotation':{x:0.248, y:-0.023, z:0.061}, 'RightHandPinky1.rotation':{x:0.211, y:0.154, z:0.029}, 'RightHandPinky2.rotation':{x:0.348, y:-0.128, z:0.144}, 'RightHandPinky3.rotation':{x:0.21, y:-0.091, z:0.065}, 'LeftShoulder.rotation':{x:1.626, y:-0.027, z:-1.367}, 'LeftArm.rotation':{x:1.048, y:0.737, z:0.712}, 'LeftForeArm.rotation':{x:-0.508, y:0.879, z:0.625}, 'LeftHand.rotation':{x:0.06, y:-0.243, z:-0.079}, 'LeftHandThumb1.rotation':{x:0.187, y:-0.072, z:0.346}, 'LeftHandThumb2.rotation':{x:-0.066, y:0.008, z:-0.256}, 'LeftHandThumb3.rotation':{x:-0.085, y:0.014, z:-0.334}, 'LeftHandIndex1.rotation':{x:-0.1, y:0.016, z:-0.058}, 'LeftHandIndex2.rotation':{x:0.334, y:0, z:0}, 'LeftHandIndex3.rotation':{x:0.281, y:0, z:0}, 'LeftHandMiddle1.rotation':{x:-0.056, y:0, z:0}, 'LeftHandMiddle2.rotation':{x:0.258, y:0, z:0}, 'LeftHandMiddle3.rotation':{x:0.26, y:0, z:0}, 'LeftHandRing1.rotation':{x:-0.067, y:-0.002, z:0.008}, 'LeftHandRing2.rotation':{x:0.259, y:0, z:0}, 'LeftHandRing3.rotation':{x:0.276, y:0, z:0}, 'LeftHandPinky1.rotation':{x:-0.128, y:-0.007, z:0.042}, 'LeftHandPinky2.rotation':{x:0.227, y:0, z:0}, 'LeftHandPinky3.rotation':{x:0.145, y:0, z:0}, 'RightUpLeg.rotation':{x:-1.507, y:0.2, z:-3.043}, 'RightLeg.rotation':{x:-0.689, y:-0.124, z:0.017}, 'RightFoot.rotation':{x:0.909, y:0.008, z:-0.093}, 'RightToeBase.rotation':{x:0.842, y:0.075, z:-0.008}, 'LeftUpLeg.rotation':{x:-1.449, y:-0.2, z:3.018}, 'LeftLeg.rotation':{x:-0.74, y:-0.115, z:-0.008}, 'LeftFoot.rotation':{x:1.048, y:-0.058, z:0.117}, 'LeftToeBase.rotation':{x:0.807, y:-0.067, z:0.003}
        }
      },

      'back':{
        standing: true,
        props: {
          'Hips.position':{x:0,y:1,z:0}, 'Hips.rotation':{x:-0.732,y:-1.463,z:-0.637}, 'Spine.rotation':{x:-0.171,y:0.106,z:0.157}, 'Spine1.rotation':{x:-0.044,y:0.138,z:-0.059}, 'Spine2.rotation':{x:0.082,y:0.133,z:-0.074}, 'Neck.rotation':{x:0.39,y:0.591,z:-0.248}, 'Head.rotation':{x:-0.001,y:0.596,z:-0.057}, 'LeftShoulder.rotation':{x:1.676,y:0.007,z:-1.892}, 'LeftArm.rotation':{x:-5.566,y:1.188,z:-0.173}, 'LeftForeArm.rotation':{x:-0.673,y:-0.105,z:1.702}, 'LeftHand.rotation':{x:-0.469,y:-0.739,z:0.003}, 'LeftHandThumb1.rotation':{x:0.876,y:0.274,z:0.793}, 'LeftHandThumb2.rotation':{x:0.161,y:-0.23,z:-0.172}, 'LeftHandThumb3.rotation':{x:0.078,y:0.027,z:0.156}, 'LeftHandIndex1.rotation':{x:-0.085,y:-0.002,z:0.009}, 'LeftHandIndex2.rotation':{x:0.176,y:0,z:-0.002}, 'LeftHandIndex3.rotation':{x:-0.036,y:0.001,z:-0.035}, 'LeftHandMiddle1.rotation':{x:0.015,y:0.144,z:-0.076}, 'LeftHandMiddle2.rotation':{x:0.378,y:-0.007,z:-0.077}, 'LeftHandMiddle3.rotation':{x:-0.141,y:-0.001,z:0.031}, 'LeftHandRing1.rotation':{x:0.039,y:0.02,z:-0.2}, 'LeftHandRing2.rotation':{x:0.25,y:-0.002,z:-0.073}, 'LeftHandRing3.rotation':{x:0.236,y:0.006,z:-0.075}, 'LeftHandPinky1.rotation':{x:0.172,y:-0.033,z:-0.275}, 'LeftHandPinky2.rotation':{x:0.216,y:0.043,z:-0.054}, 'LeftHandPinky3.rotation':{x:0.325,y:0.078,z:-0.13}, 'RightShoulder.rotation':{x:2.015,y:-0.168,z:1.706}, 'RightArm.rotation':{x:0.203,y:-1.258,z:-0.782}, 'RightForeArm.rotation':{x:-0.658,y:-0.133,z:-1.401}, 'RightHand.rotation':{x:-1.504,y:0.375,z:-0.005}, 'RightHandThumb1.rotation':{x:0.413,y:-0.158,z:-1.121}, 'RightHandThumb2.rotation':{x:-0.142,y:-0.008,z:0.209}, 'RightHandThumb3.rotation':{x:-0.091,y:0.021,z:0.142}, 'RightHandIndex1.rotation':{x:-0.167,y:0.014,z:-0.072}, 'RightHandIndex2.rotation':{x:0.474,y:0.009,z:0.051}, 'RightHandIndex3.rotation':{x:0.115,y:0.006,z:0.047}, 'RightHandMiddle1.rotation':{x:0.385,y:0.019,z:0.144}, 'RightHandMiddle2.rotation':{x:0.559,y:0.035,z:0.101}, 'RightHandMiddle3.rotation':{x:0.229,y:0,z:0.027}, 'RightHandRing1.rotation':{x:0.48,y:0.026,z:0.23}, 'RightHandRing2.rotation':{x:0.772,y:0.038,z:0.109}, 'RightHandRing3.rotation':{x:0.622,y:0.039,z:0.106}, 'RightHandPinky1.rotation':{x:0.767,y:0.288,z:0.353}, 'RightHandPinky2.rotation':{x:0.886,y:0.049,z:0.122}, 'RightHandPinky3.rotation':{x:0.662,y:0.044,z:0.113}, 'LeftUpLeg.rotation':{x:-0.206,y:-0.268,z:-3.343}, 'LeftLeg.rotation':{x:-0.333,y:0.757,z:-0.043}, 'LeftFoot.rotation':{x:1.049,y:0.167,z:0.287}, 'LeftToeBase.rotation':{x:0.672,y:-0.069,z:-0.004}, 'RightUpLeg.rotation':{x:0.055,y:-0.226,z:3.037}, 'RightLeg.rotation':{x:-0.559,y:0.39,z:-0.001}, 'RightFoot.rotation':{x:1.2,y:0.133,z:0.085}, 'RightToeBase.rotation':{x:0.92,y:0.093,z:-0.013}
        }
      },

      'straight':{
        standing: true,
        props: {
          'Hips.position':{x:0, y:0.989, z:0.001}, 'Hips.rotation':{x:0.047, y:0.007, z:-0.007}, 'Spine.rotation':{x:-0.143, y:-0.007, z:0.005}, 'Spine1.rotation':{x:-0.043, y:-0.014, z:0.012}, 'Spine2.rotation':{x:0.072, y:-0.013, z:0.013}, 'Neck.rotation':{x:0.048, y:-0.003, z:0.012}, 'Head.rotation':{x:0.05, y:-0.02, z:-0.017}, 'LeftShoulder.rotation':{x:1.62, y:-0.166, z:-1.605}, 'LeftArm.rotation':{x:1.275, y:0.544, z:-0.092}, 'LeftForeArm.rotation':{x:0, y:0, z:0.302}, 'LeftHand.rotation':{x:-0.225, y:-0.154, z:0.11}, 'LeftHandThumb1.rotation':{x:0.435, y:-0.044, z:0.457}, 'LeftHandThumb2.rotation':{x:-0.028, y:0.002, z:-0.246}, 'LeftHandThumb3.rotation':{x:-0.236, y:-0.025, z:0.113}, 'LeftHandIndex1.rotation':{x:0.218, y:0.008, z:-0.081}, 'LeftHandIndex2.rotation':{x:0.165, y:-0.001, z:-0.017}, 'LeftHandIndex3.rotation':{x:0.165, y:-0.001, z:-0.017}, 'LeftHandMiddle1.rotation':{x:0.235, y:-0.011, z:-0.065}, 'LeftHandMiddle2.rotation':{x:0.182, y:-0.002, z:-0.019}, 'LeftHandMiddle3.rotation':{x:0.182, y:-0.002, z:-0.019}, 'LeftHandRing1.rotation':{x:0.316, y:-0.017, z:0.008}, 'LeftHandRing2.rotation':{x:0.253, y:-0.003, z:-0.026}, 'LeftHandRing3.rotation':{x:0.255, y:-0.003, z:-0.026}, 'LeftHandPinky1.rotation':{x:0.336, y:-0.062, z:0.088}, 'LeftHandPinky2.rotation':{x:0.276, y:-0.004, z:-0.028}, 'LeftHandPinky3.rotation':{x:0.276, y:-0.004, z:-0.028}, 'RightShoulder.rotation':{x:1.615, y:0.064, z:1.53}, 'RightArm.rotation':{x:1.313, y:-0.424, z:0.131}, 'RightForeArm.rotation':{x:0, y:0, z:-0.317}, 'RightHand.rotation':{x:-0.158, y:-0.639, z:-0.196}, 'RightHandThumb1.rotation':{x:0.44, y:0.048, z:-0.549}, 'RightHandThumb2.rotation':{x:-0.056, y:-0.008, z:0.274}, 'RightHandThumb3.rotation':{x:-0.258, y:0.031, z:-0.095}, 'RightHandIndex1.rotation':{x:0.169, y:-0.011, z:0.105}, 'RightHandIndex2.rotation':{x:0.134, y:0.001, z:0.011}, 'RightHandIndex3.rotation':{x:0.134, y:0.001, z:0.011}, 'RightHandMiddle1.rotation':{x:0.288, y:0.014, z:0.092}, 'RightHandMiddle2.rotation':{x:0.248, y:0.003, z:0.02}, 'RightHandMiddle3.rotation':{x:0.249, y:0.003, z:0.02}, 'RightHandRing1.rotation':{x:0.369, y:0.019, z:0.006}, 'RightHandRing2.rotation':{x:0.321, y:0.004, z:0.026}, 'RightHandRing3.rotation':{x:0.323, y:0.004, z:0.026}, 'RightHandPinky1.rotation':{x:0.468, y:0.085, z:-0.03}, 'RightHandPinky2.rotation':{x:0.427, y:0.007, z:0.034}, 'RightHandPinky3.rotation':{x:0.142, y:0.001, z:0.012}, 'LeftUpLeg.rotation':{x:-0.077, y:-0.058, z:3.126}, 'LeftLeg.rotation':{x:-0.252, y:0.001, z:-0.018}, 'LeftFoot.rotation':{x:1.315, y:-0.064, z:0.315}, 'LeftToeBase.rotation':{x:0.577, y:-0.07, z:-0.009}, 'RightUpLeg.rotation':{x:-0.083, y:-0.032, z:3.124}, 'RightLeg.rotation':{x:-0.272, y:-0.003, z:0.021}, 'RightFoot.rotation':{x:1.342, y:0.076, z:-0.222}, 'RightToeBase.rotation':{x:0.44, y:0.069, z:0.016}
        }
      },

      'wide':{
        standing: true,
        props: {
          'Hips.position':{x:0, y:1.017, z:0.016}, 'Hips.rotation':{x:0.064, y:-0.048, z:0.059}, 'Spine.rotation':{x:-0.123, y:0, z:-0.018}, 'Spine1.rotation':{x:0.014, y:0.003, z:-0.006}, 'Spine2.rotation':{x:0.04, y:0.003, z:-0.007}, 'Neck.rotation':{x:0.101, y:0.007, z:-0.035}, 'Head.rotation':{x:-0.091, y:-0.049, z:0.105}, 'RightShoulder.rotation':{x:1.831, y:0.017, z:1.731}, 'RightArm.rotation':{x:-1.673, y:-1.102, z:-3.132}, 'RightForeArm.rotation':{x:0.265, y:0.23, z:-0.824}, 'RightHand.rotation':{x:-0.52, y:0.345, z:-0.061}, 'RightHandThumb1.rotation':{x:0.291, y:0.056, z:-0.428}, 'RightHandThumb2.rotation':{x:0.025, y:0.005, z:0.166}, 'RightHandThumb3.rotation':{x:-0.089, y:0.009, z:0.068}, 'RightHandIndex1.rotation':{x:0.392, y:-0.015, z:0.11}, 'RightHandIndex2.rotation':{x:0.391, y:0.001, z:0.004}, 'RightHandIndex3.rotation':{x:0.326, y:0, z:0.003}, 'RightHandMiddle1.rotation':{x:0.285, y:0.068, z:0.081}, 'RightHandMiddle2.rotation':{x:0.519, y:0.004, z:0.011}, 'RightHandMiddle3.rotation':{x:0.252, y:0, z:0.001}, 'RightHandRing1.rotation':{x:0.207, y:0.133, z:0.146}, 'RightHandRing2.rotation':{x:0.597, y:0.004, z:0.004}, 'RightHandRing3.rotation':{x:0.292, y:0.002, z:0.012}, 'RightHandPinky1.rotation':{x:0.338, y:0.182, z:0.136}, 'RightHandPinky2.rotation':{x:0.533, y:0.002, z:0.004}, 'RightHandPinky3.rotation':{x:0.194, y:0, z:0.002}, 'LeftShoulder.rotation':{x:1.83, y:-0.063, z:-1.808}, 'LeftArm.rotation':{x:-1.907, y:1.228, z:-2.959}, 'LeftForeArm.rotation':{x:-0.159, y:0.268, z:0.572}, 'LeftHand.rotation':{x:0.069, y:-0.498, z:-0.025}, 'LeftHandThumb1.rotation':{x:0.738, y:0.123, z:0.178}, 'LeftHandThumb2.rotation':{x:-0.26, y:0.028, z:-0.477}, 'LeftHandThumb3.rotation':{x:-0.448, y:0.093, z:-0.661}, 'LeftHandIndex1.rotation':{x:1.064, y:0.005, z:-0.13}, 'LeftHandIndex2.rotation':{x:1.55, y:-0.143, z:-0.136}, 'LeftHandIndex3.rotation':{x:0.722, y:-0.076, z:-0.127}, 'LeftHandMiddle1.rotation':{x:1.095, y:-0.091, z:0.006}, 'LeftHandMiddle2.rotation':{x:1.493, y:-0.174, z:-0.151}, 'LeftHandMiddle3.rotation':{x:0.651, y:-0.031, z:-0.087}, 'LeftHandRing1.rotation':{x:1.083, y:-0.224, z:0.072}, 'LeftHandRing2.rotation':{x:1.145, y:-0.107, z:-0.195}, 'LeftHandRing3.rotation':{x:1.208, y:-0.134, z:-0.158}, 'LeftHandPinky1.rotation':{x:0.964, y:-0.383, z:0.128}, 'LeftHandPinky2.rotation':{x:1.457, y:-0.146, z:-0.159}, 'LeftHandPinky3.rotation':{x:1.019, y:-0.102, z:-0.141}, 'RightUpLeg.rotation':{x:-0.221, y:-0.233, z:2.87}, 'RightLeg.rotation':{x:-0.339, y:-0.043, z:-0.041}, 'RightFoot.rotation':{x:1.081, y:0.177, z:0.114}, 'RightToeBase.rotation':{x:0.775, y:0, z:0}, 'LeftUpLeg.rotation':{x:-0.185, y:0.184, z:3.131}, 'LeftLeg.rotation':{x:-0.408, y:0.129, z:0.02}, 'LeftFoot.rotation':{x:1.167, y:-0.002, z:-0.007}, 'LeftToeBase.rotation':{x:0.723, y:0, z:0}
        }
      },

      'oneknee':{
        kneeling: true,
        props: {
          'Hips.position':{x:-0.005, y:0.415, z:-0.017}, 'Hips.rotation':{x:-0.25, y:0.04, z:-0.238}, 'Spine.rotation':{x:0.037, y:0.043, z:0.047}, 'Spine1.rotation':{x:0.317, y:0.103, z:0.066}, 'Spine2.rotation':{x:0.433, y:0.109, z:0.054}, 'Neck.rotation':{x:-0.156, y:-0.092, z:0.059}, 'Head.rotation':{x:-0.398, y:-0.032, z:0.018}, 'RightShoulder.rotation':{x:1.546, y:0.119, z:1.528}, 'RightArm.rotation':{x:0.896, y:-0.247, z:-0.512}, 'RightForeArm.rotation':{x:0.007, y:0, z:-1.622}, 'RightHand.rotation':{x:1.139, y:-0.853, z:0.874}, 'RightHandThumb1.rotation':{x:0.176, y:0.107, z:-0.311}, 'RightHandThumb2.rotation':{x:-0.047, y:-0.003, z:0.12}, 'RightHandThumb3.rotation':{x:0, y:0, z:0}, 'RightHandIndex1.rotation':{x:0.186, y:0.005, z:0.125}, 'RightHandIndex2.rotation':{x:0.454, y:0.005, z:0.015}, 'RightHandIndex3.rotation':{x:0, y:0, z:0}, 'RightHandMiddle1.rotation':{x:0.444, y:0.035, z:0.127}, 'RightHandMiddle2.rotation':{x:0.403, y:-0.006, z:-0.04}, 'RightHandMiddle3.rotation':{x:0, y:0, z:0}, 'RightHandRing1.rotation':{x:0.543, y:0.074, z:0.121}, 'RightHandRing2.rotation':{x:0.48, y:-0.018, z:-0.063}, 'RightHandRing3.rotation':{x:0, y:0, z:0}, 'RightHandPinky1.rotation':{x:0.464, y:0.086, z:0.113}, 'RightHandPinky2.rotation':{x:0.667, y:-0.06, z:-0.128}, 'RightHandPinky3.rotation':{x:0, y:0, z:0}, 'LeftShoulder.rotation':{x:1.545, y:-0.116, z:-1.529}, 'LeftArm.rotation':{x:0.799, y:0.631, z:0.556}, 'LeftForeArm.rotation':{x:-0.002, y:0.007, z:0.926}, 'LeftHand.rotation':{x:-0.508, y:0.439, z:0.502}, 'LeftHandThumb1.rotation':{x:0.651, y:-0.035, z:0.308}, 'LeftHandThumb2.rotation':{x:-0.053, y:0.008, z:-0.11}, 'LeftHandThumb3.rotation':{x:0, y:0, z:0}, 'LeftHandIndex1.rotation':{x:0.662, y:-0.053, z:-0.116}, 'LeftHandIndex2.rotation':{x:0.309, y:-0.004, z:-0.02}, 'LeftHandIndex3.rotation':{x:0, y:0, z:0}, 'LeftHandMiddle1.rotation':{x:0.501, y:-0.062, z:-0.12}, 'LeftHandMiddle2.rotation':{x:0.144, y:-0.002, z:0.016}, 'LeftHandMiddle3.rotation':{x:0, y:0, z:0}, 'LeftHandRing1.rotation':{x:0.397, y:-0.029, z:-0.143}, 'LeftHandRing2.rotation':{x:0.328, y:0.01, z:0.059}, 'LeftHandRing3.rotation':{x:0, y:0, z:0}, 'LeftHandPinky1.rotation':{x:0.194, y:0.008, z:-0.164}, 'LeftHandPinky2.rotation':{x:0.38, y:0.031, z:0.128}, 'LeftHandPinky3.rotation':{x:0, y:0, z:0}, 'RightUpLeg.rotation':{x:-1.594, y:-0.251, z:2.792}, 'RightLeg.rotation':{x:-2.301, y:-0.073, z:0.055}, 'RightFoot.rotation':{x:1.553, y:-0.207, z:-0.094}, 'RightToeBase.rotation':{x:0.459, y:0.069, z:0.016}, 'LeftUpLeg.rotation':{x:-0.788, y:-0.236, z:-2.881}, 'LeftLeg.rotation':{x:-2.703, y:0.012, z:-0.047}, 'LeftFoot.rotation':{x:2.191, y:-0.102, z:0.019}, 'LeftToeBase.rotation':{x:1.215, y:-0.027, z:0.01}
        }
      },

      'kneel':{
        kneeling: true, lying: true,
        props: {
          'Hips.position':{x:0, y:0.532, z:-0.002}, 'Hips.rotation':{x:0.018, y:-0.008, z:-0.017}, 'Spine.rotation':{x:-0.139, y:-0.01, z:0.002}, 'Spine1.rotation':{x:0.002, y:-0.002, z:0.001}, 'Spine2.rotation':{x:0.028, y:-0.002, z:0.001}, 'Neck.rotation':{x:-0.007, y:0, z:-0.002}, 'Head.rotation':{x:-0.02, y:-0.008, z:-0.004}, 'LeftShoulder.rotation':{x:1.77, y:-0.428, z:-1.588}, 'LeftArm.rotation':{x:0.911, y:0.343, z:0.083}, 'LeftForeArm.rotation':{x:0, y:0, z:0.347}, 'LeftHand.rotation':{x:0.033, y:-0.052, z:-0.105}, 'LeftHandThumb1.rotation':{x:0.508, y:-0.22, z:0.708}, 'LeftHandThumb2.rotation':{x:-0.323, y:-0.139, z:-0.56}, 'LeftHandThumb3.rotation':{x:-0.328, y:0.16, z:-0.301}, 'LeftHandIndex1.rotation':{x:0.178, y:0.248, z:0.045}, 'LeftHandIndex2.rotation':{x:0.236, y:-0.002, z:-0.019}, 'LeftHandIndex3.rotation':{x:-0.062, y:0, z:0.005}, 'LeftHandMiddle1.rotation':{x:0.123, y:-0.005, z:-0.019}, 'LeftHandMiddle2.rotation':{x:0.589, y:-0.014, z:-0.045}, 'LeftHandMiddle3.rotation':{x:0.231, y:-0.002, z:-0.019}, 'LeftHandRing1.rotation':{x:0.196, y:-0.008, z:-0.091}, 'LeftHandRing2.rotation':{x:0.483, y:-0.009, z:-0.038}, 'LeftHandRing3.rotation':{x:0.367, y:-0.005, z:-0.029}, 'LeftHandPinky1.rotation':{x:0.191, y:-0.269, z:-0.246}, 'LeftHandPinky2.rotation':{x:0.37, y:-0.006, z:-0.029}, 'LeftHandPinky3.rotation':{x:0.368, y:-0.005, z:-0.029}, 'RightShoulder.rotation':{x:1.73, y:0.434, z:1.715}, 'RightArm.rotation':{x:0.841, y:-0.508, z:-0.155}, 'RightForeArm.rotation':{x:0, y:0, z:-0.355}, 'RightHand.rotation':{x:0.091, y:0.137, z:0.197}, 'RightHandThumb1.rotation':{x:0.33, y:0.051, z:-0.753}, 'RightHandThumb2.rotation':{x:-0.113, y:0.075, z:0.612}, 'RightHandThumb3.rotation':{x:-0.271, y:-0.166, z:0.164}, 'RightHandIndex1.rotation':{x:0.073, y:0.001, z:-0.093}, 'RightHandIndex2.rotation':{x:0.338, y:0.006, z:0.034}, 'RightHandIndex3.rotation':{x:0.131, y:0.001, z:0.013}, 'RightHandMiddle1.rotation':{x:0.13, y:0.005, z:-0.017}, 'RightHandMiddle2.rotation':{x:0.602, y:0.018, z:0.058}, 'RightHandMiddle3.rotation':{x:-0.031, y:0, z:-0.003}, 'RightHandRing1.rotation':{x:0.351, y:0.019, z:0.045}, 'RightHandRing2.rotation':{x:0.19, y:0.002, z:0.019}, 'RightHandRing3.rotation':{x:0.21, y:0.002, z:0.021}, 'RightHandPinky1.rotation':{x:0.256, y:0.17, z:0.118}, 'RightHandPinky2.rotation':{x:0.451, y:0.01, z:0.045}, 'RightHandPinky3.rotation':{x:0.346, y:0.006, z:0.035}, 'LeftUpLeg.rotation':{x:-0.06, y:0.1, z:-2.918}, 'LeftLeg.rotation':{x:-1.933, y:-0.01, z:0.011}, 'LeftFoot.rotation':{x:0.774, y:-0.162, z:-0.144}, 'LeftToeBase.rotation':{x:1.188, y:0, z:0}, 'RightUpLeg.rotation':{x:-0.099, y:-0.057, z:2.922}, 'RightLeg.rotation':{x:-1.93, y:0.172, z:-0.02}, 'RightFoot.rotation':{x:0.644, y:0.251, z:0.212}, 'RightToeBase.rotation':{x:0.638, y:-0.034, z:-0.001}
        }
      },

      'sitting': {
        sitting: true, lying: true,
        props: {
          'Hips.position':{x:0, y:0.117, z:0.005}, 'Hips.rotation':{x:-0.411, y:-0.049, z:0.056}, 'Spine.rotation':{x:0.45, y:-0.039, z:-0.116}, 'Spine1.rotation':{x:0.092, y:-0.076, z:0.08}, 'Spine2.rotation':{x:0.073, y:0.035, z:0.066}, 'Neck.rotation':{x:0.051, y:0.053, z:-0.079}, 'Head.rotation':{x:-0.169, y:0.009, z:0.034}, 'LeftShoulder.rotation':{x:1.756, y:-0.037, z:-1.301}, 'LeftArm.rotation':{x:-0.098, y:0.016, z:1.006}, 'LeftForeArm.rotation':{x:-0.089, y:0.08, z:0.837}, 'LeftHand.rotation':{x:0.262, y:-0.399, z:0.3}, 'LeftHandThumb1.rotation':{x:0.149, y:-0.043, z:0.452}, 'LeftHandThumb2.rotation':{x:0.032, y:0.006, z:-0.162}, 'LeftHandThumb3.rotation':{x:-0.086, y:-0.005, z:-0.069}, 'LeftHandIndex1.rotation':{x:0.145, y:0.032, z:-0.069}, 'LeftHandIndex2.rotation':{x:0.325, y:-0.001, z:-0.004}, 'LeftHandIndex3.rotation':{x:0.253, y:0, z:-0.003}, 'LeftHandMiddle1.rotation':{x:0.186, y:-0.051, z:-0.091}, 'LeftHandMiddle2.rotation':{x:0.42, y:-0.003, z:-0.011}, 'LeftHandMiddle3.rotation':{x:0.153, y:0.001, z:-0.001}, 'LeftHandRing1.rotation':{x:0.087, y:-0.19, z:-0.078}, 'LeftHandRing2.rotation':{x:0.488, y:-0.004, z:-0.005}, 'LeftHandRing3.rotation':{x:0.183, y:-0.001, z:-0.012}, 'LeftHandPinky1.rotation':{x:0.205, y:-0.262, z:0.051}, 'LeftHandPinky2.rotation':{x:0.407, y:-0.002, z:-0.004}, 'LeftHandPinky3.rotation':{x:0.068, y:0, z:-0.002}, 'RightShoulder.rotation':{x:1.619, y:-0.139, z:1.179}, 'RightArm.rotation':{x:0.17, y:-0.037, z:-1.07}, 'RightForeArm.rotation':{x:-0.044, y:-0.056, z:-0.665}, 'RightHand.rotation':{x:0.278, y:0.454, z:-0.253}, 'RightHandThumb1.rotation':{x:0.173, y:0.089, z:-0.584}, 'RightHandThumb2.rotation':{x:-0.003, y:-0.004, z:0.299}, 'RightHandThumb3.rotation':{x:-0.133, y:-0.002, z:0.235}, 'RightHandIndex1.rotation':{x:0.393, y:-0.023, z:0.108}, 'RightHandIndex2.rotation':{x:0.391, y:0.001, z:0.004}, 'RightHandIndex3.rotation':{x:0.326, y:0, z:0.003}, 'RightHandMiddle1.rotation':{x:0.285, y:0.062, z:0.086}, 'RightHandMiddle2.rotation':{x:0.519, y:0.003, z:0.011}, 'RightHandMiddle3.rotation':{x:0.252, y:-0.001, z:0.001}, 'RightHandRing1.rotation':{x:0.207, y:0.122, z:0.155}, 'RightHandRing2.rotation':{x:0.597, y:0.004, z:0.005}, 'RightHandRing3.rotation':{x:0.292, y:0.001, z:0.012}, 'RightHandPinky1.rotation':{x:0.338, y:0.171, z:0.149}, 'RightHandPinky2.rotation':{x:0.533, y:0.002, z:0.004}, 'RightHandPinky3.rotation':{x:0.194, y:0, z:0.002}, 'LeftUpLeg.rotation':{x:-1.957, y:0.083, z:-2.886}, 'LeftLeg.rotation':{x:-1.46, y:0.123, z:0.005}, 'LeftFoot.rotation':{x:-0.013, y:0.016, z:0.09}, 'LeftToeBase.rotation':{x:0.744, y:0, z:0}, 'RightUpLeg.rotation':{x:-1.994, y:0.125, z:2.905}, 'RightLeg.rotation':{x:-1.5, y:-0.202, z:-0.006}, 'RightFoot.rotation':{x:-0.012, y:-0.065, z:0.081}, 'RightToeBase.rotation':{x:0.758, y:0, z:0}
        }
      }
    };

    // Gestures
    // NOTE: For one hand gestures, use left left
    this.gestureTemplates = {
      'handup': {
        'LeftShoulder.rotation':{x:[1.5,2,1,2], y:[0.2,0.4,1,2], z:[-1.5,-1.3,1,2]}, 'LeftArm.rotation':{x:[1.5,1.7,1,2], y:[-0.6,-0.4,1,2], z:[1,1.2,1,2]}, 'LeftForeArm.rotation':{x:-0.815, y:[-0.4,0,1,2], z:1.575}, 'LeftHand.rotation':{x:-0.529, y:-0.2, z:0.022}, 'LeftHandThumb1.rotation':{x:0.745, y:-0.526, z:0.604}, 'LeftHandThumb2.rotation':{x:-0.107, y:-0.01, z:-0.142}, 'LeftHandThumb3.rotation':{x:0, y:0.001, z:0}, 'LeftHandIndex1.rotation':{x:-0.126, y:-0.035, z:-0.087}, 'LeftHandIndex2.rotation':{x:0.255, y:0.007, z:-0.085}, 'LeftHandIndex3.rotation':{x:0, y:0, z:0}, 'LeftHandMiddle1.rotation':{x:-0.019, y:-0.128, z:-0.082}, 'LeftHandMiddle2.rotation':{x:0.233, y:0.019, z:-0.074}, 'LeftHandMiddle3.rotation':{x:0, y:0, z:0}, 'LeftHandRing1.rotation':{x:0.005, y:-0.241, z:-0.122}, 'LeftHandRing2.rotation':{x:0.261, y:0.021, z:-0.076}, 'LeftHandRing3.rotation':{x:0, y:0, z:0}, 'LeftHandPinky1.rotation':{x:0.059, y:-0.336, z:-0.2}, 'LeftHandPinky2.rotation':{x:0.153, y:0.019, z:0.001}, 'LeftHandPinky3.rotation':{x:0, y:0, z:0}
      },
      'index': {
        'LeftShoulder.rotation':{x:[1.5,2,1,2], y:[0.2,0.4,1,2], z:[-1.5,-1.3,1,2]}, 'LeftArm.rotation':{x:[1.5,1.7,1,2], y:[-0.6,-0.4,1,2], z:[1,1.2,1,2]}, 'LeftForeArm.rotation':{x:-0.815, y:[-0.4,0,1,2], z:1.575}, 'LeftHand.rotation':{x:-0.276, y:-0.506, z:-0.208}, 'LeftHandThumb1.rotation':{x:0.579, y:0.228, z:0.363}, 'LeftHandThumb2.rotation':{x:-0.027, y:-0.04, z:-0.662}, 'LeftHandThumb3.rotation':{x:0, y:0.001, z:0}, 'LeftHandIndex1.rotation':{x:0, y:-0.105, z:0.225}, 'LeftHandIndex2.rotation':{x:0.256, y:-0.103, z:-0.213}, 'LeftHandIndex3.rotation':{x:0, y:0, z:0}, 'LeftHandMiddle1.rotation':{x:1.453, y:0.07, z:0.021}, 'LeftHandMiddle2.rotation':{x:1.599, y:0.062, z:0.07}, 'LeftHandMiddle3.rotation':{x:0, y:0, z:0}, 'LeftHandRing1.rotation':{x:1.528, y:-0.073, z:0.052}, 'LeftHandRing2.rotation':{x:1.386, y:0.044, z:0.053}, 'LeftHandRing3.rotation':{x:0, y:0, z:0}, 'LeftHandPinky1.rotation':{x:1.65, y:-0.204, z:0.031}, 'LeftHandPinky2.rotation':{x:1.302, y:0.071, z:0.085}, 'LeftHandPinky3.rotation':{x:0, y:0, z:0}
      },
      'ok': {
        'LeftShoulder.rotation':{x:[1.5,2,1,2], y:[0.2,0.4,1,2], z:[-1.5,-1.3,1,2]}, 'LeftArm.rotation':{x:[1.5,1.7,1,1], y:[-0.6,-0.4,1,2], z:[1,1.2,1,2]}, 'LeftForeArm.rotation':{x:-0.415, y:[-0.4,0,1,2], z:1.575}, 'LeftHand.rotation':{x:-0.476, y:-0.506, z:-0.208}, 'LeftHandThumb1.rotation':{x:0.703, y:0.445, z:0.899}, 'LeftHandThumb2.rotation':{x:-0.312, y:-0.04, z:-0.938}, 'LeftHandThumb3.rotation':{x:-0.37, y:0.024, z:-0.393}, 'LeftHandIndex1.rotation':{x:0.8, y:-0.086, z:-0.091}, 'LeftHandIndex2.rotation':{x:1.123, y:-0.046, z:-0.074}, 'LeftHandIndex3.rotation':{x:0.562, y:-0.013, z:-0.043}, 'LeftHandMiddle1.rotation':{x:-0.019, y:-0.128, z:-0.082}, 'LeftHandMiddle2.rotation':{x:0.233, y:0.019, z:-0.074}, 'LeftHandMiddle3.rotation':{x:0, y:0, z:0}, 'LeftHandRing1.rotation':{x:0.005, y:-0.241, z:-0.122}, 'LeftHandRing2.rotation':{x:0.261, y:0.021, z:-0.076}, 'LeftHandRing3.rotation':{x:0, y:0, z:0}, 'LeftHandPinky1.rotation':{x:0.059, y:-0.336, z:-0.2}, 'LeftHandPinky2.rotation':{x:0.153, y:0.019, z:0.001}, 'LeftHandPinky3.rotation':{x:0, y:0, z:0}
      },
      'thumbup': {
        'LeftShoulder.rotation':{x:[1.5,2,1,2], y:[0.2,0.4,1,2], z:[-1.5,-1.3,1,2]}, 'LeftArm.rotation':{x:[1.5,1.7,1,2], y:[-0.6,-0.4,1,2], z:[1,1.2,1,2]}, 'LeftForeArm.rotation':{x:-0.415, y:0.206, z:1.575}, 'LeftHand.rotation':{x:-0.276, y:-0.506, z:-0.208}, 'LeftHandThumb1.rotation':{x:0.208, y:-0.189, z:0.685}, 'LeftHandThumb2.rotation':{x:0.129, y:-0.285, z:-0.163}, 'LeftHandThumb3.rotation':{x:-0.047, y:0.068, z:0.401}, 'LeftHandIndex1.rotation':{x:1.412, y:-0.102, z:-0.152}, 'LeftHandIndex2.rotation':{x:1.903, y:-0.16, z:-0.114}, 'LeftHandIndex3.rotation':{x:0.535, y:-0.017, z:-0.062}, 'LeftHandMiddle1.rotation':{x:1.424, y:-0.103, z:-0.12}, 'LeftHandMiddle2.rotation':{x:1.919, y:-0.162, z:-0.114}, 'LeftHandMiddle3.rotation':{x:0.44, y:-0.012, z:-0.051}, 'LeftHandRing1.rotation':{x:1.619, y:-0.127, z:-0.053}, 'LeftHandRing2.rotation':{x:1.898, y:-0.16, z:-0.115}, 'LeftHandRing3.rotation':{x:0.262, y:-0.004, z:-0.031}, 'LeftHandPinky1.rotation':{x:1.661, y:-0.131, z:-0.016}, 'LeftHandPinky2.rotation':{x:1.715, y:-0.067, z:-0.13}, 'LeftHandPinky3.rotation':{x:0.627, y:-0.023, z:-0.071}
      },
      'thumbdown': {
        'LeftShoulder.rotation':{x:[1.5,2,1,2], y:[0.2,0.4,1,2], z:[-1.5,-1.3,1,2]}, 'LeftArm.rotation':{x:[1.5,1.7,1,2], y:[-0.6,-0.4,1,2], z:[1,1.2,1,2]}, 'LeftForeArm.rotation':{x:-2.015, y:0.406, z:1.575}, 'LeftHand.rotation':{x:-0.176, y:-0.206, z:-0.208}, 'LeftHandThumb1.rotation':{x:0.208, y:-0.189, z:0.685}, 'LeftHandThumb2.rotation':{x:0.129, y:-0.285, z:-0.163}, 'LeftHandThumb3.rotation':{x:-0.047, y:0.068, z:0.401}, 'LeftHandIndex1.rotation':{x:1.412, y:-0.102, z:-0.152}, 'LeftHandIndex2.rotation':{x:1.903, y:-0.16, z:-0.114}, 'LeftHandIndex3.rotation':{x:0.535, y:-0.017, z:-0.062}, 'LeftHandMiddle1.rotation':{x:1.424, y:-0.103, z:-0.12}, 'LeftHandMiddle2.rotation':{x:1.919, y:-0.162, z:-0.114}, 'LeftHandMiddle3.rotation':{x:0.44, y:-0.012, z:-0.051}, 'LeftHandRing1.rotation':{x:1.619, y:-0.127, z:-0.053}, 'LeftHandRing2.rotation':{x:1.898, y:-0.16, z:-0.115}, 'LeftHandRing3.rotation':{x:0.262, y:-0.004, z:-0.031}, 'LeftHandPinky1.rotation':{x:1.661, y:-0.131, z:-0.016}, 'LeftHandPinky2.rotation':{x:1.715, y:-0.067, z:-0.13}, 'LeftHandPinky3.rotation':{x:0.627, y:-0.023, z:-0.071}
      },
      'side': {
        'LeftShoulder.rotation':{x:1.755, y:-0.035, z:-1.63}, 'LeftArm.rotation':{x:1.263, y:-0.955, z:1.024}, 'LeftForeArm.rotation':{x:0, y:0, z:0.8}, 'LeftHand.rotation':{x:-0.36, y:-1.353, z:-0.184}, 'LeftHandThumb1.rotation':{x:0.137, y:-0.049, z:0.863}, 'LeftHandThumb2.rotation':{x:-0.293, y:0.153, z:-0.193}, 'LeftHandThumb3.rotation':{x:-0.271, y:-0.17, z:0.18}, 'LeftHandIndex1.rotation':{x:-0.018, y:0.007, z:0.28}, 'LeftHandIndex2.rotation':{x:0.247, y:-0.003, z:-0.025}, 'LeftHandIndex3.rotation':{x:0.13, y:-0.001, z:-0.013}, 'LeftHandMiddle1.rotation':{x:0.333, y:-0.015, z:0.182}, 'LeftHandMiddle2.rotation':{x:0.313, y:-0.005, z:-0.032}, 'LeftHandMiddle3.rotation':{x:0.294, y:-0.004, z:-0.03}, 'LeftHandRing1.rotation':{x:0.456, y:-0.028, z:-0.092}, 'LeftHandRing2.rotation':{x:0.53, y:-0.014, z:-0.052}, 'LeftHandRing3.rotation':{x:0.478, y:-0.012, z:-0.047}, 'LeftHandPinky1.rotation':{x:0.647, y:-0.049, z:-0.184}, 'LeftHandPinky2.rotation':{x:0.29, y:-0.004, z:-0.029}, 'LeftHandPinky3.rotation':{x:0.501, y:-0.013, z:-0.049}
      },
      'shrug': {
        'Neck.rotation':{x:[-0.3,0.3,1,2], y:[-0.3,0.3,1,2], z:[-0.1,0.1]}, 'Head.rotation':{x:[-0.3,0.3], y:[-0.3,0.3], z:[-0.1,0.1]}, 'RightShoulder.rotation':{x:1.732, y:-0.058, z:1.407}, 'RightArm.rotation':{x:1.305, y:0.46, z:0.118}, 'RightForeArm.rotation':{x:[0,2.0], y:[-1,0.2], z:-1.637}, 'RightHand.rotation':{x:-0.048, y:0.165, z:-0.39}, 'RightHandThumb1.rotation':{x:1.467, y:0.599, z:-1.315}, 'RightHandThumb2.rotation':{x:-0.255, y:-0.123, z:0.119}, 'RightHandThumb3.rotation':{x:0, y:-0.002, z:0}, 'RightHandIndex1.rotation':{x:-0.293, y:-0.066, z:-0.112}, 'RightHandIndex2.rotation':{x:0.181, y:0.007, z:0.069}, 'RightHandIndex3.rotation':{x:0, y:0, z:0}, 'RightHandMiddle1.rotation':{x:-0.063, y:-0.041, z:0.032}, 'RightHandMiddle2.rotation':{x:0.149, y:0.005, z:0.05}, 'RightHandMiddle3.rotation':{x:0, y:0, z:0}, 'RightHandRing1.rotation':{x:0.152, y:-0.03, z:0.132}, 'RightHandRing2.rotation':{x:0.194, y:0.007, z:0.058}, 'RightHandRing3.rotation':{x:0, y:0, z:0}, 'RightHandPinky1.rotation':{x:0.306, y:-0.015, z:0.257}, 'RightHandPinky2.rotation':{x:0.15, y:-0.003, z:-0.003}, 'RightHandPinky3.rotation':{x:0, y:0, z:0}, 'LeftShoulder.rotation':{x:1.713, y:0.141, z:-1.433}, 'LeftArm.rotation':{x:1.136, y:-0.422, z:-0.416}, 'LeftForeArm.rotation':{x:1.42, y:0.123, z:1.506}, 'LeftHand.rotation':{x:0.073, y:-0.138, z:0.064}, 'LeftHandThumb1.rotation':{x:1.467, y:-0.599, z:1.314}, 'LeftHandThumb2.rotation':{x:-0.255, y:0.123, z:-0.119}, 'LeftHandThumb3.rotation':{x:0, y:0.001, z:0}, 'LeftHandIndex1.rotation':{x:-0.293, y:0.066, z:0.112}, 'LeftHandIndex2.rotation':{x:0.181, y:-0.007, z:-0.069}, 'LeftHandIndex3.rotation':{x:0, y:0, z:0}, 'LeftHandMiddle1.rotation':{x:-0.062, y:0.041, z:-0.032}, 'LeftHandMiddle2.rotation':{x:0.149, y:-0.005, z:-0.05}, 'LeftHandMiddle3.rotation':{x:0, y:0, z:0}, 'LeftHandRing1.rotation':{x:0.152, y:0.03, z:-0.132}, 'LeftHandRing2.rotation':{x:0.194, y:-0.007, z:-0.058}, 'LeftHandRing3.rotation':{x:0, y:0, z:0}, 'LeftHandPinky1.rotation':{x:0.306, y:0.015, z:-0.257}, 'LeftHandPinky2.rotation':{x:0.15, y:0.003, z:0.003}, 'LeftHandPinky3.rotation':{x:0, y:0, z:0}
      },
      'namaste': {
        'RightShoulder.rotation':{x:1.758, y:0.099, z:1.604}, 'RightArm.rotation':{x:0.862, y:-0.292, z:-0.932}, 'RightForeArm.rotation':{x:0.083, y:0.066, z:-1.791}, 'RightHand.rotation':{x:-0.52, y:-0.001, z:-0.176}, 'RightHandThumb1.rotation':{x:0.227, y:0.418, z:-0.776}, 'RightHandThumb2.rotation':{x:-0.011, y:-0.003, z:0.171}, 'RightHandThumb3.rotation':{x:-0.041, y:-0.001, z:-0.013}, 'RightHandIndex1.rotation':{x:-0.236, y:0.003, z:-0.028}, 'RightHandIndex2.rotation':{x:0.004, y:0, z:0.001}, 'RightHandIndex3.rotation':{x:0.002, y:0, z:0}, 'RightHandMiddle1.rotation':{x:-0.236, y:0.003, z:-0.028}, 'RightHandMiddle2.rotation':{x:0.004, y:0, z:0.001}, 'RightHandMiddle3.rotation':{x:0.002, y:0, z:0}, 'RightHandRing1.rotation':{x:-0.236, y:0.003, z:-0.028}, 'RightHandRing2.rotation':{x:0.004, y:0, z:0.001}, 'RightHandRing3.rotation':{x:0.002, y:0, z:0}, 'RightHandPinky1.rotation':{x:-0.236, y:0.003, z:-0.028}, 'RightHandPinky2.rotation':{x:0.004, y:0, z:0.001}, 'RightHandPinky3.rotation':{x:0.002, y:0, z:0}, 'LeftShoulder.rotation':{x:1.711, y:-0.002, z:-1.625}, 'LeftArm.rotation':{x:0.683, y:0.334, z:0.977}, 'LeftForeArm.rotation':{x:0.086, y:-0.066, z:1.843}, 'LeftHand.rotation':{x:-0.595, y:-0.229, z:0.096}, 'LeftHandThumb1.rotation':{x:0.404, y:-0.05, z:0.537}, 'LeftHandThumb2.rotation':{x:-0.02, y:0.004, z:-0.154}, 'LeftHandThumb3.rotation':{x:-0.049, y:0.002, z:-0.019}, 'LeftHandIndex1.rotation':{x:-0.113, y:-0.001, z:0.014}, 'LeftHandIndex2.rotation':{x:0.003, y:0, z:0}, 'LeftHandIndex3.rotation':{x:0.002, y:0, z:0}, 'LeftHandMiddle1.rotation':{x:-0.113, y:-0.001, z:0.014}, 'LeftHandMiddle2.rotation':{x:0.004, y:0, z:0}, 'LeftHandMiddle3.rotation':{x:0.002, y:0, z:0}, 'LeftHandRing1.rotation':{x:-0.113, y:-0.001, z:0.014}, 'LeftHandRing2.rotation':{x:0.003, y:0, z:0}, 'LeftHandRing3.rotation':{x:0.002, y:0, z:0}, 'LeftHandPinky1.rotation':{x:-0.122, y:-0.001, z:-0.057}, 'LeftHandPinky2.rotation':{x:0.012, y:0.001, z:0.07}, 'LeftHandPinky3.rotation':{x:0.002, y:0, z:0}
      }
    }


    // Pose deltas
    // NOTE: In this object (x,y,z) are always Euler rotations despite the name!!
    // NOTE: This object should include all the used delta properties.
    this.poseDelta = {
      props: {
        'Hips.quaternion':{x:0, y:0, z:0},'Spine.quaternion':{x:0, y:0, z:0},
        'Spine1.quaternion':{x:0, y:0, z:0}, 'Neck.quaternion':{x:0, y:0, z:0},
        'Head.quaternion':{x:0, y:0, z:0}, 'Spine1.scale':{x:0, y:0, z:0},
        'Neck.scale':{x:0, y:0, z:0}, 'LeftArm.scale':{x:0, y:0, z:0},
        'RightArm.scale':{x:0, y:0, z:0}
      }
    };
    // Add legs, arms and hands
    ['Left','Right'].forEach( x => {
      ['Leg','UpLeg','Arm','ForeArm','Hand'].forEach( y => {
        this.poseDelta.props[x+y+'.quaternion'] = {x:0, y:0, z:0};
      });
      ['HandThumb', 'HandIndex','HandMiddle','HandRing', 'HandPinky'].forEach( y => {
        this.poseDelta.props[x+y+'1.quaternion'] = {x:0, y:0, z:0};
        this.poseDelta.props[x+y+'2.quaternion'] = {x:0, y:0, z:0};
        this.poseDelta.props[x+y+'3.quaternion'] = {x:0, y:0, z:0};
      });
    })

    // Dynamically pick up all the property names that we need in the code
    const names = new Set();
    Object.values(this.poseTemplates).forEach( x => {
      Object.keys( this.propsToThreeObjects(x.props) ).forEach( y => names.add(y) );
    });
    Object.keys( this.poseDelta.props ).forEach( x => {
      names.add(x)
    });
    this.posePropNames = [...names];

    // Use "side" as the first pose, weight on left leg
    this.poseName = "side"; // First pose
    this.poseWeightOnLeft = true; // Initial weight on left leg
    this.gesture = null; // Values that override pose properties
    this.poseCurrentTemplate = this.poseTemplates[this.poseName];
    this.poseStraight = this.propsToThreeObjects( this.poseTemplates["straight"].props ); // Straight pose used as a reference
    this.poseBase = this.poseFactory( this.poseCurrentTemplate );
    this.poseTarget = this.poseFactory( this.poseCurrentTemplate );
    this.poseAvatar = null; // Set when avatar has been loaded

    // Avatar height in meters
    // NOTE: The actual value is calculated based on the eye level on avatar load
    this.avatarHeight = 1.7;


    // Animation templates
    //
    // baseline: Describes morph target baseline. Values can be either float or
    //           an array [start,end,skew] describing a probability distribution.
    // speech  : Describes voice rate, pitch and volume as deltas to the values
    //           set as options.
    // anims   : Animations for breathing, pose, etc. To be used animation
    //           sequence is selected in the following order:
    //           1. State (idle, speaking, listening)
    //           2. Mood (moodX, moodY)
    //           3. Pose (poseX, poseY)
    //           5. View (full, upper, head)
    //           6. Body form ('M','F')
    //           7. Alt (sequence of objects with propabilities p. If p is not
    //              specified, the remaining part is shared equivally among
    //              the rest.)
    //           8. Current object
    // object  : delay, delta times dt and values vs.
    //

    this.animTemplateEyes = { name: 'eyes',
      idle: { alt: [
        {
          p: () => ( this.avatar?.hasOwnProperty('avatarIdleEyeContact') ? this.avatar.avatarIdleEyeContact : this.opt.avatarIdleEyeContact ),
          delay: [200,5000], dt: [ 200,[2000,5000],[3000,10000,1,2] ],
          vs: {
            headMove: [ this.avatar?.hasOwnProperty('avatarIdleHeadMove') ? this.avatar.avatarIdleHeadMove : this.opt.avatarIdleHeadMove ],
            eyesRotateY: [[-0.6,0.6]], eyesRotateX: [[-0.2,0.6]],
            eyeContact: [null,1]
          }
        },
        {
          delay: [200,5000], dt: [ 200,[2000,5000,1,2] ], vs: {
            headMove: [ this.avatar?.hasOwnProperty('avatarIdleHeadMove') ? this.avatar.avatarIdleHeadMove : this.opt.avatarIdleHeadMove ],
            eyesRotateY: [[-0.6,0.6]], eyesRotateX: [[-0.2,0.6]]
          }
        }
      ]},
      speaking: { alt: [
        {
          p: () => ( this.avatar?.hasOwnProperty('avatarSpeakingEyeContact') ? this.avatar.avatarSpeakingEyeContact : this.opt.avatarSpeakingEyeContact ),
          delay: [200,5000], dt: [ 0, [3000,10000,1,2], [2000,5000] ],
          vs: { eyeContact: [1,null],
            headMove: [null,( this.avatar?.hasOwnProperty('avatarSpeakingHeadMove') ? this.avatar.avatarSpeakingHeadMove : this.opt.avatarSpeakingHeadMove ),null],
            eyesRotateY: [null,[-0.6,0.6]], eyesRotateX: [null,[-0.2,0.6]]
          }
        },
        {
          delay: [200,5000], dt: [ 200,[2000,5000,1,2] ], vs: {
            headMove: [( this.avatar?.hasOwnProperty('avatarSpeakingHeadMove') ? this.avatar.avatarSpeakingHeadMove : this.opt.avatarSpeakingHeadMove ),null],
            eyesRotateY: [[-0.6,0.6]], eyesRotateX: [[-0.2,0.6]]
          }
        }
      ]}
    };
    this.animTemplateBlink = { name: 'blink', alt: [
      { p: 0.85, delay: [1000,8000,1,2], dt: [50,[100,300],100], vs: { eyeBlinkLeft: [1,1,0], eyeBlinkRight: [1,1,0] } },
      { delay: [1000,4000,1,2], dt: [50,[100,200],100,[10,400,0],50,[100,200],100], vs: { eyeBlinkLeft: [1,1,0,0,1,1,0], eyeBlinkRight: [1,1,0,0,1,1,0] } }
    ]};

    this.animMoods = {
      'neutral' : {
        baseline: { eyesLookDown: 0.1 },
        speech: { deltaRate: 0, deltaPitch: 0, deltaVolume: 0 },
        anims: [
          { name: 'breathing', delay: 1500, dt: [ 1200,500,1000 ], vs: { chestInhale: [0.5,0.5,0] } },
          { name: 'pose', alt: [
            { p: 0.5, delay: [5000,30000], vs: { pose: ['side'] } },
            { p: 0.3, delay: [5000,30000], vs: { pose: ['hip'] },
              'M': { delay: [5000,30000], vs: { pose: ['wide'] } }
            },
            { delay: [5000,30000], vs: { pose: ['straight'] } }
          ]},
          { name: 'head',
            idle: { delay: [0,1000], dt: [ [200,5000] ], vs: { bodyRotateX: [[-0.04,0.10]], bodyRotateY: [[-0.3,0.3]], bodyRotateZ: [[-0.08,0.08]] } },
            speaking: { dt: [ [0,1000,0] ], vs: { bodyRotateX: [[-0.05,0.15,1,2]], bodyRotateY: [[-0.1,0.1]], bodyRotateZ: [[-0.1,0.1]] } }
          },
          this.animTemplateEyes,
          this.animTemplateBlink,
          { name: 'mouth', delay: [1000,5000], dt: [ [100,500],[100,5000,2] ], vs : { mouthRollLower: [[0,0.3,2]], mouthRollUpper: [[0,0.3,2]], mouthStretchLeft: [[0,0.3]], mouthStretchRight: [[0,0.3]], mouthPucker: [[0,0.3]] } },
          { name: 'misc', delay: [100,5000], dt: [ [100,500],[1000,5000,2] ], vs : { eyeSquintLeft: [[0,0.3,2]], eyeSquintRight: [[0,0.3,2]], browInnerUp: [[0,0.3,2]], browOuterUpLeft: [[0,0.3,2]], browOuterUpRight: [[0,0.3,2]] } }
        ]
      },
      'happy' : {
        baseline: { mouthSmile: 0.2, eyesLookDown: 0.1 },
        speech: { deltaRate: 0, deltaPitch: 0.1, deltaVolume: 0 },
        anims: [
          { name: 'breathing', delay: 1500, dt: [ 1200,500,1000 ], vs: { chestInhale: [0.5,0.5,0] } },
          { name: 'pose',
            idle: {
              alt: [
                { p: 0.6, delay: [5000,30000], vs: { pose: ['side'] } },
                { p: 0.2, delay: [5000,30000], vs: { pose: ['hip'] },
                  'M': { delay: [5000,30000], vs: { pose: ['side'] } }
                },
                { p: 0.1, delay: [5000,30000], vs: { pose: ['straight'] } },
                { delay: [5000,10000], vs: { pose: ['wide'] } },
                { delay: [1000,3000], vs: { pose: ['turn'] } },
              ]
            },
            speaking: {
              alt: [
                { p: 0.4, delay: [5000,30000], vs: { pose: ['side'] } },
                { p: 0.4, delay: [5000,30000], vs: { pose: ['straight'] } },
                { delay: [5000,20000], vs: { pose: ['hip'] },
                  'M': { delay: [5000,30000], vs: { pose: ['wide'] } }
                },
              ]
            }
          },
          { name: 'head',
            idle: { dt: [ [1000,5000] ], vs: { bodyRotateX: [[-0.04,0.10]], bodyRotateY: [[-0.3,0.3]], bodyRotateZ: [[-0.08,0.08]] } },
            speaking: { dt: [ [0,1000,0] ], vs: { bodyRotateX: [[-0.05,0.15,1,2]], bodyRotateY: [[-0.1,0.1]], bodyRotateZ: [[-0.1,0.1]] } }
          },
          this.animTemplateEyes,
          this.animTemplateBlink,
          { name: 'mouth', delay: [1000,5000], dt: [ [100,500],[100,5000,2] ], vs : { mouthLeft: [[0,0.3,2]], mouthSmile: [[0,0.2,3]], mouthRollLower: [[0,0.3,2]], mouthRollUpper: [[0,0.3,2]], mouthStretchLeft: [[0,0.3]], mouthStretchRight: [[0,0.3]], mouthPucker: [[0,0.3]] } },
          { name: 'misc', delay: [100,5000], dt: [ [100,500],[1000,5000,2] ], vs : { eyeSquintLeft: [[0,0.3,2]], eyeSquintRight: [[0,0.3,2]], browInnerUp: [[0,0.3,2]], browOuterUpLeft: [[0,0.3,2]], browOuterUpRight: [[0,0.3,2]] } }
        ]
      },
      'angry' : {
        baseline: { eyesLookDown: 0.1, browDownLeft: 0.6, browDownRight: 0.6, jawForward: 0.3, mouthFrownLeft: 0.7, mouthFrownRight: 0.7, mouthRollLower: 0.2, mouthShrugLower: 0.3, handFistLeft: 1, handFistRight: 1 },
        speech: { deltaRate: -0.2, deltaPitch: 0.2, deltaVolume: 0 },
        anims: [
          { name: 'breathing', delay: 500, dt: [ 1000,500,1000 ], vs: { chestInhale: [0.7,0.7,0] } },
          { name: 'pose', alt: [
            { p: 0.4, delay: [5000,30000], vs: { pose: ['side'] } },
            { p: 0.4, delay: [5000,30000], vs: { pose: ['straight'] } },
            { p: 0.2, delay: [5000,30000], vs: { pose: ['hip'] },
              'M': { delay: [5000,30000], vs: { pose: ['wide'] } }
            },
          ]},
          { name: 'head',
            idle: { delay: [100,500], dt: [ [200,5000] ], vs: { bodyRotateX: [[-0.04,0.10]], bodyRotateY: [[-0.2,0.2]], bodyRotateZ: [[-0.08,0.08]] } },
            speaking: { dt: [ [0,1000,0] ], vs: { bodyRotateX: [[-0.05,0.15,1,2]], bodyRotateY: [[-0.1,0.1]], bodyRotateZ: [[-0.1,0.1]] } }
          },
          this.animTemplateEyes,
          this.animTemplateBlink,
          { name: 'mouth', delay: [1000,5000], dt: [ [100,500],[100,5000,2] ], vs : { mouthRollLower: [[0,0.3,2]], mouthRollUpper: [[0,0.3,2]], mouthStretchLeft: [[0,0.3]], mouthStretchRight: [[0,0.3]], mouthPucker: [[0,0.3]] } },
          { name: 'misc', delay: [100,5000], dt: [ [100,500],[1000,5000,2] ], vs : { eyeSquintLeft: [[0,0.3,2]], eyeSquintRight: [[0,0.3,2]], browInnerUp: [[0,0.3,2]], browOuterUpLeft: [[0,0.3,2]], browOuterUpRight: [[0,0.3,2]] } }
        ]
      },
      'sad' : {
        baseline: { eyesLookDown: 0.2, browDownRight: 0.1, browInnerUp: 0.6, browOuterUpRight: 0.2, eyeSquintLeft: 0.7, eyeSquintRight: 0.7, mouthFrownLeft: 0.8, mouthFrownRight: 0.8, mouthLeft: 0.2, mouthPucker: 0.5, mouthRollLower: 0.2, mouthRollUpper: 0.2, mouthShrugLower: 0.2, mouthShrugUpper: 0.2, mouthStretchLeft: 0.4 },
        speech: { deltaRate: -0.2, deltaPitch: -0.2, deltaVolume: 0 },
        anims: [
          { name: 'breathing', delay: 1500, dt: [ 1000,500,1000 ], vs: { chestInhale: [0.3,0.3,0] } },
          { name: 'pose', alt: [
            { p: 0.4, delay: [5000,30000], vs: { pose: ['side'] } },
            { p: 0.4, delay: [5000,30000], vs: { pose: ['straight'] } },
            { delay: [5000,20000], vs: { pose: ['side'] },
              full: { delay: [5000,20000], vs: { pose: ['oneknee'] } }
            },
          ]},
          { name: 'head',
            idle: { delay: [100,500], dt: [ [200,5000] ], vs: { bodyRotateX: [[-0.04,0.10]], bodyRotateY: [[-0.2,0.2]], bodyRotateZ: [[-0.08,0.08]] } },
            speaking: { dt: [ [0,1000,0] ], vs: { bodyRotateX: [[-0.05,0.15,1,2]], bodyRotateY: [[-0.1,0.1]], bodyRotateZ: [[-0.1,0.1]] } }
          },
          this.animTemplateEyes,
          this.animTemplateBlink,
          { name: 'mouth', delay: [1000,5000], dt: [ [100,500],[100,5000,2] ], vs : { mouthRollLower: [[0,0.3,2]], mouthRollUpper: [[0,0.3,2]], mouthStretchLeft: [[0,0.3]], mouthStretchRight: [[0,0.3]], mouthPucker: [[0,0.3]] } },
          { name: 'misc', delay: [100,5000], dt: [ [100,500],[1000,5000,2] ], vs : { eyeSquintLeft: [[0,0.3,2]], eyeSquintRight: [[0,0.3,2]], browInnerUp: [[0,0.3,2]], browOuterUpLeft: [[0,0.3,2]], browOuterUpRight: [[0,0.3,2]] } }
        ]
      },
      'fear' : {
        baseline: { browInnerUp: 0.7, eyeSquintLeft: 0.5, eyeSquintRight: 0.5, eyeWideLeft: 0.6, eyeWideRight: 0.6, mouthClose: 0.1, mouthFunnel: 0.3, mouthShrugLower: 0.5, mouthShrugUpper: 0.5 },
        speech: { deltaRate: -0.2, deltaPitch: 0, deltaVolume: 0 },
        anims: [
          { name: 'breathing', delay: 500, dt: [ 1000,500,1000 ], vs: { chestInhale: [0.7,0.7,0] } },
          { name: 'pose', alt: [
            { p: 0.8, delay: [5000,30000], vs: { pose: ['side'] } },
            { delay: [5000,30000], vs: { pose: ['straight'] } },
            { delay: [5000,20000], vs: { pose: ['wide'] } },
            { delay: [5000,20000], vs: { pose: ['side'] },
              full: { delay: [5000,20000], vs: { pose: ['oneknee'] } }
            },
          ]},
          { name: 'head',
            idle: { delay: [100,500], dt: [ [200,3000] ], vs: { bodyRotateX: [[-0.06,0.12]], bodyRotateY: [[-0.7,0.7]], bodyRotateZ: [[-0.1,0.1]] } },
            speaking: { dt: [ [0,1000,0] ], vs: { bodyRotateX: [[-0.05,0.15,1,2]], bodyRotateY: [[-0.1,0.1]], bodyRotateZ: [[-0.1,0.1]] } }
          },
          this.animTemplateEyes,
          this.animTemplateBlink,
          { name: 'mouth', delay: [1000,5000], dt: [ [100,500],[100,5000,2] ], vs : { mouthRollLower: [[0,0.3,2]], mouthRollUpper: [[0,0.3,2]], mouthStretchLeft: [[0,0.3]], mouthStretchRight: [[0,0.3]], mouthPucker: [[0,0.3]] } },
          { name: 'misc', delay: [100,5000], dt: [ [100,500],[1000,5000,2] ], vs : { eyeSquintLeft: [[0,0.3,2]], eyeSquintRight: [[0,0.3,2]], browInnerUp: [[0,0.3,2]], browOuterUpLeft: [[0,0.3,2]], browOuterUpRight: [[0,0.3,2]] } }
        ]
      },
      'disgust' : {
        baseline: { browDownLeft: 0.7, browDownRight: 0.1, browInnerUp: 0.3, eyeSquintLeft: 1, eyeSquintRight: 1, eyeWideLeft: 0.5, eyeWideRight: 0.5, eyesRotateX: 0.05, mouthLeft: 0.4, mouthPressLeft: 0.3, mouthRollLower: 0.3, mouthShrugLower: 0.3, mouthShrugUpper: 0.8, mouthUpperUpLeft: 0.3, noseSneerLeft: 1, noseSneerRight: 0.7 },
        speech: { deltaRate: -0.2, deltaPitch: 0, deltaVolume: 0 },
        anims: [
          { name: 'breathing', delay: 1500, dt: [ 1000,500,1000 ], vs: { chestInhale: [0.5,0.5,0] } },
          { name: 'pose', alt: [
            { delay: [5000,20000], vs: { pose: ['side'] } },
          ]},
          { name: 'head',
            idle: { delay: [100,500], dt: [ [200,5000] ], vs: { bodyRotateX: [[-0.04,0.10]], bodyRotateY: [[-0.2,0.2]], bodyRotateZ: [[-0.08,0.08]] } },
            speaking: { dt: [ [0,1000,0] ], vs: { bodyRotateX: [[-0.05,0.15,1,2]], bodyRotateY: [[-0.1,0.1]], bodyRotateZ: [[-0.1,0.1]] } }
          },
          this.animTemplateEyes,
          this.animTemplateBlink,
          { name: 'mouth', delay: [1000,5000], dt: [ [100,500],[100,5000,2] ], vs : { mouthRollLower: [[0,0.3,2]], mouthRollUpper: [[0,0.3,2]], mouthStretchLeft: [[0,0.3]], mouthStretchRight: [[0,0.3]], mouthPucker: [[0,0.3]] } },
          { name: 'misc', delay: [100,5000], dt: [ [100,500],[1000,5000,2] ], vs : { eyeSquintLeft: [[0,0.3,2]], eyeSquintRight: [[0,0.3,2]], browInnerUp: [[0,0.3,2]], browOuterUpLeft: [[0,0.3,2]], browOuterUpRight: [[0,0.3,2]] } }
        ]
      },
      'love' : {
        baseline: { browInnerUp: 0.4, browOuterUpLeft: 0.2, browOuterUpRight: 0.2, mouthSmile: 0.2, eyeBlinkLeft: 0.6, eyeBlinkRight: 0.6, eyeWideLeft: 0.7, eyeWideRight: 0.7, bodyRotateX: 0.1, mouthDimpleLeft: 0.1, mouthDimpleRight: 0.1, mouthPressLeft: 0.2, mouthShrugUpper: 0.2, mouthUpperUpLeft: 0.1, mouthUpperUpRight: 0.1 },
        speech: { deltaRate: -0.1, deltaPitch: -0.7, deltaVolume: 0 },
        anims: [
          { name: 'breathing', delay: 1500, dt: [ 1500,500,1500 ], vs: { chestInhale: [0.8,0.8,0] } },
          { name: 'pose', alt: [
            { p: 0.4, delay: [5000,30000], vs: { pose: ['side'] } },
            { p: 0.2, delay: [5000,30000], vs: { pose: ['straight'] } },
            { p: 0.2, delay: [5000,30000], vs: { pose: ['hip'] },
              'M': { delay: [5000,30000], vs: { pose: ['side'] } }
            },
            { delay: [5000,10000], vs: { pose: ['side'] },
              full: { delay: [5000,10000], vs: { pose: ['kneel'] } }
            },
            { delay: [1000,3000], vs: { pose: ['turn'] },
              'M': { delay: [1000,3000], vs: { pose: ['wide'] } }
            },
            { delay: [1000,3000], vs: { pose: ['back'] },
              'M': { delay: [1000,3000], vs: { pose: ['wide'] } }
            },
            { delay: [5000,20000], vs: { pose: ['side'] },
              'M': { delay: [5000,20000], vs: { pose: ['side'] } },
              full: { delay: [5000,20000], vs: { pose: ['bend'] } }
            },
            { delay: [1000,3000], vs: { pose: ['side'] },
              full: { delay: [5000,10000], vs: { pose: ['oneknee'] } }
            },
          ]},
          { name: 'head',
            idle: { dt: [ [1000,5000] ], vs: { bodyRotateX: [[-0.04,0.10]], bodyRotateY: [[-0.3,0.3]], bodyRotateZ: [[-0.08,0.08]] } },
            speaking: { dt: [ [0,1000,0] ], vs: { bodyRotateX: [[-0.05,0.15,1,2]], bodyRotateY: [[-0.1,0.1]], bodyRotateZ: [[-0.1,0.1]] } }
          },
          this.animTemplateEyes,
          this.deepCopy(this.animTemplateBlink,(o) => { o.alt[0].delay[0] = o.alt[1].delay[0] = 2000; }),
          { name: 'mouth', delay: [1000,5000], dt: [ [100,500],[100,5000,2] ], vs : { mouthLeft: [[0,0.3,2]], mouthRollLower: [[0,0.3,2]], mouthRollUpper: [[0,0.3,2]], mouthStretchLeft: [[0,0.3]], mouthStretchRight: [[0,0.3]], mouthPucker: [[0,0.3]] } },
          { name: 'misc', delay: [100,5000], dt: [ [500,1000],[1000,5000,2] ], vs : { eyeSquintLeft: [[0,0.3,2]], eyeSquintRight: [[0,0.3,2]], browInnerUp: [[0.3,0.6,2]], browOuterUpLeft: [[0.1,0.3,2]], browOuterUpRight: [[0.1,0.3,2]] } }
        ]
      },
      'sleep' : {
        baseline: { eyeBlinkLeft: 1, eyeBlinkRight: 1, eyesClosed: 0.6 },
        speech: { deltaRate: 0, deltaPitch: -0.2, deltaVolume: 0 },
        anims: [
          { name: 'breathing', delay: 1500, dt: [ 1000,500,1000 ], vs: { chestInhale: [0.6,0.6,0] } },
          { name: 'pose', alt: [
            { delay: [5000,20000], vs: { pose: ['side'] } }
          ]},
          { name: 'head', delay: [1000,5000], dt: [ [2000,10000] ], vs: { bodyRotateX: [[0,0.4]], bodyRotateY: [[-0.1,0.1]], bodyRotateZ: [[-0.04,0.04]] } },
          { name: 'eyes', delay: 10010, dt: [], vs: {} },
          { name: 'blink', delay: 10020, dt: [], vs: {} },
          { name: 'mouth', delay: 10030, dt: [], vs: {} },
          { name: 'misc', delay: 10040, dt: [], vs: {} }
        ]
      }
    };
    this.moodName = this.opt.avatarMood || "neutral";
    this.mood = this.animMoods[ this.moodName ];
    if ( !this.mood ) {
      this.moodName = "neutral";
      this.mood = this.animMoods["neutral"];
    }

    // Animation templates for emojis
    this.animEmojis = {

      '😐': { dt: [300,2000], rescale: [0,1], vs: { pose: ['straight'], browInnerUp: [0.4], eyeWideLeft: [0.7], eyeWideRight: [0.7], mouthPressLeft: [0.6], mouthPressRight: [0.6], mouthRollLower: [0.3], mouthStretchLeft: [1], mouthStretchRight: [1] } },
      '😶': { link:  '😐' },
      '😏': { dt: [300,2000], rescale: [0,1], vs: { eyeContact: [0], browDownRight: [0.1], browInnerUp: [0.7], browOuterUpRight: [0.2], eyeLookInRight: [0.7], eyeLookOutLeft: [0.7], eyeSquintLeft: [1], eyeSquintRight: [0.8], eyesRotateY: [0.7], mouthLeft: [0.4], mouthPucker: [0.4], mouthShrugLower: [0.3], mouthShrugUpper: [0.2], mouthSmile: [0.2], mouthSmileLeft: [0.4], mouthSmileRight: [0.2], mouthStretchLeft: [0.5], mouthUpperUpLeft: [0.6], noseSneerLeft: [0.7] } },
      '🙂': { dt: [300,2000], rescale: [0,1], vs: { mouthSmile: [0.5] } },
      '🙃': { link:  '🙂' },
      '😊': { dt: [300,2000], rescale: [0,1], vs: { browInnerUp: [0.6], eyeSquintLeft: [1], eyeSquintRight: [1], mouthSmile: [0.7], noseSneerLeft: [0.7], noseSneerRight: [0.7]} },
      '😇': { link:  '😊' },
      '😀': { dt: [300,2000], rescale: [0,1], vs: { browInnerUp: [0.6], jawOpen: [0.1], mouthDimpleLeft: [0.2], mouthDimpleRight: [0.2], mouthOpen: [0.3], mouthPressLeft: [0.3], mouthPressRight: [0.3], mouthRollLower: [0.4], mouthShrugUpper: [0.4], mouthSmile: [0.7], mouthUpperUpLeft: [0.3], mouthUpperUpRight: [0.3], noseSneerLeft: [0.4], noseSneerRight: [0.4] }},
      '😃': { dt: [300,2000], rescale: [0,1], vs: { browInnerUp: [0.6], eyeWideLeft: [0.7], eyeWideRight: [0.7], jawOpen: [0.1], mouthDimpleLeft: [0.2], mouthDimpleRight: [0.2], mouthOpen: [0.3], mouthPressLeft: [0.3], mouthPressRight: [0.3], mouthRollLower: [0.4], mouthShrugUpper: [0.4], mouthSmile: [0.7], mouthUpperUpLeft: [0.3], mouthUpperUpRight: [0.3], noseSneerLeft: [0.4], noseSneerRight: [0.4] } },
      '😄': { dt: [300,2000], rescale: [0,1], vs: { browInnerUp: [0.3], eyeSquintLeft: [1], eyeSquintRight: [1], jawOpen: [0.2], mouthDimpleLeft: [0.2], mouthDimpleRight: [0.2], mouthOpen: [0.3], mouthPressLeft: [0.3], mouthPressRight: [0.3], mouthRollLower: [0.4], mouthShrugUpper: [0.4], mouthSmile: [0.7], mouthUpperUpLeft: [0.3], mouthUpperUpRight: [0.3], noseSneerLeft: [0.4], noseSneerRight: [0.4] } },
      '😁': { dt: [300,2000], rescale: [0,1], vs: { browInnerUp: [0.3], eyeSquintLeft: [1], eyeSquintRight: [1], jawOpen: [0.3], mouthDimpleLeft: [0.2], mouthDimpleRight: [0.2], mouthPressLeft: [0.5], mouthPressRight: [0.5], mouthShrugUpper: [0.4], mouthSmile: [0.7], mouthUpperUpLeft: [0.3], mouthUpperUpRight: [0.3], noseSneerLeft: [0.4], noseSneerRight: [0.4] } },
      '😆': { dt: [300,2000], rescale: [0,1], vs: { browInnerUp: [0.3], eyeSquintLeft: [1], eyeSquintRight: [1], eyesClosed: [0.6], jawOpen: [0.3], mouthDimpleLeft: [0.2], mouthDimpleRight: [0.2], mouthPressLeft: [0.5], mouthPressRight: [0.5], mouthShrugUpper: [0.4], mouthSmile: [0.7], mouthUpperUpLeft: [0.3], mouthUpperUpRight: [0.3], noseSneerLeft: [0.4], noseSneerRight: [0.4] } },
      '😝': { dt: [300,100,1500,500,500], rescale: [0,0,1,0,0], vs: { browInnerUp: [0.8], eyesClosed: [1], jawOpen: [0.7], mouthFunnel: [0.5], mouthSmile: [1], tongueOut: [0,1,1,0] } },
      '😋': { link:  '😝' }, '😛': { link:  '😝' }, '😛': { link:  '😝' }, '😜': { link:  '😝' }, '🤪': { link:  '😝' },
      '😂': { dt: [300,2000], rescale: [0,1], vs: { browInnerUp: [0.3], eyeSquintLeft: [1], eyeSquintRight: [1], eyesClosed: [0.6], jawOpen: [0.3], mouthDimpleLeft: [0.2], mouthDimpleRight: [0.2], mouthPressLeft: [0.5], mouthPressRight: [0.5], mouthShrugUpper: [0.4], mouthSmile: [0.7], mouthUpperUpLeft: [0.3], mouthUpperUpRight: [0.3], noseSneerLeft: [0.4], noseSneerRight: [0.4] } },
      '🤣': { link:  '😂' }, '😅': { link:  '😂' },
      '😉': { dt: [500,200,500,500], rescale: [0,0,0,1], vs: { mouthSmile: [0.5], mouthOpen: [0.2], mouthSmileLeft: [0,0.5,0], eyeBlinkLeft: [0,0.7,0], eyeBlinkRight: [0,0,0], bodyRotateX: [0.05,0.05,0.05,0], bodyRotateZ: [-0.05,-0.05,-0.05,0], browDownLeft: [0,0.7,0], cheekSquintLeft: [0,0.7,0], eyeSquintLeft: [0,1,0], eyesClosed: [0] } },

      '😭': { dt: [1000,1000], rescale: [0,1], vs: { browInnerUp: [1], eyeSquintLeft: [1], eyeSquintRight: [1], eyesClosed: [0.1], jawOpen: [0], mouthFrownLeft: [1], mouthFrownRight: [1], mouthOpen: [0.5], mouthPucker: [0.5], mouthUpperUpLeft: [0.6], mouthUpperUpRight: [0.6] } },
      '🥺': { dt: [1000,1000], rescale: [0,1], vs: { browDownLeft: [0.2], browDownRight: [0.2], browInnerUp: [1], eyeWideLeft: [0.9], eyeWideRight: [0.9], eyesClosed: [0.1], mouthClose: [0.2], mouthFrownLeft: [1], mouthFrownRight: [1], mouthPressLeft: [0.4], mouthPressRight: [0.4], mouthPucker: [1], mouthRollLower: [0.6], mouthRollUpper: [0.2], mouthUpperUpLeft: [0.8], mouthUpperUpRight: [0.8] } },
      '😞': { dt: [1000,1000], rescale: [0,1], vs: { browInnerUp: [0.7], eyeSquintLeft: [1], eyeSquintRight: [1], eyesClosed: [0.5], bodyRotateX: [0.3], mouthClose: [0.2], mouthFrownLeft: [1], mouthFrownRight: [1], mouthPucker: [1], mouthRollLower: [1], mouthShrugLower: [0.2], mouthUpperUpLeft: [0.8], mouthUpperUpRight: [0.8] } },
      '😔': { dt: [1000,1000], rescale: [0,1], vs: { browInnerUp: [1], eyeSquintLeft: [1], eyeSquintRight: [1], eyesClosed: [0.5], bodyRotateX: [0.3], mouthClose: [0.2], mouthFrownLeft: [1], mouthFrownRight: [1], mouthPressLeft: [0.4], mouthPressRight: [0.4], mouthPucker: [1], mouthRollLower: [0.6], mouthRollUpper: [0.2], mouthUpperUpLeft: [0.8], mouthUpperUpRight: [0.8] } },
      '😳': { dt: [1000,1000], rescale: [0,1], vs: { browInnerUp: [1], eyeWideLeft: [0.5], eyeWideRight: [0.5], eyesRotateY: [0.05], eyesRotateX: [0.05], mouthClose: [0.2], mouthFunnel: [0.5], mouthPucker: [0.4], mouthRollLower: [0.4], mouthRollUpper: [0.4] } },
      '☹️': { dt: [500,1500], rescale: [0,1], vs: { mouthFrownLeft: [1], mouthFrownRight: [1], mouthPucker: [0.1], mouthRollLower: [0.8] } },

      '😚': { dt: [500,1000,1000], rescale: [0,1,0], vs: { browInnerUp: [0.6], eyeBlinkLeft: [1], eyeBlinkRight: [1], eyeSquintLeft: [1], eyeSquintRight: [1], mouthPucker: [0,0.5], noseSneerLeft: [0,0.7], noseSneerRight: [0,0.7], viseme_U: [0,1] } },
      '😘': { dt: [500,500,200,500], rescale: [0,0,0,1], vs: { browInnerUp: [0.6], eyeBlinkLeft: [0,0,1,0], eyeBlinkRight: [0], eyesRotateY: [0], bodyRotateY: [0], bodyRotateX: [0,0.05,0.05,0], bodyRotateZ: [0,-0.05,-0.05,0], eyeSquintLeft: [1], eyeSquintRight: [1], mouthPucker: [0,0.5,0], noseSneerLeft: [0,0.7], noseSneerRight: [0.7], viseme_U: [0,1] } },
      '🥰': { dt: [1000,1000], rescale: [0,1], vs: { browInnerUp: [0.6], eyeSquintLeft: [1], eyeSquintRight: [1], mouthSmile: [0.7], noseSneerLeft: [0.7], noseSneerRight: [0.7] } },
      '😍': { dt: [1000,1000], rescale: [0,1], vs: { browInnerUp: [0.6], jawOpen: [0.1], mouthDimpleLeft: [0.2], mouthDimpleRight: [0.2], mouthOpen: [0.3], mouthPressLeft: [0.3], mouthPressRight: [0.3], mouthRollLower: [0.4], mouthShrugUpper: [0.4], mouthSmile: [0.7], mouthUpperUpLeft: [0.3], mouthUpperUpRight: [0.3], noseSneerLeft: [0.4], noseSneerRight: [0.4] } },
      '🤩': { link:  '😍' },

      '😡': { dt: [1000,1500], rescale: [0,1], vs: { browDownLeft: [1], browDownRight: [1], eyesLookUp: [0.2], jawForward: [0.3], mouthFrownLeft: [1], mouthFrownRight: [1], bodyRotateX: [0.15] } },
      '😠': { dt: [1000,1500], rescale: [0,1], vs: { browDownLeft: [1], browDownRight: [1], eyesLookUp: [0.2], jawForward: [0.3], mouthFrownLeft: [1], mouthFrownRight: [1], bodyRotateX: [0.15] } },
      '🤬': { link:  '😠' },
      '😒': { dt: [1000,1000], rescale: [0,1], vs: { eyeContact: [0], browDownRight: [0.1], browInnerUp: [0.7], browOuterUpRight: [0.2], eyeLookInRight: [0.7], eyeLookOutLeft: [0.7], eyeSquintLeft: [1], eyeSquintRight: [0.8], eyesRotateY: [0.7], mouthFrownLeft: [1], mouthFrownRight: [1], mouthLeft: [0.2], mouthPucker: [0.5], mouthRollLower: [0.2], mouthRollUpper: [0.2], mouthShrugLower: [0.2], mouthShrugUpper: [0.2], mouthStretchLeft: [0.5] } },

      '😱': { dt: [500,1500], rescale: [0,1], vs: { browInnerUp: [0.8], eyeWideLeft: [0.5], eyeWideRight: [0.5], jawOpen: [0.7], mouthFunnel: [0.5] } },
      '😬': { dt: [500,1500], rescale: [0,1], vs: { browDownLeft: [1], browDownRight: [1], browInnerUp: [1], mouthDimpleLeft: [0.5], mouthDimpleRight: [0.5], mouthLowerDownLeft: [1], mouthLowerDownRight: [1], mouthPressLeft: [0.4], mouthPressRight: [0.4], mouthPucker: [0.5], mouthSmile: [0.1], mouthSmileLeft: [0.2], mouthSmileRight: [0.2], mouthStretchLeft: [1], mouthStretchRight: [1], mouthUpperUpLeft: [1], mouthUpperUpRight: [1] } },
      '🙄': { dt: [500,1500], rescale: [0,1], vs: { browInnerUp: [0.8], eyeWideLeft: [1], eyeWideRight: [1], eyesRotateX: [-0.8], bodyRotateX: [0.15], mouthPucker: [0.5], mouthRollLower: [0.6], mouthRollUpper: [0.5], mouthShrugLower: [0], mouthSmile: [0] } },
      '🤔': { dt: [500,1500], rescale: [0,1], vs: {
        browDownLeft: [1], browOuterUpRight: [1], eyeSquintLeft: [0.6],
        mouthFrownLeft: [0.7], mouthFrownRight: [0.7], mouthLowerDownLeft: [0.3],
        mouthPressRight: [0.4], mouthPucker: [0.1], mouthRight: [0.5], mouthRollLower: [0.5],
        mouthRollUpper: [0.2], handRight: [{ x: 0.1, y: 0.1, z:0.1, d:1000 }, { d:1000 }],
        handFistRight: [0.1]
      } },
      '👀': { dt: [500,1500], rescale: [0,1], vs: { eyesRotateY: [-0.8] } },

      '😴': { dt: [5000,5000], rescale: [0,1], vs:{ eyeBlinkLeft: [1], eyeBlinkRight: [1], bodyRotateX: [0.2], bodyRotateZ: [0.1] } },

      '✋': { dt: [300,2000], rescale: [0,1], vs:{ mouthSmile: [0.5], gesture: [["handup",2,true],null] } },
      '🤚': { dt: [300,2000], rescale: [0,1], vs:{ mouthSmile: [0.5], gesture: [["handup",2],null] } },
      '👋': { link:  '✋' },
      '👍': { dt: [300,2000], rescale: [0,1], vs:{ mouthSmile: [0.5], gesture: [["thumbup",2],null] } },
      '👎': { dt: [300,2000], rescale: [0,1], vs:{ browDownLeft: [1], browDownRight: [1], eyesLookUp: [0.2], jawForward: [0.3], mouthFrownLeft: [1], mouthFrownRight: [1], bodyRotateX: [0.15], gesture: [["thumbdown",2],null] } },
      '👌': { dt: [300,2000], rescale: [0,1], vs:{ mouthSmile: [0.5], gesture: [["ok",2],null] } },
      '🤷‍♂️': { dt: [1000,1500], rescale: [0,1], vs:{ gesture: [["shrug",2],null] } },
      '🤷‍♀️': { link: '🤷‍♂️' },
      '🤷': { link: '🤷‍♂️' },
      '🙏': { dt: [1500,300,1000], rescale: [0,1,0], vs:{ eyeBlinkLeft: [0,1], eyeBlinkRight: [0,1], bodyRotateX: [0], bodyRotateZ: [0.1], gesture: [["namaste",2],null] } },

      'yes': { dt: [[200,500],[200,500],[200,500],[200,500]], vs:{ headMove: [0], headRotateX: [[0.1,0.2],0.1,[0.1,0.2],0], headRotateZ: [[-0.2,0.2]] } },
      'no': { dt: [[200,500],[200,500],[200,500],[200,500],[200,500]], vs:{ headMove: [0], headRotateY: [[-0.1,-0.05],[0.05,0.1],[-0.1,-0.05],[0.05,0.1],0], headRotateZ: [[-0.2,0.2]] } }

    };

    // Morph targets
    this.mtAvatar = {};
    this.mtCustoms = [
      "handFistLeft","handFistRight",'bodyRotateX', 'bodyRotateY',
      'bodyRotateZ', 'headRotateX', 'headRotateY', 'headRotateZ','chestInhale'
    ];
    this.mtEasingDefault = this.sigmoidFactory(5); // Morph target default ease in/out
    this.mtAccDefault = 0.01; // Acceleration [rad / s^2]
    this.mtAccExceptions = {
      eyeBlinkLeft: 0.1, eyeBlinkRight: 0.1, eyeLookOutLeft: 0.1,
      eyeLookInLeft: 0.1, eyeLookOutRight: 0.1, eyeLookInRight: 0.1
    };
    this.mtMaxVDefault = 5; // Maximum velocity [rad / s]
    this.mtMaxVExceptions = {
      bodyRotateX: 1, bodyRotateY: 1, bodyRotateZ: 1,
      // headRotateX: 1, headRotateY: 1, headRotateZ: 1
    };
    this.mtBaselineDefault = 0; // Default baseline value
    this.mtBaselineExceptions = {
      bodyRotateX: null, bodyRotateY: null, bodyRotateZ: null,
      eyeLookOutLeft: null, eyeLookInLeft: null, eyeLookOutRight: null,
      eyeLookInRight: null, eyesLookDown: null, eyesLookUp: null
    };
    this.mtMinDefault = 0;
    this.mtMinExceptions = {
      bodyRotateX: -1, bodyRotateY: -1, bodyRotateZ: -1,
      headRotateX: -1, headRotateY: -1, headRotateZ: -1
    };
    this.mtMaxDefault = 1;
    this.mtMaxExceptions = {};
    this.mtLimits = {
      eyeBlinkLeft: (v) => ( Math.max(v, ( this.mtAvatar['eyesLookDown'].value + this.mtAvatar['browDownLeft'].value ) / 2) ),
      eyeBlinkRight: (v) => ( Math.max(v, ( this.mtAvatar['eyesLookDown'].value + this.mtAvatar['browDownRight'].value ) / 2 ) )
    };
    this.mtOnchange = {
      eyesLookDown: () => {
        this.mtAvatar['eyeBlinkLeft'].needsUpdate = true;
        this.mtAvatar['eyeBlinkRight'].needsUpdate = true;
      },
      browDownLeft: () => { this.mtAvatar['eyeBlinkLeft'].needsUpdate = true; },
      browDownRight: () => { this.mtAvatar['eyeBlinkRight'].needsUpdate = true; }
    };
    this.mtRandomized = [
      'mouthDimpleLeft','mouthDimpleRight', 'mouthLeft', 'mouthPressLeft',
      'mouthPressRight', 'mouthStretchLeft', 'mouthStretchRight',
      'mouthShrugLower', 'mouthShrugUpper', 'noseSneerLeft', 'noseSneerRight',
      'mouthRollLower', 'mouthRollUpper', 'browDownLeft', 'browDownRight',
      'browOuterUpLeft', 'browOuterUpRight', 'cheekPuff', 'cheekSquintLeft',
      'cheekSquintRight'
    ];
    this.mtExtras = [ // RPM Extras from ARKit, if missing
      { key: "mouthOpen", mix: { jawOpen: 0.5 } },
      { key: "mouthSmile", mix: { mouthSmileLeft: 0.8, mouthSmileRight: 0.8 } },
      { key: "eyesClosed", mix: { eyeBlinkLeft: 1.0, eyeBlinkRight: 1.0 } },
      { key: "eyesLookUp", mix: { eyeLookUpLeft: 1.0, eyeLookUpRight: 1.0 } },
      { key: "eyesLookDown", mix: { eyeLookDownLeft: 1.0, eyeLookDownRight: 1.0 } }
    ];

    // Anim queues
    this.animQueue = [];
    this.animClips = [];
    this.animPoses = [];

    // Clock
    this.animFrameDur = 1000/ this.opt.modelFPS;
    this.animClock = 0;
    this.animSlowdownRate = 1;
    this.animTimeLast = 0;
    this.easing = this.sigmoidFactory(5); // Ease in and out

    // Lip-sync extensions, import dynamically
    this.lipsync = {};
    this.opt.lipsyncModules.forEach( x => this.lipsyncGetProcessor(x) );
    this.visemeNames = [
      'aa', 'E', 'I', 'O', 'U', 'PP', 'SS', 'TH', 'DD', 'FF', 'kk',
      'nn', 'RR', 'CH', 'sil'
    ];

    // Grapheme segmenter
    this.segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });

    // Audio context and playlist
    this.initAudioGraph();
    this.audioPlaylist = [];

    // Volume based head movement
    this.volumeFrequencyData = new Uint8Array(16);
    this.volumeMax = 0;
    this.volumeHeadBase = 0;
    this.volumeHeadTarget = 0;
    this.volumeHeadCurrent = 0;
    this.volumeHeadVelocity = 0.15;
    this.volumeHeadEasing = this.sigmoidFactory(3);

    // Listening
    this.isListening = false;
    this.listeningAnalyzer = null;
    this.listeningActive = false;
    this.listeningVolume = 0;
    this.listeningSilenceThresholdLevel = this.opt.listeningSilenceThresholdLevel;
    this.listeningSilenceThresholdMs = this.opt.listeningSilenceThresholdMs;
    this.listeningSilenceDurationMax = this.opt.listeningSilenceDurationMax;
    this.listeningActiveThresholdLevel = this.opt.listeningActiveThresholdLevel;
    this.listeningActiveThresholdMs = this.opt.listeningActiveThresholdMs;
    this.listeningActiveDurationMax = this.opt.listeningActiveDurationMax;
    this.listeningTimer = 0;
    this.listeningTimerTotal = 0;

    // Draco loading
    this.dracoEnabled = this.opt.dracoEnabled;
    this.dracoDecoderPath = this.opt.dracoDecoderPath;

    // Create a lookup table for base64 decoding
    const b64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    this.b64Lookup = typeof Uint8Array === 'undefined' ? [] : new Uint8Array(256);
    for (let i = 0; i < b64Chars.length; i++) this.b64Lookup[b64Chars.charCodeAt(i)] = i;

    // Speech queue
    this.stateName = 'idle';
    this.speechQueue = [];
    this.isSpeaking = false;
    this.isListening = false;

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
    }

    // Avatar only mode
    this.isAvatarOnly = this.opt.avatarOnly;

    // Setup 3D Animation
    if ( this.isAvatarOnly ) {
      this.scene = this.opt.avatarOnlyScene;
      this.camera = this.opt.avatarOnlyCamera;
    } else {
      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      this.renderer.setPixelRatio( this.opt.modelPixelRatio * window.devicePixelRatio );
      this.renderer.setSize(this.nodeAvatar.clientWidth, this.nodeAvatar.clientHeight);
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.shadowMap.enabled = false;
      this.nodeAvatar.appendChild( this.renderer.domElement );
      this.camera = new THREE.PerspectiveCamera( 10, this.nodeAvatar.clientWidth / this.nodeAvatar.clientHeight, 0.1, 2000 );
      this.scene = new THREE.Scene();
      this.lightAmbient = new THREE.AmbientLight(
        new THREE.Color( this.opt.lightAmbientColor ),
        this.opt.lightAmbientIntensity
      );
      this.lightDirect = new THREE.DirectionalLight(
        new THREE.Color( this.opt.lightDirectColor ),
        this.opt.lightDirectIntensity
      );
      this.lightSpot = new THREE.SpotLight(
        new THREE.Color( this.opt.lightSpotColor ),
        this.opt.lightSpotIntensity,
        0,
        this.opt.lightSpotDispersion
      );
      this.setLighting( this.opt );
      const pmremGenerator = new THREE.PMREMGenerator( this.renderer );
      pmremGenerator.compileEquirectangularShader();
      this.scene.environment = pmremGenerator.fromScene( new RoomEnvironment() ).texture;
      this.resizeobserver = new ResizeObserver(this.onResize.bind(this));
      this.resizeobserver.observe(this.nodeAvatar);

      this.controls = new OrbitControls( this.camera, this.renderer.domElement );
      this.controls.enableZoom = this.opt.cameraZoomEnable;
      this.controls.enableRotate = this.opt.cameraRotateEnable;
      this.controls.enablePan = this.opt.cameraPanEnable;
      this.controls.minDistance = 2;
      this.controls.maxDistance = 2000;
      this.controls.autoRotateSpeed = 0;
      this.controls.autoRotate = false;
      this.controls.update();
      this.cameraClock = null;
    }

    // IK Mesh
    this.ikMesh = new THREE.SkinnedMesh();
    const ikSetup = {
      'LeftShoulder': null, 'LeftArm': 'LeftShoulder', 'LeftForeArm': 'LeftArm',
      'LeftHand': 'LeftForeArm', 'LeftHandMiddle1': 'LeftHand',
      'RightShoulder': null, 'RightArm': 'RightShoulder', 'RightForeArm': 'RightArm',
      'RightHand': 'RightForeArm', 'RightHandMiddle1': 'RightHand'
    };
    const ikBones = [];
    Object.entries(ikSetup).forEach( (x,i) => {
      const bone = new THREE.Bone();
      bone.name = x[0];
      if ( x[1] ) {
        this.ikMesh.getObjectByName(x[1]).add(bone);
      } else {
        this.ikMesh.add(bone);
      }
      ikBones.push(bone);
    });
    this.ikMesh.bind( new THREE.Skeleton( ikBones ) );

    // Dynamic Bones
    this.dynamicbones = new DynamicBones();

    // Stream speech mode
    this.isStreaming = false;
    this.streamWorkletNode = null;
    this.streamAudioStartTime = null;
    this.streamWaitForAudioChunks = true;
    this.streamLipsyncLang = null;
    this.streamLipsyncType = "visemes";
    this.streamLipsyncQueue = [];
  }

  /**
  * Helper that re/creates the audio context and the other nodes.
  * @param {number} sampleRate
  */
  initAudioGraph(sampleRate = null) {
    // Close existing context if it exists
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close();
    }

    // Create a new context
    if (sampleRate) {
      this.audioCtx = new AudioContext({ sampleRate });
    } else {
      this.audioCtx = new AudioContext();
    }
    
    // Create audio nodes
    this.audioSpeechSource = this.audioCtx.createBufferSource();
    this.audioBackgroundSource = this.audioCtx.createBufferSource();
    this.audioBackgroundGainNode = this.audioCtx.createGain();
    this.audioSpeechGainNode = this.audioCtx.createGain();
    this.audioStreamGainNode = this.audioCtx.createGain();
    this.audioAnalyzerNode = this.audioCtx.createAnalyser();
    this.audioAnalyzerNode.fftSize = 256;
    this.audioAnalyzerNode.smoothingTimeConstant = 0.1;
    this.audioAnalyzerNode.minDecibels = -70;
    this.audioAnalyzerNode.maxDecibels = -10;
    this.audioReverbNode = this.audioCtx.createConvolver();
    
    // Connect nodes
    this.audioBackgroundGainNode.connect(this.audioReverbNode);
    this.audioAnalyzerNode.connect(this.audioSpeechGainNode);
    this.audioSpeechGainNode.connect(this.audioReverbNode);
    this.audioStreamGainNode.connect(this.audioReverbNode);
    this.audioReverbNode.connect(this.audioCtx.destination);
    
    // Apply reverb and mixer settings
    this.setReverb(this.currentReverb || null);
    this.setMixerGain(
      this.opt.mixerGainSpeech, 
      this.opt.mixerGainBackground
    );
    
    // Delete the stream audio worklet if initialised
    this.workletLoaded = false;
    if (this.streamWorkletNode) {
      try {
        this.streamWorkletNode.port.postMessage({type: 'stop'});
        this.streamWorkletNode.disconnect();
        this.isStreaming = false;
      } catch(e) { 
        console.error('Error disconnecting streamWorkletNode:', e);
        /* ignore */ 
      }
      this.streamWorkletNode = null;
    }
  }

  /**
  * Helper that returns the parameter or, if it is a function, its return value.
  * @param {Any} x Parameter
  * @return {Any} Value
  */
  valueFn(x) {
    return (typeof x === 'function' ? x() : x);
  }

  /**
  * Helper to deep copy and edit an object.
  * @param {Object} x Object to copy and edit
  * @param {function} [editFn=null] Callback function for editing the new object
  * @return {Object} Deep copy of the object.
  */
  deepCopy(x, editFn=null) {
    const o = JSON.parse(JSON.stringify(x));
    if ( editFn && typeof editFn === "function" ) editFn(o);
    return o;
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
    if ( bufs.length === 1 ) return bufs[0];
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
  * Convert internal notation to THREE objects.
  * NOTE: All rotations are converted to quaternions.
  * @param {Object} p Pose
  * @return {Object} A new pose object.
  */
  propsToThreeObjects(p) {
    const r = {};
    for( let [key,val] of Object.entries(p) ) {
      const ids = key.split('.');
      let x = Array.isArray(val.x) ? this.gaussianRandom(...val.x) : val.x;
      let y = Array.isArray(val.y) ? this.gaussianRandom(...val.y) : val.y;
      let z = Array.isArray(val.z) ? this.gaussianRandom(...val.z) : val.z;

      if ( ids[1] === 'position' || ids[1] === 'scale' ) {
        r[key] = new THREE.Vector3(x,y,z);
      } else if ( ids[1] === 'rotation' ) {
        key = ids[0] + '.quaternion';
        r[key] = new THREE.Quaternion().setFromEuler(new THREE.Euler(x,y,z,'XYZ')).normalize();
      } else if ( ids[1] === 'quaternion' ) {
        r[key] = new THREE.Quaternion(x,y,z,val.w).normalize();
      }
    }

    return r;
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
  * Adds a new mixed morph target based on the given sources.
  * Note: This assumes that morphTargetsRelative === true (default for GLTF)
  * 
  * @param {Object[]} meshes Meshes to process
  * @param {string} name New of the new morph target (a.k.a. shape key)
  * @param {Object} sources Object of existing morph target values, e.g. { mouthOpen: 1.0 }
  * @param {boolean} [override=false] If true, override existing morph target
  */
  addMixedMorphTarget(meshes, name, sources, override=false ) {
  
    meshes.forEach( x => {

      // Skip, we already have a morph target with the same name and we do not override
      if ( !override && x.morphTargetDictionary.hasOwnProperty(name) ) return;
      
      // Check if this mesh has any sources to add to the mix
      const g = x.geometry;
      let mixPos = null;
      let mixNor = null;
      for( const [k,v] of Object.entries(sources) ) {
        if ( x.morphTargetDictionary.hasOwnProperty(k) ) {
          const index = x.morphTargetDictionary[k];
          const pos = g.morphAttributes.position[index];
          const nor = g.morphAttributes.normal?.[index];

          // Create position and normal
          if ( !mixPos ) {
            mixPos = new THREE.Float32BufferAttribute(pos.count * 3, 3);
            if ( nor ) {
              mixNor = new THREE.Float32BufferAttribute(pos.count * 3, 3);
            }
          }

          // Update position
          for (let i = 0; i < pos.count; i++) {
            const dx = mixPos.getX(i) + pos.getX(i) * v;
            const dy = mixPos.getY(i) + pos.getY(i) * v;
            const dz = mixPos.getZ(i) + pos.getZ(i) * v;
            mixPos.setXYZ(i, dx, dy, dz);
          }

          // Update normal
          if ( nor ) {
            for (let i = 0; i < pos.count; i++) {
              const dx = mixNor.getX(i) + nor.getX(i) * v;
              const dy = mixNor.getY(i) + nor.getY(i) * v;
              const dz = mixNor.getZ(i) + nor.getZ(i) * v;
              mixNor.setXYZ(i, dx, dy, dz);
            }
          }

        }
      }

      // We found one or more sources, so we add the new mixed morph target
      if ( mixPos ) {
        g.morphAttributes.position.push(mixPos);
        if ( mixNor ) {
          g.morphAttributes.normal.push(mixNor);
        }
        const index = g.morphAttributes.position.length - 1;
        x.morphTargetInfluences[index] = 0;
        x.morphTargetDictionary[name] = index;
      }

    });
  }

  /**
  * Loader for 3D avatar model.
  * @param {string} avatar Avatar object with 'url' property to GLTF/GLB file.
  * @param {progressfn} [onprogress=null] Callback for progress
  */
  async showAvatar(avatar, onprogress=null ) {

    // Checkt the avatar parameter
    if ( !avatar || !avatar.hasOwnProperty('url') ) {
      throw new Error("Invalid parameter. The avatar must have at least 'url' specified.");
    }

    // Loader
    const loader = new GLTFLoader();

    // Check if draco loading enabled
    if ( this.dracoEnabled ) {
      const dracoLoader = new DRACOLoader();
      dracoLoader.setDecoderPath( this.dracoDecoderPath );
      loader.setDRACOLoader( dracoLoader );
    }

    let gltf = await loader.loadAsync( avatar.url, onprogress );

    // Check the gltf
    const required = [ this.opt.modelRoot ];
    this.posePropNames.forEach( x => required.push( x.split('.')[0] ) );
    required.forEach( x => {
      if ( !gltf.scene.getObjectByName(x) ) {
        throw new Error('Avatar object ' + x + ' not found');
      }
    });

    this.stop();
    this.avatar = avatar;

    // Dispose Dynamic Bones
    this.dynamicbones.dispose();

    // Clear previous scene, if avatar was previously loaded
    this.mixer = null;
    if ( this.isAvatarOnly ) {
      if ( this.armature ) {
        this.clearThree( this.armature );
      }
    } else {
      if ( this.armature ) {
        this.clearThree( this.scene );
      }
    }

    // Avatar full-body
    this.armature = gltf.scene.getObjectByName( this.opt.modelRoot );
    this.armature.scale.setScalar(1);

    // Expose GLB animations and userData
    this.animations = gltf.animations;
    this.userData = gltf.userData;

    // Morph targets
    this.morphs = [];
    this.armature.traverse( x => {
      if ( x.morphTargetInfluences && x.morphTargetInfluences.length &&
        x.morphTargetDictionary ) {
        this.morphs.push(x);
      }

      // Workaround for #40, hands culled from the rendering process
      x.frustumCulled = false;
    });
    if ( this.morphs.length === 0 ) {
      throw new Error('Blend shapes not found');
    }

    // Morph target keys and values
    const keys = new Set(this.mtCustoms);
    this.morphs.forEach( x => {
      Object.keys(x.morphTargetDictionary).forEach( y => keys.add(y) );
    });

    // Add RPM extra blend shapes, if missing
    this.mtExtras.forEach( x => {
      if ( !keys.has(x.key) ) {
        this.addMixedMorphTarget( this.morphs, x.key, x.mix );
        keys.add(x.key);
      }
    });

    // Create internal morph target data structure
    const mtTemp = {};
    keys.forEach( x => {

      // Morph target data structure
      mtTemp[x] = {
        fixed: null, realtime: null, system: null, systemd: null, newvalue: null, ref: null,
        min: (this.mtMinExceptions.hasOwnProperty(x) ? this.mtMinExceptions[x] : this.mtMinDefault),
        max: (this.mtMaxExceptions.hasOwnProperty(x) ? this.mtMaxExceptions[x] : this.mtMaxDefault),
        easing: this.mtEasingDefault, base: null, v: 0, needsUpdate: true,
        acc: (this.mtAccExceptions.hasOwnProperty(x) ? this.mtAccExceptions[x] : this.mtAccDefault) / 1000,
        maxv: (this.mtMaxVExceptions.hasOwnProperty(x) ? this.mtMaxVExceptions[x] : this.mtMaxVDefault) / 1000,
        limit: this.mtLimits.hasOwnProperty(x) ? this.mtLimits[x] : null,
        onchange: this.mtOnchange.hasOwnProperty(x) ? this.mtOnchange[x] : null,
        baseline: this.avatar.baseline?.hasOwnProperty(x) ? this.avatar.baseline[x] : (this.mtBaselineExceptions.hasOwnProperty(x) ? this.mtBaselineExceptions[x] : this.mtBaselineDefault ),
        ms: [], is: []
      };
      mtTemp[x].value = mtTemp[x].baseline;
      mtTemp[x].applied = mtTemp[x].baseline;

      // Copy previous values
      const y = this.mtAvatar[x];
      if ( y ) {
        [ 'fixed','system','systemd','realtime','base','v','value','applied' ].forEach( z => {
          mtTemp[x][z] = y[z];
        });
      }

      // Find relevant meshes
      this.morphs.forEach( y => {
        const ndx = y.morphTargetDictionary[x];
        if ( ndx !== undefined ) {
          mtTemp[x].ms.push(y.morphTargetInfluences);
          mtTemp[x].is.push(ndx);
          y.morphTargetInfluences[ndx] = mtTemp[x].applied;
        }
      });

    });
    this.mtAvatar = mtTemp;

    // Objects for needed properties
    this.poseAvatar = { props: {} };
    this.posePropNames.forEach( x => {
      const ids = x.split('.');
      const o = this.armature.getObjectByName(ids[0]);
      this.poseAvatar.props[x] = o[ids[1]];
      if ( this.poseBase.props.hasOwnProperty(x) ) {
        this.poseAvatar.props[x].copy( this.poseBase.props[x] );
      } else {
        this.poseBase.props[x] = this.poseAvatar.props[x].clone();
      }

      // Make sure the target has the delta properties, because we need it as a basis
      if ( this.poseDelta.props.hasOwnProperty(x) && !this.poseTarget.props.hasOwnProperty(x) ) {
        this.poseTarget.props[x] = this.poseAvatar.props[x].clone();
      }

      // Take target pose
      this.poseTarget.props[x].t = this.animClock;
      this.poseTarget.props[x].d = 2000;
    });

    // Reset IK bone positions
    this.ikMesh.traverse( x => {
      if (x.isBone) {
        x.position.copy( this.armature.getObjectByName(x.name).position );
      }
    });

    if ( this.isAvatarOnly ) {
      if ( this.scene ) {
        this.scene.add( this.armature );
      }
    } else {
      // Add avatar to scene
      this.scene.add(gltf.scene);

      // Add lights
      this.scene.add( this.lightAmbient );
      this.scene.add( this.lightDirect );
      this.scene.add( this.lightSpot );
      this.lightSpot.target = this.armature.getObjectByName('Head');
    }

    // Setup Dynamic Bones
    if ( avatar.hasOwnProperty("modelDynamicBones") ) {
      try {
        this.dynamicbones.setup(this.scene, this.armature, avatar.modelDynamicBones );
      }
      catch(error) {
        console.error("Dynamic bones setup failed: " + error);
      }
    }

    // Find objects that we need in the animate function
    this.objectLeftToeBase = this.armature.getObjectByName('LeftToeBase');
    this.objectRightToeBase = this.armature.getObjectByName('RightToeBase');
    this.objectLeftEye = this.armature.getObjectByName('LeftEye');
    this.objectRightEye = this.armature.getObjectByName('RightEye');
    this.objectLeftArm = this.armature.getObjectByName('LeftArm');
    this.objectRightArm = this.armature.getObjectByName('RightArm');
    this.objectHips = this.armature.getObjectByName('Hips');
    this.objectHead = this.armature.getObjectByName('Head');
    this.objectNeck = this.armature.getObjectByName('Neck');

    // Estimate avatar height based on eye level
    const plEye = new THREE.Vector3();
    this.objectLeftEye.getWorldPosition(plEye);
    this.avatarHeight = plEye.y + 0.2;

    // Set pose, view and start animation
    if ( !this.viewName ) this.setView( this.opt.cameraView );
    this.setMood( this.avatar.avatarMood || this.moodName || this.opt.avatarMood );
    this.start();

  }

  /**
  * Get view names.
  * @return {string[]} Supported view names.
  */
  getViewNames() {
    return ['full', 'mid', 'upper', 'head'];
  }

  /**
  * Get current view.
  * @return {string} View name.
  */
  getView() {
    return this.viewName;
  }

  /**
  * Fit 3D object to the view.
  * @param {string} [view=null] Camera view. If null, reset current view
  * @param {Object} [opt=null] Options
  */
  setView(view, opt = null) {
    view = view || this.viewName;
    if ( view !== 'full' && view !== 'upper' && view !== 'head' && view !== 'mid' ) return;
    if ( !this.armature ) {
      this.opt.cameraView = view;
      return;
    }

    this.viewName = view || this.viewName;
    opt = opt || {};

    // In avatarOnly mode we do not control the camera
    if ( this.isAvatarOnly ) return;

    // Camera controls
    const cameraX = opt.hasOwnProperty("cameraX") ? opt.cameraX : this.opt.cameraX;
    const cameraY = opt.hasOwnProperty("cameraY") ? opt.cameraY : this.opt.cameraY;
    const cameraDistance = opt.hasOwnProperty("cameraDistance") ? opt.cameraDistance : this.opt.cameraDistance;
    const cameraRotateX = opt.hasOwnProperty("cameraRotateX") ? opt.cameraRotateX : this.opt.cameraRotateX;
    const cameraRotateY = opt.hasOwnProperty("cameraRotateY") ? opt.cameraRotateY : this.opt.cameraRotateY;

    const fov = this.camera.fov * ( Math.PI / 180 );
    let x = - cameraX * Math.tan( fov / 2 );
    let y = ( 1 - cameraY) * Math.tan( fov / 2 );
    let z = cameraDistance;

    switch(this.viewName) {
    case 'head':
      z += 2;
      y = y * z + 4 * this.avatarHeight / 5;
      break;
    case 'upper':
      z += 4.5;
      y = y * z + 2 * this.avatarHeight / 3;
      break;
    case 'mid':
      z += 8;
      y = y * z + this.avatarHeight / 3;
      break;
    default:
      z += 12;
      y = y * z;
    }

    x = x * z;

    this.controlsEnd = new THREE.Vector3(x, y, 0);
    this.cameraEnd = new THREE.Vector3(x, y, z).applyEuler( new THREE.Euler( cameraRotateX, cameraRotateY, 0 ) );

    if ( this.cameraClock === null ) {
      this.controls.target.copy( this.controlsEnd );
      this.camera.position.copy( this.cameraEnd );
    }
    this.controlsStart = this.controls.target.clone();
    this.cameraStart = this.camera.position.clone();
    this.cameraClock = 0;

  }

  /**
  * Change light colors and intensities.
  * @param {Object} opt Options
  */
  setLighting(opt) {
    if ( this.isAvatarOnly ) return;
    opt = opt || {};

    // Ambient light
    if ( opt.hasOwnProperty("lightAmbientColor") ) {
      this.lightAmbient.color.set( new THREE.Color( opt.lightAmbientColor ) );
    }
    if ( opt.hasOwnProperty("lightAmbientIntensity") ) {
      this.lightAmbient.intensity = opt.lightAmbientIntensity;
      this.lightAmbient.visible = (opt.lightAmbientIntensity !== 0);
    }

    // Directional light
    if ( opt.hasOwnProperty("lightDirectColor") ) {
      this.lightDirect.color.set( new THREE.Color( opt.lightDirectColor ) );
    }
    if ( opt.hasOwnProperty("lightDirectIntensity") ) {
      this.lightDirect.intensity = opt.lightDirectIntensity;
      this.lightDirect.visible = (opt.lightDirectIntensity !== 0);
    }
    if ( opt.hasOwnProperty("lightDirectPhi") && opt.hasOwnProperty("lightDirectTheta") ) {
      this.lightDirect.position.setFromSphericalCoords(2, opt.lightDirectPhi, opt.lightDirectTheta);
    }

    // Spot light
    if ( opt.hasOwnProperty("lightSpotColor") ) {
      this.lightSpot.color.set( new THREE.Color( opt.lightSpotColor ) );
    }
    if ( opt.hasOwnProperty("lightSpotIntensity") ) {
      this.lightSpot.intensity = opt.lightSpotIntensity;
      this.lightSpot.visible = (opt.lightSpotIntensity !== 0);
    }
    if ( opt.hasOwnProperty("lightSpotPhi") && opt.hasOwnProperty("lightSpotTheta") ) {
      this.lightSpot.position.setFromSphericalCoords( 2, opt.lightSpotPhi, opt.lightSpotTheta );
      this.lightSpot.position.add( new THREE.Vector3(0,1.5,0) );
    }
    if ( opt.hasOwnProperty("lightSpotDispersion") ) {
      this.lightSpot.angle = opt.lightSpotDispersion;
    }
  }

  /**
  * Render scene.
  */
  render() {
    if ( this.isRunning && !this.isAvatarOnly ) {
      this.renderer.render( this.scene, this.camera );
    }
  }

  /**
  * Resize avatar.
  */
  onResize() {
    if ( !this.isAvatarOnly ) {
      this.camera.aspect = this.nodeAvatar.clientWidth / this.nodeAvatar.clientHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize( this.nodeAvatar.clientWidth, this.nodeAvatar.clientHeight );
      this.controls.update();
      this.render();
    }
  }

  /**
  * Update avatar pose.
  * @param {number} t High precision timestamp in ms.
  */
  updatePoseBase(t) {
    for( const [key,val] of Object.entries(this.poseTarget.props) ) {
      const o = this.poseAvatar.props[key];
      if (o) {
        let alpha = (t - val.t) / val.d;
        if ( alpha > 1 || !this.poseBase.props.hasOwnProperty(key) ) {
          o.copy(val);
        } else {
          if ( o.isQuaternion ) {
            o.copy( this.poseBase.props[key].slerp(val, this.easing(alpha) ));
          } else if ( o.isVector3 ) {
            o.copy( this.poseBase.props[key].lerp(val, this.easing(alpha) ));
          }
        }
      }
    }
  }

  /**
  * Update avatar pose deltas
  */
  updatePoseDelta() {
    for( const [key,d] of Object.entries(this.poseDelta.props) ) {
      if ( d.x === 0 && d.y === 0 && d.z === 0 ) continue;
      e.set(d.x,d.y,d.z);
      const o = this.poseAvatar.props[key];
      if ( o.isQuaternion ) {
        q.setFromEuler(e);
        o.multiply(q);
      } else if ( o.isVector3 ) {
        o.add( e );
      }
    }
  }

  /**
  * Update morph target values.
  * @param {number} dt Delta time in ms.
  */
  updateMorphTargets(dt) {

    for( let [mt,o] of Object.entries(this.mtAvatar) ) {

      if ( !o.needsUpdate ) continue;

      // Alternative target (priority order):
      // - fixed: Fixed value, typically user controlled
      // - realtime: Realtime value, overriding everything except fixed
      // - system: System value, which overrides animations
      // - newvalue: Animation value
      // - baseline: Baseline value when none of the above applies
      let target = null;
      let newvalue = null;
      if ( o.fixed !== null ) {
        target = o.fixed;
        o.system = null;
        o.systemd = null;
        o.newvalue = null;
        if ( o.ref && o.ref.hasOwnProperty(mt) ) delete o.ref[mt];
        o.ref = null;
        o.base = null;
        if ( o.value === target ) {
          o.needsUpdate = false;
          continue;
        }
      } else if ( o.realtime !== null ) {
        o.ref = null;
        o.base = null;
        newvalue = o.realtime;
      } else if ( o.system !== null ) {
        target = o.system;
        o.newvalue = null;
        if ( o.ref && o.ref.hasOwnProperty(mt) ) delete o.ref[mt];
        o.ref = null;
        o.base = null;
        if ( o.systemd !== null ) {
          if ( o.systemd === 0 ) {
            target = null;
            o.system = null;
            o.systemd = null;
          } else {
            o.systemd -= dt;
            if ( o.systemd < 0 ) o.systemd= 0;
            if ( o.value === target ) {
              target = null;
            }
          }
        } else if ( o.value === target ) {
          target = null;
          o.system = null;
        }
      } else if ( o.newvalue !== null ) {
        o.ref = null;
        o.base = null;
        newvalue = o.newvalue;
        o.newvalue = null;
      } else if ( o.base !== null ) {
        target = o.base;
        o.ref = null;
        if ( o.value === target ) {
          target = null;
          o.base = null;
          o.needsUpdate = false;
        }
      } else {
        o.ref = null;
        if ( o.baseline !== null && o.value !== o.baseline ) {
          target = o.baseline;
          o.base = o.baseline;
        } else {
          o.needsUpdate = false;
        }
      }

      // Calculate new value using exponential smoothing
      if ( target !== null ) {
        let diff = target - o.value;
        if ( diff >= 0 ) {
          if ( diff < 0.005 ) {
            newvalue = target;
            o.v = 0;
          } else {
            if ( o.v < o.maxv ) o.v += o.acc * dt;
            if ( o.v >= 0 ) {
              newvalue = o.value + diff * ( 1 - Math.exp(- o.v * dt) );
            } else {
              newvalue = o.value + o.v * dt * ( 1 - Math.exp(o.v * dt) );
            }
          }
        } else {
          if ( diff > -0.005 ) {
            newvalue = target;
            o.v = 0;
          } else {
            if ( o.v > -o.maxv ) o.v -= o.acc * dt;
            if ( o.v >= 0 ) {
              newvalue = o.value + o.v * dt * ( 1 - Math.exp(- o.v * dt) );
            } else {
              newvalue = o.value + diff * ( 1 - Math.exp( o.v * dt) );
            }
          }
        }
      }

      // Check limits and whether we need to actually update the morph target
      if ( o.limit !== null ) {
        if ( newvalue !== null && newvalue !== o.value ) {
          o.value = newvalue;
          if ( o.onchange !== null ) o.onchange(newvalue);
        }
        newvalue = o.limit(o.value);
        if ( newvalue === o.applied ) continue;
      } else {
        if ( newvalue === null || newvalue === o.value ) continue;
        o.value = newvalue;
        if ( o.onchange !== null ) o.onchange(newvalue);
      }

      o.applied = newvalue;
      if ( o.applied < o.min ) o.applied = o.min;
      if ( o.applied > o.max ) o.applied = o.max;

      // Apply value
      switch(mt) {

      case 'headRotateX':
        this.poseDelta.props['Head.quaternion'].x = o.applied + this.mtAvatar['bodyRotateX'].applied;
        break;

      case 'headRotateY':
        this.poseDelta.props['Head.quaternion'].y = o.applied + this.mtAvatar['bodyRotateY'].applied;
        break;

      case 'headRotateZ':
        this.poseDelta.props['Head.quaternion'].z = o.applied + this.mtAvatar['bodyRotateZ'].applied;
        break;

      case 'bodyRotateX':
        this.poseDelta.props['Head.quaternion'].x = o.applied + this.mtAvatar['headRotateX'].applied;
        this.poseDelta.props['Spine1.quaternion'].x = o.applied/2;
        this.poseDelta.props['Spine.quaternion'].x = o.applied/8;
        this.poseDelta.props['Hips.quaternion'].x = o.applied/24;
        break;

      case 'bodyRotateY':
        this.poseDelta.props['Head.quaternion'].y = o.applied + this.mtAvatar['headRotateY'].applied;
        this.poseDelta.props['Spine1.quaternion'].y = o.applied/2;
        this.poseDelta.props['Spine.quaternion'].y = o.applied/2;
        this.poseDelta.props['Hips.quaternion'].y = o.applied/4;
        this.poseDelta.props['LeftUpLeg.quaternion'].y = o.applied/2;
        this.poseDelta.props['RightUpLeg.quaternion'].y = o.applied/2;
        this.poseDelta.props['LeftLeg.quaternion'].y = o.applied/4;
        this.poseDelta.props['RightLeg.quaternion'].y = o.applied/4;
        break;

      case 'bodyRotateZ':
        this.poseDelta.props['Head.quaternion'].z = o.applied + this.mtAvatar['headRotateZ'].applied;
        this.poseDelta.props['Spine1.quaternion'].z = o.applied/12;
        this.poseDelta.props['Spine.quaternion'].z = o.applied/12;
        this.poseDelta.props['Hips.quaternion'].z = o.applied/24;
        break;

      case 'handFistLeft':
      case 'handFistRight':
        const side = mt.substring(8);
        ['HandThumb', 'HandIndex','HandMiddle',
        'HandRing', 'HandPinky'].forEach( (x,i) => {
          if ( i === 0 ) {
            this.poseDelta.props[side+x+'1.quaternion'].x = 0;
            this.poseDelta.props[side+x+'2.quaternion'].z = (side === 'Left' ? -1 : 1) * o.applied;
            this.poseDelta.props[side+x+'3.quaternion'].z = (side === 'Left' ? -1 : 1) * o.applied;
          } else {
            this.poseDelta.props[side+x+'1.quaternion'].x = o.applied;
            this.poseDelta.props[side+x+'2.quaternion'].x = 1.5 * o.applied;
            this.poseDelta.props[side+x+'3.quaternion'].x = 1.5 * o.applied;
          }
        });
        break;

      case 'chestInhale':
        const scale = o.applied/20;
        const d = { x: scale, y: (scale/2), z: (3 * scale) };
        const dneg = { x: (1/(1+scale) - 1), y: (1/(1 + scale/2) - 1), z: (1/(1 + 3 * scale) - 1) };
        this.poseDelta.props['Spine1.scale'] = d;
        this.poseDelta.props['Neck.scale'] = dneg;
        this.poseDelta.props['LeftArm.scale'] = dneg;
        this.poseDelta.props['RightArm.scale'] = dneg;
        break;

      default:
        for( let i=0,l=o.ms.length; i<l; i++ ) {
          o.ms[i][o.is[i]] = o.applied;
        }

      }
    }
  }

  /**
  * Get given pose as a string.
  * @param {Object} pose Pose
  * @param {number} [prec=1000] Precision used in values
  * @return {string} Pose as a string
  */
  getPoseString(pose,prec=1000){
    let s = '{';
    Object.entries(pose).forEach( (x,i) => {
      const ids = x[0].split('.');
      if ( ids[1] === 'position' || ids[1] === 'rotation' || ids[1] === 'quaternion' ) {
        const key = (ids[1] === 'quaternion' ? (ids[0]+'.rotation') : x[0]);
        const val = (x[1].isQuaternion ? new THREE.Euler().setFromQuaternion(x[1]) : x[1]);
        s += (i?", ":"") + "'" + key + "':{";
        s += 'x:' + Math.round(val.x * prec) / prec;
        s += ', y:' + Math.round(val.y * prec) / prec;
        s += ', z:' + Math.round(val.z * prec) / prec;
        s += '}';
      }
    });
    s += '}';
    return s;
  }


  /**
  * Return pose template property taking into account mirror pose and gesture.
  * @param {string} key Property key
  * @return {Quaternion|Vector3} Position or rotation
  */
  getPoseTemplateProp(key) {

    const ids = key.split('.');
    let target = ids[0] + '.' + (ids[1] === 'rotation' ? 'quaternion' : ids[1]);

    if ( this.gesture && this.gesture.hasOwnProperty(target) ) {
      return this.gesture[target].clone();
    } else {
      let source = ids[0] + '.' + (ids[1] === 'quaternion' ? 'rotation' : ids[1]);
      if ( !this.poseWeightOnLeft ) {
        if ( source.startsWith('Left') ) {
          source = 'Right' + source.substring(4);
          target = 'Right' + target.substring(4);
        } else if ( source.startsWith('Right') ) {
          source = 'Left' + source.substring(5);
          target = 'Left' + target.substring(5);
        }
      }

      // Get value
      let val;
      if ( this.poseTarget.template.props.hasOwnProperty(target) ) {
        const o = {};
        o[target] = this.poseTarget.template.props[target];
        val = this.propsToThreeObjects( o )[target];
      } else if ( this.poseTarget.template.props.hasOwnProperty(source) ) {
        const o = {};
        o[source] = this.poseTarget.template.props[source];
        val = this.propsToThreeObjects( o )[target];
      }

      // Mirror
      if ( val && !this.poseWeightOnLeft && val.isQuaternion ) {
        val.x *= -1;
        val.w *= -1;
      }

      return val;
    }
  }

  /**
  * Change body weight from current leg to another.
  * @param {Object} p Pose properties
  * @return {Object} Mirrored pose.
  */
  mirrorPose(p) {
    const r = {};
    for( let [key,val] of Object.entries(p) ) {

      // Create a mirror image
      if ( val.isQuaternion ) {
        if ( key.startsWith('Left') ) {
          key = 'Right' + key.substring(4);
        } else if ( key.startsWith('Right') ) {
          key = 'Left' + key.substring(5);
        }
        val.x *= -1;
        val.w *= -1;
      }

      r[key] = val.clone();

      // Custom properties
      r[key].t = val.t;
      r[key].d = val.d;
    }
    return r;
  }

  /**
  * Create a new pose.
  * @param {Object} template Pose template
  * @param {numeric} [ms=2000] Transition duration in ms
  * @return {Object} A new pose object.
  */
  poseFactory(template, ms=2000) {

    // Pose object
    const o = {
      template: template,
      props: this.propsToThreeObjects( template.props )
    };

    for( const [p,val] of Object.entries(o.props) ) {

      // Restrain movement when standing
      if ( this.opt.modelMovementFactor < 1 && template.standing &&
        (p === 'Hips.quaternion' || p === 'Spine.quaternion' ||
        p === 'Spine1.quaternion' || p === 'Spine2.quaternion' ||
        p === 'Neck.quaternion' || p === 'LeftUpLeg.quaternion' ||
        p === 'LeftLeg.quaternion' || p === 'RightUpLeg.quaternion' ||
        p === 'RightLeg.quaternion') ) {
        const ref = this.poseStraight[p];
        const angle = val.angleTo( ref );
        val.rotateTowards( ref, (1 - this.opt.modelMovementFactor) * angle );
      }

      // Custom properties
      val.t = this.animClock; // timestamp
      val.d = ms; // Transition duration

    }
    return o;
  }

  /**
  * Set a new pose and start transition timer.
  * @param {Object} template Pose template, if null update current pose
  * @param {number} [ms=2000] Transition time in milliseconds
  */
  setPoseFromTemplate(template, ms=2000) {

    // Special cases
    const isIntermediate = template && this.poseTarget && this.poseTarget.template && ((this.poseTarget.template.standing && template.lying) || (this.poseTarget.template.lying && template.standing));
    const isSameTemplate = template && (template === this.poseCurrentTemplate);
    const isWeightOnLeft = this.poseWeightOnLeft;
    let duration = isIntermediate ? 1000 : ms;

    // New pose template
    if ( isIntermediate) {
      this.poseCurrentTemplate = this.poseTemplates['oneknee'];
      setTimeout( () => {
        this.setPoseFromTemplate(template,ms);
      }, duration);
    } else {
      this.poseCurrentTemplate = template || this.poseCurrentTemplate;
    }

    // Set target
    this.poseTarget = this.poseFactory(this.poseCurrentTemplate, duration);
    this.poseWeightOnLeft = true;

    // Mirror properties, if necessary
    if ( (!isSameTemplate && !isWeightOnLeft) || (isSameTemplate && isWeightOnLeft ) ) {
      this.poseTarget.props = this.mirrorPose(this.poseTarget.props);
      this.poseWeightOnLeft = !this.poseWeightOnLeft;
    }

    // Gestures
    if ( this.gesture ) {
      for( let [p,val] of Object.entries(this.gesture) ) {
        if ( this.poseTarget.props.hasOwnProperty(p) ) {
          this.poseTarget.props[p].copy(val);
          this.poseTarget.props[p].t = val.t;
          this.poseTarget.props[p].d = val.d;
        }
      }
    }

    // Make sure deltas are included in the target
    Object.keys(this.poseDelta.props).forEach( key => {
      if ( !this.poseTarget.props.hasOwnProperty(key) ) {
        this.poseTarget.props[key] = this.poseBase.props[key].clone();
        this.poseTarget.props[key].t = this.animClock;
        this.poseTarget.props[key].d = duration;
      }
    });

  }

  /**
  * Get morph target value.
  * @param {string} mt Morph target
  * @return {number} Value
  */
  getValue(mt) {
    return this.mtAvatar[mt]?.value;
  }

  /**
  * Set morph target value.
  * @param {string} mt Morph target
  * @param {number} val Value
  * @param {number} [ms=null] Transition time in milliseconds.
  */
  setValue(mt,val,ms=null) {
    if ( this.mtAvatar.hasOwnProperty(mt) ) {
      Object.assign(this.mtAvatar[mt],{ system: val, systemd: ms, needsUpdate: true });
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
  * Get current mood.
  * @return {string[]} Mood name.
  */
  getMood() {
    return this.opt.avatarMood;
  }

  /**
  * Set mood.
  * @param {string} s Mood name.
  */
  setMood(s) {
    s = (s || '').trim().toLowerCase();
    if ( !this.animMoods.hasOwnProperty(s) ) throw new Error("Unknown mood.");
    this.moodName = s;
    this.mood = this.animMoods[this.moodName];

    // Reset morph target baseline
    for( let mt of Object.keys(this.mtAvatar) ) {
      let val = this.mtBaselineExceptions.hasOwnProperty(mt) ? this.mtBaselineExceptions[mt] : this.mtBaselineDefault;
      if ( this.mood.baseline.hasOwnProperty(mt) ) {
        val = this.mood.baseline[mt];
      } else if ( this.avatar.baseline?.hasOwnProperty(mt) ) {
        val = this.avatar.baseline[mt];
      }
      this.setBaselineValue( mt, val );
    }

    // Set/replace animations
    this.mood.anims.forEach( x => {
      let i = this.animQueue.findIndex( y => y.template.name === x.name );
      if ( i !== -1 ) {
        this.animQueue.splice(i, 1);
      }
      this.animQueue.push( this.animFactory( x, -1 ) );
    });

  }


  /**
  * Get morph target names.
  * @return {string[]} Morph target names.
  */
  getMorphTargetNames() {
    return [ 'eyesRotateX', 'eyesRotateY', ...Object.keys(this.mtAvatar)].sort();
  }

  /**
  * Get baseline value for the morph target.
  * @param {string} mt Morph target name
  * @return {number} Value, null if not in baseline
  */
  getBaselineValue( mt ) {
    if ( mt === 'eyesRotateY' ) {
      const ll = this.getBaselineValue('eyeLookOutLeft');
      if ( ll === undefined ) return undefined;
      const lr = this.getBaselineValue('eyeLookInLeft');
      if ( lr === undefined ) return undefined;
      const rl = this.getBaselineValue('eyeLookOutRight');
      if ( rl === undefined ) return undefined;
      const rr = this.getBaselineValue('eyeLookInRight');
      if ( rr === undefined ) return undefined;
      return ll - lr;
    } else if ( mt === 'eyesRotateX' ) {
      const d = this.getBaselineValue('eyesLookDown');
      if ( d === undefined ) return undefined;
      const u = this.getBaselineValue('eyesLookUp');
      if ( u === undefined ) return undefined;
      return d - u;
    } else {
      return this.mtAvatar[mt]?.baseline;
    }
  }

  /**
  * Set baseline for morph target.
  * @param {string} mt Morph target name
  * @param {number} val Value, null if to be removed from baseline
  */
  setBaselineValue( mt, val ) {
    if ( mt === 'eyesRotateY' ) {
      this.setBaselineValue('eyeLookOutLeft', (val === null) ? null : (val>0 ? val : 0) );
      this.setBaselineValue('eyeLookInLeft', (val === null) ? null : (val>0 ? 0 : -val) );
      this.setBaselineValue('eyeLookOutRight', (val === null) ? null : (val>0 ? 0 : -val) );
      this.setBaselineValue('eyeLookInRight', (val === null) ? null : (val>0 ? val : 0) );
    } else if ( mt === 'eyesRotateX' ) {
      this.setBaselineValue('eyesLookDown', (val === null) ? null : (val>0 ? val : 0) );
      this.setBaselineValue('eyesLookUp', (val === null) ? null : (val>0 ? 0 : -val) );
    } else {
      if ( this.mtAvatar.hasOwnProperty(mt) ) {
        Object.assign(this.mtAvatar[mt],{ base: null, baseline: val, needsUpdate: true });
      }
    }
  }

  /**
  * Get fixed value for the morph target.
  * @param {string} mt Morph target name
  * @return {number} Value, null if not fixed
  */
  getFixedValue( mt ) {
    if ( mt === 'eyesRotateY' ) {
      const ll = this.getFixedValue('eyeLookOutLeft');
      if ( ll === null ) return null;
      const lr = this.getFixedValue('eyeLookInLeft');
      if ( lr === null ) return null;
      const rl = this.getFixedValue('eyeLookOutRight');
      if ( rl === null ) return null;
      const rr = this.getFixedValue('eyeLookInRight');
      if ( rr === null ) return null;
      return ll - lr;
    } else if ( mt === 'eyesRotateX' ) {
      const d = this.getFixedValue('eyesLookDown');
      if ( d === null ) return null;
      const u = this.getFixedValue('eyesLookUp');
      if ( u === null ) return null;
      return d - u;
    } else {
      return this.mtAvatar[mt]?.fixed;
    }
  }

  /**
  * Fix morph target.
  * @param {string} mt Morph target name
  * @param {number} val Value, null if to be removed
  */
  setFixedValue( mt, val, ms=null ) {
    if ( mt === 'eyesRotateY' ) {
      this.setFixedValue('eyeLookOutLeft', (val === null) ? null : (val>0 ? val : 0 ), ms );
      this.setFixedValue('eyeLookInLeft', (val === null) ? null : (val>0 ? 0 : -val ), ms );
      this.setFixedValue('eyeLookOutRight', (val === null) ? null : (val>0 ? 0 : -val ), ms );
      this.setFixedValue('eyeLookInRight', (val === null) ? null : (val>0 ? val : 0 ), ms );
    } else if ( mt === 'eyesRotateX' ) {
      this.setFixedValue('eyesLookDown', (val === null) ? null : (val>0 ? val : 0 ), ms );
      this.setFixedValue('eyesLookUp', (val === null) ? null : (val>0 ? 0 : -val ), ms );
    } else {
      if ( this.mtAvatar.hasOwnProperty(mt) ) {
        Object.assign(this.mtAvatar[mt],{ fixed: val, needsUpdate: true });
      }
    }
  }


  /**
  * Create a new animation based on an animation template.
  * @param {Object} t Animation template
  * @param {number} [loop=false] Number of loops, false if not looped
  * @param {number} [scaleTime=1] Scale template times
  * @param {number} [scaleValue=1] Scale template values
  * @param {boolean} [noClockOffset=false] Do not apply clock offset
  * @return {Object} New animation object.
  */
  animFactory( t, loop = false, scaleTime = 1, scaleValue = 1, noClockOffset = false ) {
    const o = { template: t, ts: [0], vs: {} };

    // Follow the hierarchy of objects
    let a = t;
    while(1) {
      if ( a.hasOwnProperty(this.stateName) ) {
        a = a[this.stateName];
      } else if ( a.hasOwnProperty(this.moodName) ) {
        a = a[this.moodName];
      } else if ( a.hasOwnProperty(this.poseName) ) {
        a = a[this.poseName];
      } else if ( a.hasOwnProperty(this.viewName) ) {
        a = a[this.viewName];
      } else if ( this.avatar.body && a.hasOwnProperty(this.avatar.body) ) {
        a = a[this.avatar.body];
      } else if ( a.hasOwnProperty('alt') ) {

        // Go through alternatives with probabilities
        let b = a.alt[0];
        if ( a.alt.length > 1 ) {
         // Flip a coin
         const coin = Math.random();
         let p = 0;
         for( let i=0; i<a.alt.length; i++ ) {
           let val = this.valueFn(a.alt[i].p);
           p += (val === undefined ? (1-p)/(a.alt.length-1-i) : val);
           if (coin<p) {
             b = a.alt[i];
             break;
           }
         }
        }
        a = b;

      } else {
        break;
      }
    }

    // Time series
    let delay = this.valueFn(a.delay) || 0;
    if ( Array.isArray(delay) ) {
      delay = this.gaussianRandom(...delay);
    }
    if ( a.hasOwnProperty('dt') ) {
      a.dt.forEach( (x,i) => {
        let val = this.valueFn(x);
        if ( Array.isArray(val) ) {
          val = this.gaussianRandom(...val);
        }
        o.ts[i+1] = o.ts[i] + val;
      });
    } else {
      let l = Object.values(a.vs).reduce( (acc,val) => (val.length > acc) ? val.length : acc, 0);
      o.ts = Array(l+1).fill(0);
    }
    if ( noClockOffset ) {
      o.ts = o.ts.map( x => delay + x * scaleTime );
    } else {
      o.ts = o.ts.map( x => this.animClock + delay + x * scaleTime );
    }

    // Values
    for( let [mt,vs] of Object.entries(a.vs) ) {
      const base = this.getBaselineValue(mt);
      const vals = vs.map( x => {
        x = this.valueFn(x);
        if ( x === null ) {
          return null;
        } else if ( typeof x === 'function' ) {
          return x;
        } else if ( typeof x === 'string' || x instanceof String ) {
          return x.slice();
        } else if ( Array.isArray(x) ) {
          if ( mt === 'gesture' ) {
            return x.slice();
          } else {
            return (base === undefined ? 0 : base) + scaleValue * this.gaussianRandom(...x);
          }
        } else if (typeof x == "boolean") {
          return x;
        } else if ( x instanceof Object && x.constructor === Object ) {
          return Object.assign( {}, x );
        } else {
          return (base === undefined ? 0 : base) + scaleValue * x;
        }
      });

      if ( mt === 'eyesRotateY' ) {
        o.vs['eyeLookOutLeft'] = [null, ...vals.map( x => (x>0) ? x : 0 ) ];
        o.vs['eyeLookInLeft'] = [null, ...vals.map( x => (x>0) ? 0 : -x ) ];
        o.vs['eyeLookOutRight'] = [null, ...vals.map( x => (x>0) ? 0 : -x ) ];
        o.vs['eyeLookInRight'] = [null, ...vals.map( x => (x>0) ? x : 0 ) ];
      } else if ( mt === 'eyesRotateX' ) {
        o.vs['eyesLookDown'] = [null, ...vals.map( x => (x>0) ? x : 0 ) ];
        o.vs['eyesLookUp'] = [null, ...vals.map( x => (x>0) ? 0 : -x ) ];
      } else {
        o.vs[mt] = [null, ...vals];
      }
    }
    for( let mt of Object.keys(o.vs) ) {
      while( o.vs[mt].length <= o.ts.length ) o.vs[mt].push( o.vs[mt][ o.vs[mt].length - 1 ]);
    }

    // Mood
    if ( t.hasOwnProperty("mood") ) o.mood = this.valueFn(t.mood).slice();

    // Loop
    if ( loop ) o.loop = loop;

    return o;
  }

  /**
  * Calculate the correct value based on a given time using the given function.
  * @param {number[]} vstart Start value
  * @param {number[]} vend End value
  * @param {number[]} tstart Start time
  * @param {number[]} tend End time
  * @param {number[]} t Current time
  * @param {function} [fun=null] Ease in/out function, null = linear
  * @return {number} Value based on the given time.
  */
  valueAnimationSeq(vstart,vend,tstart,tend,t,fun=null) {
    vstart = this.valueFn(vstart);
    vend = this.valueFn(vend);
    if ( t < tstart ) t = tstart;
    if ( t > tend ) t = tend;
    let k = (vend - vstart) / (tend - tstart);
    if ( fun ) {
      k *= fun( ( t - tstart ) / (tend - tstart) );
    }
    return k * t + (vstart - k * tstart);
  }

  /**
  * Return gaussian distributed random value between start and end with skew.
  * @param {number} start Start value
  * @param {number} end End value
  * @param {number} [skew=1] Skew
  * @param {number} [samples=5] Number of samples, 1 = uniform distribution.
  * @return {number} Gaussian random value.
  */
  gaussianRandom(start,end,skew=1,samples=5) {
    let r = 0;
    for( let i=0; i<samples; i++) r += Math.random();
    return start + Math.pow(r/samples,skew) * (end - start);
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
  * @param {number} t High precision timestamp in ms. In avatarOnly mode delta.
  */
  animate(t) {

    // Are we running?
    if ( !this.isRunning ) return;

    let dt;
    if ( this.isAvatarOnly ) {
      dt = t;
    } else {
      requestAnimationFrame( this.animate.bind(this) );
      dt = t - this.animTimeLast;
      if ( dt < this.animFrameDur ) return;
      this.animTimeLast = t;
    }
    dt = dt / this.animSlowdownRate;
    this.animClock += dt;

    let i,j,l,k,vol=0;

    // Statistics start
    if ( this.stats ) {
      this.stats.begin();
    }

    // Listening
    if ( this.isListening ) {

      // Get input max volume
      this.listeningAnalyzer.getByteFrequencyData(this.volumeFrequencyData);
      for (i=2, l=10; i<l; i++) {
        if (this.volumeFrequencyData[i] > vol) {
          vol = this.volumeFrequencyData[i];
        }
      }

      this.listeningVolume = (this.listeningVolume + vol) / 2;
      if ( this.listeningActive ) {
        this.listeningTimerTotal += dt;
        if ( this.listeningVolume < this.listeningSilenceThresholdLevel ) {
          this.listeningTimer += dt;
          if ( this.listeningTimer > this.listeningSilenceThresholdMs ) {
            if ( this.listeningOnchange ) this.listeningOnchange('stop',this.listeningTimer);
            this.listeningActive = false;
            this.listeningTimer = 0;
            this.listeningTimerTotal = 0;
          }
        } else {
          this.listeningTimer *= 0.5;
        }
        if ( this.listeningTimerTotal > this.listeningActiveDurationMax ) {
          if ( this.listeningOnchange ) this.listeningOnchange('maxactive');
          this.listeningTimerTotal = 0;
        }
      } else {
        this.listeningTimerTotal += dt;
        if ( this.listeningVolume > this.listeningActiveThresholdLevel ) {
          this.listeningTimer += dt;
          if ( this.listeningTimer > this.listeningActiveThresholdMs ) {
            if ( this.listeningOnchange ) this.listeningOnchange('start');
            this.listeningActive = true;
            this.listeningTimer = 0;
            this.listeningTimerTotal = 0;
          }
        } else {
          this.listeningTimer *= 0.5;
        }
        if ( this.listeningTimerTotal > this.listeningSilenceDurationMax ) {
          if ( this.listeningOnchange ) this.listeningOnchange('maxsilence');
          this.listeningTimerTotal = 0;
        }
      }
    }

    // Speaking
    if ( this.isSpeaking ) {
      vol = 0;
      this.audioAnalyzerNode.getByteFrequencyData(this.volumeFrequencyData);
      for (i=2, l=10; i<l; i++) {
        if (this.volumeFrequencyData[i] > vol) {
          vol = this.volumeFrequencyData[i];
        }
      }
    }

    // Animation loop
    let isEyeContact = null;
    let isHeadMove = null;
    const tasks = [];
    for( i=0, l=this.animQueue.length; i<l; i++ ) {
      const x = this.animQueue[i];
      if ( this.animClock < x.ts[0] ) continue;

      for( j = x.ndx || 0, k = x.ts.length; j<k; j++ ) {
        if ( this.animClock < x.ts[j] ) break;

        for( let [mt,vs] of Object.entries(x.vs) ) {

          if ( this.mtAvatar.hasOwnProperty(mt) ) {
            if ( vs[j+1] === null ) continue; // Last or unknown target, skip

            // Start value and target
            const m = this.mtAvatar[mt];
            if ( vs[j] === null ) vs[j] = m.value; // Fill-in start value
            if ( j === k - 1 ) {
              m.newvalue = vs[j];
            } else {
              m.newvalue = vs[j+1];
              const tdiff = x.ts[j+1] - x.ts[j];
              let alpha = 1;
              if ( tdiff > 0.0001 ) alpha = (this.animClock - x.ts[j]) / tdiff;
              if ( alpha < 1 ) {
                if ( m.easing ) alpha = m.easing(alpha);
                m.newvalue = ( 1 - alpha ) * vs[j] + alpha * m.newvalue;
              }
              if ( m.ref && m.ref !== x.vs && m.ref.hasOwnProperty(mt) ) delete m.ref[mt];
              m.ref = x.vs;
            }

            // Volume effect
            if ( vol ) {
              switch(mt){
                case 'viseme_aa':
                case 'viseme_E':
                case 'viseme_I':
                case 'viseme_O':
                case 'viseme_U':
                  m.newvalue *= 1 + vol / 255 - 0.5;
              }
            }

            // Update
            m.needsUpdate = true;

          } else if ( mt === 'eyeContact' && vs[j] !== null && isEyeContact !== false ) {
            isEyeContact = Boolean(vs[j]);
          } else if ( mt === 'headMove' && vs[j] !== null && isHeadMove !== false ) {
            if ( vs[j] === 0 ) {
              isHeadMove = false;
            } else {
              if ( Math.random() < vs[j] ) isHeadMove = true;
              vs[j] = null;
            }
          } else if ( vs[j] !== null ) {
            tasks.push({ mt: mt, val: vs[j] });
            vs[j] = null;
          }

        }

      }

      // If end timeslot, loop or remove the animation, otherwise keep at it
      if ( j === k ) {
        if ( x.hasOwnProperty('mood') ) this.setMood(x.mood);
        if ( x.loop ) {
          k = ( this.isSpeaking && (x.template.name === 'head' || x.template.name === 'eyes') ) ? 4 : 1; // Restrain
          this.animQueue[i] = this.animFactory( x.template, (x.loop > 0 ? x.loop - 1 : x.loop), 1, 1/k );
        } else {
          this.animQueue.splice(i--, 1);
          l--;
        }
      } else {
        x.ndx = j - 1;
      }

    }

    // Tasks
    for( let i=0, l=tasks.length; i<l; i++ ) {
      j = tasks[i].val;

      switch(tasks[i].mt) {

      case 'speak':
        this.speakText(j);
        break;

      case 'subtitles':
        if ( this.onSubtitles && typeof this.onSubtitles === "function" ) {
          this.onSubtitles(j);
        }
        break;

      case 'pose':
        this.poseName = j;
        this.setPoseFromTemplate( this.poseTemplates[ this.poseName ] );
        break;

      case 'gesture':
        this.playGesture( ...j );
        break;

      case 'function':
        if ( j && typeof j === "function" ) {
          j();
        }
        break;

      case 'moveto':
        Object.entries(j.props).forEach( y => {
          if ( y[1] ) {
            this.poseTarget.props[y[0]].copy( y[1] );
          } else {
            this.poseTarget.props[y[0]].copy( this.getPoseTemplateProp(y[0]) );
          }
          this.poseTarget.props[y[0]].t = this.animClock;
          this.poseTarget.props[y[0]].d = (y[1] && y[1].d) ? y[1].d : (y.duration || 2000);
        });
        break;

      case 'handLeft':
        this.ikSolve( {
          iterations: 20, root: "LeftShoulder", effector: "LeftHandMiddle1",
          links: [
            { link: "LeftHand", minx: -0.5, maxx: 0.5, miny: -1, maxy: 1, minz: -0.5, maxz: 0.5 },
            { link: "LeftForeArm", minx: -0.5, maxx: 1.5, miny: -1.5, maxy: 1.5, minz: -0.5, maxz: 3 },
            { link: "LeftArm", minx: -1.5, maxx: 1.5, miny: 0, maxy: 0, minz: -1, maxz: 3 }
          ]
        }, j.x ? new THREE.Vector3(j.x,j.y,j.z) : null, true, j.d );
        break;


      case 'handRight':
        this.ikSolve( {
          iterations: 20, root: "RightShoulder", effector: "RightHandMiddle1",
          links: [
            { link: "RightHand", minx: -0.5, maxx: 0.5, miny: -1, maxy: 1, minz: -0.5, maxz: 0.5, maxAngle: 0.1 },
            { link: "RightForeArm", minx: -0.5, maxx: 1.5, miny: -1.5, maxy: 1.5, minz: -3, maxz: 0.5, maxAngle: 0.2 },
            { link: "RightArm", minx: -1.5, maxx: 1.5, miny: 0, maxy: 0, minz: -1, maxz: 3 }
          ]
        }, j.x ? new THREE.Vector3(j.x,j.y,j.z) : null, true, j.d );
        break;
      }
    }

    // Eye contact
    if ( isEyeContact || isHeadMove ) {

      // Get head position
      e.setFromQuaternion( this.poseAvatar.props['Head.quaternion'] );
      e.x = Math.max(-0.9,Math.min(0.9, 2 * e.x - 0.5 ));
      e.y = Math.max(-0.9,Math.min(0.9, -2.5 * e.y));

      if ( isEyeContact ) {
        Object.assign( this.mtAvatar['eyesLookDown'], { system: e.x < 0 ? -e.x : 0, needsUpdate: true });
        Object.assign( this.mtAvatar['eyesLookUp'], { system: e.x < 0 ? 0 : e.x, needsUpdate: true });
        Object.assign( this.mtAvatar['eyeLookInLeft'], { system: e.y < 0 ? -e.y : 0, needsUpdate: true });
        Object.assign( this.mtAvatar['eyeLookOutLeft'], { system: e.y < 0 ? 0 : e.y, needsUpdate: true });
        Object.assign( this.mtAvatar['eyeLookInRight'], { system: e.y < 0 ? 0 : e.y, needsUpdate: true });
        Object.assign( this.mtAvatar['eyeLookOutRight'], { system: e.y < 0 ? -e.y : 0, needsUpdate: true });

        // Head move
        if ( isHeadMove ) {
          i = - this.mtAvatar['bodyRotateY'].value;
          j = this.gaussianRandom(-0.2,0.2);
          this.animQueue.push( this.animFactory({ name: "headmove",
            dt: [[1000,2000],[1000,2000,1,2],[1000,2000],[1000,2000,1,2]], vs: {
              headRotateY: [i,i,0], headRotateX: [j,j,0], headRotateZ: [-i/4,-i/4,0]
            }
          }));
        }

      } else {
        i = this.mtAvatar['eyeLookInLeft'].value - this.mtAvatar['eyeLookOutLeft'].value;
        j = this.gaussianRandom(-0.2,0.2);
        this.animQueue.push( this.animFactory({ name: "headmove",
          dt: [[1000,2000],[1000,2000,1,2],[1000,2000],[1000,2000,1,2]], vs: {
            headRotateY: [null,i,i,0], headRotateX: [null,j,j,0], headRotateZ: [null,-i/4,-i/4,0],
            eyeLookInLeft: [null,0], eyeLookOutLeft: [null,0], eyeLookInRight: [null,0], eyeLookOutRight: [null,0],
            eyeContact: [0]
          }
        }));
      }

    }

    // Make sure we do not overshoot
    if ( dt > 2 * this.animFrameDur ) dt = 2 * this.animFrameDur;

    // Randomize facial expression by changing baseline
    if ( this.viewName !== 'full' || this.isAvatarOnly) {
      i = this.mtRandomized[ Math.floor( Math.random() * this.mtRandomized.length ) ];
      j = this.mtAvatar[i];
      if ( !j.needsUpdate ) {
        Object.assign(j,{ base: (this.mood.baseline[i] || 0) + ( 1 + vol/255 ) * Math.random() / 5, needsUpdate: true });
      }
    }

    // Animate
    this.updatePoseBase(this.animClock);
    if ( this.mixer ) {
      this.mixer.update(dt / 1000 * this.mixer.timeScale);
    }
    this.updatePoseDelta();


    // Volume based head movement, set targets
    if ( (this.isSpeaking || this.isListening) && isEyeContact ) {
      if ( vol > this.volumeMax ) {
        this.volumeHeadBase = 0.05;
        if ( Math.random() > 0.6 ) {
          this.volumeHeadTarget = - 0.05 - Math.random() / 15;
        }
        this.volumeMax = vol;
      } else {
        this.volumeMax *= 0.92;
        this.volumeHeadTarget = this.volumeHeadBase - 0.9 * (this.volumeHeadBase - this.volumeHeadTarget);
      }
    } else {
      this.volumeHeadTarget = 0;
      this.volumeMax = 0;
    }
    i = this.volumeHeadTarget - this.volumeHeadCurrent;
    j = Math.abs(i);
    if ( j > 0.0001 ) {
      k = j * (this.volumeHeadEasing( Math.min(1, this.volumeHeadVelocity * dt / 1000 / j ) / 2 + 0.5 ) - 0.5 );
      this.volumeHeadCurrent += Math.sign(i) * Math.min(j,k);
    }
    if ( Math.abs(this.volumeHeadCurrent) > 0.0001 ) {
      q.setFromAxisAngle(axisx, this.volumeHeadCurrent );
      this.objectNeck.quaternion.multiply(q);
    }

    // Hip-feet balance
    box.setFromObject( this.armature );
    this.objectLeftToeBase.getWorldPosition(v);
    v.sub(this.armature.position);
    this.objectRightToeBase.getWorldPosition(w);
    w.sub(this.armature.position);
    this.objectHips.position.y -= box.min.y / 2;
    this.objectHips.position.x -= (v.x+w.x)/4;
    this.objectHips.position.z -= (v.z+w.z)/2;

    // Update Dynamic Bones
    this.dynamicbones.update(dt);

    // Custom update
    if ( this.opt.update ) {
      this.opt.update(dt);
    }

    // Update morph targets
    this.updateMorphTargets(dt);

    // Finalize
    if ( this.isAvatarOnly ) {

      // Statistics end
      if ( this.stats ) {
        this.stats.end();
      }

    } else {

      // Camera
      if ( this.cameraClock !== null && this.cameraClock < 1000 ) {
        this.cameraClock += dt;
        if ( this.cameraClock > 1000 ) this.cameraClock = 1000;
        let s = new THREE.Spherical().setFromVector3(this.cameraStart);
        let sEnd = new THREE.Spherical().setFromVector3(this.cameraEnd);
        s.phi += this.easing(this.cameraClock / 1000) * (sEnd.phi - s.phi);
        s.theta += this.easing(this.cameraClock / 1000) * (sEnd.theta - s.theta);
        s.radius += this.easing(this.cameraClock / 1000) * (sEnd.radius - s.radius);
        s.makeSafe();
        this.camera.position.setFromSpherical( s );
        if ( this.controlsStart.x !== this.controlsEnd.x ) {
          this.controls.target.copy( this.controlsStart.lerp( this.controlsEnd, this.easing(this.cameraClock / 1000) ) );
        } else {
          s.setFromVector3(this.controlsStart);
          sEnd.setFromVector3(this.controlsEnd);
          s.phi += this.easing(this.cameraClock / 1000) * (sEnd.phi - s.phi);
          s.theta += this.easing(this.cameraClock / 1000) * (sEnd.theta - s.theta);
          s.radius += this.easing(this.cameraClock / 1000) * (sEnd.radius - s.radius);
          s.makeSafe();
          this.controls.target.setFromSpherical( s );
        }
        this.controls.update();
      }

      // Autorotate
      if ( this.controls.autoRotate ) this.controls.update();

      // Statistics end
      if ( this.stats ) {
        this.stats.end();
      }

      this.render();
    }

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
  * Get lip-sync processor based on language. Import module dynamically.
  * @param {string} lang Language
  * @param {string} [path="./"] Module path
  */
  lipsyncGetProcessor(lang, path="./") {
    if ( !this.lipsync.hasOwnProperty(lang) ) {
      const moduleName = path + 'lipsync-' + lang.toLowerCase() + '.mjs';
      const className = 'Lipsync' + lang.charAt(0).toUpperCase() + lang.slice(1);
      import(moduleName).then( module => {
        this.lipsync[lang] = new module[className];
      });
    }
  }

  /**
  * Preprocess text for tts/lipsync, including:
  * - convert symbols/numbers to words
  * - filter out characters that should be left unspoken
  * @param {string} s Text
  * @param {string} lang Language
  * @return {string} Pre-processsed text.
  */
  lipsyncPreProcessText(s,lang) {
    const o = this.lipsync[lang] || Object.values(this.lipsync)[0];
    return o.preProcessText(s);
  }

  /**
  * Convert words to Oculus LipSync Visemes.
  * @param {string} word Word
  * @param {string} lang Language
  * @return {Lipsync} Lipsync object.
  */
  lipsyncWordsToVisemes(word,lang) {
    const o = this.lipsync[lang] || Object.values(this.lipsync)[0];
    return o.wordsToVisemes(word);
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

    // Classifiers
    const dividersSentence = /[!\.\?\n\p{Extended_Pictographic}]/ug;
    const dividersWord = /[ ]/ug;
    const speakables = /[\p{L}\p{N},\.\p{Quotation_Mark}!€\$\+\p{Dash_Punctuation}%&\?]/ug;
    const emojis = /[\p{Extended_Pictographic}]/ug;
    const lipsyncLang = opt.lipsyncLang || this.avatar.lipsyncLang || this.opt.lipsyncLang;

    let markdownWord = ''; // markdown word
    let textWord = ''; // text-to-speech word
    let markId = 0; // SSML mark id
    let ttsSentence = []; // Text-to-speech sentence
    let lipsyncAnim = []; // Lip-sync animation sequence
    const letters = Array.from(this.segmenter.segment(s), x => x.segment);
    for( let i=0; i<letters.length; i++ ) {
      const isLast = i === (letters.length-1);
      const isSpeakable = letters[i].match(speakables);
      let isEndOfSentence = letters[i].match(dividersSentence);
      const isEmoji = letters[i].match(emojis);
      const isEndOfWord = letters[i].match(dividersWord);

      // Exception for end-of-sentence is repeated dividers
      if ( isEndOfSentence && !isLast && !isEmoji && letters[i+1].match(dividersSentence) ) {
        isEndOfSentence = false;
      }

      // Add letter to subtitles
      if ( onsubtitles ) {
        markdownWord += letters[i];
      }

      // Add letter to spoken word
      if ( isSpeakable ) {
        if ( !excludes || excludes.every( x => (i < x[0]) || (i > x[1]) ) ) {
          textWord += letters[i];
        }
      }

      // Add words to sentence and animations
      if ( isEndOfWord || isEndOfSentence || isLast ) {

        // Add to text-to-speech sentence
        if ( textWord.length ) {
          textWord = this.lipsyncPreProcessText(textWord, lipsyncLang);
          if ( textWord.length ) {
            ttsSentence.push( {
              mark: markId,
              word: textWord
            });
          }
        }

        // Push subtitles to animation queue
        if ( markdownWord.length ) {
          lipsyncAnim.push( {
            mark: markId,
            template: { name: 'subtitles' },
            ts: [0],
            vs: {
              subtitles: [markdownWord]
            },
          });
          markdownWord = '';
        }

        // Push visemes to animation queue
        if ( textWord.length ) {
          const val = this.lipsyncWordsToVisemes(textWord, lipsyncLang);
          if ( val && val.visemes && val.visemes.length ) {
            const d = val.times[ val.visemes.length-1 ] + val.durations[ val.visemes.length-1 ];
            for( let j=0; j<val.visemes.length; j++ ) {
              const o =
              lipsyncAnim.push( {
                mark: markId,
                template: { name: 'viseme' },
                ts: [ (val.times[j] - 0.6) / d, (val.times[j] + 0.5) / d, (val.times[j] + val.durations[j] + 0.5) / d ],
                vs: {
                  ['viseme_'+val.visemes[j]]: [null,(val.visemes[j] === 'PP' || val.visemes[j] === 'FF') ? 0.9 : 0.6,0]
                }
              });
            }
          }
          textWord = '';
          markId++;
        }
      }

      // Process sentences
      if ( isEndOfSentence || isLast ) {

        // Send sentence to Text-to-speech queue
        if ( ttsSentence.length || (isLast && lipsyncAnim.length) ) {
          const o = {
            anim: lipsyncAnim
          };
          if ( onsubtitles ) o.onSubtitles = onsubtitles;
          if ( ttsSentence.length && !opt.avatarMute ) {
            o.text = ttsSentence;
            if ( opt.avatarMood ) o.mood = opt.avatarMood;
            if ( opt.ttsLang ) o.lang = opt.ttsLang;
            if ( opt.ttsVoice ) o.voice = opt.ttsVoice;
            if ( opt.ttsRate ) o.rate = opt.ttsRate;
            if ( opt.ttsVoice ) o.pitch = opt.ttsPitch;
            if ( opt.ttsVolume ) o.volume = opt.ttsVolume;
          }
          this.speechQueue.push(o);

          // Reset sentence and animation sequence
          ttsSentence = [];
          textWord = '';
          markId = 0;
          lipsyncAnim = [];
        }

        // Send emoji, if the divider was a known emoji
        if ( isEmoji ) {
          let emoji = this.animEmojis[letters[i]];
          if ( emoji && emoji.link ) emoji = this.animEmojis[emoji.link];
          if ( emoji ) {
            this.speechQueue.push( { emoji: emoji } );
          }
        }

        this.speechQueue.push( { break: 100 } );

      }

    }

    this.speechQueue.push( { break: 1000 } );

    // Start speaking (if not already)
    this.startSpeaking();
  }

  /**
  * Add emoji to speech queue.
  * @param {string} em Emoji.
  */
  async speakEmoji(em) {
    let emoji = this.animEmojis[em];
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
  * @param {number} [background=null] Gain for background audio, if null do not change
  * @param {number} [fadeSecs=0] Gradual exponential fade in/out time in seconds
  */
  setMixerGain( speech, background=null, fadeSecs=0 ) {
    if ( speech !== null ) {
      this.audioSpeechGainNode.gain.cancelScheduledValues(this.audioCtx.currentTime);
      if ( fadeSecs ) {
        this.audioSpeechGainNode.gain.setValueAtTime( Math.max( this.audioSpeechGainNode.gain.value, 0.0001), this.audioCtx.currentTime);
        this.audioSpeechGainNode.gain.exponentialRampToValueAtTime( Math.max( speech, 0.0001), this.audioCtx.currentTime + fadeSecs );
      } else {
        this.audioSpeechGainNode.gain.setValueAtTime( speech, this.audioCtx.currentTime);
      }
    }
    if ( background !== null ) {
      this.audioBackgroundGainNode.gain.cancelScheduledValues(this.audioCtx.currentTime);
      if ( fadeSecs ) {
        this.audioBackgroundGainNode.gain.setValueAtTime( Math.max( this.audioBackgroundGainNode.gain.value, 0.0001), this.audioCtx.currentTime);
        this.audioBackgroundGainNode.gain.exponentialRampToValueAtTime( Math.max( background, 0.0001 ), this.audioCtx.currentTime + fadeSecs );
      } else {
        this.audioBackgroundGainNode.gain.setValueAtTime( background, this.audioCtx.currentTime);
      }
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
                subtitles: [' ' + word]
              }
            });
          }

          // If visemes were not specified, calculate visemes based on the words
          if ( !r.visemes ) {
            const wrd = this.lipsyncPreProcessText(word, lipsyncLang);
            const val = this.lipsyncWordsToVisemes(wrd, lipsyncLang);
            if ( val && val.visemes && val.visemes.length ) {
              const dTotal = val.times[ val.visemes.length-1 ] + val.durations[ val.visemes.length-1 ];
              const overdrive = Math.min(duration, Math.max( 0, duration - val.visemes.length * 150));
              let level = 0.6 + this.convertRange( overdrive, [0,duration], [0,0.4]);
              duration = Math.min( duration, val.visemes.length * 200 );
              if ( dTotal > 0 ) {
                for( let j=0; j<val.visemes.length; j++ ) {
                  const t = time + (val.times[j]/dTotal) * duration;
                  const d = (val.durations[j]/dTotal) * duration;
                  lipsyncAnim.push( {
                    template: { name: 'viseme' },
                    ts: [ t - Math.min(60,2*d/3), t + Math.min(25,d/2), t + d + Math.min(60,d/2) ],
                    vs: {
                      ['viseme_'+val.visemes[j]]: [null,(val.visemes[j] === 'PP' || val.visemes[j] === 'FF') ? 0.9 : level, 0]
                    }
                  });
                }
              }
            }
          }
        }
      }

      // If visemes were specified, use them
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

    // Blend shapes animation
    if (r.anim?.name) {
      let animObj = this.animFactory(r.anim, false, 1, 1, true);
      if (!o.anim) {
        o.anim = [ animObj ];
      } else {
        o.anim.push(animObj);
      }
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
      if ( this.audioCtx.state === "suspended" || this.audioCtx.state === "interrupted" ) {
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
      let audio;
      if ( Array.isArray(item.audio) ) {
        // Convert from PCM samples
        let buf = this.concatArrayBuffers( item.audio );
        audio = this.pcmToAudioBuffer(buf);
      } else {
        audio = item.audio;
      }

      // Create audio source
      this.audioSpeechSource = this.audioCtx.createBufferSource();
      this.audioSpeechSource.buffer = audio;
      this.audioSpeechSource.playbackRate.value = 1 / this.animSlowdownRate;
      this.audioSpeechSource.connect(this.audioAnalyzerNode);
      this.audioSpeechSource.addEventListener('ended', () => {
        this.audioSpeechSource.disconnect();
        this.playAudio(true);
      }, { once: true });

      // Rescale lipsync and push to queue
      let delay = 0;
      if ( item.anim ) {
        // Find the lowest negative time point, if any
        delay = Math.abs(Math.min(0, ...item.anim.map( x => Math.min(...x.ts) ) ) );
        item.anim.forEach( x => {
          for(let i=0; i<x.ts.length; i++) {
            x.ts[i] = this.animClock + x.ts[i] + delay;
          }
          this.animQueue.push(x);
        });
      }

      // Play, dealy in seconds so pre-animations can be played
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
    this.stateName = 'speaking';
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
              .replaceAll('\'','&apos;')
              .replace(/^\p{Dash_Punctuation}$/ug,'<break time="750ms"/>');

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

            // Workaround for Google TTS not providing all timepoints
            const times = [ 0 ];
            let markIndex = 0;
            line.text.forEach( (x,i) => {
              if ( i > 0 ) {
                let ms = times[ times.length - 1 ];
                if ( data.timepoints[markIndex] ) {
                  ms = data.timepoints[markIndex].timeSeconds * 1000;
                  if ( data.timepoints[markIndex].markName === ""+x.mark ) {
                    markIndex++;
                  }
                }
                times.push( ms );
              }
            });

            // Word-to-audio alignment
            const timepoints = [ { mark: 0, time: 0 } ];
            times.forEach( (x,i) => {
              if ( i>0 ) {
                let prevDuration = x - times[i-1];
                if ( prevDuration > 150 ) prevDuration - 150; // Trim out leading space
                timepoints[i-1].duration = prevDuration;
                timepoints.push( { mark: i, time: x });
              }
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

  /**
  * Pause speaking.
  */
  pauseSpeaking() {
    try { this.audioSpeechSource.stop(); } catch(error) {}
    this.audioPlaylist.length = 0;
    this.stateName = 'idle';
    this.isSpeaking = false;
    this.isAudioPlaying = false;
    this.animQueue = this.animQueue.filter( x  => x.template.name !== 'viseme' && x.template.name !== 'subtitles' && x.template.name !== 'blendshapes' );
    if ( this.armature ) {
      this.resetLips();
      this.render();
    }
  }

  /**
  * Stop speaking and clear the speech queue.
  */
  stopSpeaking() {
    try { this.audioSpeechSource.stop(); } catch(error) {}
    this.audioPlaylist.length = 0;
    this.speechQueue.length = 0;
    this.animQueue = this.animQueue.filter( x  => x.template.name !== 'viseme' && x.template.name !== 'subtitles' && x.template.name !== 'blendshapes' );
    this.stateName = 'idle';
    this.isSpeaking = false;
    this.isAudioPlaying = false;
    if ( this.armature ) {
      this.resetLips();
      this.render();
    }
  }

  /**
  * Start streaming mode.
  * @param {Object} [opt={}] Optional settings include gain, sampleRate, lipsyncLang, lipsyncType, metrics, and waitForAudioChunks
  * @param {function} [onAudioStart=null] Optional callback when audio playback starts
  * @param {function} [onAudioEnd=null] Optional callback when audio streaming is automatically ended
  * @param {function} [onSubtitles=null] Optional callback to play subtitles
  * @param {function} [onMetrics=null] Optional callback to receive metrics data during streaming
  */
  async streamStart(opt = {}, onAudioStart = null, onAudioEnd = null, onSubtitles = null, onMetrics = null) {
    this.stopSpeaking(); // Stop the speech queue mode

    this.isStreaming = true;
    if (opt.waitForAudioChunks) this.streamWaitForAudioChunks = opt.waitForAudioChunks;
    if (!this.streamWaitForAudioChunks) { this.streamAudioStartTime = this.animClock; }
    this.streamLipsyncQueue = [];
    this.streamLipsyncType = opt.lipsyncType || this.streamLipsyncType || 'visemes';
    this.streamLipsyncLang = opt.lipsyncLang || this.streamLipsyncLang || this.avatar.lipsyncLang || this.opt.lipsyncLang;
    // Store callbacks for this streaming session
    this.onAudioStart = onAudioStart;
    this.onAudioEnd = onAudioEnd;
    this.onMetrics = onMetrics;

    if (opt.sampleRate !== undefined) {
      const sr = opt.sampleRate;    
      if (
        typeof sr === 'number' &&
        sr >= 8000 &&
        sr <= 96000
      ) {
        if (sr !== this.audioCtx.sampleRate) {
          this.initAudioGraph(sr);
        }
      } else {
        console.warn(
          'Invalid sampleRate provided. It must be a number between 8000 and 96000 Hz.'
        );
      }
    }
    
    if (opt.gain !== undefined) {
      this.audioStreamGainNode.gain.value = opt.gain;
    }

    // Check if we need to create or recreate the worklet
    const needsWorkletSetup = !this.streamWorkletNode || 
                              !this.streamWorkletNode.port || 
                              this.streamWorkletNode.numberOfOutputs === 0 ||
                              this.streamWorkletNode.context !== this.audioCtx;

    if (needsWorkletSetup) {
      // Clean up existing worklet if it exists but is invalid
      if (this.streamWorkletNode) {
        try {
          this.streamWorkletNode.disconnect();
          this.streamWorkletNode = null;
        } catch (e) {
          // Ignore errors during cleanup
        }
      }

      if (!this.workletLoaded) {
        try {
          const loadPromise = this.audioCtx.audioWorklet.addModule(workletUrl.href);
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Worklet loading timed out")), 5000)
          );
          await Promise.race([loadPromise, timeoutPromise]);
          this.workletLoaded = true;
        } catch (error) {
          console.error("Failed to load audio worklet:", error);
          throw new Error("Failed to initialize streaming speech");
        }
      }

      this.streamWorkletNode = new AudioWorkletNode(this.audioCtx, 'playback-worklet', {
        processorOptions: {
          sampleRate: this.audioCtx.sampleRate,
          metrics: opt.metrics || { enabled: false }
        }
      });

      // Connect the node to the audio graph
      this.streamWorkletNode.connect(this.audioStreamGainNode);
      this.streamWorkletNode.connect(this.audioAnalyzerNode);

      this.streamWorkletNode.port.onmessage = (event) => {

        if(event.data.type === 'playback-started') {
          this.isSpeaking = true;
          this.stateName = "speaking";
          if (this.streamWaitForAudioChunks) this.streamAudioStartTime = this.animClock;
          this._processStreamLipsyncQueue();
          this.speakWithHands();
          if (this.onAudioStart) {
            try { this.onAudioStart?.(); } catch(e) { console.error(e); }
          }
        }

        if (event.data.type === 'playback-ended') {
          this._streamPause();
          if (this.onAudioEnd) {
            try { this.onAudioEnd?.(); } catch(e) { console.error(e); }
          }
        }

        // Forward diagnostic metrics if provided
        if (this.onMetrics && event.data.type === 'metrics') {
          try { this.onMetrics(event.data); } catch(e) { /* ignore */ }
        }
      };
    }

    // Update metrics config if provided (can be different per session)
    if (opt.metrics) {
      try { this.streamWorkletNode.port.postMessage({ type: 'config-metrics', data: opt.metrics }); } catch(e) {}
    }

    this.resetLips();
    this.lookAtCamera(500);
    opt.mood && this.setMood( opt.mood );
    this.onSubtitles = onSubtitles || null;

    // If Web Audio API is suspended, try to resume it
    if ( this.audioCtx.state === "suspended" || this.audioCtx.state === "interrupted" ) {
      const resume = this.audioCtx.resume();
      const timeout = new Promise((_r, rej) => setTimeout(() => rej("p2"), 1000));
      try {
        await Promise.race([resume, timeout]);
      } catch(e) {
        console.warn("Can't play audio. Web Audio API suspended. This is often due to calling some speak method before the first user action, which is typically prevented by the browser.");
        return;
      }
    }
  }

  /**
  * Notify if no more streaming data is coming.
  * Actual stop occurs after audio playback.
  */
  streamNotifyEnd() {
    if (!this.isStreaming || !this.streamWorkletNode) return;

    this.streamWorkletNode.port.postMessage({ type: 'no-more-data' });
  }

  /**
   * Interrupt ongoing stream audio and lipsync
   */
  streamInterrupt() {
    if (this.streamWorkletNode) {
      // tell worklet to stop.
      try { this.streamWorkletNode.port.postMessage({type: 'stop'}); } catch(e) { /* ignore */ }
    }
    this._streamPause(true);
  }

  /**
   * Stop streaming mode
   * @param {boolean} disconnect - If true, also disconnect and cleanup the audio worklet
   */
  streamStop() {
    this.streamInterrupt();
    if (this.streamWorkletNode) {
      try {
        this.streamWorkletNode.disconnect();
        this.streamWorkletNode = null;
      } catch(e) { /* ignore */ }
    }
    this.isStreaming = false;
  }
  

  /**
   * Internal function to pause the speaking state after a speech utterance. 
   * This is called when the audio stream ends or is interrupted.
   * @param {boolean} interrupt_lipsync - If true, interrupts the lipsync
   * @private
   */
  _streamPause(interrupt_lipsync = false) {
    this.isSpeaking = false;
    this.stateName = "idle";
    if (this.streamWaitForAudioChunks) this.streamAudioStartTime = null;
    this.streamLipsyncQueue = [];
    // force stop the speech animation.
    if(interrupt_lipsync) {
      this.animQueue = this.animQueue.filter( x  => x.template.name !== 'viseme' && x.template.name !== 'subtitles' && x.template.name !== 'blendshapes' );
      if ( this.armature ) {
        this.resetLips();
        this.render();
      }
    }
  }

  /**
 * Processes all lipsync data items currently in the streamLipsyncQueue.
 * This is called once the actual audio start time is known.
 * @private
 */
  _processStreamLipsyncQueue() {
    if (!this.isStreaming) return;
    while (this.streamLipsyncQueue.length > 0) {
      const lipsyncPayload = this.streamLipsyncQueue.shift();
      // Pass the now confirmed streamAudioStartTime
      this._processLipsyncData(lipsyncPayload, this.streamAudioStartTime);
    }
  }

  /**
   * Processes the lipsync data for the current audio stream.
   * * @param {Object} r The lipsync data object.
   * * @param {number} audioStart The start time of the audio stream.
   * * @private
   */
  _processLipsyncData(r, audioStart) {
    // Early return if streaming has been stopped
    if (!this.isStreaming) return;
    
    // Process visemes
    if (r.visemes && this.streamLipsyncType == 'visemes') {
      for (let i = 0; i < r.visemes.length; i++) {
        const viseme = r.visemes[i];
        const time = audioStart + r.vtimes[i];
        const duration = r.vdurations[i];
        const animObj = {
          template: { name: 'viseme' },
          ts: [time - 2 * duration / 3, time + duration / 2, time + duration + duration / 2],
          vs: {
            ['viseme_' + viseme]: [null, (viseme === 'PP' || viseme === 'FF') ? 0.9 : 0.6, 0]
          }
        }
        this.animQueue.push(animObj);
      }
    }

    // Process words
    if (r.words && (this.onSubtitles || this.streamLipsyncType == "words")) {
      for (let i = 0; i < r.words.length; i++) {
        const word = r.words[i];
        const time = r.wtimes[i];
        let duration = r.wdurations[i];

        if (word.length) {
          // If subtitles callback is available, add the subtitles
          if (this.onSubtitles) {
            this.animQueue.push({
              template: { name: 'subtitles' },
              ts: [audioStart + time],
              vs: {
                subtitles: [' ' + word]
              }
            });
          }

          // Calculate visemes based on the words
          if (this.streamLipsyncType == "words") {
            const lipsyncLang = this.streamLipsyncLang || this.avatar.lipsyncLang || this.opt.lipsyncLang;
            const wrd = this.lipsyncPreProcessText(word, lipsyncLang);
            const val = this.lipsyncWordsToVisemes(wrd, lipsyncLang);
            if (val && val.visemes && val.visemes.length) {
              const dTotal = val.times[val.visemes.length - 1] + val.durations[val.visemes.length - 1];
              const overdrive = Math.min(duration, Math.max(0, duration - val.visemes.length * 150));
              let level = 0.6 + this.convertRange(overdrive, [0, duration], [0, 0.4]);
              duration = Math.min(duration, val.visemes.length * 200);
              if (dTotal > 0) {
                for (let j = 0; j < val.visemes.length; j++) {
                  const t = audioStart + time + (val.times[j] / dTotal) * duration;
                  const d = (val.durations[j] / dTotal) * duration;
                  this.animQueue.push({
                    template: { name: 'viseme' },
                    ts: [t - Math.min(60, 2 * d / 3), t + Math.min(25, d / 2), t + d + Math.min(60, d / 2)],
                    vs: {
                      ['viseme_' + val.visemes[j]]: [null, (val.visemes[j] === 'PP' || val.visemes[j] === 'FF') ? 0.9 : level, 0]
                    }
                  });
                }
              }
            }
          }
        }
      }
    }

    // If blendshapes anims are provided, add them to animQueue
    if (r.anims && this.streamLipsyncType == "blendshapes") {
      for (let i = 0; i < r.anims.length; i++) {
        let anim = r.anims[i];
        anim.delay += audioStart;
        let animObj = this.animFactory(anim, false, 1, 1, true);
        this.animQueue.push(animObj);
      }
    }
  }

  /**
  * stream audio and lipsync. Audio must be in 16 bit PCM format.
  * @param r Audio object with viseme data.
  */
  streamAudio(r) {
    if (!this.isStreaming || !this.streamWorkletNode) return;
    this.isSpeaking = true;
    this.stateName = "speaking";

    // Process audio data if provided
    if (r.audio !== undefined) {
      const message = { type: 'audioData', data: null };

      // Feed ArrayBuffer for performance. Other fallback formats require copy/conversion.
      if (r.audio instanceof ArrayBuffer) {
        message.data = r.audio;
        this.streamWorkletNode.port.postMessage(message, [message.data]);
      } 
      else if (r.audio instanceof Int16Array || r.audio instanceof Uint8Array) {
        const bufferCopy = r.audio.buffer.slice(r.audio.byteOffset, r.audio.byteOffset + r.audio.byteLength);
        message.data = bufferCopy;
        this.streamWorkletNode.port.postMessage(message, [message.data]);
      } 
      else if (r.audio instanceof Float32Array) {
        // Convert Float32 -> Int16 PCM
        const int16Buffer = new Int16Array(r.audio.length);
        for (let i = 0; i < r.audio.length; i++) {
            let s = Math.max(-1, Math.min(1, r.audio[i])); // clamp
            int16Buffer[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }
        message.data = int16Buffer.buffer;
        this.streamWorkletNode.port.postMessage(message, [message.data]);
      } 
      else {
          console.error("r.audio is not a supported type. Must be ArrayBuffer, Int16Array, Uint8Array, or Float32Array:", r.audio);
      }
    }

    if(r.visemes || r.anims || r.words) {
      if(this.streamWaitForAudioChunks && !this.streamAudioStartTime) {
        // Lipsync data received before audio playback start. Queue the lipsync data.
        if (this.streamLipsyncQueue.length >= 200) { // set maximum queue length
            this.streamLipsyncQueue.shift();
        }
        this.streamLipsyncQueue.push(r);
        return;
      }
      this._processLipsyncData(r, this.streamAudioStartTime);
    }
  }

  /**
  * Make eye contact.
  * @param {number} t Time in milliseconds
  */
  makeEyeContact(t) {
    this.animQueue.push( this.animFactory( {
      name: 'eyecontact', dt: [0,t], vs: { eyeContact: [1] }
    }));
  }

  /**
  * Look ahead.
  * @param {number} t Time in milliseconds
  */
  lookAhead(t) {

    if ( t ) {

      // Randomize head/eyes ratio
      let drotx = (Math.random() - 0.5) / 4;
      let droty = (Math.random() - 0.5) / 4;

      // Remove old, if any
      let old = this.animQueue.findIndex( y => y.template.name === 'lookat' );
      if ( old !== -1 ) {
        this.animQueue.splice(old, 1);
      }

      // Add new anim
      const templateLookAt = {
        name: 'lookat',
        dt: [750,t],
        vs: {
          bodyRotateX: [ drotx ],
          bodyRotateY: [ droty ],
          eyesRotateX: [ - 3 * drotx + 0.1 ],
          eyesRotateY: [ - 5 * droty ],
          browInnerUp: [[0,0.7]],
          mouthLeft: [[0,0.7]],
          mouthRight: [[0,0.7]],
          eyeContact: [0],
          headMove: [0]
        }
      };
      this.animQueue.push( this.animFactory( templateLookAt ) );
    }

  }

  /**
  * Turn head and eyes to look at the camera.
  * @param {number} t Time in milliseconds
  */
  lookAtCamera(t) {

    // Calculate the target
    let target;
    if ( this.speakTo ) {
      target = new THREE.Vector3();
      if ( this.speakTo.objectLeftEye?.isObject3D ) {

        // Target eyes
        const o = this.speakTo.armature.objectHead;
        this.speakTo.objectLeftEye.updateMatrixWorld(true);
        this.speakTo.objectRightEye.updateMatrixWorld(true);
        v.setFromMatrixPosition(this.speakTo.objectLeftEye.matrixWorld);
        w.setFromMatrixPosition(this.speakTo.objectRightEye.matrixWorld);
        target.addVectors(v,w).divideScalar( 2 );

      } else if ( this.speakTo.isObject3D ) {
        this.speakTo.getWorldPosition(target);
      } else if ( this.speakTo.isVector3 ) {
        target.set( this.speakTo );
      } else if ( this.speakTo.x && this.speakTo.y && this.speakTo.z ) {
        target.set( this.speakTo.x, this.speakTo.y, this.speakTo.z );
      }
    }
    
    // If we don't have a target, look ahead or to the screen
    if ( !target ) {
      if ( this.avatar.hasOwnProperty('avatarIgnoreCamera') ) {
        if ( this.avatar.avatarIgnoreCamera ) {
          this.lookAhead(t);
          return;
        }
      } else if ( this.opt.avatarIgnoreCamera ) {
        this.lookAhead(t);
        return;
      }
      this.lookAt(null,null,t);
      return;
    }

    // TODO: Improve the logic, if possible

    // Eyes position and head world rotation
    this.objectLeftEye.updateMatrixWorld(true);
    this.objectRightEye.updateMatrixWorld(true);
    v.setFromMatrixPosition(this.objectLeftEye.matrixWorld);
    w.setFromMatrixPosition(this.objectRightEye.matrixWorld);
    v.add(w).divideScalar( 2 );
    q.copy( this.armature.quaternion );
    q.multiply( this.poseTarget.props['Hips.quaternion'] );
    q.multiply( this.poseTarget.props['Spine.quaternion'] );
    q.multiply( this.poseTarget.props['Spine1.quaternion'] );
    q.multiply( this.poseTarget.props['Spine2.quaternion'] );
    q.multiply( this.poseTarget.props['Neck.quaternion'] );
    q.multiply( this.poseTarget.props['Head.quaternion'] );

    // Direction from object to speakto target
    const dir = new THREE.Vector3().subVectors(target, v).normalize();

    // Remove roll: compute yaw + pitch only
    const yaw   = Math.atan2(dir.x, dir.z); // rotation around Y
    const pitch = Math.asin(-dir.y); // rotation around X
    const roll  = 0; // force to 0

    // Desired rotation with Z locked
    e.set(pitch, yaw, roll, 'YXZ');
    const desiredQ  = new THREE.Quaternion().setFromEuler(e);

    // Rotation difference
    const deltaQ = new THREE.Quaternion().copy(desiredQ).multiply(q.clone().invert());

    // Convert to Euler (Z will be ~0 by construction)
    e.setFromQuaternion(deltaQ, 'YXZ');
    let rx = e.x / (40/24) + 0.2; // Refer to setValue(bodyRotateX)
    let ry = e.y / (9/4); // Refer to setValue(bodyRotateY)
    let rotx = Math.min(0.6,Math.max(-0.3,rx));
    let roty = Math.min(0.8,Math.max(-0.8,ry));

    // Randomize head/eyes ratio
    let drotx = (Math.random() - 0.5) / 4;
    let droty = (Math.random() - 0.5) / 4;

    if ( t ) {

      // Remove old, if any
      let old = this.animQueue.findIndex( y => y.template.name === 'lookat' );
      if ( old !== -1 ) {
        this.animQueue.splice(old, 1);
      }

      // Add new anim
      const templateLookAt = {
        name: 'lookat',
        dt: [750,t],
        vs: {
          bodyRotateX: [ rotx + drotx ],
          bodyRotateY: [ roty + droty ],
          eyesRotateX: [ - 3 * drotx + 0.1 ],
          eyesRotateY: [ - 5 * droty ],
          browInnerUp: [[0,0.7]],
          mouthLeft: [[0,0.7]],
          mouthRight: [[0,0.7]],
          eyeContact: [0],
          headMove: [0]
        }
      };
      this.animQueue.push( this.animFactory( templateLookAt ) );
    }

  }

  /**
  * Turn head and eyes to look at the point (x,y).
  * @param {number} x X-coordinate relative to visual viewport
  * @param {number} y Y-coordinate relative to visual viewport
  * @param {number} t Time in milliseconds
  */
  lookAt(x,y,t) {
    if ( !this.camera ) return; // Can't be done w/o knowing the camera location

    // Eyes position
    const rect = this.nodeAvatar.getBoundingClientRect();
    this.objectLeftEye.updateMatrixWorld(true);
    this.objectRightEye.updateMatrixWorld(true);
    const plEye = new THREE.Vector3().setFromMatrixPosition(this.objectLeftEye.matrixWorld);
    const prEye = new THREE.Vector3().setFromMatrixPosition(this.objectRightEye.matrixWorld);
    const pEyes = new THREE.Vector3().addVectors( plEye, prEye ).divideScalar( 2 );

    pEyes.project(this.camera);
    let eyesx = (pEyes.x + 1) / 2 * rect.width + rect.left;
    let eyesy  = -(pEyes.y - 1) / 2 * rect.height + rect.top;

    // if coordinate not specified, look at the camera
    if ( x === null ) x = eyesx;
    if ( y === null ) y = eyesy;

    // Use body/camera rotation to determine the required head rotation
    q.copy( this.armature.quaternion );
    q.multiply( this.poseTarget.props['Hips.quaternion'] );
    q.multiply( this.poseTarget.props['Spine.quaternion'] );
    q.multiply( this.poseTarget.props['Spine1.quaternion'] );
    q.multiply( this.poseTarget.props['Spine2.quaternion'] );
    q.multiply( this.poseTarget.props['Neck.quaternion'] );
    q.multiply( this.poseTarget.props['Head.quaternion'] );
    e.setFromQuaternion(q);
    let rx = e.x / (40/24); // Refer to setValue(bodyRotateX)
    let ry = e.y / (9/4); // Refer to setValue(bodyRotateY)
    let camerarx = Math.min(0.4, Math.max(-0.4,this.camera.rotation.x));
    let camerary = Math.min(0.4, Math.max(-0.4,this.camera.rotation.y));

    // Calculate new delta
    let maxx = Math.max( window.innerWidth - eyesx, eyesx );
    let maxy = Math.max( window.innerHeight - eyesy, eyesy );
    let rotx = this.convertRange(y,[eyesy-maxy,eyesy+maxy],[-0.3,0.6]) - rx + camerarx;
    let roty = this.convertRange(x,[eyesx-maxx,eyesx+maxx],[-0.8,0.8]) - ry + camerary;
    rotx = Math.min(0.6,Math.max(-0.3,rotx));
    roty = Math.min(0.8,Math.max(-0.8,roty));

    // Randomize head/eyes ratio
    let drotx = (Math.random() - 0.5) / 4;
    let droty = (Math.random() - 0.5) / 4;

    if ( t ) {

      // Remove old, if any
      let old = this.animQueue.findIndex( y => y.template.name === 'lookat' );
      if ( old !== -1 ) {
        this.animQueue.splice(old, 1);
      }

      // Add new anim
      const templateLookAt = {
        name: 'lookat',
        dt: [750,t],
        vs: {
          bodyRotateX: [ rotx + drotx ],
          bodyRotateY: [ roty + droty ],
          eyesRotateX: [ - 3 * drotx + 0.1 ],
          eyesRotateY: [ - 5 * droty ],
          browInnerUp: [[0,0.7]],
          mouthLeft: [[0,0.7]],
          mouthRight: [[0,0.7]],
          eyeContact: [0],
          headMove: [0]
        }
      };
      this.animQueue.push( this.animFactory( templateLookAt ) );
    }
  }


  /**
  * Set the closest hand to touch at (x,y).
  * @param {number} x X-coordinate relative to visual viewport
  * @param {number} y Y-coordinate relative to visual viewport
  * @return {Boolean} If true, (x,y) touch the avatar
  */
  touchAt(x,y) {
    if ( !this.camera ) return; // Can't be done w/o knowing the camera location

    const rect = this.nodeAvatar.getBoundingClientRect();
    const pointer = new THREE.Vector2(
      ( (x - rect.left) / rect.width ) * 2 - 1,
      - ( (y - rect.top) / rect.height ) * 2 + 1
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(pointer,this.camera);
    const intersects = raycaster.intersectObject(this.armature);
    if ( intersects.length > 0 ) {
      const target = intersects[0].point;
      const LeftArmPos = new THREE.Vector3();
      const RightArmPos = new THREE.Vector3();
      this.objectLeftArm.getWorldPosition(LeftArmPos);
      this.objectRightArm.getWorldPosition(RightArmPos);
      const LeftD2 = LeftArmPos.distanceToSquared(target);
      const RightD2 = RightArmPos.distanceToSquared(target);
      if ( LeftD2 < RightD2 ) {
        this.ikSolve( {
          iterations: 20, root: "LeftShoulder", effector: "LeftHandMiddle1",
          links: [
            { link: "LeftHand", minx: -0.5, maxx: 0.5, miny: -1, maxy: 1, minz: -0.5, maxz: 0.5, maxAngle: 0.1 },
            { link: "LeftForeArm", minx: -0.5, maxx: 1.5, miny: -1.5, maxy: 1.5, minz: -0.5, maxz: 3, maxAngle: 0.2 },
            { link: "LeftArm", minx: -1.5, maxx: 1.5, miny: 0, maxy: 0, minz: -1, maxz: 3 }
          ]
        }, target, false, 1000 );
        this.setValue("handFistLeft",0);
      } else {
        this.ikSolve( {
          iterations: 20, root: "RightShoulder", effector: "RightHandMiddle1",
          links: [
            { link: "RightHand", minx: -0.5, maxx: 0.5, miny: -1, maxy: 1, minz: -0.5, maxz: 0.5, maxAngle: 0.1 },
            { link: "RightForeArm", minx: -0.5, maxx: 1.5, miny: -1.5, maxy: 1.5, minz: -3, maxz: 0.5, maxAngle: 0.2 },
            { link: "RightArm", minx: -1.5, maxx: 1.5, miny: 0, maxy: 0, minz: -1, maxz: 3 }
          ]
        }, target, false, 1000 );
        this.setValue("handFistRight",0);
      }
    } else {
      ["LeftArm","LeftForeArm","LeftHand","RightArm","RightForeArm","RightHand"].forEach( x => {
        let key = x + ".quaternion";
        this.poseTarget.props[key].copy( this.getPoseTemplateProp(key) );
        this.poseTarget.props[key].t = this.animClock;
        this.poseTarget.props[key].d = 1000;
      });
    }

    return ( intersects.length > 0 );
  }

  /**
  * Talk with hands.
  * @param {number} [delay=0] Delay in milliseconds
  * @param {number} [prob=1] Probability of hand movement
  */
  speakWithHands(delay=0,prob=0.5) {

    // Only if we are standing and not bending and probabilities match up
    if ( this.mixer || this.gesture || !this.poseTarget.template.standing || this.poseTarget.template.bend || Math.random()>prob ) return;

    // Random targets for left hand
    this.ikSolve( {
      root: "LeftShoulder", effector: "LeftHandMiddle1",
      links: [
        { link: "LeftHand", minx: -0.5, maxx: 0.5, miny: -1, maxy: 1, minz: -0.5, maxz: 0.5 },
        { link: "LeftForeArm", minx: -0.5, maxx: 1.5, miny: -1.5, maxy: 1.5, minz: -0.5, maxz: 3 },
        { link: "LeftArm", minx: -1.5, maxx: 1.5, miny: -1.5, maxy: 1.5, minz: -1, maxz: 3 }
      ]
    }, new THREE.Vector3(
      this.gaussianRandom(0,0.5),
      this.gaussianRandom(-0.8,-0.2),
      this.gaussianRandom(0,0.5)
    ), true);

    // Random target for right hand
    this.ikSolve( {
      root: "RightShoulder", effector: "RightHandMiddle1",
      links: [
        { link: "RightHand", minx: -0.5, maxx: 0.5, miny: -1, maxy: 1, minz: -0.5, maxz: 0.5 },
        { link: "RightForeArm", minx: -0.5, maxx: 1.5, miny: -1.5, maxy: 1.5, minz: -3, maxz: 0.5 },
        { link: "RightArm" }
      ]
    }, new THREE.Vector3(
      this.gaussianRandom(-0.5,0),
      this.gaussianRandom(-0.8,-0.2),
      this.gaussianRandom(0,0.5)
    ), true);

    // Moveto
    const dt = [];
    const moveto = [];

    // First move
    dt.push( 100 + Math.round( Math.random() * 500 ) );
    moveto.push( { duration: 1000, props: {
      "LeftHand.quaternion": new THREE.Quaternion().setFromEuler( new THREE.Euler( 0, -1 - Math.random(), 0 ) ),
      "RightHand.quaternion": new THREE.Quaternion().setFromEuler( new THREE.Euler( 0, 1 + Math.random(), 0 ) )
    } } );
    ["LeftArm","LeftForeArm","RightArm","RightForeArm"].forEach( x => {
      moveto[0].props[x+'.quaternion'] = this.ikMesh.getObjectByName(x).quaternion.clone();
    });

    // Return to original target
    dt.push( 1000 + Math.round( Math.random() * 500 ) );
    moveto.push( { duration: 2000, props: {} } );
    ["LeftArm","LeftForeArm","RightArm","RightForeArm","LeftHand","RightHand"].forEach( x => {
      moveto[1].props[x+'.quaternion'] = null;
    });

    // Make an animation
    const anim = this.animFactory( {
      name: 'talkinghands',
      delay: delay,
      dt: dt,
      vs: { moveto: moveto }
    });
    this.animQueue.push( anim );

  }

  /**
  * Get slowdown.
  * @return {numeric} Slowdown factor.
  */
  getSlowdownRate(k) {
    return this.animSlowdownRate;
  }

  /**
  * Set slowdown.
  * @param {numeric} k Slowdown factor.
  */
  setSlowdownRate(k) {
    this.animSlowdownRate = k;
    this.audioSpeechSource.playbackRate.value = 1 / this.animSlowdownRate;
    this.audioBackgroundSource.playbackRate.value = 1 / this.animSlowdownRate;
  }

  /**
  * Get autorotate speed.
  * @return {numeric} Autorotate speed.
  */
  getAutoRotateSpeed(k) {
    return this.controls.autoRotateSpeed;
  }

  /**
  * Set autorotate.
  * @param {numeric} speed Autorotate speed, e.g. value 2 = 30 secs per orbit at 60fps.
  */
  setAutoRotateSpeed(speed) {
    this.controls.autoRotateSpeed = speed;
    this.controls.autoRotate = (speed > 0);
  }

  /**
  * Start animation cycle.
  */
  start() {
    if ( this.armature && this.isRunning === false ) {
      this.audioCtx.resume();
      this.animTimeLast = performance.now();
      this.isRunning = true;
      if ( !this.isAvatarOnly ) {
        requestAnimationFrame( this.animate.bind(this) );
      }
    }
  }

  /**
  * Stop animation cycle.
  */
  stop() {
    this.isRunning = false;
    this.audioCtx.suspend();
  }

  /**
  * Start listening incoming audio.
  * @param {AnalyserNode} analyzer Analyzer node for incoming audio
  * @param {Object} [opt={}] Options
  * @param {function} [onchange=null] Callback function for start
  */
  startListening(analyzer, opt = {}, onchange = null) {
    this.listeningAnalyzer = analyzer;
    this.listeningAnalyzer.fftSize = 256;
    this.listeningAnalyzer.smoothingTimeConstant = 0.1;
    this.listeningAnalyzer.minDecibels = -70;
    this.listeningAnalyzer.maxDecibels = -10;
    this.listeningOnchange = (onchange && typeof onchange === 'function') ? onchange : null;

    this.listeningSilenceThresholdLevel = opt?.hasOwnProperty('listeningSilenceThresholdLevel') ? opt.listeningSilenceThresholdLevel : this.opt.listeningSilenceThresholdLevel;
    this.listeningSilenceThresholdMs = opt?.hasOwnProperty('listeningSilenceThresholdMs') ? opt.listeningSilenceThresholdMs : this.opt.listeningSilenceThresholdMs;
    this.listeningSilenceDurationMax = opt?.hasOwnProperty('listeningSilenceDurationMax') ? opt.listeningSilenceDurationMax : this.opt.listeningSilenceDurationMax;
    this.listeningActiveThresholdLevel = opt?.hasOwnProperty('listeningActiveThresholdLevel') ? opt.listeningActiveThresholdLevel : this.opt.listeningActiveThresholdLevel;
    this.listeningActiveThresholdMs = opt?.hasOwnProperty('listeningActiveThresholdMs') ? opt.listeningActiveThresholdMs : this.opt.listeningActiveThresholdMs;
    this.listeningActiveDurationMax = opt?.hasOwnProperty('listeningActiveDurationMax') ? opt.listeningActiveDurationMax : this.opt.listeningActiveDurationMax;

    this.listeningActive = false;
    this.listeningVolume = 0;
    this.listeningTimer = 0;
    this.listeningTimerTotal = 0;
    this.isListening = true;
  }

  /**
  * Stop animation cycle.
  */
  stopListening() {
    this.isListening = false;
  }

  /**
  * Play RPM/Mixamo animation clip.
  * @param {string|Object} url URL to animation file FBX
  * @param {progressfn} [onprogress=null] Callback for progress
  * @param {number} [dur=10] Duration in seconds, but at least once
  * @param {number} [ndx=0] Index of the clip
  * @param {number} [scale=0.01] Position scale factor
  */
  async playAnimation(url, onprogress=null, dur=10, ndx=0, scale=0.01) {
    if ( !this.armature ) return;

    let item = this.animClips.find( x => x.url === url+'-'+ndx );
    if ( item ) {

      // Reset pose update
      let anim = this.animQueue.find( x => x.template.name === 'pose' );
      if ( anim ) {
        anim.ts[0] = Infinity;
      }

      // Set new pose
      Object.entries(item.pose.props).forEach( x => {
        this.poseBase.props[x[0]] = x[1].clone();
        this.poseTarget.props[x[0]] = x[1].clone();
        this.poseTarget.props[x[0]].t = 0;
        this.poseTarget.props[x[0]].d = 1000;
      });

      // Create a new mixer
      this.mixer = new THREE.AnimationMixer(this.armature);
      this.mixer.addEventListener( 'finished', this.stopAnimation.bind(this), { once: true });

      // Play action
      const repeat = Math.ceil(dur / item.clip.duration);
      const action = this.mixer.clipAction(item.clip);
      action.setLoop( THREE.LoopRepeat, repeat );
      action.clampWhenFinished = true;
      action.fadeIn(0.5).play();

    } else {

      // Load animation
      const loader = new FBXLoader();

      let fbx = await loader.loadAsync( url, onprogress );

      if ( fbx && fbx.animations && fbx.animations[ndx] ) {
        let anim = fbx.animations[ndx];

        // Rename and scale Mixamo tracks, create a pose
        const props = {};
        anim.tracks.forEach( t => {
          t.name = t.name.replaceAll('mixamorig','');
          const ids = t.name.split('.');
          if ( ids[1] === 'position' ) {
            for(let i=0; i<t.values.length; i++ ) {
              t.values[i] = t.values[i] * scale;
            }
            props[t.name] = new THREE.Vector3(t.values[0],t.values[1],t.values[2]);
          } else if ( ids[1] === 'quaternion' ) {
            props[t.name] = new THREE.Quaternion(t.values[0],t.values[1],t.values[2],t.values[3]);
          } else if ( ids[1] === 'rotation' ) {
            props[ids[0]+".quaternion"] = new THREE.Quaternion().setFromEuler(new THREE.Euler(t.values[0],t.values[1],t.values[2],'XYZ')).normalize();
          }

        });

        // Add to clips
        const newPose = { props: props };
        if ( props['Hips.position'] ) {
          if ( props['Hips.position'].y < 0.5 ) {
            newPose.lying = true;
          } else {
            newPose.standing = true;
          }
        }
        this.animClips.push({
          url: url+'-'+ndx,
          clip: anim,
          pose: newPose
        });

        // Play
        this.playAnimation(url, onprogress, dur, ndx, scale);

      } else {
        const msg = 'Animation ' + url + ' (ndx=' + ndx + ') not found';
        console.error(msg);
      }
    }
  }

  /**
  * Stop running animations.
  */
  stopAnimation() {

    // Stop mixer
    this.mixer = null;

    // Restart gesture
    if ( this.gesture ) {
      for( let [p,v] of Object.entries(this.gesture) ) {
        v.t = this.animClock;
        v.d = 1000;
        if ( this.poseTarget.props.hasOwnProperty(p) ) {
          this.poseTarget.props[p].copy(v);
          this.poseTarget.props[p].t = this.animClock;
          this.poseTarget.props[p].d = 1000;
        }
      }
    }

    // Restart pose animation
    let anim = this.animQueue.find( x => x.template.name === 'pose' );
    if ( anim ) {
      anim.ts[0] = this.animClock;
    }
    this.setPoseFromTemplate( null );

  }


  /**
  * Play RPM/Mixamo pose.
  * @param {string|Object} url Pose name | URL to FBX
  * @param {progressfn} [onprogress=null] Callback for progress
  * @param {number} [dur=5] Duration of the pose in seconds
  * @param {number} [ndx=0] Index of the clip
  * @param {number} [scale=0.01] Position scale factor
  */
  async playPose(url, onprogress=null, dur=5, ndx=0, scale=0.01) {

    if ( !this.armature ) return;

    // Check if we already have the pose template ready
    let pose = this.poseTemplates[url];
    if ( !pose ) {
      const item = this.animPoses.find( x => x.url === url+'-'+ndx );
      if ( item ) {
        pose = item.pose;
      }
    }

    // If we have the template, use it, otherwise try to load it
    if ( pose ) {

      this.poseName = url;

      this.mixer = null;
      let anim = this.animQueue.find( x => x.template.name === 'pose' );
      if ( anim ) {
        anim.ts[0] = this.animClock + (dur * 1000) + 2000;
      }
      this.setPoseFromTemplate( pose );

    } else {

      // Load animation
      const loader = new FBXLoader();

      let fbx = await loader.loadAsync( url, onprogress );

      if ( fbx && fbx.animations && fbx.animations[ndx] ) {
        let anim = fbx.animations[ndx];

        // Create a pose
        const props = {};
        anim.tracks.forEach( t => {

          // Rename and scale Mixamo tracks
          t.name = t.name.replaceAll('mixamorig','');
          const ids = t.name.split('.');
          if ( ids[1] === 'position' ) {
            props[t.name] = new THREE.Vector3( t.values[0] * scale, t.values[1] * scale, t.values[2] * scale);
          } else if ( ids[1] === 'quaternion' ) {
            props[t.name] = new THREE.Quaternion( t.values[0], t.values[1], t.values[2], t.values[3] );
          } else if ( ids[1] === 'rotation' ) {
            props[ids[0]+".quaternion"] = new THREE.Quaternion().setFromEuler(new THREE.Euler( t.values[0], t.values[1], t.values[2],'XYZ' )).normalize();
          }
        });

        // Add to pose
        const newPose = { props: props };
        if ( props['Hips.position'] ) {
          if ( props['Hips.position'].y < 0.5 ) {
            newPose.lying = true;
          } else {
            newPose.standing = true;
          }
        }
        this.animPoses.push({
          url: url+'-'+ndx,
          pose: newPose
        });

        // Play
        this.playPose(url, onprogress, dur, ndx, scale);

      } else {
        const msg = 'Pose ' + url + ' (ndx=' + ndx + ') not found';
        console.error(msg);
      }
    }
  }

  /**
  * Stop the pose. (Functionality is the same as in stopAnimation.)
  */
  stopPose() {
    this.stopAnimation();
  }

  /**
  * Play a gesture, which is either a hand gesture, an emoji animation or their
  * combination.
  * @param {string} name Gesture name
  * @param {number} [dur=3] Duration of the gesture in seconds
  * @param {boolean} [mirror=false] Mirror gesture
  * @param {number} [ms=1000] Transition time in milliseconds
  */
  playGesture(name, dur=3, mirror=false, ms=1000) {

    if ( !this.armature ) return;

    // Hand gesture, if any
    let g = this.gestureTemplates[name];
    if ( g ) {

      // New gesture always overrides the existing one
      if ( this.gestureTimeout ) {
        clearTimeout( this.gestureTimeout );
        this.gestureTimeout = null;
      }

      // Stop talking hands animation
      let ndx = this.animQueue.findIndex( y => y.template.name === "talkinghands" );
      if ( ndx !== -1 ) {
        this.animQueue[ndx].ts = this.animQueue[ndx].ts.map( x => 0 );
      }

      // Set gesture
      this.gesture = this.propsToThreeObjects( g );
      if ( mirror ) {
        this.gesture = this.mirrorPose( this.gesture );
      }
      if ( name === "namaste" && this.avatar.body === 'M' ) {
        // Work-a-round for male model so that the hands meet
        this.gesture["RightArm.quaternion"].rotateTowards( new THREE.Quaternion(0,1,0,0), -0.25);
        this.gesture["LeftArm.quaternion"].rotateTowards( new THREE.Quaternion(0,1,0,0), -0.25);
      }

      // Apply to target
      for( let [p,val] of Object.entries(this.gesture) ) {
        val.t = this.animClock;
        val.d = ms;
        if ( this.poseTarget.props.hasOwnProperty(p) ) {
          this.poseTarget.props[p].copy(val);
          this.poseTarget.props[p].t = this.animClock;
          this.poseTarget.props[p].d = ms;
        }
      }

      // Timer
      if ( dur && Number.isFinite(dur) ) {
        this.gestureTimeout = setTimeout( this.stopGesture.bind(this,ms), 1000 * dur);
      }
    }

    // Animated emoji, if any
    let em = this.animEmojis[name];
    if ( em ) {

      // Follow link
      if ( em && em.link ) {
        em = this.animEmojis[em.link];
      }

      if ( em ) {
        // Look at the camera for 500 ms
        this.lookAtCamera(500);

        // Create animation and tag as gesture
        const anim = this.animFactory( em );
        anim.gesture = true;

        // Rescale duration
        if ( dur && Number.isFinite(dur) ) {
          const first = anim.ts[0];
          const last = anim.ts[ anim.ts.length -1 ];
          const total = last - first;
          const excess = (dur * 1000) - total;

          // If longer, increase longer parts; if shorter, scale everything
          if ( excess > 0 ) {
            const dt = [];
            for( let i=1; i<anim.ts.length; i++ ) dt.push( anim.ts[i] - anim.ts[i-1] );
            const rescale = em.template?.rescale || dt.map( x => x / total );
            const excess = dur * 1000 - total;
            anim.ts = anim.ts.map( (x,i,arr) => {
              return (i===0) ? first : (arr[i-1] + dt[i-1] + rescale[i-1] * excess);
            });
          } else {
            const scale = (dur * 1000) / total;
            anim.ts = anim.ts.map( x => first + scale * (x - first) );
          }
        }

        this.animQueue.push( anim );
      }
    }

  }

  /**
  * Stop the gesture.
  * @param {number} [ms=1000] Transition time in milliseconds
  */
  stopGesture(ms=1000) {

    // Stop gesture timer
    if ( this.gestureTimeout ) {
      clearTimeout( this.gestureTimeout );
      this.gestureTimeout = null;
    }

    // Stop hand gesture, if any
    if ( this.gesture ) {
      const gs = Object.entries(this.gesture);
      this.gesture = null;
      for( const [p,val] of gs ) {
        if ( this.poseTarget.props.hasOwnProperty(p) ) {
          this.poseTarget.props[p].copy( this.getPoseTemplateProp(p) );
          this.poseTarget.props[p].t = this.animClock;
          this.poseTarget.props[p].d = ms;
        }
      }
    }

    // Stop animated emoji gesture, if any
    let i = this.animQueue.findIndex( y => y.gesture );
    if ( i !== -1 ) {
      this.animQueue.splice(i, 1);
    }

  }

  /**
  * Cyclic Coordinate Descent (CCD) Inverse Kinematic (IK) algorithm.
  * Adapted from:
  * https://github.com/mrdoob/three.js/blob/master/examples/jsm/animation/CCDIKSolver.js
  * @param {Object} ik IK configuration object
  * @param {Vector3} [target=null] Target coordinate, if null return to template
  * @param {Boolean} [relative=false] If true, target is relative to root
  * @param {numeric} [d=null] If set, apply in d milliseconds
  */
  ikSolve(ik, target=null, relative=false, d=null) {
    const targetVec = new THREE.Vector3();
    const effectorPos = new THREE.Vector3();
    const effectorVec = new THREE.Vector3();
    const linkPos = new THREE.Vector3();
    const invLinkQ = new THREE.Quaternion();
    const linkScale = new THREE.Vector3();
    const axis = new THREE.Vector3();
    const vector = new THREE.Vector3();

    // Reset IK setup positions and rotations
    const root = this.ikMesh.getObjectByName(ik.root);
    root.position.setFromMatrixPosition( this.armature.getObjectByName(ik.root).matrixWorld );
    root.quaternion.setFromRotationMatrix( this.armature.getObjectByName(ik.root).matrixWorld );
    if ( target && relative ) {
      target.applyQuaternion(this.armature.quaternion).add( root.position );
    }
    const effector = this.ikMesh.getObjectByName(ik.effector);
    const links = ik.links;
    links.forEach( x => {
      x.bone = this.ikMesh.getObjectByName(x.link);
      x.bone.quaternion.copy( this.getPoseTemplateProp(x.link+'.quaternion') );
    });
    root.updateMatrixWorld(true);
    const iterations = ik.iterations || 10;

    // Iterate
    if ( target ) {
      for ( let i = 0; i < iterations; i ++ ) {
        let rotated = false;
        for ( let j = 0, jl = links.length; j < jl; j++ ) {
          const bone = links[j].bone;
          bone.matrixWorld.decompose( linkPos, invLinkQ, linkScale );
          invLinkQ.invert();
          effectorPos.setFromMatrixPosition( effector.matrixWorld );
          effectorVec.subVectors( effectorPos, linkPos );
          effectorVec.applyQuaternion( invLinkQ );
          effectorVec.normalize();
          targetVec.subVectors( target, linkPos );
          targetVec.applyQuaternion( invLinkQ );
          targetVec.normalize();
          let angle = targetVec.dot( effectorVec );
          if ( angle > 1.0 ) {
            angle = 1.0;
          } else if ( angle < - 1.0 ) {
            angle = - 1.0;
          }
          angle = Math.acos( angle );
          if ( angle < 1e-5 ) continue;
          if ( links[j].minAngle !== undefined && angle < links[j].minAngle ) {
            angle = links[j].minAngle;
          }
          if ( links[j].maxAngle !== undefined && angle > links[j].maxAngle ) {
            angle = links[j].maxAngle;
          }
          axis.crossVectors( effectorVec, targetVec );
          axis.normalize();
          q.setFromAxisAngle( axis, angle );
          bone.quaternion.multiply( q );

          // Constraints
          bone.rotation.setFromVector3( vector.setFromEuler( bone.rotation ).clamp( new THREE.Vector3(
            links[j].minx !== undefined ? links[j].minx : -Infinity,
            links[j].miny !== undefined ? links[j].miny : -Infinity,
            links[j].minz !== undefined ? links[j].minz : -Infinity
          ), new THREE.Vector3(
            links[j].maxx !== undefined ? links[j].maxx : Infinity,
            links[j].maxy !== undefined ? links[j].maxy : Infinity,
            links[j].maxz !== undefined ? links[j].maxz : Infinity
          )) );

          bone.updateMatrixWorld( true );
          rotated = true;
        }
        if ( !rotated ) break;
      }
    }

    // Apply
    if ( d ) {
      links.forEach( x => {
        this.poseTarget.props[x.link+".quaternion"].copy( x.bone.quaternion );
        this.poseTarget.props[x.link+".quaternion"].t = this.animClock;
        this.poseTarget.props[x.link+".quaternion"].d = d;
      });
    }
  }

  /**
  * Dispose the instance.
  */
  dispose() {
    
    // Stop animation, clear speech queue, stop stream
    this.stop();
    this.stopSpeaking();
    this.streamStop();

    // Dispose Three.JS objects
    if ( this.isAvatarOnly ) {
      if ( this.armature ) {
        if ( this.armature.parent ) {
          this.armature.parent.remove(this.armature);
        }
        this.clearThree(this.armature);
      }
    } else {
      this.clearThree(this.scene);
      this.resizeobserver.disconnect();
    }
    this.clearThree( this.ikMesh );
    this.dynamicbones.dispose();

  }

}

export { TalkingHead };
