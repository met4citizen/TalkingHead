import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import Stats from 'three/addons/libs/stats.module.js';

import { poseTemplates, poseDelta, posePropNames } from './pose-templates.mjs'
import { animMoods } from './animmoods.mjs'
import { animEmojis } from './animemojis.mjs'

import { b64ToArrayBuffer, concatArrayBuffers, pcmToAudioBuffer } from './talkingutils.js'

/**
* @class Talking Head
* @author Mika Suominen
*/
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
      cameraView: 'full',
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
      markedOptions: { mangle:false, headerIds:false, breaks: true },
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
    this.poseTemplates = poseTemplates
    this.poseDelta = poseDelta
    this.posePropNames = posePropNames

    // Use "side" as the first pose, weight on left leg
    this.poseName = "side"; // First pose
    this.poseWeightOnLeft = true; // Initial weight on left leg
    this.poseCurrentTemplate = null;
    this.poseBase = this.poseFactory( this.poseTemplates[this.poseName] );
    this.poseTarget = this.poseFactory( this.poseTemplates[this.poseName] );
    this.poseAvatar = null; // Set when avatar has been loaded

    this.animEmojis = animEmojis
    this.animMoods = animMoods

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
    //           1. State (idle, talking)
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
    this.moodName = this.opt.avatarMood || "neutral";
    this.mood = this.animMoods[ this.moodName ];
    if ( !this.mood ) {
      this.moodName = "neutral";
      this.mood = this.animMoods["neutral"];
    }
    this.randomized = [
      'mouthDippleLeft','mouthDippleRight', 'mouthLeft', 'mouthPress',
      'mouthStretchLeft', 'mouthStretchRight', 'mouthShrugLower',
      'mouthShrugUpper', 'noseSneerLeft', 'noseSneerRight', 'mouthRollLower',
      'mouthRollUpper', 'browDownLeft', 'browDownRight', 'browOuterUpLeft',
      'browOuterUpRight', 'cheekPuff', 'cheekSquintLeft', 'cheekSquintRight'
    ];

    // Baseline/fixed morph targets
    this.animBaseline = {};
    this.animFixed = {};

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
    this.stateName = 'idle';
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
      throw new Error("You must provide some Google-compliant Text-To-Speech Endpoint.");
    }

    this._setupIKMesh()
    this._setupLocalRenderer()
  }

  _setupIKMesh() {
    // IK Mesh
    this.ikMesh = new THREE.SkinnedMesh();
    const ikSetup = {
      'LeftShoulder': null, 'LeftArm': 'LeftShoulder', 'LeftForeArm': 'LeftArm',
      'LeftHand': 'LeftForeArm', 'LeftHandMiddle1': 'LeftHand',
      'RightShoulder': null, 'RightArm': 'RightShoulder', 'RightForeArm': 'RightArm',
      'RightHand': 'RightForeArm', 'RightHandMiddle1': 'RightHand'
    };
    const ikBones = [];
    Object.entries(ikSetup).forEach( (e,i) => {
      const bone = new THREE.Bone();
      bone.name = e[0];
      if ( e[1] ) {
        this.ikMesh.getObjectByName(e[1]).add(bone);
      } else {
        this.ikMesh.add(bone);
      }
      ikBones.push(bone);
    });
    this.ikMesh.bind( new THREE.Skeleton( ikBones ) );
  }


  _setupLocalRenderer() {

    // Setup 3D Animation
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

    // Clear previous scene, if avatar was previously loaded
    this.mixer = null;
    if ( this.armature ) {
      this.clearThree( this.scene );
    }

    // Avatar full-body
    this.armature = gltf.scene.getObjectByName( this.opt.modelRoot );
    this.armature.scale.setScalar(1);

    // Morph targets
    // TODO: Check morph target names
    this.morphs = [];
    this.armature.traverse( x => {
      if ( x.morphTargetInfluences && x.morphTargetInfluences.length &&
        x.morphTargetDictionary ) {
        this.morphs.push(x);
      }
    });
    if ( this.morphs.length === 0 ) {
      throw new Error('Blend shapes not found');
    }

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

    // Add avatar to scene
    this.scene.add(gltf.scene);

    // Add lights
    this.scene.add( this.lightAmbient );
    this.scene.add( this.lightDirect );
    this.scene.add( this.lightSpot );
    this.lightSpot.target = this.armature.getObjectByName('Head');

    // Estimate avatar height based on eye level
    const plEye = new THREE.Vector3();
    this.armature.getObjectByName('LeftEye').getWorldPosition(plEye);
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
    if ( view !== 'full' && view !== 'upper' && view !== 'head' && view !== 'mid' ) return;
    if ( !this.armature ) {
      this.opt.cameraView = view;
      return;
    }

    this.viewName = view || this.viewName;
    opt = opt || {};

    const fov = this.camera.fov * ( Math.PI / 180 );
    let x = - (opt.cameraX || this.opt.cameraX) * Math.tan( fov / 2 );
    let y = ( 1 - (opt.cameraY || this.opt.cameraY)) * Math.tan( fov / 2 );
    let z = (opt.cameraDistance || this.opt.cameraDistance);
    if ( this.viewName === 'head' ) {
      z += 2;
      y = y * z + 4 * this.avatarHeight / 5;
    } else if ( this.viewName === 'upper' ) {
      z += 4.5;
      y = y * z + 2 * this.avatarHeight / 3;
    } else if ( this.viewName === 'mid' ) {
      z += 8;
      y = y * z + this.avatarHeight / 3;
    } else {
      z += 12;
      y = y * z;
    }
    x = x * z;

    this.controlsEnd = new THREE.Vector3(x, y, 0);
    this.cameraEnd = new THREE.Vector3(x, y, z).applyEuler( new THREE.Euler( (opt.cameraRotateX || opt.cameraRotateX), (opt.cameraRotateY || this.opt.cameraRotateY), 0 ) );

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
    if ( this.isRunning ) {

      // Set limits to eyelids
      const blinkl = this.getValue("eyeBlinkLeft");
      const blinkr = this.getValue("eyeBlinkRight");
      const lookdown = this.getValue("eyesLookDown") / 2;
      const limitl = lookdown + this.getValue("browDownLeft") / 2;
      const limitr = lookdown + this.getValue("browDownRight") / 2;
      this.setValue( "eyeBlinkLeft", Math.max(blinkl,limitl) );
      this.setValue( "eyeBlinkRight", Math.max(blinkr,limitr) );

      this.renderer.render( this.scene, this.camera );

      // Restore eyelid values
      this.setValue( "eyeBlinkLeft", blinkl );
      this.setValue( "eyeBlinkRight", blinkr );

    }
  }

  /**
  * Resize avatar.
  */
  onResize() {
    this.camera.aspect = this.nodeAvatar.clientWidth / this.nodeAvatar.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize( this.nodeAvatar.clientWidth, this.nodeAvatar.clientHeight );
    this.controls.update();
    this.renderer.render( this.scene, this.camera );
  }

  /**
  * Update avatar pose.
  * @param {number} t High precision timestamp in ms.
  */
  updatePoseBase(t) {
    for( const [key,v] of Object.entries(this.poseTarget.props) ) {
      const o = this.poseAvatar.props[key];
      if (o) {
        const alpha = (t - v.t) / v.d;
        if ( alpha > 1 || !this.poseBase.props.hasOwnProperty(key) ) {
          o.copy(v);
        } else {
          if ( o.isQuaternion ) {
            o.copy( this.poseBase.props[key].slerp(v, this.easing(alpha) ));
          } else if ( o.isVector3 ) {
            o.copy( this.poseBase.props[key].lerp(v, this.easing(alpha) ));
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
      const e = new THREE.Euler(d.x,d.y,d.z);
      const o = this.poseAvatar.props[key];
      if ( o.isQuaternion ) {
        const q = new THREE.Quaternion().setFromEuler(e).normalize();
        o.multiply(q);
      } else if ( o.isVector3 ) {
        o.add( e );
      }
    }
  }

  /**
  * Get given pose as a string.
  * @param {Object} pose Pose
  * @param {number} [prec=0.001] Precision used in values
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
  * Return pose template property taking into account mirror pose.
  * @param {string} key Property key
  * @return {Quaternion|Vector3} Position or rotation
  */
  getPoseTemplateProp(key) {
    let q;
    if ( !this.poseWeightOnLeft ) {
      if ( key.startsWith('Left') ) {
        key = 'Right' + key.substring(4);
      } else if ( key.startsWith('Right') ) {
        key = 'Left' + key.substring(5);
      }
      q = this.poseTarget.template.props[key].clone();
      if ( q.isQuaternion ) {
        q.x *= -1;
        q.w *= -1;
      }
    } else {
      q = this.poseTarget.template.props[key].clone();
    }
    return q;
  }

  /**
  * Change body weight from current leg to another.
  * @param {Object} p Pose properties
  */
  mirrorPose(p) {
    const r = {};
    for( let [key,v] of Object.entries(p) ) {

      // Create a mirror image
      if ( v.isQuaternion ) {
        if ( key.startsWith('Left') ) {
          key = 'Right' + key.substring(4);
        } else if ( key.startsWith('Right') ) {
          key = 'Left' + key.substring(5);
        }
        v.x *= -1;
        v.w *= -1;
      }

      r[key] = v.clone();

      // Custom properties
      r[key].t = v.t;
      r[key].d = v.d;
    }
    this.poseWeightOnLeft = !this.poseWeightOnLeft;
    return r;
  }

  /**
  * Create a new pose.
  * @param {Object} template Pose template
  * @param {numeric} duration Default duration in ms
  * @return {Object} A new pose object.
  */
  poseFactory(template, duration) {
    const o = { template: template, props: {} };
    Object.entries(template.props).forEach( x => {
      o.props[x[0]] = x[1].clone();

      // Restrain movement when standing
      if ( this.opt.modelMovementFactor < 1 && template.standing &&
        (x[0] === 'Hips.quaternion' || x[0] === 'Spine.quaternion' ||
        x[0] === 'Spine1.quaternion' || x[0] === 'Spine2.quaternion' ||
        x[0] === 'Neck.quaternion' || x[0] === 'LeftUpLeg.quaternion' ||
        x[0] === 'LeftLeg.quaternion' || x[0] === 'RightUpLeg.quaternion' ||
        x[0] === 'RightLeg.quaternion') ) {
        const ref = this.poseTemplates["straight"].props[x[0]];
        const angle = o.props[x[0]].angleTo( ref );
        o.props[x[0]].rotateTowards( ref, (1 - this.opt.modelMovementFactor) * angle );
      }

      // Custom properties
      o.props[x[0]].t = this.animClock; // timestamp
      o.props[x[0]].d = duration; // Transition duration
    });
    this.poseWeightOnLeft = true;
    return o;
  }

  /**
  * Set a new pose and start transition timer.
  * @param {Object} t Pose template
  */
  setPoseFromTemplate(template) {

    // Special cases
    const isIntermediate = this.poseTarget && this.poseTarget.template && ((this.poseTarget.template.standing && template.lying) || (this.poseTarget.template.lying && template.standing));
    const isSameTemplate = template === this.poseCurrentTemplate;
    const isWeightOnLeft = this.poseWeightOnLeft;
    let duration = isIntermediate ? 1000 : 2000;

    // New pose template
    if ( isIntermediate) {
      this.poseCurrentTemplate = this.poseTemplates['oneknee'];
      setTimeout( () => {
        this.setPoseFromTemplate(template);
      }, duration);
    } else {
      this.poseCurrentTemplate = template;
    }

    // Set target
    this.poseTarget = this.poseFactory(this.poseCurrentTemplate, duration);

    // Mirror properties, if necessary
    if ( (!isSameTemplate && !isWeightOnLeft) || (isSameTemplate && isWeightOnLeft ) ) {
      this.poseTarget.props = this.mirrorPose(this.poseTarget.props);
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
    if ( mt === 'headRotateX' ) {
      return this.poseDelta.props['Head.quaternion'].x;
    } else if ( mt === 'headRotateY' ) {
      return this.poseDelta.props['Head.quaternion'].y;
    } else if ( mt === 'headRotateZ' ) {
      return this.poseDelta.props['Head.quaternion'].z;
    } else if ( mt.startsWith('handFist') ) {
      const side = mt.substring(8);
      return this.poseDelta.props[side+'HandMiddle1.quaternion'].x;
    } else if ( mt === 'chestInhale' ) {
      return this.poseDelta.props['Spine1.scale'].x * 20;
    } else {
      const ndx = this.morphs[0].morphTargetDictionary[mt];
      if ( ndx !== undefined ) {
        return this.morphs[0].morphTargetInfluences[ndx];
      } else {
        return 0;
      }
    }
  }


  /**
  * Set morph target value.
  * @param {string} mt Morph target
  * @param {number} v Value
  */
  setValue(mt,v) {
    if ( mt === 'headRotateX' ) {
      this.poseDelta.props['Head.quaternion'].x = v;
      this.poseDelta.props['Spine1.quaternion'].x =v/2;
      this.poseDelta.props['Spine.quaternion'].x = v/8;
      this.poseDelta.props['Hips.quaternion'].x = v/24;
    } else if ( mt === 'headRotateY' ) {
      this.poseDelta.props['Head.quaternion'].y = v;
      this.poseDelta.props['Spine1.quaternion'].y = v/2;
      this.poseDelta.props['Spine.quaternion'].y = v/2;
      this.poseDelta.props['Hips.quaternion'].y = v/4;
      this.poseDelta.props['LeftUpLeg.quaternion'].y = v/2;
      this.poseDelta.props['RightUpLeg.quaternion'].y = v/2;
      this.poseDelta.props['LeftLeg.quaternion'].y = v/4;
      this.poseDelta.props['RightLeg.quaternion'].y = v/4;
    } else if ( mt === 'headRotateZ' ) {
      this.poseDelta.props['Head.quaternion'].z = v;
      this.poseDelta.props['Spine1.quaternion'].z = v/12;
      this.poseDelta.props['Spine.quaternion'].z = v/12;
      this.poseDelta.props['Hips.quaternion'].z = v/24;
    } else if ( mt.startsWith('handFist') ) {
      const side = mt.substring(8);
      ['HandThumb', 'HandIndex','HandMiddle',
      'HandRing', 'HandPinky'].forEach( (x,i) => {
        if ( i === 0 ) {
          this.poseDelta.props[side+x+'1.quaternion'].x = 0;
          this.poseDelta.props[side+x+'2.quaternion'].z = (side === 'Left' ? -1 : 1) * v;
          this.poseDelta.props[side+x+'3.quaternion'].z = (side === 'Left' ? -1 : 1) * v;
        } else {
          this.poseDelta.props[side+x+'1.quaternion'].x = v;
          this.poseDelta.props[side+x+'2.quaternion'].x = 1.5 * v;
          this.poseDelta.props[side+x+'3.quaternion'].x = 1.5 * v;
        }
      });
    } else if ( mt === 'chestInhale' ) {
      const scale = v/20;
      const d = { x: scale, y: (scale/2), z: (3 * scale) };
      const dneg = { x: (1/(1+scale) - 1), y: (1/(1 + scale/2) - 1), z: (1/(1 + 3 * scale) - 1) };
      this.poseDelta.props['Spine1.scale'] = d;
      this.poseDelta.props['Neck.scale'] = dneg;
      this.poseDelta.props['LeftArm.scale'] = dneg;
      this.poseDelta.props['RightArm.scale'] = dneg;
    } else {
      this.morphs.forEach( x => {
        const ndx = x.morphTargetDictionary[mt];
        if ( ndx !== undefined ) {
          x.morphTargetInfluences[ndx] = v;
        }
      });
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

    // Reset morph target baseline to 0
    for( let mt of ["handFistLeft","handFistRight",...Object.keys(this.morphs[0].morphTargetDictionary)] ) {
      this.setBaselineValue( mt, this.mood.baseline.hasOwnProperty(mt) ? this.mood.baseline[mt] : 0 );
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
    return [
      'headRotateX', 'headRotateY', 'headRotateZ',
      'eyesRotateX', 'eyesRotateY', 'chestInhale',
      'handFistLeft', 'handFistRight',
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
    } else if ( mt === 'eyeLookOutLeft' || mt === 'eyeLookInLeft' ||
            mt === 'eyeLookOutRight' || mt === 'eyeLookInRight' ||
            mt === 'eyesLookDown' || mt === 'eyesLookUp' ) {
      // skip these
    } else {
      if ( v === null ) {
        if ( this.animBaseline.hasOwnProperty(mt) ) {
          delete this.animBaseline[mt];
        }
      } else {
        this.animBaseline[mt] = { target: v };
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
      if ( v === null ) {
        if ( this.animFixed.hasOwnProperty(mt) ) {
          delete this.animFixed[mt];
        }
      } else {
        this.animFixed[mt] = { target: v };
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
           p += a.alt[i].p || (1-p)/(a.alt.length-i);
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
    const delay = a.delay ? (Array.isArray(a.delay) ? this.gaussianRandom(a.delay[0], a.delay[1], a.delay[2], a.delay[3]) : a.delay ) : 0;
    if ( a.hasOwnProperty('dt') ) {
      a.dt.forEach( (x,i) => {
        o.ts[i+1] = o.ts[i] + (Array.isArray(x) ? this.gaussianRandom(x[0],x[1],x[2],x[3]) : x);
      });
    }
    o.ts = o.ts.map( x => this.animClock + delay + x * scaleTime );

    // Values
    for( let [mt,vs] of Object.entries(a.vs) ) {
      const base = this.getBaselineValue(mt);
      const v = vs.map( x => {
        if ( x === null ) {
          return null;
        } else if ( typeof x === 'function' ) {
          return x;
        } else if ( typeof x === 'string' || x instanceof String ) {
          return x.slice();
        } else if ( Array.isArray(x) ) {
          return (base === undefined ? 0 : base) + scaleValue * this.gaussianRandom(x[0],x[1],x[2],x[3]);
        } else if ( x instanceof Object && x.constructor === Object ) {
          return Object.assign( {}, x );
        } else {
          return (base === undefined ? 0 : base) + scaleValue * x;
        }
      });

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

    // Loop
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
    if ( t <= ts[iMin] ) return (typeof vs[iMin] === 'function' ? vs[iMin]() : vs[iMin]);
    if ( t >= ts[iMax] ) return (typeof vs[iMax] === 'function' ? vs[iMax]() : vs[iMax]);
    while( t > ts[iMin+1] ) iMin++;
    iMax = iMin + 1;
    let k = ((typeof vs[iMax] === 'function' ? vs[iMax]() : vs[iMax]) - (typeof vs[iMin] === 'function' ? vs[iMin]() : vs[iMin])) / (ts[iMax] - ts[iMin]);
    if ( fun ) k = fun( ( t - ts[iMin] ) / (ts[iMax] - ts[iMin]) ) * k;
    const b = (typeof vs[iMin] === 'function' ? vs[iMin]() : vs[iMin]) - (k * ts[iMin]);
    return (k * t + b);
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
  * @param {number} t High precision timestamp in ms.
  */
  animate(t) {

    // Are we running?
    if ( this.isRunning ) {
      requestAnimationFrame( this.animate.bind(this) );
    } else {
      return;
    }

    // Delta time
    let dt = t - this.animTimeLast;
    if ( dt < this.animFrameDur ) return;
    dt = dt / this.animSlowdownRate;
    this.animClock += dt;
    this.animTimeLast = t;

    // Statistics start
    if ( this.stats ) {
      this.stats.begin();
    }

    // Randomize facial expression
    if ( this.viewName !== 'full' ) {
      const randomizedMs = this.randomized[ Math.floor( Math.random() * this.randomized.length ) ];
      const v = this.getValue(randomizedMs);
      const vb = this.getBaselineValue(randomizedMs);
      if ( v === vb ) {
        const randomizedV = (this.mood.baseline[randomizedMs] || 0) + Math.random()/5;
        this.setBaselineValue(randomizedMs, randomizedV);
      }
    }

    // Start from baseline
    const o = {};
    for( let [mt,x] of Object.entries(this.animBaseline) ) {
      const v = this.getValue(mt);
      if ( v !== x.target ) {
        if ( x.t0 === undefined ) {
          x.t0 = this.animClock;
          x.v0 = v;
        }
        let delay = 1000;
        o[mt] = this.valueAnimationSeq( [x.t0,x.t0+delay], [x.v0,x.target], this.animClock, this.easing );
      } else {
        x.t0 = undefined;
      }
    }

    // Animations
    for( let i = 0; i < this.animQueue.length; i++ ) {
      const x = this.animQueue[i];
      if ( this.animClock >= x.ts[0] ) {
        for( let [mt,vs] of Object.entries(x.vs) ) {
          if ( mt === 'subtitles' ) {
            o[mt] = (o.hasOwnProperty(mt) ? o[mt] + vs : "" + vs);
            delete x.vs[mt];
          } else if ( mt === 'function' ) {
            vs.forEach( fn => {
              if ( fn && typeof fn === "function" ) {
                fn();
              }
            });
            delete x.vs[mt];
          } else if ( mt === 'speak' ) {
            o[mt] = (o.hasOwnProperty(mt) ? o[mt] + ' ' + vs : "" + vs);
            delete x.vs[mt];
          } else if ( mt === 'pose' ) {
            o[mt] = ""+vs[1];
            delete x.vs[mt];
          } else if ( mt === 'moveto' || mt ==='handLeft' || mt === 'handRight' ) {
            for( let j=0; j<x.ts.length; j++ ) {
              if ( vs[j] && this.animClock >= x.ts[j] ) {
                o[mt] = Object.assign(o[mt] || {}, vs[j]);
                vs[j] = null;
              }
            }
          } else {
            if ( vs[0] === null ) vs[0] = this.getValue(mt);
            o[mt] = this.valueAnimationSeq( x.ts, vs, this.animClock, this.easing );
            if ( this.animBaseline.hasOwnProperty(mt) ) this.animBaseline[mt].t0 = undefined;
            for( let j=0; j<i; j++ ) {
              if ( this.animQueue[j].vs.hasOwnProperty(mt) ) delete this.animQueue[j].vs[mt];
            }
          }
        }
        if ( this.animClock >= x.ts[x.ts.length-1] ) {
          if ( x.hasOwnProperty('mood') ) this.setMood(x.mood);
          if ( x.loop ) {
            let restrain = ( this.isSpeaking && (x.template.name === 'head' || x.template.name === 'eyes') ) ? 4 : 1;
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
          x.t0 = this.animClock;
          x.v0 = v;
        }
        let delay = 1000;
        o[mt] = this.valueAnimationSeq( [x.t0,x.t0+delay], [x.v0,x.target], this.animClock, this.easing );
      } else {
        if ( o.hasOwnProperty(mt) ) delete o[mt];
        x.t0 = undefined;
      }
      if ( this.animBaseline.hasOwnProperty(mt) ) this.animBaseline[mt].t0 = undefined;
    }

    // Update values
    for( let [mt,x] of Object.entries(o) ) {
      if ( mt === 'subtitles' ) {
        if( this.onSubtitles && typeof this.onSubtitles === "function" ) {
          this.onSubtitles(""+x);
        }
      } else if ( mt === 'speak' ) {
        this.speakText(""+x);
      } else if ( mt === 'pose' ) {
        this.poseName = ""+x;
        this.setPoseFromTemplate( this.poseTemplates[ this.poseName ] );
      } else if ( mt === 'moveto' ) {
        Object.entries(x.props).forEach( e => {
          if ( e[1] ) {
            this.poseTarget.props[e[0]].copy( e[1] );
          } else {
            this.poseTarget.props[e[0]].copy( this.getPoseTemplateProp(e[0]) );
          }
          this.poseTarget.props[e[0]].t = this.animClock;
          this.poseTarget.props[e[0]].d = (e[1] && e[1].d) ? e[1].d : (x.duration || 2000);
        });
      } else if ( mt === 'handLeft' ) {
        this.ikSolve( {
          iterations: 20, root: "LeftShoulder", effector: "LeftHandMiddle1",
          links: [
            { link: "LeftHand", minx: -0.5, maxx: 0.5, miny: -1, maxy: 1, minz: -0.5, maxz: 0.5 },
            { link: "LeftForeArm", minx: -0.5, maxx: 1.5, miny: -1.5, maxy: 1.5, minz: -0.5, maxz: 3 },
            { link: "LeftArm", minx: -1.5, maxx: 1.5, miny: 0, maxy: 0, minz: -1, maxz: 3 }
          ]
        }, x.x ? new THREE.Vector3(x.x,x.y,x.z) : null, true, x.d );
      } else if ( mt === 'handRight' ) {
        this.ikSolve( {
          iterations: 20, root: "RightShoulder", effector: "RightHandMiddle1",
          links: [
            { link: "RightHand", minx: -0.5, maxx: 0.5, miny: -1, maxy: 1, minz: -0.5, maxz: 0.5, maxAngle: 0.1 },
            { link: "RightForeArm", minx: -0.5, maxx: 1.5, miny: -1.5, maxy: 1.5, minz: -3, maxz: 0.5, maxAngle: 0.2 },
            { link: "RightArm", minx: -1.5, maxx: 1.5, miny: 0, maxy: 0, minz: -1, maxz: 3 }
          ]
        }, x.x ? new THREE.Vector3(x.x,x.y,x.z) : null, true, x.d );
      } else {
        this.setValue(mt,x);
      }
    }

    // Animate
    this.updatePoseBase(this.animClock);
    if ( this.mixer ) {
      this.mixer.update(dt / 1000 * this.mixer.timeScale);
    }
    this.updatePoseDelta();

    // Hip-feet balance
    const box = new THREE.Box3();
    box.setFromObject( this.armature );
    const ltoePos = new THREE.Vector3();
    const rtoePos = new THREE.Vector3();
    this.armature.getObjectByName('LeftToeBase').getWorldPosition(ltoePos);
    this.armature.getObjectByName('RightToeBase').getWorldPosition(rtoePos);
    const hips = this.armature.getObjectByName('Hips');
    hips.position.y -= box.min.y / 2;
    hips.position.x -= (ltoePos.x+rtoePos.x)/4;
    hips.position.z -= (ltoePos.z+rtoePos.z)/2;

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
  * @return {Object} Pre-processsed text.
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
  * @param {string} w Word
  * @param {string} lang Language
  * @return {Lipsync} Lipsync object.
  */
  lipsyncWordsToVisemes(w,lang) {
    const o = this.lipsync[lang] || Object.values(this.lipsync)[0];
    return o.wordsToVisemes(w);
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
    const speakables = /[\p{L}\p{N},\.'!€\$\+\-%&\?]/ug;
    const emojis = /[\p{Extended_Pictographic}]/ug;
    const lipsyncLang = opt.lipsyncLang || this.avatar.lipsyncLang || this.opt.lipsyncLang;

    let markdownWord = ''; // markdown word
    let textWord = ''; // text-to-speech word
    let markId = 0; // SSML mark id
    let ttsSentence = []; // Text-to-speech sentence
    let lipsyncAnim = []; // Lip-sync animation sequence
    const letters = [...s];
    for( let i=0; i<letters.length; i++ ) {
      const isLast = i === (letters.length-1);
      const isSpeakable = letters[i].match(speakables);
      const isEndOfSentence = letters[i].match(dividersSentence);
      const isEndOfWord = letters[i].match(dividersWord);

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
              subtitles: markdownWord
            },
          });
          markdownWord = '';
        }

        // Push visemes to animation queue
        if ( textWord.length ) {
          const v = this.lipsyncWordsToVisemes(textWord, lipsyncLang);
          if ( v && v.visemes && v.visemes.length ) {
            const d = v.times[ v.visemes.length-1 ] + v.durations[ v.visemes.length-1 ];
            for( let j=0; j<v.visemes.length; j++ ) {
              const o =
              lipsyncAnim.push( {
                mark: markId,
                template: { name: 'viseme' },
                ts: [ (v.times[j] - 0.6) / d, (v.times[j] + 0.5) / d, (v.times[j] + v.durations[j] + 0.5) / d ],
                vs: {
                  ['viseme_'+v.visemes[j]]: [null,(v.visemes[j] === 'PP' || v.visemes[j] === 'FF') ? 0.9 : 0.6,0]
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
        if ( letters[i].match(emojis) ) {
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
            const w = this.lipsyncPreProcessText(word, lipsyncLang);
            const v = this.lipsyncWordsToVisemes(w, lipsyncLang);
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
      let audio;
      if ( Array.isArray(item.audio) ) {
        // Convert from PCM samples
        let buf = concatArrayBuffers( item.audio );
        audio = pcmToAudioBuffer(buf);
      } else {
        audio = item.audio;
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
            const buf = b64ToArrayBuffer(data.audioContent);
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

  /**
  * Pause speaking.
  */
  pauseSpeaking() {
    try { this.audioSpeechSource.stop(); } catch(error) {}
    this.audioPlaylist.length = 0;
    this.stateName = 'idle';
    this.isSpeaking = false;
    this.isAudioPlaying = false;
    this.animQueue = this.animQueue.filter( x  => x.template.name !== 'viseme' );
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
    this.animQueue = this.animQueue.filter( x  => x.template.name !== 'viseme' );
    this.stateName = 'idle';
    this.isSpeaking = false;
    this.isAudioPlaying = false;
    if ( this.armature ) {
      this.resetLips();
      this.render();
    }
  }

  /**
  * Turn head and eyes to look at the camera.
  * @param {number} t Time in milliseconds
  */
  lookAtCamera(t) {
    this.lookAt( null, null, t );
  }

  /**
  * Turn head and eyes to look at the point (x,y).
  * @param {number} x X-coordinate relative to visual viewport
  * @param {number} y Y-coordinate relative to visual viewport
  * @param {number} t Time in milliseconds
  */
  lookAt(x,y,t) {

    // Eyes position
    const rect = this.nodeAvatar.getBoundingClientRect();
    const lEye = this.armature.getObjectByName('LeftEye');
    const rEye = this.armature.getObjectByName('RightEye');
    lEye.updateMatrixWorld(true);
    rEye.updateMatrixWorld(true);
    const plEye = new THREE.Vector3().setFromMatrixPosition(lEye.matrixWorld);
    const prEye = new THREE.Vector3().setFromMatrixPosition(rEye.matrixWorld);
    const pEyes = new THREE.Vector3().addVectors( plEye, prEye ).divideScalar( 2 );
    pEyes.project(this.camera);
    let eyesx = (pEyes.x + 1) / 2 * rect.width + rect.left;
    let eyesy  = -(pEyes.y - 1) / 2 * rect.height + rect.top;

    // if coordinate not specified, look at the camera
    if ( x === null ) x = eyesx;
    if ( y === null ) y = eyesy;

    // Use body/camera rotation to determine the required head rotation
    let q = this.poseTarget.props['Hips.quaternion'].clone();
    q.multiply( this.poseTarget.props['Spine.quaternion'] );
    q.multiply( this.poseTarget.props['Spine1.quaternion'] );
    q.multiply( this.poseTarget.props['Spine2.quaternion'] );
    q.multiply( this.poseTarget.props['Neck.quaternion'] );
    q.multiply( this.poseTarget.props['Head.quaternion'] );
    let e = new THREE.Euler().setFromQuaternion(q);
    let rx = e.x / (40/24); // Refer to setValue(headRotateX)
    let ry = e.y / (9/4); // Refer to setValue(headRotateY)
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
          headRotateX: [ rotx + drotx ],
          headRotateY: [ roty + droty ],
          eyesRotateX: [ - 3 * drotx + 0.1 ],
          eyesRotateY: [ - 5 * droty ],
          browInnerUp: [[0,0.7]],
          mouthLeft: [[0,0.7]],
          mouthRight: [[0,0.7]]
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
      this.armature.getObjectByName('LeftArm').getWorldPosition(LeftArmPos);
      this.armature.getObjectByName('RightArm').getWorldPosition(RightArmPos);
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
    if ( this.mixer || !this.poseTarget.template.standing || this.poseTarget.template.bend || Math.random()>prob ) return;

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
    })

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
      requestAnimationFrame( this.animate.bind(this) );
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
  * Play RPM/Mixamo animation clip.
  * @param {string} url URL to animation file FBX
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
    this.mixer = null;
    this.poseCurrentTemplate = null; // This forces the pose change
    let anim = this.animQueue.find( x => x.template.name === 'pose' );
    if ( anim ) {
      anim.ts[0] = this.animClock;
    }
  }


  /**
  * Play RPM/Mixamo pose.
  * @param {string} url URL to animation file FBX
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
  * Cyclic Coordinate Descent (CCD) Inverse Kinematic (IK) algorithm.
  * Adapted from:
  * https://github.com/mrdoob/three.js/blob/master/examples/jsm/animation/CCDIKSolver.js
  * @param {Object} ik IK configuration object
  * @param {Vector3} [target=null] Target coordinate, if null return to template
  * @param {Boolean} [relative=false] If true, target is relative to root
  * @param {numeric} [d=null] If set, apply in d milliseconds
  */
  ikSolve(ik, target=null, relative=false, d=null) {
    const q = new THREE.Quaternion();
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
      target.add( root.position );
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
        for ( let j = 0, jl = links.length; j < jl; j ++ ) {
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

}

export { TalkingHead };
