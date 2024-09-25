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
let tmp;
const arr = [0,0,0,0];
const v = new THREE.Vector3();
const w = new THREE.Vector3();
const e = new THREE.Euler();
const q = new THREE.Quaternion();
const m = new THREE.Matrix4();
const minv = new THREE.Matrix4();

// Axis
const axisx = new THREE.Vector3(1, 0, 0);
const axisy = new THREE.Vector3(0, 1, 0);
const axisz = new THREE.Vector3(0, 0, 1);


class DynamicBones {

  constructor( opt = null ) {
    this.opt = Object.assign({
      warmupMs: 2000,
      helperBoneColor: 0xff0000,
      helperLinkColor1: 0xff0000,
      helperLinkColor2: 0x0000ff
    }, opt || {});

    this.armature = null;
    this.config = [];
    this.types = { point: 0, link: 1, mix: 2, full: 3 };
    this.data = []; // Dynamic bones data
    this.dict = {}; // Dictionary from bone name to data object
    this.helpers = {
      active: false,
      points: { bones: [], object: null },
      lines: { bones: [], object: null }
    };
    this.running = false;
    this.timerMs = 0; // Warm-up timer

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
    if ( !this.dict.hasOwnProperty(name) ) {
      throw new Error("Dynamic bone '"+name+"' not found.");
    }
    const d = this.dict[name];
    let val;
    if ( key === "type" ) {
      val = Object.keys(this.types).find(x => this.types[x] === d.type);
    } else if ( key === "stiffness" ) {
      val = [...d.k];
    } else if ( key === "damping" ) {
      val = [...d.c];
    } else if ( key === "limits" ) {
      val = d.limits?.map( x => {
        if ( x === null ) {
          return null;
        } else {
          return [...x];
        }
      });
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
    if ( !this.dict.hasOwnProperty(name) ) {
      throw new Error("Dynamic bone '"+name+"' not found.");
    }
    const d = this.dict[name];
    if ( key === "type" ) {

      if ( !val ) throw new Error("Parameter 'type' not set.");
      if ( typeof val !== "string" ) throw new Error( "Type must be a string." );
      if ( !this.types.hasOwnProperty(val), "Type '" + val + "' not supported." );
      d.type = this.types[val];
      d.dim = d.type === 3 ? 4 : 3;

    } else if ( key === "stiffness" ) {

      if ( !val ) throw new Error( "Parameter 'stiffness' not set." );
      if ( !Array.isArray(val) || val.length !== 4 ) throw new Error( "Stiffness must be an array of four numbers." );
      if ( !val.every( x => x >= 0 ) ) throw new Error( "Stiffness values must be non-negative numbers." );
      d.k = [...val];

    } else if ( key === "damping" ) {

      if ( !val ) throw new Error( "Parameter 'damping' not set." );
      if ( !Array.isArray(val) || val.length !== 4 ) throw new Error( "Damping must be an array of four numbers." );
      if ( !val.every( x => x >= 0 ) ) throw new Error( "Damping values must be non-negative numbers." );
      d.c = [...val];

    } else if ( key === "limits" ) {

      if ( val === null || val === undefined ) {
        d.limits = null;
      } else {
        if ( !Array.isArray(val) || val.length !== 4 ) throw new Error( "Limits (if set) must null, or an array of four arrays." );
        if ( !val.every( x => x === null || (Array.isArray(x) && x.length === 2 && ( x[0] === null || x[0] >= 0 ) && ( x[1] === null || x[1] >= 0 ) ) ) ) throw new Error( "Limit values must be null, or arrays of two non-negative numbers." );
        d.limits = [
          val[0] ? [...val[0]] : null,
          val[1] ? [...val[1]] : null,
          val[2] ? [...val[2]] : null,
          val[3] ? [...val[3]] : null
        ];
      }

    } else if ( key === "helper" ) {

      if ( val === null || val === undefined ) {
        d.helper = null;
      } else {
        if ( val !== false && val !== true ) throw new Error( "Helper, if set, must be false or true." );
        d.helper = val;
      }

      this.showHelpers();

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
      const o = {
        name: d.name.slice(),
        type: Object.keys(this.types).find(x => this.types[x] === d.type),
        stiffness: [...d.k],
        damping: [...d.c],
      };
      if ( d.limits !== null ) {
        o.limits = [
          d.limits[0] ? [...d.limits[0]] : null,
          d.limits[1] ? [...d.limits[1]] : null,
          d.limits[2] ? [...d.limits[2]] : null,
          d.limits[3] ? [...d.limits[3]] : null
        ];
      }
      if ( d.helper !== null ) {
        o.helper = d.helper;
      }
      return o;
    });
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
        vBasis: bone.position.clone(), // Local position
        vWorld: bone.parent.getWorldPosition(v).clone(), // World position, parent
        qBasis: bone.parent.quaternion.clone(), // Local quaternion, parent
        l: bone.position.length(), // Bone length
        p: [0,0,0,0], // Relative position [m]
        v: [0,0,0,0], // Velocity [m/s]
        a: [0,0,0,0], // Acceleration [m/s]
        ev: [0,0,0,0], // External velocity [m/s]
        ea: [0,0,0,0] //  External acceleration [m/s^2]
      };

      // Add to data and dictionary
      this.data.push(o);
      this.dict[name] = o;

      // Set dynamic bone properties
      try {
        this.setValue(name, "type", item.type);
        this.setValue(name, "stiffness", item.stiffness);
        this.setValue(name, "damping", item.damping);
        this.setValue(name, "limits", item.limits);
        this.setValue(name, "helper", item.helper);
      } catch(error) {
        check( false, id + error );
      }

    });

    // Order data and find roots
    let i = 0;
    this.armature.traverse( x => {
      if ( x.isBone && this.dict.hasOwnProperty(x.name) ) {
        this.dict[x.name].index = i;
        i++;
      }
    });
    this.data.sort( (a,b) => a.index - b.index );
    this.data.forEach( x => {
      x.isRoot = !this.dict.hasOwnProperty(x.boneParent.name);
    });

    // We are OK to go!
    this.start();

  }

  /**
  * Animate dynamic bones.
  * @param {number} t High precision timestamp in ms.
  */
  update(dt) {

    // Are we running?
    if ( !this.running ) return;

    // Timing
    const ds = dt / 1000; // delta time [s]
    this.timerMs += dt; // Warmup timer
    if ( dt > 1000) this.timerMs = 0; // Odd update, so we warmup

    // Data
    for( let i=0, l=this.data.length; i<l; i++ ) {
      const d = this.data[i];

      // Get parent's world displacement and update world position
      v.copy(d.vWorld); // Previous position
      if ( d.isRoot ) {
        d.bone.updateWorldMatrix( true, false ); // Roots update parents
      } else {
        d.bone.updateMatrixWorld();
      }
      m.copy( d.boneParent.matrixWorld );
      d.vWorld.setFromMatrixPosition( m ); // Update position
      v.applyMatrix4( m.invert() ); // World to local

      if ( v.length() > 0.5 ) {
        // Not realistic update, so limit
        console.info("Info: Unrealistic jump of " + v.length() + " meters.");
        v.setLength(0.5);
      }

      arr[0] = v.x;
      arr[1] = v.y;
      arr[2] = -v.z;
      arr[3] = v.length() / 3; // TODO: Hack, fix this in later versions

      // Simulate each dimension using Velocity Verlet integration
      for( let j=0, l=d.dim; j<l; j++ ) {

        // External force/velocity due to drag
        tmp = arr[j] / ds;
        d.ea[j] = (tmp - d.ev[j]) / ds; // External acceleration
        d.ev[j] = tmp; // External velocity

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
        d.a[j] = - d.k[j] * d.p[j] - d.c[j] * d.v[j] - d.ea[j];
        d.p[j] += d.v[j] * ds + d.a[j] * ds * ds / 2 + arr[j];
        tmp = d.v[j] + d.a[j] * ds / 2;
        tmp = - d.k[j] * d.p[j] - d.c[j] * tmp - d.ea[j];
        d.v[j] = d.v[j] + (tmp + d.a[j]) * ds / 2; // Iterated velocity

      }

      // Warmup
      if ( this.timerMs < this.opt.warmupMs ) {
        // d.bone.position.copy( d.vBasis );
        for( let j=0, l=d.dim; j<l; j++ ){
          d.v[j] *= 0.0001;
          d.p[j] *= 0.0001;
        }
      }

      // Delta positions
      arr[0] = d.p[0];
      arr[1] = d.p[1];
      arr[2] = d.p[2];
      arr[3] = d.p[3];

      // Limits
      tmp = d.limits;
      if ( tmp ) {
        if ( tmp[0] ) {
          if ( tmp[0][0] !== null && arr[0] < -tmp[0][0] ) arr[0] = -tmp[0][0];
          if ( tmp[0][1] !== null && arr[0] > tmp[0][1] ) arr[0] = tmp[0][1];
        }
        if ( tmp[1] ) {
          if ( tmp[1][0] !== null && arr[1] < -tmp[1][0] ) arr[1] = -tmp[1][0];
          if ( tmp[1][1] !== null && arr[1] > tmp[1][1] ) arr[1] = tmp[1][1];
        }
        if ( tmp[2] ) {
          if ( tmp[2][0] !== null && arr[2] < -tmp[2][0] ) arr[2] = -tmp[2][0];
          if ( tmp[2][1] !== null && arr[2] > tmp[2][1] ) arr[2] = tmp[2][1];
        }
        if ( tmp[3] ) {
          if ( tmp[3][0] !== null && arr[3] < -tmp[3][0] ) arr[3] = -tmp[3][0];
          if ( tmp[3][1] !== null && arr[3] > tmp[3][1] ) arr[3] = tmp[3][1];
        }
      }

      // Apply move
      if ( d.type === 0 ) {

        // Point: set position
        d.bone.position.set(
          d.vBasis.x + arr[0],
          d.vBasis.y + arr[1],
          d.vBasis.z + arr[2]
        );

      } else {

        // Link: set parent quaternion
        d.boneParent.quaternion.copy(d.qBasis);
        tmp = Math.atan( arr[0] / d.l );
        q.setFromAxisAngle(axisz, -tmp);
        d.boneParent.quaternion.multiply(q);
        tmp = Math.atan( arr[2] / d.l );
        q.setFromAxisAngle(axisx, -tmp);
        d.boneParent.quaternion.multiply(q);
        if ( d.type === 3 ) {
          // Full: twist the bones
          tmp = 1.5 * Math.tanh( arr[3] * 1.5 );
          q.setFromAxisAngle(axisy, -tmp);
          d.boneParent.quaternion.multiply(q);
        }
        d.boneParent.updateMatrixWorld();

        if ( d.type > 1 ) {
          // Mix/full: set length, limit delta to on third of the length
          tmp = d.l / 3;
          tmp = tmp * Math.tanh( arr[1] / tmp );
          d.bone.position.setLength( d.l + tmp );
          d.bone.updateMatrixWorld();
        }

      }

    }

    // Update helper
    if ( this.helpers.active ) {
      this.updateHelpers();
    }

  }

  /**
  * Add dynamic bone helpers to the scene.
  *
  * @param {boolean} [all=false] If true, add all, otherwise only flagged bones
  */
  showHelpers(all=false) {

    // Remove previous helpers, if any
    this.hideHelpers();

    // Find out the bones with helper set to true
    tmp = this.helpers;
    this.data.forEach( d => {
      if ( all || d.helper === true ) {
        tmp.active = true;
        tmp.points.bones.push( d.bone );
        if ( d.type !== 0 ) {
          tmp.lines.bones.push( d.bone );
        }
      }
    });

    let geom, vertices, colors, material;

    // Create points helpers
    tmp = this.helpers.points;
    if ( tmp.bones.length ) {
      geom = new THREE.BufferGeometry();
      vertices = Array( tmp.bones.length ).fill([0,0,0]).flat();
      geom.setAttribute( 'position', new THREE.Float32BufferAttribute( vertices, 3 ) );
      material = new THREE.PointsMaterial( {
        depthTest: false, depthWrite: false, toneMapped: false,
        transparent: true, color: this.opt.helperBoneColor, size: 0.2
      });
      tmp.object = new THREE.Points( geom, material );
      tmp.object.matrix = this.armature.matrixWorld;
      tmp.object.matrixAutoUpdate = false;
      this.scene.add(tmp.object);
    }

    // Create lines helper
    tmp = this.helpers.lines;
    if ( tmp.bones.length ) {
      this.helpers.active = true;
      geom = new THREE.BufferGeometry();
      vertices = Array( tmp.bones.length ).fill([0,0,0,0,0,0]).flat();
      geom.setAttribute( 'position', new THREE.Float32BufferAttribute( vertices, 3 ) );
      const c1 = new THREE.Color( this.opt.helperLinkColor1 );
      const c2 = new THREE.Color( this.opt.helperLinkColor2 );
      colors = Array( tmp.bones.length ).fill([c1.r,c1.g,c1.b,c2.r,c2.g,c2.b]).flat();
      geom.setAttribute( 'color', new THREE.Float32BufferAttribute( colors, 3 ) );
      material = new THREE.LineBasicMaterial( {
        vertexColors: true, depthTest: false, depthWrite: false,
        toneMapped: false, transparent: true
      });
      tmp.object = new THREE.LineSegments( geom, material );
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

    [ this.helpers.points, this.helpers.lines ].forEach( x => {
      x.bones = [];
      if ( x.object ) {
        x.object.geometry.dispose();
        x.object.material.dispose();
        this.scene.remove( x.object );
        x.object = null
      }
    });
    this.helpers.active = false;

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
    this.timerMs = 0;

  }

}

export { DynamicBones };
