import bpy

BONE_MAP = {
    
    # Spine
    "J_Bip_C_Hips": "Hips", "J_Bip_C_Spine": "Spine", "J_Bip_C_Chest": "Spine1",
    "J_Bip_C_UpperChest": "Spine2", "J_Bip_C_Neck": "Neck", "J_Bip_C_Head": "Head",
    
    # Eyes
    "J_Adj_L_FaceEye": "LeftEye", "J_Adj_R_FaceEye": "RightEye",
    
    # Left arm
    "J_Bip_L_Shoulder": "LeftShoulder", "J_Bip_L_UpperArm": "LeftArm",
    "J_Bip_L_LowerArm": "LeftForeArm", "J_Bip_L_Hand": "LeftHand",
    
    # Left hand fingers
    "J_Bip_L_Thumb1": "LeftHandThumb1", "J_Bip_L_Thumb2": "LeftHandThumb2",
    "J_Bip_L_Thumb3": "LeftHandThumb3", "J_Bip_L_Index1": "LeftHandIndex1",
    "J_Bip_L_Index2": "LeftHandIndex2", "J_Bip_L_Index3": "LeftHandIndex3",
    "J_Bip_L_Middle1": "LeftHandMiddle1", "J_Bip_L_Middle2": "LeftHandMiddle2",
    "J_Bip_L_Middle3": "LeftHandMiddle3", "J_Bip_L_Ring1": "LeftHandRing1",
    "J_Bip_L_Ring2": "LeftHandRing2", "J_Bip_L_Ring3": "LeftHandRing3",
    "J_Bip_L_Little1": "LeftHandPinky1", "J_Bip_L_Little2": "LeftHandPinky2",
    "J_Bip_L_Little3": "LeftHandPinky3",
    
    # Right arm
    "J_Bip_R_Shoulder": "RightShoulder", "J_Bip_R_UpperArm": "RightArm",
    "J_Bip_R_LowerArm": "RightForeArm", "J_Bip_R_Hand": "RightHand",

    # Right hand fingers
    "J_Bip_R_Thumb1": "RightHandThumb1", "J_Bip_R_Thumb2": "RightHandThumb2",
    "J_Bip_R_Thumb3": "RightHandThumb3", "J_Bip_R_Index1": "RightHandIndex1",
    "J_Bip_R_Index2": "RightHandIndex2", "J_Bip_R_Index3": "RightHandIndex3",
    "J_Bip_R_Middle1": "RightHandMiddle1", "J_Bip_R_Middle2": "RightHandMiddle2",
    "J_Bip_R_Middle3": "RightHandMiddle3", "J_Bip_R_Ring1": "RightHandRing1",
    "J_Bip_R_Ring2": "RightHandRing2", "J_Bip_R_Ring3": "RightHandRing3",
    "J_Bip_R_Little1": "RightHandPinky1", "J_Bip_R_Little2": "RightHandPinky2",
    "J_Bip_R_Little3": "RightHandPinky3",
    
    # Left leg
    "J_Bip_L_UpperLeg": "LeftUpLeg", "J_Bip_L_LowerLeg": "LeftLeg",
    "J_Bip_L_Foot": "LeftFoot", "J_Bip_L_ToeBase": "LeftToeBase",
    
    # Right leg
    "J_Bip_R_UpperLeg": "RightUpLeg", "J_Bip_R_LowerLeg": "RightLeg",
    "J_Bip_R_Foot": "RightFoot", "J_Bip_R_ToeBase": "RightToeBase",
}

# Find armature
arm = None
for o in bpy.data.objects:
    if o.type == 'ARMATURE':
        arm = o
        break

if not arm:
    print("ERROR: No armature found!")
else:
    # Rename bones (vertex groups follow automatically in Blender)
    renamed = 0
    for bone in arm.data.bones:
        if bone.name in BONE_MAP:
            bone.name = BONE_MAP[bone.name]
            renamed += 1
    print(f"{renamed} bones renamed")

    # Remove Root bone, make Hips the root
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode='EDIT')

    hips = arm.data.edit_bones.get('Hips')
    root = arm.data.edit_bones.get('Root')

    if hips and root:
        hips.parent = None
        arm.data.edit_bones.remove(root)
        print("Root bone removed, Hips is now root of hierarchy")
    elif hips:
        hips.parent = None
        print("Hips parent cleared (no Root bone found)")

    # Re-orient feet bones
    lfeet = arm.data.edit_bones.get('LeftFoot')
    ltoes = arm.data.edit_bones.get('LeftToeBase')

    if lfeet and ltoes:
      lfeet.tail = ltoes.head

    rfeet = arm.data.edit_bones.get('RightFoot')
    rtoes = arm.data.edit_bones.get('RightToeBase')

    if rfeet and rtoes:
      rfeet.tail = rtoes.head

    bpy.ops.object.mode_set(mode='OBJECT')

    # Summary
    j_sec = sum(1 for b in arm.data.bones if b.name.startswith('J_Sec_'))
    print(f"\nTotal bones: {len(arm.data.bones)}")
    print(f"J_Sec_ bones preserved: {j_sec} (available for Dynamic Bones)")
    print(f"Hierarchy root: {[b.name for b in arm.data.bones if not b.parent]}")