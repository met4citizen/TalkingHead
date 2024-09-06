import bpy

# Shape key map for Microsoft Rocketbox
shapekeyMap = [
[ "AA_VI_00_Sil", "viseme_sil" ], [ "AA_VI_01_PP", "viseme_PP" ], [ "AA_VI_02_FF", "viseme_FF" ],
[ "AA_VI_03_TH", "viseme_TH" ], [ "AA_VI_04_DD", "viseme_DD" ], [ "AA_VI_05_KK", "viseme_kk" ],
[ "AA_VI_06_CH", "viseme_CH" ], [ "AA_VI_07_SS", "viseme_SS" ], [ "AA_VI_08_nn", "viseme_nn" ],
[ "AA_VI_09_RR", "viseme_RR" ], [ "AA_VI_10_aa", "viseme_aa" ], [ "AA_VI_11_E", "viseme_E" ],
[ "AA_VI_12_I", "viseme_I" ], [ "AA_VI_13_O", "viseme_O" ], [ "AA_VI_14_U", "viseme_U" ],
[ "AK_01_BrowDownLeft", "browDownLeft" ],
[ "AK_02_BrowDownRight", "browDownRight" ],
[ "AK_03_BrowInnerUp", "browInnerUp" ],
[ "AK_04_BrowOuterUpLeft", "browOuterUpLeft" ],
[ "AK_05_BrowOuterUpRight", "browOuterUpRight" ],
[ "AK_06_CheekPuff", "cheekPuff" ],
[ "AK_07_CheekSquintLeft", "cheekSquintLeft" ],
[ "AK_08_CheekSquintRight", "cheekSquintRight" ],
[ "AK_09_EyeBlinkLeft", "eyeBlinkLeft" ],
[ "AK_10_EyeBlinkRight", "eyeBlinkRight" ],
[ "AK_11_EyeLookDownLeft", "eyeLookDownLeft" ],
[ "AK_12_EyeLookDownRight", "eyeLookDownRight" ],
[ "AK_13_EyeLookInLeft", "eyeLookInLeft" ],
[ "AK_14_EyeLookInRight", "eyeLookInRight" ],
[ "AK_15_EyeLookOutLeft", "eyeLookOutLeft" ],
[ "AK_16_EyeLookOutRight", "eyeLookOutRight" ],
[ "AK_17_EyeLookUpLeft", "eyeLookUpLeft" ],
[ "AK_18_EyeLookUpRight", "eyeLookUpRight" ],
[ "AK_19_EyeSquintLeft", "eyeSquintLeft" ],
[ "AK_20_EyeSquintRight", "eyeSquintRight" ],
[ "AK_21_EyeWideLeft", "eyeWideLeft" ],
[ "AK_22_EyeWideRight", "eyeWideRight" ],
[ "AK_23_JawForward", "jawForward" ],
[ "AK_24_JawLeft", "jawLeft" ],
[ "AK_25_JawOpen", "jawOpen" ],
[ "AK_26_JawRight", "jawRight" ],
[ "AK_27_MouthClose", "mouthClose" ],
[ "AK_28_MouthDimpleLeft", "mouthDimpleLeft" ],
[ "AK_29_MouthDimpleRight", "mouthDimpleRight" ],
[ "AK_30_MouthFrownLeft", "mouthFrownLeft" ],
[ "AK_31_MouthFrownRight", "mouthFrownRight" ],
[ "AK_32_MouthFunnel", "mouthFunnel" ],
[ "AK_33_MouthLeft", "mouthLeft" ],
[ "AK_34_MouthLowerDownLeft", "mouthLowerDownLeft" ],
[ "AK_35_MouthLowerDownRight", "mouthLowerDownRight" ],
[ "AK_36_MouthPressLeft", "mouthPressLeft" ],
[ "AK_37_MouthPressRight", "mouthPressRight" ],
[ "AK_38_MouthPucker", "mouthPucker" ],
[ "AK_39_MouthRight", "mouthRight" ],
[ "AK_40_MouthRollLower", "mouthRollLower" ],
[ "AK_41_MouthRollUpper", "mouthRollUpper" ],
[ "AK_42_MouthShrugLower", "mouthShrugLower" ],
[ "AK_43_MouthShrugUpper", "mouthShrugUpper" ],
[ "AK_44_MouthSmileLeft", "mouthSmileLeft" ],
[ "AK_45_MouthSmileRight", "mouthSmileRight" ],
[ "AK_46_MouthStretchLeft", "mouthStretchLeft" ],
[ "AK_47_MouthStretchRight", "mouthStretchRight" ],
[ "AK_48_MouthUpperUpLeft", "mouthUpperUpLeft" ],
[ "AK_49_MouthUpperUpRight", "mouthUpperUpRight" ],
[ "AK_50_NoseSneerLeft", "noseSneerLeft" ],
[ "AK_51_NoseSneerRight", "noseSneerRight" ],
[ "AK_52_TongueOut", "tongueOut" ],
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

# Rename shape keys
for r in bpy.context.scene.objects:
    for o in traverse(r):
        if hasShapekeys(o):
            keys = o.data.shape_keys.key_blocks
            for m in shapekeyMap:
                idx = keys.find(m[0])
                if idx != -1:
                    keys[idx].name = m[1]
