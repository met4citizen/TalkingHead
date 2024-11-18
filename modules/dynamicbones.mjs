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

// Temporary variables
let tmp,tmp2,tmp3;
const arr = [0,0,0,0];
const v = new THREE.Vector3();
const v2 = new THREE.Vector3();
const w = new THREE.Vector3();
const w2 = new THREE.Vector3();
const p = new THREE.Plane();
const r = new THREE.Ray();
const e = new THREE.Euler();
const q = new THREE.Quaternion();
const q2 = new THREE.Quaternion();
const m = new THREE.Matrix4();
const minv = new THREE.Matrix4();

// Axis
const origin = new THREE.Vector3();
const forward = new THREE.Vector3(0, 0, 1);
const axisx = new THREE.Vector3(1, 0, 0);
const axisy = new THREE.Vector3(0, 1, 0);
const axisz = new THREE.Vector3(0, 0, 1);


class DynamicBones {

  constructor( opt = null ) {
    this.opt = Object.assign({
      warmupMs: 2000,
      sensitivityFactor: 1, // Sensitivity to external forces
      movementFactor: 1, // Scale movement
      isExcludes: true, // Use excludes
      isPivots: true, // Use pivots
      isLimits: true, // Use limits
      helperBoneColor1: 0xff0000,
      helperBoneColor2: 0xf7c5cc,
      helperLinkColor1: 0xff0000,
      helperLinkColor2: 0x0000ff,
      helperExcludesColor: 0xaaaaff
    }, opt || {});

    this.scene = null;
    this.armature = null;
    this.config = [];
    this.data = []; // Dynamic bones data
    this.dict = {}; // Dictionary from bone name to data object
    this.objectsUpdate = []; // Matrices to be update in order
    this.helpers = {
      isActive: false,
      isShowAll: false,
      points: { bones: [], pivots: [], object: null },
      lines: { bones: [], object: null },
      excludes: { bones: [], deltaLocals: [], radii: [], objects: [] }
    };
    this.running = false;
    this.timerMs = 0; // Warm-up timer

  }

  /**
  * Get option value.
  *
  * @param {string} key Option name
  * @return {any} Option value
  */
  getOptionValue(key) {
    return this.opt[key];
  }

  /**
  * Set option value.
  *
  * @param {string} key Option name
  * @param {any} val Option value
  */
  setOptionValue(key,val) {
    this.opt[key] = val;
    if ( this.helpers.isActive ) {
      this.showHelpers();
    }
  }

  /**
  * Get dynamic bone names.
  *
  * @return {string[]} Array of bone names
  */
  getBoneNames() {
    return this.data.map( x => x.name );
  }

  /**
  * Get property value for a dynamic bone.
  *
  * @param {string} name Name of the bone
  * @param {string} key Property name
  * @return {any} Property value
  */
  getValue(name, key) {
    if ( this.scene === null ) {
      throw new Error("Dynamic bones has not been setup yet.");
    }
    if ( !this.dict.hasOwnProperty(name) ) {
      throw new Error("Dynamic bone '"+name+"' not found.");
    }
    const d = this.dict[name];
    let val;
    if ( key === "type" ) {
      val = d.type;
    } else if ( key === "stiffness" ) {
      val = d.k.every( x => x === d.k[0] ) ? d.k[0] : [...d.k];
    } else if ( key === "damping" ) {
      val = d.c.every( x => x === d.c[0] ) ? d.c[0] : [...d.c];
    } else if ( key === "external" ) {
      val = ( d.ext < 1.0 ) ? d.ext : null;
    } else if ( key === "limits" ) {
      val = d.limits?.map( x => ( x === null ) ? null : [...x] );
    } else if ( key === "deltaLocal" ) {
      val = d.dl ? [...d.dl] : null;
    } else if ( key === "excludes" ) {
      val = d.excludes ? [...d.excludes.map( x => {
        const o = { bone: x.bone.name.slice(), radius: x.radius };
        if ( x.deltaLocal ) {
          o.deltaLocal = [...x.deltaLocal];
        }
        return o;
      })] : null;
    } else if ( key === "deltaWorld" ) {
      val = d.dw ? [...d.dw] : null;
    } else if ( key === "pivot" ) {
      val = d.pivot;
    } else if ( key === "helper" ) {
      val = d.helper;
    } else {
      throw new Error("Unsupported property '"+key+"'.");
    }
    return val;
  }

  /**
  * Set property value for a dynamic bone.
  *
  * @param {string} name Name of the bone
  * @param {string} key Property name
  * @param {any} val Property value
  */
  setValue(name, key, val) {
    if ( this.scene === null ) {
      throw new Error("Dynamic bones has not been setup yet.");
    }
    if ( !this.dict.hasOwnProperty(name) ) {
      throw new Error("Dynamic bone '"+name+"' not found.");
    }
    const d = this.dict[name];
    if ( key === "type" ) {
      if ( !val ) throw new Error("Parameter 'type' not set.");
      if ( typeof val !== "string" ) throw new Error( "Type must be a string." );
      switch(val) {
      case "point":
        d.isPoint = true; d.isX = true; d.isY = true; d.isZ = true; d.isT = false;
        break;
      case "link":
        d.isPoint = false; d.isX = true; d.isY = false; d.isZ = true; d.isT = false;
        break;
      case "mix1":
        d.isPoint = false; d.isX = true; d.isY = true; d.isZ = true; d.isT = false;
        break;
      case "mix2":
        d.isPoint = false; d.isX = true; d.isY = false; d.isZ = true; d.isT = true;
        break;
      case "full":
        d.isPoint = false; d.isX = true; d.isY = true; d.isZ = true; d.isT = true;
        break;
      default:
        throw new Error( "Unknown type'" + val + "'." );
      }
      d.type = val.slice();
    } else if ( key === "stiffness" ) {
      if ( !val ) throw new Error( "Parameter 'stiffness' not set." );
      if ( !Number.isNaN(val) && val >= 0 ) {
        d.k = Array(4).fill(val);
      } else if ( Array.isArray(val) && val.length === 4 && val.every( x => x >= 0 ) ) {
        d.k = [...val];
      } else {
        throw new Error( "Stiffness must be a non-negative number or an array of four non-negative numbers." );
      }
    } else if ( key === "damping" ) {
      if ( !val ) throw new Error( "Parameter 'damping' not set." );
      if ( !Number.isNaN(val) && val >= 0 ) {
        d.c = Array(4).fill(val);
      } else if ( Array.isArray(val) && val.length === 4 && val.every( x => x >= 0 ) ) {
        d.c = [...val];
      } else {
        throw new Error( "Damping must be a non-negative number or an array of four non-negative numbers." );
      }
    } else if ( key === "external" ) {
      if ( val === null || val === undefined ) {
        d.ext = 1.0;
      } else if ( !Number.isNaN(val) && val >=0 && val <= 1 ) {
        d.ext = val;
      } else {
        throw new Error( "External (if set) must be a number between [0,1]." );
      }
    } else if ( key === "limits" ) {

      if ( val === null || val === undefined ) {
        d.limits = null;
      } else {
        if ( !Array.isArray(val) || val.length !== 4 ) throw new Error( "Limits (if set) must null, or an array of four arrays." );
        if ( !val.every( x => x === null || (Array.isArray(x) && x.length === 2 && ( x[0] === null || !Number.isNaN(x[0]) ) && ( x[1] === null || !Number.isNaN(x) ) ) ) ) throw new Error( "Limit values must be null or numbers." );
        d.limits = [
          val[0] ? [...val[0]] : null,
          val[1] ? [...val[1]] : null,
          val[2] ? [...val[2]] : null,
          val[3] ? [...val[3]] : null
        ];
      }

    } else if ( key === "excludes" ) {

      if ( val === null || val === undefined ) {
        d.excludes = null;
      } else {
        if ( !Array.isArray(val) ) throw new Error( "Excludes (if set) must null, or an array." );
        d.excludes = [];
        val.forEach( (x,i) => {
          if ( !x.bone ) throw new Error("Bone not specified in #" + i + " exclude." );
          if ( typeof x.bone !== "string" || x.bone.length === 0 ) throw new Error("Bone name must be a non-empty string in #" + i + " exclude." );
          const bone = this.armature.getObjectByName( x.bone );
          if ( !bone ) throw new Error("Bone '" + x.bone + "' not found in #" + i + " exclude." );
          if ( Number.isNaN(x.radius) && x.radius >= 0 ) throw new Error("Radius must be a non-negative number in #" + i + " exclude." );

          const o = {
            bone: bone, // Bone object
            radius: x.radius, // Radius
            radiusSq: x.radius * x.radius, // Radius squared
            deltaLocal: null
          };

          if ( x.deltaLocal ) {
            if ( !Array.isArray(x.deltaLocal) || x.deltaLocal.length !== 3 || x.deltaLocal.some( y => Number.isNaN(y) ) ) throw new Error("deltaLocal must be an array of three numbers in #" + i + " exclude." );
            o.deltaLocal = [...x.deltaLocal];
          }

          d.excludes.push(o);
        });
      }

      this.showHelpers();

    } else if ( key === "helper" ) {

      if ( val === null || val === undefined ) {
        d.helper = null;
      } else {
        if ( val !== false && val !== true ) throw new Error( "Helper, if set, must be false or true." );
        d.helper = val;
      }

      this.showHelpers();

    } else if ( key === "pivot" ) {

      if ( val === null || val === undefined ) {
        d.pivot = null;
      } else {
        if ( val !== false && val !== true ) throw new Error( "Pivot, if set, must be false or true." );
        if ( val === true && d.type === 0 ) throw new Error( "Point type bone can't be a pivot." );
        d.pivot = val;
      }

    } else if ( key === "deltaLocal" ) {

      if ( val === null || val === undefined ) {
        d.dl = null;
      } else {
        if ( !Array.isArray(val) || val.length !== 3 ) throw new Error( "deltaLocal, is set, must be an array of three numbers." );
        if ( !val.every( x => !Number.isNaN(x) ) ) throw new Error( "deltaLocal values must be numbers." );
        d.dl = [...val];
      }

    } else if ( key === "deltaWorld" ) {

      if ( val === null || val === undefined ) {
        d.dw = null;
      } else {
        if ( !Array.isArray(val) || val.length !== 3 ) throw new Error( "deltaWorld, is set, must be an array of three values." );
        if ( !val.every( x => !Number.isNaN(x) ) ) throw new Error( "deltaWorld values must be numbers." );
        d.dw = [...val];
      }

    } else {
      throw new Error("Unsupported property "+key);
    }
  }


  /**
  * Get current config.
  *
  * @return {Object[]} Config.
  */
  getConfig() {
    return this.data.map( d => {

      const o = { bone: d.name.slice() };
      ["type","stiffness","damping","external","deltaLocal",
      "deltaWorld","limits","excludes","pivot","helper"].forEach( x => {
        tmp = this.getValue(d.name,x);
        if ( tmp ) o[x] = tmp;
      });
      return o;
    });
  }

  /**
  * Sort bones so that they get updated in optimal order.
  */
  sortBones() {

    if ( this.scene === null ) {
      throw new Error("Dynamic bones has not been setup yet.");
    }

    // Order for all bones
    let i = 0;
    const objectsOrder = new WeakMap();
    this.armature.traverse( x => {
      if ( !objectsOrder.has(x) ) {
        objectsOrder.set(x,i);
        i++;
      }
    });

    // Order data
    this.data.sort( (a,b) => objectsOrder.get(a.bone) - objectsOrder.get(b.bone) );

    // Find children
    this.data.forEach( x => {
      tmp = this.dict[x.boneParent.name];
      if ( tmp ) {
        if ( !tmp.children ) tmp.children = [];
        tmp.children.push(x);
      }
    });

    // Get all dynamic bones, excluded bones, and their ancestry, only unique
    this.objectsUpdate = [];
    const objectsSet = new WeakSet();
    const getParents = (x) => {
      return (x.parent?.isBone) ? [x,...getParents( x.parent )] : [x];
    };
    const addObject = (x) => {
      const o = getParents(x);
      o.forEach( y => {
        if ( !objectsSet.has(y) ) {
          this.objectsUpdate.push(y);
          objectsSet.add(y);
        }
      });
    };
    this.data.forEach( x => {
      addObject(x.bone);
      if ( x.excludes ) {
        x.excludes.forEach( y => {
          addObject(y.bone);
        });
      }
    });

    // Sort in optimal order
    this.objectsUpdate.sort( (a,b) => objectsOrder.get(a) - objectsOrder.get(b) );

  }


  /**
  * Setup dynamic bones.
  *
  * @param {Scene} scene Scene, if helper is used
  * @param {Object3D} armature Armature object
  * @param {Object[]} config Array of configuration objects
  */
  setup(scene, armature, config) {

    // Remove previous setup
    this.dispose();

    // Helper function to check logical statement and throw exception if false.
    const check = (test, error) => {
      if ( !test ) {
        this.dispose();
        throw new Error(error);
      }
    }

    // Parameters
    check( scene?.isScene, "First parameter must be Scene.");
    this.scene = scene;
    check( armature?.isObject3D, "Second parameter must be the armature Object3D.");
    this.armature = armature;
    check( Array.isArray(config), "Third parameter must be an array of bone configs.");
    this.config = config;


    // Configuration
    this.config.forEach( (item,i) => {

      // Item id
      const id = "Config item #" + i + ": ";

      // Bone, must be specified for each item
      check( item.bone, id + "Bone not specified." );
      const name = item.bone;
      check( typeof name === "string" && name.length > 0, id + "Bone name must be a non-empty string." );
      const bone = this.armature.getObjectByName( name );
      check( bone, id + "Bone '" + name + "' not found." );
      check( bone.parent?.isBone, id + "Bone must have a parent bone." );
      check( this.data.every( x => x.bone !== bone ), id + "Bone '" + name + "' already exists." );
      bone.updateMatrixWorld(true);

      // Data object
      const o = {
        name: name, // Bone name
        bone: bone, // Bone object
        boneParent: bone.parent, /// Bone's parent object
        vBasis: bone.position.clone(), // Original local position
        vWorld: bone.parent.getWorldPosition(v).clone(), // World position, parent
        qBasis: bone.parent.quaternion.clone(), // Original quaternion, parent
        l: bone.position.length(), // Bone length
        p: [0,0,0,0], // Relative position [m]
        v: [0,0,0,0], // Velocity [m/s]
        a: [0,0,0,0], // Acceleration [m/s]
        ev: [0,0,0,0], // External velocity [m/s]
        ea: [0,0,0,0] //  External acceleration [m/s^2]
      };

      // Set pivot/gravity baseline
      o.boneParent.matrixWorld.decompose( v, q, w ); // World quaternion q
      v.copy(forward).applyQuaternion(q).setY(0).normalize(); // Project to XZ-plane
      q.premultiply( q2.setFromUnitVectors(forward,v).invert() ).normalize();
      o.qWorldInverseYaw = q.clone().normalize(); // Only the yaw rotation

      // Add to data and dictionary
      this.data.push(o);
      this.dict[name] = o;

      // Set dynamic bone properties
      try {
        this.setValue(name, "type", item.type);
        this.setValue(name, "stiffness", item.stiffness);
        this.setValue(name, "damping", item.damping);
        this.setValue(name, "external", item.external);
        this.setValue(name, "limits", item.limits);
        this.setValue(name, "excludes", item.excludes);
        this.setValue(name, "deltaLocal", item.deltaLocal);
        this.setValue(name, "deltaWorld", item.deltaWorld);
        this.setValue(name, "pivot", item.pivot);
        this.setValue(name, "helper", item.helper);
      } catch(error) {
        check( false, id + error );
      }

    });

    // Sort bones
    this.sortBones();

    // We are OK to go!
    this.start();

  }


  /**
  * Animate dynamic bones.
  * @param {number} dt Delta time in ms.
  */
  update(dt) {

    // Are we running?
    if ( !this.running ) return;

    let i,j,l,k,d;

    // Timing
    this.timerMs += dt; // Warmup timer
    if ( dt > 1000) this.timerMs = 0; // Odd update, so we warmup
    dt /= 1000; // delta time to seconds [s]

    // Update all bone matrices in optimal order, only once
    for( i=0, l=this.objectsUpdate.length; i<l; i++ ) {
      d = this.objectsUpdate[i];
      d.updateMatrix();
      if ( d.parent === null ) {
				d.matrixWorld.copy( d.matrix );
			} else {
				d.matrixWorld.multiplyMatrices( d.parent.matrixWorld, d.matrix );
			}
      d.matrixWorldNeedsUpdate = false;
    }

    // Data
    for( i=0, l=this.data.length; i<l; i++ ) {
      d = this.data[i];

      // Get parent's world displacement and update world position
      v.copy(d.vWorld); // Previous position
      m.copy( d.boneParent.matrixWorld );
      minv.copy(m).invert();
      d.vWorld.setFromMatrixPosition( m ); // Update position
      v.applyMatrix4( minv ); // World to local

      if ( v.length() > 0.5 ) {
        // Not realistic update, so limit
        console.info("Info: Unrealistic jump of " + v.length().toFixed(2) + " meters.");
        v.setLength(0.5);
      }

      // External effect, parent
      v.applyQuaternion(d.bone.quaternion);
      arr[0] = v.x;
      arr[1] = v.y;
      arr[2] = -v.z;
      arr[3] = v.length() / 3; // TODO: Hack, fix this in later versions

      // External effect, children
      if ( d.children ) {
        for( j=0, k=d.children.length; j<k; j++ ) {
          tmp = d.children[j];
          arr[0] -= tmp.v[0] * dt / 3;
          arr[1] -= tmp.v[1] * dt / 3;
          arr[2] += tmp.v[2] * dt / 3;
          arr[3] -= tmp.v[3] * dt / 3;
        }
      }

      // External effect, scale
      tmp = this.opt.sensitivityFactor;
      arr[0] *= d.ext * tmp;
      arr[1] *= d.ext * tmp;
      arr[2] *= d.ext * tmp;
      arr[3] *= d.ext * tmp;


      if ( d.isX ) {

        // External force/velocity due to drag
        tmp = arr[0] / dt;
        d.ea[0] = (tmp - d.ev[0]) / dt; // External acceleration
        d.ev[0] = tmp; // External velocity

        // VELOCITY VERLET INTEGRATION
        //
        // 1. Total acceleration at step n:
        //      a_n = - k/m * x_n - c/m * v_n - a_ext
        //    (m = 1 kg)
        // 2. Update position
        //      x_n+1 = x_n + v_n * dt + 1/2 * a_n * d_t^2
        //    (When parent moves, child moves, so we compensate with arr)
        // 3. Predict new velocity:
        //      v_n+1 = v_n + 1/2 * a_n * dt
        // 4. New acceleration at time n+1:
        //      a_n+1 = - k/m * x_n+1 - c/m * v_n+1 - a_ext
        //    (m = 1 kg)
        // 5. Corrected velocity:
        //      v_n+1 = v_n + 1/2 * (a_n + a_n+1) * dt
        //
        d.a[0] = - d.k[0] * d.p[0] - d.c[0] * d.v[0] - d.ea[0];
        d.p[0] += d.v[0] * dt + d.a[0] * dt * dt / 2 + arr[0];
        tmp = d.v[0] + d.a[0] * dt / 2;
        tmp = - d.k[0] * d.p[0] - d.c[0] * tmp - d.ea[0];
        d.v[0] = d.v[0] + (tmp + d.a[0]) * dt / 2; // Iterated velocity
      }

      if ( d.isY ) {
        tmp = arr[1] / dt;
        d.ea[1] = (tmp - d.ev[1]) / dt; // External acceleration
        d.ev[1] = tmp; // External velocity

        d.a[1] = - d.k[1] * d.p[1] - d.c[1] * d.v[1] - d.ea[1];
        d.p[1] += d.v[1] * dt + d.a[1] * dt * dt / 2 + arr[1];
        tmp = d.v[1] + d.a[1] * dt / 2;
        tmp = - d.k[1] * d.p[1] - d.c[1] * tmp - d.ea[1];
        d.v[1] = d.v[1] + (tmp + d.a[1]) * dt / 2; // Iterated velocity
      }

      if ( d.isZ ) {
        tmp = arr[2] / dt;
        d.ea[2] = (tmp - d.ev[2]) / dt; // External acceleration
        d.ev[2] = tmp; // External velocity

        d.a[2] = - d.k[2] * d.p[2] - d.c[2] * d.v[2] - d.ea[2];
        d.p[2] += d.v[2] * dt + d.a[2] * dt * dt / 2 + arr[2];
        tmp = d.v[2] + d.a[2] * dt / 2;
        tmp = - d.k[2] * d.p[2] - d.c[2] * tmp - d.ea[2];
        d.v[2] = d.v[2] + (tmp + d.a[2]) * dt / 2; // Iterated velocity
      }

      if ( d.isT ) {
        tmp = arr[3] / dt;
        d.ea[3] = (tmp - d.ev[3]) / dt; // External acceleration
        d.ev[3] = tmp; // External velocity

        d.a[3] = - d.k[3] * d.p[3] - d.c[3] * d.v[3] - d.ea[3];
        d.p[3] += d.v[3] * dt + d.a[3] * dt * dt / 2 + arr[3];
        tmp = d.v[3] + d.a[3] * dt / 2;
        tmp = - d.k[3] * d.p[3] - d.c[3] * tmp - d.ea[3];
        d.v[3] = d.v[3] + (tmp + d.a[3]) * dt / 2; // Iterated velocity
      }

      // Warmup
      if ( this.timerMs < this.opt.warmupMs ) {
        d.v[0] *= 0.0001; d.p[0] *= 0.0001;
        d.v[1] *= 0.0001; d.p[1] *= 0.0001;
        d.v[2] *= 0.0001; d.p[2] *= 0.0001;
        d.v[3] *= 0.0001; d.p[3] *= 0.0001;
      }

      // Positions relative to basis
      arr[0] = d.p[0];
      arr[1] = d.p[1];
      arr[2] = d.p[2];
      arr[3] = d.p[3];

      // Scale movement
      tmp = this.opt.movementFactor;
      arr[0] *= tmp;
      arr[1] *= tmp;
      arr[2] *= tmp;
      arr[3] *= tmp;

      // Delta local
      if ( d.dl ) {
        tmp = d.dl;
        arr[0] += tmp[0];
        arr[1] += tmp[1];
        arr[2] += tmp[2];
      }

      // Delta world
      if ( d.dw ) {
        tmp = d.dw;
        v.set(
          d.vBasis.x + arr[0],
          d.vBasis.y + arr[1],
          d.vBasis.z + arr[2]
        );
        v.applyMatrix4(m); // local to world
        v.x += tmp[0];
        v.y += tmp[1];
        v.z += tmp[2];
        v.applyMatrix4(minv); // world to local
        arr[0] += v.x - d.vBasis.x;
        arr[1] += v.y - d.vBasis.y;
        arr[2] += v.z - d.vBasis.z;
      }

      // Limits
      if ( d.limits && this.opt.isLimits ) {
        tmp = d.limits;
        if ( tmp[0] ) {
          if ( tmp[0][0] !== null && arr[0] < tmp[0][0] ) arr[0] = tmp[0][0];
          if ( tmp[0][1] !== null && arr[0] > tmp[0][1] ) arr[0] = tmp[0][1];
        }
        if ( tmp[1] ) {
          if ( tmp[1][0] !== null && arr[1] < tmp[1][0] ) arr[1] = tmp[1][0];
          if ( tmp[1][1] !== null && arr[1] > tmp[1][1] ) arr[1] = tmp[1][1];
        }
        if ( tmp[2] ) {
          if ( tmp[2][0] !== null && arr[2] < tmp[2][0] ) arr[2] = tmp[2][0];
          if ( tmp[2][1] !== null && arr[2] > tmp[2][1] ) arr[2] = tmp[2][1];
        }
        if ( tmp[3] ) {
          if ( tmp[3][0] !== null && arr[3] < tmp[3][0] ) arr[3] = tmp[3][0];
          if ( tmp[3][1] !== null && arr[3] > tmp[3][1] ) arr[3] = tmp[3][1];
        }
      }

      // Apply move
      if ( d.isPoint ) {

        // Point: set position
        d.bone.position.set(
          d.vBasis.x + arr[0],
          d.vBasis.y + arr[1],
          d.vBasis.z - arr[2]
        );

      } else {

        // Baseline orientation, either original or free hanging
        d.boneParent.quaternion.copy(d.qBasis);
        if ( d.pivot && this.opt.isPivots ) {
          d.boneParent.updateWorldMatrix(false,false);
          d.boneParent.matrixWorld.decompose( v, q, w );
          v.copy(forward).applyQuaternion(q).setY(0).normalize();
          q.premultiply( q2.setFromUnitVectors(forward,v).invert() ).normalize();
          d.boneParent.quaternion.multiply(q.invert());
          d.boneParent.quaternion.multiply(d.qWorldInverseYaw);
        }

        if ( d.isZ ) {
          tmp = Math.atan( arr[0] / d.l );
          q.setFromAxisAngle(axisz, -tmp);
          d.boneParent.quaternion.multiply(q);
        }

        if ( d.isY ) {
          tmp = d.l / 3;
          tmp = tmp * Math.tanh( arr[1] / tmp );
          d.bone.position.setLength( d.l + tmp );
        }

        if ( d.isX ) {
          tmp = Math.atan( arr[2] / d.l );
          q.setFromAxisAngle(axisx, -tmp);
          d.boneParent.quaternion.multiply(q);
        }

        if ( d.isT ) {
          tmp = 1.5 * Math.tanh( arr[3] * 1.5 );
          q.setFromAxisAngle(axisy, -tmp);
          d.boneParent.quaternion.multiply(q);
        }

        // Update world
        d.boneParent.updateWorldMatrix(false,true);

        // Excluded zones
        if ( d.excludes && this.opt.isExcludes ) {
          for( j=0, k=d.excludes.length; j<k; j++ ) {
            tmp = d.excludes[j];

            // Zone and the bone
            w.set(0,0,0);
            if ( tmp.deltaLocal ) {
              w.x += tmp.deltaLocal[0];
              w.y += tmp.deltaLocal[1];
              w.z += tmp.deltaLocal[2];
            }
            w.applyMatrix4(tmp.bone.matrixWorld);
            minv.copy(d.boneParent.matrixWorld).invert();
            w.applyMatrix4(minv);
            v.copy(d.bone.position);

            // Continue, if the bone is not inside the zone OR
            // the spheres do not intersect (e.g. one inside the other)
            if ( v.distanceToSquared(w) >= tmp.radiusSq ) continue;
            tmp3 = v.length();
            tmp2 = w.length();
            if ( tmp2 > tmp.radius + tmp3 ) continue;
            if ( tmp2 < Math.abs( tmp.radius - tmp3 ) ) continue;

            // Intersection circle
            tmp2 = (tmp2*tmp2 + tmp3*tmp3 - tmp.radiusSq) / (2 * tmp2);
            w.normalize(); // Normal vector
            w2.copy(w).multiplyScalar(tmp2); // Center
            tmp2 = Math.sqrt(tmp3*tmp3 - tmp2 * tmp2); // Radius

            // Project the bone on the circle
            v.subVectors(v,w2).projectOnPlane(w).normalize().multiplyScalar(tmp2);

            // Direction vector the defines the correct half of the intersection circle
            v2.subVectors(d.vBasis,w2).projectOnPlane(w).normalize();

            // Check that the point is on the right half, if not, project
            tmp3 = v2.dot(v);
            if ( tmp3 < 0 ) {
              tmp3 = Math.sqrt(tmp2 * tmp2 - tmp3 * tmp3); // Projection factor
              v2.multiplyScalar(tmp3);
              v.add(v2);
            }

            // Rotate
            v.add(w2).normalize();
            w.copy(d.bone.position).normalize();
            q.setFromUnitVectors(w,v);
            d.boneParent.quaternion.premultiply(q);
            d.boneParent.updateWorldMatrix(false,true);

          }
        }

      }

    }

    // Update helper
    if ( this.helpers.isActive ) {
      this.updateHelpers();
    }

  }

  /**
  * Add dynamic bone helpers to the scene.
  *
  * @param {boolean} all Show all or just flagged, if not set, use previous mode
  * @param {boolean} [keepSetting=false] If true, keep the previos all setting
  */
  showHelpers(all) {

    // Remove previous helpers, if any
    this.hideHelpers();
    this.helpers.isShowAll = (all === undefined) ? this.helpers.isShowAll : (all === true);

    // Find out the bones with helper set to true
    tmp = this.helpers;
    this.data.forEach( d => {
      if ( this.helpers.isShowAll || d.helper === true ) {
        tmp.points.bones.push( d.bone );
        tmp.points.pivots.push( d.pivot );
        if ( d.type !== 0 ) {
          tmp.lines.bones.push( d.bone );
        }
        if ( d.excludes ) {
          d.excludes.forEach( x => {
            let found = false;
            for( let i=0; i<tmp.excludes.bones.length; i++ ) {
              if ( tmp.excludes.bones[i] !== x.bone ) continue;
              if ( tmp.excludes.radii[i] !== x.radius ) continue;
              if ( tmp.excludes.deltaLocals[i] === null && x.deltaLocal !== null ) continue;
              if ( tmp.excludes.deltaLocals[i] !== null && x.deltaLocal === null ) continue;
              if ( tmp.excludes.deltaLocals[i] !== null && tmp.excludes.deltaLocals[i].some( (y,j) => y !== x.deltaLocal[j] ) ) continue;
              found = true;
              break;
            }
            if ( !found ) {
              tmp.excludes.bones.push( x.bone );
              tmp.excludes.radii.push( x.radius );
              tmp.excludes.deltaLocals.push( x.deltaLocal ? [...x.deltaLocal] : null );
              tmp.excludes.objects.push( null );
            }
          });
        }
      }
    });

    // Create constraint helpers
    tmp = this.helpers.excludes;
    if ( this.opt.isExcludes && tmp.bones.length ) {
      tmp.bones.forEach( (x,i) => {
        const geom = new THREE.SphereGeometry( tmp.radii[i], 6, 6 );
        const material = new THREE.MeshBasicMaterial( {
          depthTest: false, depthWrite: false, toneMapped: false,
          transparent: true, wireframe: true,
          color: this.opt.helperExcludesColor
        });
        tmp.objects[i] = new THREE.Mesh( geom, material );
        tmp.objects[i].renderOrder = 997;
        x.add(tmp.objects[i]);
        if ( tmp.deltaLocals[i] ) {
          tmp.objects[i].position.set(
            tmp.deltaLocals[i][0],
            tmp.deltaLocals[i][1],
            tmp.deltaLocals[i][2]
          );
        }
      });
    }

    // Create points helpers
    tmp = this.helpers.points;
    if ( tmp.bones.length ) {
      this.helpers.isActive = true;
      const geom = new THREE.BufferGeometry();
      const vertices = tmp.bones.map( x => [0,0,0] ).flat();
      geom.setAttribute( 'position', new THREE.Float32BufferAttribute( vertices, 3 ) );
      const c1 = new THREE.Color( this.opt.helperBoneColor1 );
      const c2 = new THREE.Color( this.opt.helperBoneColor2 );
      const colors = tmp.pivots.map( x => (x && this.opt.isPivots) ? [c2.r,c2.g,c2.b] : [c1.r,c1.g,c1.b] ).flat();
      geom.setAttribute( 'color', new THREE.Float32BufferAttribute( colors, 3 ) );
      const material = new THREE.PointsMaterial( {
        depthTest: false, depthWrite: false, toneMapped: false,
        transparent: true, size: 0.2, vertexColors: true
      });
      tmp.object = new THREE.Points( geom, material );
      tmp.object.renderOrder = 998;
      tmp.object.matrix = this.armature.matrixWorld;
      tmp.object.matrixAutoUpdate = false;
      this.scene.add(tmp.object);
    }

    // Create lines helper
    tmp = this.helpers.lines;
    if ( tmp.bones.length ) {
      const geom = new THREE.BufferGeometry();
      const vertices = tmp.bones.map( x => [0,0,0,0,0,0] ).flat();
      geom.setAttribute( 'position', new THREE.Float32BufferAttribute( vertices, 3 ) );
      const c1 = new THREE.Color( this.opt.helperLinkColor1 );
      const c2 = new THREE.Color( this.opt.helperLinkColor2 );
      const colors = tmp.bones.map( x => [c1.r,c1.g,c1.b,c2.r,c2.g,c2.b] ).flat();
      geom.setAttribute( 'color', new THREE.Float32BufferAttribute( colors, 3 ) );
      const material = new THREE.LineBasicMaterial( {
        vertexColors: true, depthTest: false, depthWrite: false,
        toneMapped: false, transparent: true
      });
      tmp.object = new THREE.LineSegments( geom, material );
      tmp.object.renderOrder = 999;
      tmp.object.matrix = this.armature.matrixWorld;
      tmp.object.matrixAutoUpdate = false;
      this.scene.add(tmp.object);
    }

  }

  /**
  * Update the positions of dynamic bone helpers.
  */
  updateHelpers() {

    // Update points
    tmp = this.helpers.points;
    if ( tmp.bones.length ) {
      minv.copy( this.armature.matrixWorld ).invert();
      const pos = tmp.object.geometry.getAttribute('position');
      for( let i=0, l=tmp.bones.length; i<l; i++ ) {
        m.multiplyMatrices( minv, tmp.bones[i].matrixWorld );
        v.setFromMatrixPosition( m );
        pos.setXYZ( i, v.x, v.y, v.z );
      }
      pos.needsUpdate = true;
      tmp.object.updateMatrixWorld();
    }

    // Update lines
    tmp = this.helpers.lines;
    if ( tmp.bones.length ) {
      minv.copy( this.armature.matrixWorld ).invert();
      const pos = tmp.object.geometry.getAttribute('position');
      for ( let i=0, j=0, l=tmp.bones.length; i < l; i++, j+=2 ) {
        m.multiplyMatrices( minv, tmp.bones[i].matrixWorld );
        v.setFromMatrixPosition( m );
        pos.setXYZ( j, v.x, v.y, v.z );
        m.multiplyMatrices( minv, tmp.bones[i].parent.matrixWorld );
        v.setFromMatrixPosition( m );
        pos.setXYZ( j + 1, v.x, v.y, v.z );
      }
      pos.needsUpdate = true;
      tmp.object.updateMatrixWorld();
    }

  }

  /**
  * Remove dynamic bone helpers.
  */
  hideHelpers() {

    // Hide points and lines
    [ this.helpers.points, this.helpers.lines ].forEach( x => {
      x.bones = [];
      if ( x.object ) {
        this.scene.remove( x.object );
        x.object.geometry.dispose();
        x.object.material.dispose();
        x.object = null
      }
    });

    // Hide contraints
    tmp = this.helpers.excludes;
    tmp.objects.forEach( (y,i) => {
      if ( y ) {
        tmp.bones[i].remove( y );
        y.geometry.dispose();
        y.material.dispose();
      }
    });
    tmp.bones = [];
    tmp.deltaLocals = [];
    tmp.radii = [];
    tmp.objects = [];

    // De-activate
    this.helpers.isActive = false;

  }

  /**
  * Start dynamic bones.
  */
  start() {
    if ( this.data.length ) {
      this.running = true;
      this.timerMs = 0;
      this.showHelpers();
    }
  }

  /**
  * Stop dynamic bones and reset positions and rotations.
  */
  stop() {

    this.running = false;
    this.hideHelpers();

    // Reset positions and parent rotations
    for( let i=0, l=this.data.length; i<l; i++ ) {
      const d = this.data[i];
      d.bone.position.copy( d.vBasis );
      d.boneParent.quaternion.copy( d.qBasis );
    }

  }

  /**
  * Reset local position and rotations and dispose the dynamic bones.
  */
  dispose() {

    this.stop();

    this.scene = null;
    this.armature = null;
    this.config = [];
    this.data = [];
    this.dict = {};
    this.objectsUpdate = [];
    this.timerMs = 0;

  }

}

export { DynamicBones };
