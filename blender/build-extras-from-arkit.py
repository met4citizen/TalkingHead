import bpy

# Override existing extras?
override = True

# Extra blend shapes
shapekeys = [
    { "name": "mouthOpen", "mix": [
        { "name": "jawOpen", "value": 0.7 }
    ]},
    { "name": "mouthSmile", "mix": [
        { "name": "mouthSmileLeft", "value": 1.0 },
        { "name": "mouthSmileRight", "value": 1.0 }
    ]},
    { "name": "eyesClosed", "mix": [
        { "name": "eyeBlinkLeft", "value": 1.0 },
        { "name": "eyeBlinkRight", "value": 1.0 }
    ]},
    { "name": "eyesLookUp", "mix": [
        { "name": "eyeLookUpLeft", "value": 1.0 },
        { "name": "eyeLookUpRight", "value": 1.0 }
    ]},
    { "name": "eyesLookDown", "mix": [
        { "name": "eyeLookDownLeft", "value": 1.0 },
        { "name": "eyeLookDownRight", "value": 1.0 }
    ]}
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
                        
