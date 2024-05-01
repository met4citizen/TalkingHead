import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

import { animMoods } from './anim-moods.mjs'
import { animEmojis } from './anim-emojis.mjs'
import { poseTemplates, poseDelta, posePropNames } from './pose-templates.mjs'

/**
* @class Talking Head Animate
* @author Mika Suominen
* 
* Body animation support
*/
export class TalkingHeadAnimate {

  /**
  * @constructor
  * @param {Object} node DOM element of the avatar
  * @param {Object} [opt=null] Global/default options
  */
  constructor(node, opt = null ) {

    this.nodeAvatar = node;

    const default_options = {
      modelRoot: "Armature",
      modelPixelRatio: 1,
      modelFPS: 30,
      modelMovementFactor: 1,
      avatarMood: "neutral",
    };

    this.opt = Object.assign( default_options, opt || {} );

    this.stateName = 'idle';

    // Pose templates
    // NOTE: The body weight on each pose should be on left foot
    // for most natural result.
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
    this.animMoods = animMoods
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

    this.setupIKMesh()
  }

  setupIKMesh() {
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

  /**
  * Loader for 3D avatar model.
  * @param {string} avatar Avatar object with 'url' property to GLTF/GLB file.
  * @param {progressfn} [onprogress=null] Callback for progress
  */
  async loadAvatar(avatar, onprogress=null ) {

    // Checkt the avatar parameter
    if ( !avatar || !avatar.hasOwnProperty('url') ) {
      throw new Error("Invalid parameter. The avatar must have at least 'url' specified.");
    }

    // Loader
    const loader = new GLTFLoader();
    let gltf = await loader.loadAsync( avatar.url, onprogress );

    useAvatar(gltf.scene)
    return gltf.scene
  }

  useAvatar(avatar) {

    // Check the gltf
    const required = [ this.opt.modelRoot ];
    this.posePropNames.forEach( x => required.push( x.split('.')[0] ) );
    required.forEach( x => {
      if ( !avatar.getObjectByName(x) ) {
        throw new Error('Avatar object ' + x + ' not found');
      }
    });

    this.avatar = avatar;

    // Clear previous scene, if avatar was previously loaded
    this.mixer = null;

    // Avatar full-body
    this.armature = avatar.getObjectByName( this.opt.modelRoot );
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

    // Estimate avatar height based on eye level
    const plEye = new THREE.Vector3();
    this.armature.getObjectByName('LeftEye').getWorldPosition(plEye);
    this.avatarHeight = plEye.y + 0.2;

    // Set pose and start animation
    this.setMood( this.avatar.avatarMood || this.moodName || this.opt.avatarMood );
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

// THIS IS NOT USED XXX

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
   * Animate forward time
   */
  animateTime(t) {
    let dt = t - this.animTimeLast;
    if ( dt < this.animFrameDur ) return 0;
    dt = dt / this.animSlowdownRate;
    this.animClock += dt;
    this.animTimeLast = t;
    return dt
  }

  /**
  * Build a list of chores to perform
  */
  animateBuildList() {

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

    const o = {};

    // Start from baseline
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

    return o
  }

  /**
   * Update performance
   */
  _animateBodyInternal(mt,x) {
    if ( mt === 'subtitles' ) {
      // done at caller scope instead
      //      if( this.onSubtitles && typeof this.onSubtitles === "function" ) {
      //        this.onSubtitles(""+x);
      //      }
    } else if ( mt === 'speak' ) {
      // done at caller scope instead
      //      this.speakText(""+x);
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

  /**
  * animate avatar
  */
  animateBody(o) {

    // Update values
    for( let [mt,x] of Object.entries(o) ) {
    	this._animateBodyInternal(mt,x)
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

  	// camera may not exist
  	if(!this.camera || !this.nodeAvatar) return

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

    if(!this.nodeAvatar) return

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
