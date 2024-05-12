import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import Stats from 'three/addons/libs/stats.module.js';

import { TalkingHeadArticulate } from './talkinghead-articulate.mjs'

/**
* @class Talking Head
* @author Mika Suominen
* 
* Renderer support
*/
class TalkingHead extends TalkingHeadArticulate {

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

    super(node,opt)

    this.nodeAvatar = node;

    const default_options = {
      modelPixelRatio: 1,
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
      markedOptions: { mangle:false, headerIds:false, breaks: true },
      statsNode: null,
      statsStyle: null
    };

    this.opt = Object.assign( default_options, opt || {} );

    // Statistics
    if ( this.opt.statsNode ) {
      this.stats = new Stats();
      if ( this.opt.statsStyle ) {
        this.stats.dom.style.cssText = this.opt.statsStyle;
      }
      this.opt.statsNode.appendChild( this.stats.dom );
    }

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
  * Animate.
  * @param {number} t High precision timestamp in ms.
  */
  animate(t) {

    // Are we running?
    if ( this.isRunning ) {
      requestAnimationFrame( this.animate.bind(this) );
    } else {
      return;
    }

    // Statistics start
    if ( this.stats ) {
      this.stats.begin();
    }

    // Advance animation
    let dt = this.animateTime(t)
    if(dt) {
      const o = this.animateBuildList()
      this.animateSpeech(o)
      this.animateBody(o)
    } else {
      return
    }

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

    this.render()
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
    this.boundingRect = nodeAvatar.getBoundingClientRect()
    this.camera.aspect = this.nodeAvatar.clientWidth / this.nodeAvatar.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize( this.nodeAvatar.clientWidth, this.nodeAvatar.clientHeight );
    this.controls.update();
    this.renderer.render( this.scene, this.camera );
  }

  /**
  * Loader for 3D avatar model.
  * @param {string} avatar Avatar object with 'url' property to GLTF/GLB file.
  * @param {progressfn} [onprogress=null] Callback for progress
  */
  async showAvatar(avatar, onprogress=null ) {
    this.stop();
    const gltf_scene = await super.loadAvatar(this.scene,avatar,onprogress);
    if(gltf_scene) {
      this.clearThree( scene );
      this.scene.add(gltf_scene);
      this.lightSpot.target = this.gltf_scene.getObjectByName('Head');
    }
    if ( !this.viewName ) this.setView( this.opt.cameraView );
    this.start();
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

    // remove and re-add lights

    this.scene.add( this.lightAmbient );
    this.scene.add( this.lightDirect );
    this.scene.add( this.lightSpot );

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

}
