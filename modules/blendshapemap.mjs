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

// Blend shape Map.
// The blend shapes are expected to be in the order specified below.
// The first 52 mandatory blend shapes are based on ARKit morph targets. 
// The last optional 3 are head roll, left eye roll, and right eye roll.
// Note: The blend shapes are based on Azure text-to-speech 3D face blendshapes.

export const blendshapeMap = [
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
    /* 52 */ "headRoll",       // optional
    /* 53 */ "leftEyeRoll",    // optional
    /* 54 */ "rightEyeRoll"    // optional
  ];
  