import bpy

# Override existing shake keys?
OVERRIDE = True

# Falloff width between left/right sides
FALLOFF = 0

# Shape keys to build
SHAPEKEYS = [
    
  # eyeBlinkLeft, eyeBlinkRight
  { "name": "eyeBlinkLeft", "mix": [
      { "name": "Fcl_EYE_Close_L", "value": 1.0 },
  ]},
  { "name": "eyeBlinkRight", "mix": [
      { "name": "Fcl_EYE_Close_R", "value": 1.0 },
  ]},

  # eyeLookDownLeft, eyeLookDownRight, eyeLookInLeft, eyeLookInRight,
  # eyeLookOutLeft, eyeLookOutRight, eyeLookUpLeft, eyeLookUpRight
  # NOTE: These are skipped, because they should be build using `build_vroid_eyes.py` script

  # eyeSquintLeft, eyeSquintRight
  { "name": "eyeSquintLeft", "mix": [
      { "name": "Fcl_EYE_Joy_L", "value": 0.4 },
  ]},
  { "name": "eyeSquintRight", "mix": [
      { "name": "Fcl_EYE_Joy_R", "value": 0.4 },
  ]},

  # eyeWideLeft, eyeWideRight
  { "name": "eyeWideLeft", "mix": [
      { "name": "Fcl_EYE_Spread", "value": 1.0, "side": "left" },
  ]},
  { "name": "eyeWideRight", "mix": [
      { "name": "Fcl_EYE_Spread", "value": 1.0, "side": "right" },
  ]},

  # TODO: jawForward, jawLeft, jawRight, jawOpen
  { "name": "jawForward", "mix": [] },
  { "name": "jawLeft", "mix": [] },
  { "name": "jawRight", "mix": [] },
  { "name": "jawOpen", "mix": [] },

  # mouthClose
  { "name": "mouthClose", "mix": [
      { "name": "Fcl_MTH_Close", "value": 1.0 }
  ]},

  # mouthFunnel, mouthPucker
  { "name": "mouthFunnel", "mix": [
      { "name": "Fcl_MTH_U", "value": 1.0 }
  ]},
  { "name": "mouthPucker", "mix": [
      { "name": "Fcl_MTH_U", "value": 1.0 },
  ]},

  # mouthLeft, mouthRight
  { "name": "mouthLeft", "mix": [
      { "name": "Fcl_MTH_Large", "value": -0.5, "side": "left", "falloff": 0.01 },
      { "name": "Fcl_MTH_Large", "value": 0.5, "side": "right", "falloff": 0.01 },
  ]},
  { "name": "mouthRight", "mix": [
      { "name": "Fcl_MTH_Large", "value": 0.5, "side": "left", "falloff": 0.01 },
      { "name": "Fcl_MTH_Large", "value": -0.5, "side": "right", "falloff": 0.01 },
  ]},

  # mouthSmileLeft, mouthSmileRight
  { "name": "mouthSmileLeft", "mix": [
      { "name": "Fcl_MTH_Fun", "value": 1.4, "side": "left", "falloff": 0.01 }
  ]},
  { "name": "mouthSmileRight", "mix": [
      { "name": "Fcl_MTH_Fun", "value": 1.4, "side": "right", "falloff": 0.01 },
  ]},

  # mouthFrownLeft, mouthFrownRight
  { "name": "mouthFrownLeft", "mix": [
      { "name": "Fcl_MTH_Angry", "value": 1.0, "side": "left", "falloff": 0.01 },
  ]},
  { "name": "mouthFrownRight", "mix": [
      { "name": "Fcl_MTH_Angry", "value": 1.0, "side": "right", "falloff": 0.01 },
  ]},

  # mouthDimpleLeft, mouthDimpleRight
  { "name": "mouthDimpleLeft", "mix": [
      { "name": "Fcl_MTH_Fun", "value": 1.4, "side": "left", "falloff": 0.01 }
  ]},
  { "name": "mouthDimpleRight", "mix": [
      { "name": "Fcl_MTH_Fun", "value": 1.4, "side": "right", "falloff": 0.01 },
  ]},

  # mouthStretchLeft, mouthStretchRight
  { "name": "mouthStretchLeft", "mix": [
      { "name": "Fcl_MTH_Large", "value": 1.0, "side": "left", "falloff": 0.01 },
  ]},
  { "name": "mouthStretchRight", "mix": [
      { "name": "Fcl_MTH_Large", "value": 1.0, "side": "right", "falloff": 0.01 },
  ]},

  # mouthRollLower, mouthRollUpper
  { "name": "mouthRollLower", "mix": [
      { "name": "Fcl_MTH_Up", "value": 0.5 },
  ]},
  { "name": "mouthRollUpper", "mix": [
      { "name": "Fcl_MTH_Down", "value": 0.5 },
  ]},

  # TODO: mouthShrugLower, mouthShrugUpper
  { "name": "mouthShrugLower", "mix": [] },
  { "name": "mouthShrugUpper", "mix": [] },

  # mouthPressLeft, mouthPressRight
  { "name": "mouthPressLeft", "mix": [
      { "name": "Fcl_MTH_Close", "value": 1.0, "side": "left", "falloff": 0.01 },
  ]},
  { "name": "mouthPressRight", "mix": [
      { "name": "Fcl_MTH_Close", "value": 1.0, "side": "right", "falloff": 0.01 },
  ]},
  
  # mouthLowerDownLeft, mouthLowerDownRight
  { "name": "mouthLowerDownLeft", "mix": [
      { "name": "Fcl_MTH_Joy", "value": 0.5, "side": "left", "falloff": 0.01 },
  ]},
  { "name": "mouthLowerDownRight", "mix": [
      { "name": "Fcl_MTH_Joy", "value": 0.5, "side": "right", "falloff": 0.01 },
  ]},

  # TODO: mouthUpperUpLeft, mouthUpperUpRight
  { "name": "mouthUpperUpLeft", "mix": [] },
  { "name": "mouthUpperUpRight", "mix": [] },

  # browDownLeft, browDownRight
  { "name": "browDownLeft", "mix": [
      { "name": "Fcl_BRW_Angry", "value": 1.0, "side": "left" },
  ]},
  { "name": "browDownRight", "mix": [
      { "name": "Fcl_BRW_Angry", "value": 1.0, "side": "right" },
  ]},

  # browInnerUp
  { "name": "browInnerUp", "mix": [
      { "name": "Fcl_BRW_Sorrow", "value": 0.5 },
      { "name": "Fcl_BRW_Surprised", "value": 0.5 },
  ]},

  # browOuterUpLeft, browOuterUpRight
  { "name": "browOuterUpLeft", "mix": [
      { "name": "Fcl_BRW_Sorrow", "value": -1.0, "side": "left" },
  ]},
  { "name": "browOuterUpRight", "mix": [
      { "name": "Fcl_BRW_Sorrow", "value": -1.0, "side": "right" },
  ]},

  # TODO: cheekPuff
  { "name": "cheekPuff", "mix": [] },

  # TODO: cheekSquintLeft, cheekSquintRight,
  { "name": "cheekSquintLeft", "mix": [] },
  { "name": "cheekSquintRight", "mix": [] },

  # TODO: noseSneerLeft, noseSneerRight
  { "name": "noseSneerLeft", "mix": [] },
  { "name": "noseSneerRight", "mix": [] },
  
  # TODO: tongueOut
  { "name": "tongueOut", "mix": [] },

  # OCULUS VISEMES

  # SIL
  { "name": "viseme_sil", "mix": [] },

  # Vowels: A, E, I, O, U
  { "name": "viseme_aa", "mix": [
      { "name": "Fcl_MTH_A", "value": 1.0 },
  ]},
  { "name": "viseme_E", "mix": [
      { "name": "Fcl_MTH_E", "value": 1.0 },
  ]},
  { "name": "viseme_I", "mix": [
      { "name": "Fcl_MTH_I", "value": 1.0 },
  ]},
  { "name": "viseme_O", "mix": [
      { "name": "Fcl_MTH_O", "value": 1.0 },
  ]},
  { "name": "viseme_U", "mix": [
      { "name": "Fcl_MTH_U", "value": 1.0 },
  ]},

  # Consonants: PP, FF, TH, DD, kk, CH, SS, nn, RR
  { "name": "viseme_PP", "mix": [   # p, b, m — lips together
      { "name": "Fcl_MTH_Close", "value": 1.0 },
  ]},
  { "name": "viseme_FF", "mix": [   # f, v — lower lip under upper teeth
      { "name": "Fcl_MTH_Close", "value": 0.3 },
      { "name": "Fcl_MTH_I", "value": 0.4 },
      { "name": "Fcl_MTH_Up", "value": 0.5 },
  ]},
  { "name": "viseme_TH", "mix": [   # th — tongue between teeth
      { "name": "Fcl_MTH_Small", "value": 0.5 },
      { "name": "Fcl_MTH_A", "value": 0.2 },
      { "name": "Fcl_MTH_Down", "value": 0.3 },
  ]},
  { "name": "viseme_DD", "mix": [   # d, t, n — tongue on gum ridge
      { "name": "Fcl_MTH_Small", "value": 0.4 },
      { "name": "Fcl_MTH_E", "value": 0.3 },
      { "name": "Fcl_MTH_Down", "value": 0.2 },
  ]},
  { "name": "viseme_kk", "mix": [   # k, g — back of tongue
      { "name": "Fcl_MTH_Small", "value": 0.3 },
      { "name": "Fcl_MTH_A", "value": 0.3 },
      { "name": "Fcl_MTH_Down", "value": 0.2 },
  ]},
  { "name": "viseme_CH", "mix": [   # ch, sh — lips slightly rounded
      { "name": "Fcl_MTH_U", "value": 0.5 },
      { "name": "Fcl_MTH_Small", "value": 0.4 },
  ]},
  { "name": "viseme_SS", "mix": [   # s, z — teeth close, slight smile
      { "name": "Fcl_MTH_I", "value": 0.6 },
      { "name": "Fcl_MTH_Small", "value": 0.3 },
  ]},
  { "name": "viseme_nn", "mix": [   # n, ng
      { "name": "Fcl_MTH_Small", "value": 0.4 },
      { "name": "Fcl_MTH_E", "value": 0.2 },
      { "name": "Fcl_MTH_Close", "value": 0.2 },
  ]},
  { "name": "viseme_RR", "mix": [   # r — lips slightly rounded
      { "name": "Fcl_MTH_O", "value": 0.4 },
      { "name": "Fcl_MTH_Small", "value": 0.3 },
  ]},
]

# Recursive traverse
def traverse(x):
    yield x
    if hasattr(x, 'children'):
        for c in x.children:
            yield from traverse(c)

# Has shape keys
def hasShapekeys(x):
    return hasattr(x, 'data') and hasattr(x.data, 'shape_keys') and hasattr(x.data.shape_keys, 'key_blocks')

def smoothstep(t):
    t = max(0.0, min(1.0, t))
    return t * t * (3.0 - 2.0 * t)

def smootherstep(t):
    t = max(0.0, min(1.0, t))
    return t * t * t * (t * (t * 6 - 15) + 10)

def side_weight(x, side, falloff):
    if side is None:
        return 1.0

    if falloff <= 0:
        if side == "right":
            return 1.0 if x < 0 else 0.0
        elif side == "left":
            return 1.0 if x > 0 else 0.0
        return 1.0

    # map x from [-falloff, +falloff] → [0,1]
    t = (x + falloff) / (2 * falloff)

    if side == "right":
        if x <= -falloff:
            return 1.0
        elif x >= falloff:
            return 0.0
        else:
            return 1.0 - smoothstep(t)

    elif side == "left":
        if x >= falloff:
            return 1.0
        elif x <= -falloff:
            return 0.0
        else:
            return smoothstep(t)

    return 1.0

# Build missing blend shapes
for r in bpy.context.scene.objects:
    for o in traverse(r):
        if not hasShapekeys(o):
            continue

        keys = o.data.shape_keys.key_blocks
        basis = keys.get("Basis")
        if basis is None:
            continue

        for b in SHAPEKEYS:
            name = b["name"]
            mix = b["mix"]

            if OVERRIDE and keys.get(name) is not None:
                o.shape_key_remove(keys.get(name))

            if keys.get(name) is not None:
                continue

            valid_mix = [m for m in mix if keys.get(m["name"]) is not None]
            if not valid_mix:
                if o.name == "Face":
                    new_key = o.shape_key_add(name=name, from_mix=True)
                    new_key.value = 0.0
                continue
            
            for k in keys:
                k.value = 0

            new_key = o.shape_key_add(name=name, from_mix=False)

            for i, v in enumerate(o.data.vertices):
                base_co = basis.data[i].co.copy()
                final_co = base_co.copy()

                for m in valid_mix:
                    src_key = keys.get(m["name"])
                    weight = m.get("value", 1.0)
                    side = m.get("side", None)
                    falloff = m.get("falloff", FALLOFF)

                    w = side_weight(base_co.x, side, falloff)
                    if w <= 0.0:
                        continue

                    src_co = src_key.data[i].co
                    delta = src_co - base_co
                    final_co += delta * weight * w

                new_key.data[i].co = final_co
                new_key.value = 0.0