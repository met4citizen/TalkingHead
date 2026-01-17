import bpy

# Override existing visemes?
override = False

# Oculus viseme blendshapes
shapekeys = [
    { "name": "viseme_aa", "mix": [
        { "name": "aa_02", "value": 1.0 }
    ]},
    { "name": "viseme_E", "mix": [
        { "name": "ey_eh_uh_04", "value": 1.0 }
    ]},
    { "name": "viseme_I", "mix": [
        { "name": "y_iy_ih_ix_06", "value": 1.0 }
    ]},
    { "name": "viseme_O", "mix": [
        { "name": "ow_08", "value": 1.0 },
    ]},
    { "name": "viseme_U", "mix": [
        { "name": "w_uw_07", "value": 1.0 }
    ]},
    { "name": "viseme_PP", "mix": [
        { "name": "p_b_m_21", "value": 1.0 }
    ]},
    { "name": "viseme_FF", "mix": [
        { "name": "f_v_18", "value": 1.0 }
    ]},
    { "name": "viseme_DD", "mix": [
        { "name": "d_t_n_19", "value": 1.0 }
    ]},
    { "name": "viseme_SS", "mix": [
        { "name": "s_z_15", "value": 1.0 }
    ]},
    { "name": "viseme_TH", "mix": [
        { "name": "th_dh_17", "value": 1.0 }
    ]},
    { "name": "viseme_CH", "mix": [
        { "name": "sh_ch_jh_zh_16", "value": 1.0 }
    ]},
    { "name": "viseme_RR", "mix": [
        { "name": "r_13", "value": 1.0 }
    ]},
    { "name": "viseme_kk", "mix": [
        { "name": "k_g_ng_20", "value": 1.0 }
    ]},
    { "name": "viseme_nn", "mix": [
        { "name": "d_t_n_19", "value": 1.0 }
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
