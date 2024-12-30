/**
* MIT License
*
* Copyright (c) 2024
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

import { MathUtils } from "three";

// Blend shape Map.
// The blend shapes are expected to be in the order specified below.
// The first 52 mandatory blend shapes are based on ARKit morph targets. 
// The last optional 3 are head roll, left eye roll, and right eye roll.
// Note: The blend shapes are based on Azure text-to-speech 3D face blendshapes.

const blendshapeMap = [
  /* 0  */ "eyeBlinkLeft",
  /* 1  */ "eyeLookDownLeft",
  /* 2  */ "eyeLookInLeft",
  /* 3  */ "eyeLookOutLeft",
  /* 4  */ "eyeLookUpLeft",
  /* 5  */ "eyeSquintLeft",
  /* 6  */ "eyeWideLeft",
  /* 7  */ "eyeBlinkRight",
  /* 8  */ "eyeLookDownRight",
  /* 9  */ "eyeLookInRight",
  /* 10 */ "eyeLookOutRight",
  /* 11 */ "eyeLookUpRight",
  /* 12 */ "eyeSquintRight",
  /* 13 */ "eyeWideRight",
  /* 14 */ "jawForward",
  /* 15 */ "jawLeft",
  /* 16 */ "jawRight",
  /* 17 */ "jawOpen",
  /* 18 */ "mouthClose",
  /* 19 */ "mouthFunnel",
  /* 20 */ "mouthPucker",
  /* 21 */ "mouthLeft",
  /* 22 */ "mouthRight",
  /* 23 */ "mouthSmileLeft",
  /* 24 */ "mouthSmileRight",
  /* 25 */ "mouthFrownLeft",
  /* 26 */ "mouthFrownRight",
  /* 27 */ "mouthDimpleLeft",
  /* 28 */ "mouthDimpleRight",
  /* 29 */ "mouthStretchLeft",
  /* 30 */ "mouthStretchRight",
  /* 31 */ "mouthRollLower",
  /* 32 */ "mouthRollUpper",
  /* 33 */ "mouthShrugLower",
  /* 34 */ "mouthShrugUpper",
  /* 35 */ "mouthPressLeft",
  /* 36 */ "mouthPressRight",
  /* 37 */ "mouthLowerDownLeft",
  /* 38 */ "mouthLowerDownRight",
  /* 39 */ "mouthUpperUpLeft",
  /* 40 */ "mouthUpperUpRight",
  /* 41 */ "browDownLeft",
  /* 42 */ "browDownRight",
  /* 43 */ "browInnerUp",
  /* 44 */ "browOuterUpLeft",
  /* 45 */ "browOuterUpRight",
  /* 46 */ "cheekPuff",
  /* 47 */ "cheekSquintLeft",
  /* 48 */ "cheekSquintRight",
  /* 49 */ "noseSneerLeft",
  /* 50 */ "noseSneerRight",
  /* 51 */ "tongueOut",
  // 52..54 are not morph targets
  /* 52 */ "headRoll",       // Head rotation (roll)
  /* 53 */ "leftEyeRoll",    // Left eye rotation (roll)
  /* 54 */ "rightEyeRoll"    // Right eye rotation (roll)
];

const DAMPING_FACTOR = 0.2;

/**
 * Blendshapes class
 * 
 * @class
 * @classdesc Class for managing blendshapes.
 * @param {object} avatar - Avatar object.
 * @param {object} opt - Options object.
 */
class Blendshapes {

  constructor(frames, mtAvatar, objectHead, objectLeftEye, objectRightEye, frameRate = 60) {
    this.blendshapeFrames = frames;
    this.blendshapeStartTime = null;
    this.lastFrameIndex = -1;
    this.mtAvatar = mtAvatar;
    this.objectHead = objectHead;
    this.objectLeftEye = objectLeftEye;
    this.objectRightEye = objectRightEye;

    this.opt = { frameRate };

    // Filter out only valid morph targets
    this.validMTIndices = [];
    for (let i = 0; i < 52; i++) {
      const mtName = blendshapeMap[i];
      if (this.mtAvatar[mtName]) {
        this.validMTIndices.push(i);
      }
    }
  }

  /**
   * Start blendshape animation.
   * 
   * @param {number} startTime - Start time in milliseconds.
   * @return {void}
   */
  start(startTime = null) {
    this.blendshapeStartTime = startTime || performance.now();
    this.lastFrameIndex = -1;
  }

  /**
   * Stop blendshape animation.
   * 
   * @return {void}
   */
  stop() {
    this.blendshapeFrames = null;
    this.blendshapeStartTime = null;
    this.lastFrameIndex = -1;
  }

  /**
   * Check if blendshape animation is active.
   * 
   * @return {boolean} True if blendshape animation is active.
   * @return {boolean} False if blendshape animation is not active.
   */
  isActive() {
    return this.blendshapeFrames && this.blendshapeFrames.length > 0 && this.blendshapeStartTime !== null;
  }

  /**
   * Update blend shapes. Call this in the render loop.
   * 
   * @return {void}
   */
  update() {
    // Elapsed time since speech animation started
    const elapsed = (performance.now() - this.blendshapeStartTime) / 1000; // convert ms to s

    // Compute frame index
    const frameIndex = Math.floor(elapsed * this.opt.frameRate);

    // If no new frame, just return
    if (
      frameIndex === this.lastFrameIndex ||
      frameIndex < 0 ||
      frameIndex >= this.blendshapeFrames.length
    ) {
      return;
    }

    this.lastFrameIndex = frameIndex;
    const frame = this.blendshapeFrames[frameIndex];

    if (!Array.isArray(frame) || frame.length < 52) {
      // Skip frame if it has less than mandatory 52 blend shapes
      return;
    }
    this.updateMorpthTargets(frame);

    if (frame.length >= 55) {
      // Update optional blend shapes 52..54
      this.updateRolls(frame[52], frame[53], frame[54]);
    }    
  }

  updateMorpthTargets(frame) {
    for (let i = 0; i < this.validMTIndices.length; i++) {
      const index = this.validMTIndices[i];
      const mt = blendshapeMap[index];
      const value = frame[index];
      this.mtAvatar[mt].newvalue = value;
      this.mtAvatar[mt].needsUpdate = true;
    }
  }

  updateRolls(headRoll, leftEyeRoll, rightEyeRoll) {
    if (this.objectHead) {
      // Smoothly interpolate from the current rotation to the target rotation
      this.objectHead.rotation.z = MathUtils.lerp(
        this.objectHead.rotation.z,
        headRoll,
        DAMPING_FACTOR
      );
    }

    if (this.objectLeftEye) {
      this.objectLeftEye.rotation.y = MathUtils.lerp(
        this.objectLeftEye.rotation.y,
        leftEyeRoll,
        DAMPING_FACTOR
      );
    }

    if (this.objectRightEye) {
      this.objectRightEye.rotation.y = MathUtils.lerp(
        this.objectRightEye.rotation.y,
        rightEyeRoll,
        DAMPING_FACTOR
      );
    }
  }
}

export { Blendshapes };