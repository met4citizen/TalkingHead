import bpy

# NOTES FOR CONVERTING TOMCAT MODELS
#
# 1. Import and replace the rig with RPM rig
#   - Import TomCAT model: root | Apply all transformations, delete rig,
#      for all meshes: Data | Vertex groups | Delete all groups
#   - Import RPM GLB: Apply all transformations, delete all meshes,
#     edit rig to match the TomCAT character pose
#   - Add bones: LeftEye, RightEye, LeftBreast, RightBreast, Scarf etc.
#   - Select body+Armature, Parent Ctrl+P | Armature deform /w Automatic Weights
#
# 3. Add Clothes
#   - Select mesh+Armature, Parent Ctrl+P | Armature deform with Empty Groups
#
# 4. Set weights
#   - Select body + mesh: Weight Paint | Weights |
#     Transfer Weights (Nearest face interpolated, by name, all layers)
#
# 5. Define materials
#
# 6. Rename/add shape keys:
#   - Scripting | rename-tomcat-shapekeys.py
#   - Scripting | build-extras-from-arkit.py (set override = True)
#
# 7. Export
#   - Choose clothes by making them visible/hidden
#   - Export GLB: Include | Limit to | Visible objects
#

# Shape key map for Microsoft Rocketbox
shapekeyMap = [
[ "vrc.v_sil", "viseme_sil" ], [ "vrc.v_pp", "viseme_PP" ], [ "vrc.v_ff", "viseme_FF" ],
[ "vrc.v_th", "viseme_TH" ], [ "vrc.v_dd", "viseme_DD" ], [ "vrc.v_kk", "viseme_kk" ],
[ "vrc.v_ch", "viseme_CH" ], [ "vrc.v_ss", "viseme_SS" ], [ "vrc.v_nn", "viseme_nn" ],
[ "vrc.v_rr", "viseme_RR" ], [ "vrc.v_aa", "viseme_aa" ], [ "vrc.v_ee", "viseme_E" ],
[ "vrc.v_ih", "viseme_I" ], [ "vrc.v_oh", "viseme_O" ], [ "vrc.v_ou", "viseme_U" ]
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

# Has bones
def hasBones(x):
    return hasattr(x, 'data') and hasattr(x.data, 'bones')

# Rename shape keys
for r in bpy.context.scene.objects:
    for o in traverse(r):
        if hasShapekeys(o):
            keys = o.data.shape_keys.key_blocks
            for m in shapekeyMap:
                idx = keys.find(m[0])
                if idx != -1:
                    keys[idx].name = m[1]
