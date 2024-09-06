import bpy

# Override existing visemes?
override = False

# Oculus viseme blendshapes
shapekeys = [
    { "name": "viseme_aa", "mix": [
        { "name": "jawOpen", "value": 0.6 }
    ]},
    { "name": "viseme_E", "mix": [
        { "name": "mouthPressLeft", "value": 0.8 },
        { "name": "mouthPressRight", "value": 0.8 },
        { "name": "mouthDimpleLeft", "value": 1.0 },
        { "name": "mouthDimpleRight", "value": 1.0 },
        { "name": "jawOpen", "value": 0.3 }
    ]},
    { "name": "viseme_I", "mix": [
        { "name": "mouthPressLeft", "value": 0.6 },
        { "name": "mouthPressRight", "value": 0.6 },
        { "name": "mouthDimpleLeft", "value": 0.6 },
        { "name": "mouthDimpleRight", "value": 0.6 },
        { "name": "jawOpen", "value": 0.2 }
    ]},
    { "name": "viseme_O", "mix": [
        { "name": "mouthPucker", "value": 1.0 },
        { "name": "jawForward", "value": 0.6 },
        { "name": "jawOpen", "value": 0.2 }
    ]},
    { "name": "viseme_U", "mix": [
        { "name": "mouthFunnel", "value": 1.0 }
    ]},
    { "name": "viseme_PP", "mix": [
        { "name": "mouthRollLower", "value": 0.8 },
        { "name": "mouthRollUpper", "value": 0.8 },
        { "name": "mouthUpperUpLeft", "value": 0.3 },
        { "name": "mouthUpperUpRight", "value": 0.3 }
    ]},
    { "name": "viseme_FF", "mix": [
        { "name": "mouthPucker", "value": 1.0 },
        { "name": "mouthShrugUpper", "value": 1.0 },
        { "name": "mouthLowerDownLeft", "value": 0.2 },
        { "name": "mouthLowerDownRight", "value": 0.2 },
        { "name": "mouthDimpleLeft", "value": 1.0 },
        { "name": "mouthDimpleRight", "value": 1.0 },
        { "name": "mouthRollLower", "value": 1.0 }
    ]},
    { "name": "viseme_DD", "mix": [
        { "name": "mouthPressLeft", "value": 0.8 },
        { "name": "mouthPressRight", "value": 0.8 },
        { "name": "mouthFunnel", "value": 0.5 },
        { "name": "jawOpen", "value": 0.2 }
    ]},
    { "name": "viseme_SS", "mix": [
        { "name": "mouthPressLeft", "value": 0.8 },
        { "name": "mouthPressRight", "value": 0.8 },
        { "name": "mouthLowerDownLeft", "value": 0.5 },
        { "name": "mouthLowerDownRight", "value": 0.5 },
        { "name": "jawOpen", "value": 0.1 }
    ]},
    { "name": "viseme_TH", "mix": [
        { "name": "mouthRollUpper", "value": 0.6 },
        { "name": "jawOpen", "value": 0.2 },
        { "name": "tongueOut", "value": 0.4 }
    ]},
    { "name": "viseme_CH", "mix": [
        { "name": "mouthPucker", "value": 0.5 },
        { "name": "jawOpen", "value": 0.2 }
    ]},
    { "name": "viseme_RR", "mix": [
        { "name": "mouthPucker", "value": 0.5 },
        { "name": "jawOpen", "value": 0.2 }
    ]},
    { "name": "viseme_kk", "mix": [
        { "name": "mouthLowerDownLeft", "value": 0.4 },
        { "name": "mouthLowerDownRight", "value": 0.4 },
        { "name": "mouthDimpleLeft", "value": 0.3 },
        { "name": "mouthDimpleRight", "value": 0.3 },
        { "name": "mouthFunnel", "value": 0.3 },
        { "name": "mouthPucker", "value": 0.3 },
        { "name": "jawOpen", "value": 0.15 }
    ]},
    { "name": "viseme_nn", "mix": [
        { "name": "mouthLowerDownLeft", "value": 0.4 },
        { "name": "mouthLowerDownRight", "value": 0.4 },
        { "name": "mouthDimpleLeft", "value": 0.3 },
        { "name": "mouthDimpleRight", "value": 0.3 },
        { "name": "mouthFunnel", "value": 0.3 },
        { "name": "mouthPucker", "value": 0.3 },
        { "name": "jawOpen", "value": 0.15 },
        { "name": "tongueOut", "value": 0.2 }
    ]},
    { "name": "viseme_sil", "mix": [] }
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

# Build missing blend shapes
for r in bpy.context.scene.objects:
    for o in traverse(r):
        if hasShapekeys(o):
            keys = o.data.shape_keys.key_blocks
            for b in shapekeys:
                name = b["name"]
                mix = b["mix"]
                # Override
                if override:
                    if not keys.get(name) is None:
                        o.shape_key_remove(keys.get(name))
                # Check/verify the extra doesn't already exist
                if keys.get(name) is None:
                    # Check if some component exists
                    for m in mix:
                        if not keys.get(m["name"]) is None:
                            # Reset all shapes
                            for k in keys:
                                k.value = 0
                            # Create a mixed shape
                            for m in mix:
                                if not keys.get(m["name"]) is None:
                                    keys.get(m["name"]).value = m["value"]
                            # Create a new shape key from the mix
                            o.shape_key_add(name=name,from_mix=True)
                            # Reset all shapes
                            for k in keys:
                                k.value = 0
                            break
