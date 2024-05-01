export const animMoods = {
      'neutral' : {
        baseline: { eyesLookDown: 0.1 },
        speech: { deltaRate: 0, deltaPitch: 0, deltaVolume: 0 },
        anims: [
          { name: 'breathing', delay: 1500, dt: [ 1200,500,1000 ], vs: { chestInhale: [0.5,0.5,0] } },
          { name: 'pose', alt: [
            { p: 0.4, delay: [5000,20000], vs: { pose: ['side'] } },
            { p: 0.4, delay: [5000,20000], vs: { pose: ['hip'] },
              'M': { delay: [5000,20000], vs: { pose: ['wide'] } }
            },
            { delay: [5000,20000], vs: { pose: ['straight'] } }
          ]},
          { name: 'head',
            idle: { delay: [0,1000], dt: [ [200,5000] ], vs: { headRotateX: [[-0.04,0.10]], headRotateY: [[-0.3,0.3]], headRotateZ: [[-0.08,0.08]] } },
            talking: { dt: [ [0,1000,0] ], vs: { headRotateX: [[-0.05,0.15,1,2]], headRotateY: [[-0.1,0.1]], headRotateZ: [[-0.1,0.1]] } }
          },
          { name: 'eyes', delay: [200,5000], dt: [ [100,500],[100,5000,2] ], vs: { eyesRotateY: [[-0.6,0.6]], eyesRotateX: [[-0.2,0.6]] } },
          { name: 'blink', delay: [1000,8000,1,2], dt: [50,[100,300],100], vs: { eyeBlinkLeft: [1,1,0], eyeBlinkRight: [1,1,0] } },
          { name: 'mouth', delay: [1000,5000], dt: [ [100,500],[100,5000,2] ], vs : { mouthRollLower: [[0,0.3,2]], mouthRollUpper: [[0,0.3,2]], mouthStretchLeft: [[0,0.3]], mouthStretchRight: [[0,0.3]], mouthPucker: [[0,0.3]] } },
          { name: 'misc', delay: [100,5000], dt: [ [100,500],[100,5000,2] ], vs : { eyeSquintLeft: [[0,0.3,3]], eyeSquintRight: [[0,0.3,3]], browInnerUp: [[0,0.3]], browOuterUpLeft: [[0,0.3]], browOuterUpRight: [[0,0.3]] } }
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
                { p: 0.6, delay: [5000,20000], vs: { pose: ['side'] } },
                { p: 0.2, delay: [5000,20000], vs: { pose: ['hip'] },
                  'M': { delay: [5000,20000], vs: { pose: ['side'] } }
                },
                { p: 0.1, delay: [5000,20000], vs: { pose: ['straight'] } },
                { delay: [5000,10000], vs: { pose: ['wide'] } },
                { delay: [1000,3000], vs: { pose: ['turn'] } },
              ]
            },
            talking: {
              alt: [
                { p: 0.4, delay: [5000,20000], vs: { pose: ['side'] } },
                { p: 0.4, delay: [5000,20000], vs: { pose: ['straight'] } },
                { delay: [5000,20000], vs: { pose: ['hip'] },
                  'M': { delay: [5000,20000], vs: { pose: ['wide'] } }
                },
              ]
            }
          },
          { name: 'head',
            idle: { dt: [ [1000,5000] ], vs: { headRotateX: [[-0.04,0.10]], headRotateY: [[-0.3,0.3]], headRotateZ: [[-0.08,0.08]] } },
            talking: { dt: [ [0,1000,0] ], vs: { headRotateX: [[-0.05,0.15,1,2]], headRotateY: [[-0.1,0.1]], headRotateZ: [[-0.1,0.1]] } }
          },
          { name: 'eyes', delay: [100,5000], dt: [ [100,500],[100,5000,2] ], vs: { eyesRotateY: [[-0.6,0.6]], eyesRotateX: [[-0.2,0.6]] } },
          { name: 'blink', delay: [1000,8000,1,2], dt: [50,[100,300],100], vs: { eyeBlinkLeft: [1,1,0], eyeBlinkRight: [1,1,0] } },
          { name: 'mouth', delay: [1000,5000], dt: [ [100,500],[100,5000,2] ], vs : { mouthLeft: [[0,0.3,2]], mouthSmile: [[0,0.2,3]], mouthRollLower: [[0,0.3,2]], mouthRollUpper: [[0,0.3,2]], mouthStretchLeft: [[0,0.3]], mouthStretchRight: [[0,0.3]], mouthPucker: [[0,0.3]] } },
          { name: 'misc', delay: [100,5000], dt: [ [100,500],[100,5000,2] ], vs : { eyeSquintLeft: [[0,0.3,3]], eyeSquintRight: [[0,0.3,3]], browInnerUp: [[0,0.3]], browOuterUpLeft: [[0,0.3]], browOuterUpRight: [[0,0.3]] } }
        ]
      },
      'angry' : {
        baseline: { eyesLookDown: 0.1, browDownLeft: 0.6, browDownRight: 0.6, jawForward: 0.3, mouthFrownLeft: 0.7, mouthFrownRight: 0.7, mouthRollLower: 0.2, mouthShrugLower: 0.3, handFistLeft: 1, handFistRight: 1 },
        speech: { deltaRate: -0.2, deltaPitch: 0.2, deltaVolume: 0 },
        anims: [
          { name: 'breathing', delay: 500, dt: [ 1000,500,1000 ], vs: { chestInhale: [0.7,0.7,0] } },
          { name: 'pose', alt: [
            { p: 0.4, delay: [5000,20000], vs: { pose: ['side'] } },
            { p: 0.4, delay: [5000,20000], vs: { pose: ['straight'] } },
            { p: 0.2, delay: [5000,20000], vs: { pose: ['hip'] },
              'M': { delay: [5000,20000], vs: { pose: ['wide'] } }
            },
          ]},
          { name: 'head',
            idle: { delay: [100,500], dt: [ [200,5000] ], vs: { headRotateX: [[-0.04,0.10]], headRotateY: [[-0.2,0.2]], headRotateZ: [[-0.08,0.08]] } },
            talking: { dt: [ [0,1000,0] ], vs: { headRotateX: [[-0.05,0.15,1,2]], headRotateY: [[-0.1,0.1]], headRotateZ: [[-0.1,0.1]] } }
          },
          { name: 'eyes', delay: [100,5000], dt: [ [100,500],[100,5000,2] ], vs: { eyesRotateY: [[-0.6,0.6]], eyesRotateX: [[-0.2,0.6]] } },
          { name: 'blink', delay: [1000,8000,1,2], dt: [50,[100,300],100], vs: { eyeBlinkLeft: [1,1,0], eyeBlinkRight: [1,1,0] } },
          { name: 'mouth', delay: [1000,5000], dt: [ [100,500],[100,5000,2] ], vs : { mouthRollLower: [[0,0.3,2]], mouthRollUpper: [[0,0.3,2]], mouthStretchLeft: [[0,0.3]], mouthStretchRight: [[0,0.3]], mouthPucker: [[0,0.3]] } },
          { name: 'misc', delay: [100,5000], dt: [ [100,500],[100,5000,2] ], vs : { eyeSquintLeft: [[0,0.3,3]], eyeSquintRight: [[0,0.3,3]], browInnerUp: [[0,0.3]], browOuterUpLeft: [[0,0.3]], browOuterUpRight: [[0,0.3]] } }
        ]
      },
      'sad' : {
        baseline: { eyesLookDown: 0.2, browDownRight: 0.1, browInnerUp: 0.6, browOuterUpRight: 0.2, eyeSquintLeft: 0.7, eyeSquintRight: 0.7, mouthFrownLeft: 0.8, mouthFrownRight: 0.8, mouthLeft: 0.2, mouthPucker: 0.5, mouthRollLower: 0.2, mouthRollUpper: 0.2, mouthShrugLower: 0.2, mouthShrugUpper: 0.2, mouthStretchLeft: 0.4 },
        speech: { deltaRate: -0.2, deltaPitch: -0.2, deltaVolume: 0 },
        anims: [
          { name: 'breathing', delay: 1500, dt: [ 1000,500,1000 ], vs: { chestInhale: [0.3,0.3,0] } },
          { name: 'pose', alt: [
            { p: 0.4, delay: [5000,20000], vs: { pose: ['side'] } },
            { p: 0.4, delay: [5000,20000], vs: { pose: ['straight'] } },
            { delay: [5000,10000], vs: { pose: ['side'] },
              full: { delay: [5000,10000], vs: { pose: ['oneknee'] } }
            },
          ]},
          { name: 'head',
            idle: { delay: [100,500], dt: [ [200,5000] ], vs: { headRotateX: [[-0.04,0.10]], headRotateY: [[-0.2,0.2]], headRotateZ: [[-0.08,0.08]] } },
            talking: { dt: [ [0,1000,0] ], vs: { headRotateX: [[-0.05,0.15,1,2]], headRotateY: [[-0.1,0.1]], headRotateZ: [[-0.1,0.1]] } }
          },
          { name: 'eyes', delay: [100,5000], dt: [ [100,500],[100,5000,2] ], vs: { eyesRotateY: [[-0.6,0.6]], eyesRotateX: [[-0.2,0.6]] } },
          { name: 'blink', delay: [1000,8000,1,2], dt: [50,[100,300],100], vs: { eyeBlinkLeft: [1,1,0], eyeBlinkRight: [1,1,0] } },
          { name: 'mouth', delay: [1000,5000], dt: [ [100,500],[100,5000,2] ], vs : { mouthRollLower: [[0,0.3,2]], mouthRollUpper: [[0,0.3,2]], mouthStretchLeft: [[0,0.3]], mouthStretchRight: [[0,0.3]], mouthPucker: [[0,0.3]] } },
          { name: 'misc', delay: [100,5000], dt: [ [100,500],[100,5000,2] ], vs : { eyeSquintLeft: [[0,0.3,3]], eyeSquintRight: [[0,0.3,3]], browInnerUp: [[0,0.3]], browOuterUpLeft: [[0,0.3]], browOuterUpRight: [[0,0.3]] } }
        ]
      },
      'fear' : {
        baseline: { browInnerUp: 0.7, eyeSquintLeft: 0.5, eyeSquintRight: 0.5, eyeWideLeft: 0.6, eyeWideRight: 0.6, mouthClose: 0.1, mouthFunnel: 0.3, mouthShrugLower: 0.5, mouthShrugUpper: 0.5 },
        speech: { deltaRate: -0.2, deltaPitch: 0, deltaVolume: 0 },
        anims: [
          { name: 'breathing', delay: 500, dt: [ 1000,500,1000 ], vs: { chestInhale: [0.7,0.7,0] } },
          { name: 'pose', alt: [
            { p: 0.8, delay: [5000,20000], vs: { pose: ['side'] } },
            { delay: [5000,20000], vs: { pose: ['straight'] } },
            { delay: [5000,10000], vs: { pose: ['wide'] } },
            { delay: [5000,10000], vs: { pose: ['side'] },
              full: { delay: [5000,10000], vs: { pose: ['oneknee'] } }
            },
          ]},
          { name: 'head',
            idle: { delay: [100,500], dt: [ [200,3000] ], vs: { headRotateX: [[-0.06,0.12]], headRotateY: [[-0.7,0.7]], headRotateZ: [[-0.1,0.1]] } },
            talking: { dt: [ [0,1000,0] ], vs: { headRotateX: [[-0.05,0.15,1,2]], headRotateY: [[-0.1,0.1]], headRotateZ: [[-0.1,0.1]] } }
          },
          { name: 'eyes', delay: [100,2000], dt: [ [100,500],[100,5000,2] ], vs: { eyesRotateY: [[-1,1]], eyesRotateX: [[-0.2,0.6]] } },
          { name: 'blink', delay: [2000,8000,1,2], dt: [50,[100,300],100], vs: { eyeBlinkLeft: [1,1,0], eyeBlinkRight: [1,1,0] } },
          { name: 'mouth', delay: [1000,5000], dt: [ [100,500],[100,5000,2] ], vs : { mouthRollLower: [[0,0.3,2]], mouthRollUpper: [[0,0.3,2]], mouthStretchLeft: [[0,0.3]], mouthStretchRight: [[0,0.3]], mouthPucker: [[0,0.3]] } },
          { name: 'misc', delay: [100,5000], dt: [ [100,500],[100,5000,2] ], vs : { eyeSquintLeft: [[0,0.3,3]], eyeSquintRight: [[0,0.3,3]], browInnerUp: [[0,0.3]], browOuterUpLeft: [[0,0.3]], browOuterUpRight: [[0,0.3]] } }
        ]
      },
      'disgust' : {
        baseline: { browDownLeft: 0.7, browDownRight: 0.1, browInnerUp: 0.3, eyeSquintLeft: 1, eyeSquintRight: 1, eyeWideLeft: 0.5, eyeWideRight: 0.5, eyesRotateX: 0.05, mouthLeft: 0.4, mouthPressLeft: 0.3, mouthRollLower: 0.3, mouthShrugLower: 0.3, mouthShrugUpper: 0.8, mouthUpperUpLeft: 0.3, noseSneerLeft: 1, noseSneerRight: 0.7 },
        speech: { deltaRate: -0.2, deltaPitch: 0, deltaVolume: 0 },
        anims: [
          { name: 'breathing', delay: 1500, dt: [ 1000,500,1000 ], vs: { chestInhale: [0.5,0.5,0] } },
          { name: 'pose', alt: [
            { delay: [5000,10000], vs: { pose: ['side'] } },
          ]},
          { name: 'head',
            idle: { delay: [100,500], dt: [ [200,5000] ], vs: { headRotateX: [[-0.04,0.10]], headRotateY: [[-0.2,0.2]], headRotateZ: [[-0.08,0.08]] } },
            talking: { dt: [ [0,1000,0] ], vs: { headRotateX: [[-0.05,0.15,1,2]], headRotateY: [[-0.1,0.1]], headRotateZ: [[-0.1,0.1]] } }
          },
          { name: 'eyes', delay: [100,5000], dt: [ [100,500],[100,5000,2] ], vs: { eyesRotateY: [[-0.6,0.6]], eyesRotateX: [[-0.2,0.6]] } },
          { name: 'blink', delay: [2000,8000,1,2], dt: [50,[100,300],100], vs: { eyeBlinkLeft: [1,1,0], eyeBlinkRight: [1,1,0] } },
          { name: 'mouth', delay: [1000,5000], dt: [ [100,500],[100,5000,2] ], vs : { mouthRollLower: [[0,0.3,2]], mouthRollUpper: [[0,0.3,2]], mouthStretchLeft: [[0,0.3]], mouthStretchRight: [[0,0.3]], mouthPucker: [[0,0.3]] } },
          { name: 'misc', delay: [100,5000], dt: [ [100,500],[100,5000,2] ], vs : { eyeSquintLeft: [[0,0.3,3]], eyeSquintRight: [[0,0.3,3]], browInnerUp: [[0,0.3]], browOuterUpLeft: [[0,0.3]], browOuterUpRight: [[0,0.3]] } }
        ]
      },
      'love' : {
        baseline: { browInnerUp: 0.4, browOuterUpLeft: 0.2, browOuterUpRight: 0.2, mouthSmile: 0.2, eyeBlinkLeft: 0.6, eyeBlinkRight: 0.6, eyeWideLeft: 0.7, eyeWideRight: 0.7, headRotateX: 0.1, mouthDimpleLeft: 0.1, mouthDimpleRight: 0.1, mouthPressLeft: 0.2, mouthShrugUpper: 0.2, mouthUpperUpLeft: 0.1, mouthUpperUpRight: 0.1 },
        speech: { deltaRate: -0.1, deltaPitch: -0.7, deltaVolume: 0 },
        anims: [
          { name: 'breathing', delay: 1500, dt: [ 1500,500,1500 ], vs: { chestInhale: [0.8,0.8,0] } },
          { name: 'pose', alt: [
            { p: 0.4, delay: [5000,20000], vs: { pose: ['side'] } },
            { p: 0.2, delay: [5000,20000], vs: { pose: ['straight'] } },
            { p: 0.2, delay: [5000,20000], vs: { pose: ['hip'] },
              'M': { delay: [5000,20000], vs: { pose: ['side'] } }
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
            idle: { dt: [ [1000,5000] ], vs: { headRotateX: [[-0.04,0.10]], headRotateY: [[-0.3,0.3]], headRotateZ: [[-0.08,0.08]] } },
            talking: { dt: [ [0,1000,0] ], vs: { headRotateX: [[-0.05,0.15,1,2]], headRotateY: [[-0.1,0.1]], headRotateZ: [[-0.1,0.1]] } }
          },
          { name: 'eyes', delay: [300,5000], dt: [ [100,500],[100,5000,2] ], vs: { eyesRotateY: [[-0.6,0.6]], eyesRotateX: [[-0.2,0.6]] } },
          { name: 'blink', delay: [2000,8000,1,2], dt: [50,[200,300],100], vs: { eyeBlinkLeft: [0.6,0.6,0], eyeBlinkRight: [0.6,0.6,0] } },
          { name: 'mouth', delay: [1000,5000], dt: [ [100,500],[100,5000,2] ], vs : { mouthLeft: [[0,0.3,2]], mouthRollLower: [[0,0.3,2]], mouthRollUpper: [[0,0.3,2]], mouthStretchLeft: [[0,0.3]], mouthStretchRight: [[0,0.3]], mouthPucker: [[0,0.3]] } },
          { name: 'misc', delay: [100,5000], dt: [ [500,1000],[1000,5000,2] ], vs : { eyeSquintLeft: [[0,0.3,3]], eyeSquintRight: [[0,0.3,3]], browInnerUp: [[0.3,0.6]], browOuterUpLeft: [[0.1,0.3]], browOuterUpRight: [[0.1,0.3]] } }
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
          { name: 'head', delay: [1000,5000], dt: [ [2000,10000] ], vs: { headRotateX: [[0,0.4]], headRotateY: [[-0.1,0.1]], headRotateZ: [[-0.04,0.04]] } },
          { name: 'eyes', delay: 10010, dt: [], vs: {} },
          { name: 'blink', delay: 10020, dt: [], vs: {} },
          { name: 'mouth', delay: 10030, dt: [], vs: {} },
          { name: 'misc', delay: 10040, dt: [], vs: {} }
        ]
      }
    };
