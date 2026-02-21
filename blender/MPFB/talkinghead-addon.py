# ------------------------------------------------------------------------------
# The MIT License (MIT)
#
# Copyright (c) 2026 Mika Suominen
#
# Permission is hereby granted, free of charge, to any person obtaining a copy
# of this software and associated documentation files (the "Software"), to deal
# in the Software without restriction, including without limitation the rights
# to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
# copies of the Software, and to permit persons to whom the Software is
# furnished to do so, subject to the following conditions:
#
# The above copyright notice and this permission notice shall be included in
# all copies or substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
# THE SOFTWARE.
# ------------------------------------------------------------------------------
# 
# Function "apply_modifiers" is adapted from project "ApplyModifierForObjectWithShapeKeys"
# (https://github.com/przemir/ApplyModifierForObjectWithShapeKeys)
# Copyright (c) 2015 Przemysław Bągard, licensed under MIT License
#

# ADD-ON INFO
bl_info = {
    "name": "TalkingHead",
    "author": "Mika Suominen",
    "version": (0, 2),
    "blender": (4, 0, 0),
    "location": "View3D > Sidebar > TalkingHead Tab",
    "description": "TalkingHead add-on.",
    "category": "3D View",
}

# IMPORTS
import bpy, sys, os, io, time
from zipfile import ZipFile
from json import dumps
from math import pi
from mathutils import Matrix, Quaternion, Vector
from pathlib import Path

# Function adapted from "ApplyModifierForObjectWithShapeKeys"
# (https://github.com/przemir/ApplyModifierForObjectWithShapeKeys)
def apply_modifiers(context, selectedModifiers, disable_armatures=True):
    
    list_properties = []
    properties = ["interpolation", "mute", "name", "relative_key", "slider_max", "slider_min", "value", "vertex_group"]
    shapesCount = 0
    vertCount = -1
    startTime = time.time()
    
    # Inspect modifiers for hints used in error message if needed.
    contains_mirror_with_merge = False
    for modifier in context.object.modifiers:
        if modifier.name in selectedModifiers:
            if modifier.type == 'MIRROR' and modifier.use_mirror_merge == True:
                contains_mirror_with_merge = True

    # Disable armature modifiers.
    disabled_armature_modifiers = []
    if disable_armatures:
        for modifier in context.object.modifiers:
            if modifier.name not in selectedModifiers and modifier.type == 'ARMATURE' and modifier.show_viewport == True:
                disabled_armature_modifiers.append(modifier)
                modifier.show_viewport = False
    
    # Calculate shape keys count.
    if context.object.data.shape_keys:
        shapesCount = len(context.object.data.shape_keys.key_blocks)
    
    # If there are no shape keys, just apply modifiers.
    if(shapesCount == 0):
        for modifierName in selectedModifiers:
            bpy.ops.object.modifier_apply(modifier=modifierName)
        return (True, None)
    
    # We want to preserve original object, so all shapes will be joined to it.
    originalObject = context.view_layer.objects.active
    bpy.ops.object.select_all(action='DESELECT')
    originalObject.select_set(True)
    
    # Copy object which will holds all shape keys.
    bpy.ops.object.duplicate_move(OBJECT_OT_duplicate={"linked":False, "mode":'TRANSLATION'}, TRANSFORM_OT_translate={"value":(0, 0, 0), "orient_type":'GLOBAL', "orient_matrix":((1, 0, 0), (0, 1, 0), (0, 0, 1)), "orient_matrix_type":'GLOBAL', "constraint_axis":(False, False, False), "mirror":True, "use_proportional_edit":False, "proportional_edit_falloff":'SMOOTH', "proportional_size":1, "use_proportional_connected":False, "use_proportional_projected":False, "snap":False, "snap_target":'CLOSEST', "snap_point":(0, 0, 0), "snap_align":False, "snap_normal":(0, 0, 0), "gpencil_strokes":False, "cursor_transform":False, "texture_space":False, "remove_on_cancel":False, "release_confirm":False, "use_accurate":False})
    copyObject = context.view_layer.objects.active
    copyObject.select_set(False)
    
    # Return selection to originalObject.
    context.view_layer.objects.active = originalObject
    originalObject.select_set(True)
    
    # Save key shape properties
    for i in range(0, shapesCount):
        key_b = originalObject.data.shape_keys.key_blocks[i]
        print (originalObject.data.shape_keys.key_blocks[i].name, key_b.name)
        properties_object = {p:None for p in properties}
        properties_object["name"] = key_b.name
        properties_object["mute"] = key_b.mute
        properties_object["interpolation"] = key_b.interpolation
        properties_object["relative_key"] = key_b.relative_key.name
        properties_object["slider_max"] = key_b.slider_max
        properties_object["slider_min"] = key_b.slider_min
        properties_object["value"] = key_b.value
        properties_object["vertex_group"] = key_b.vertex_group
        list_properties.append(properties_object)

    # Handle base shape in "originalObject"
    print("applyModifierForObjectWithShapeKeys: Applying base shape key")
    bpy.ops.object.shape_key_remove(all=True)
    for modifierName in selectedModifiers:
        bpy.ops.object.modifier_apply(modifier=modifierName)
    vertCount = len(originalObject.data.vertices)
    bpy.ops.object.shape_key_add(from_mix=False)
    originalObject.select_set(False)
    
    # Handle other shape-keys: copy object, get right shape-key, apply modifiers and merge with originalObject.
    # We handle one object at time here.
    for i in range(1, shapesCount):
        currTime = time.time()
        elapsedTime = currTime - startTime

        print("applyModifierForObjectWithShapeKeys: Applying shape key %d/%d ('%s', %0.2f seconds since start)" % (i+1, shapesCount, list_properties[i]["name"], elapsedTime))
        context.view_layer.objects.active = copyObject
        copyObject.select_set(True)
        
        # Copy temp object.
        bpy.ops.object.duplicate_move(OBJECT_OT_duplicate={"linked":False, "mode":'TRANSLATION'}, TRANSFORM_OT_translate={"value":(0, 0, 0), "orient_type":'GLOBAL', "orient_matrix":((1, 0, 0), (0, 1, 0), (0, 0, 1)), "orient_matrix_type":'GLOBAL', "constraint_axis":(False, False, False), "mirror":True, "use_proportional_edit":False, "proportional_edit_falloff":'SMOOTH', "proportional_size":1, "use_proportional_connected":False, "use_proportional_projected":False, "snap":False, "snap_target":'CLOSEST', "snap_point":(0, 0, 0), "snap_align":False, "snap_normal":(0, 0, 0), "gpencil_strokes":False, "cursor_transform":False, "texture_space":False, "remove_on_cancel":False, "release_confirm":False, "use_accurate":False})
        tmpObject = context.view_layer.objects.active
        bpy.ops.object.shape_key_remove(all=True)
        copyObject.select_set(True)
        copyObject.active_shape_key_index = i
        
        # Get right shape-key.
        bpy.ops.object.shape_key_transfer()
        context.object.active_shape_key_index = 0
        bpy.ops.object.shape_key_remove()
        bpy.ops.object.shape_key_remove(all=True)
        
        # Time to apply modifiers.
        for modifierName in selectedModifiers:
            bpy.ops.object.modifier_apply(modifier=modifierName)
        
        # Verify number of vertices.
        if vertCount != len(tmpObject.data.vertices):
        
            errorInfoHint = ""
            if contains_mirror_with_merge == True:
                errorInfoHint = "There is mirror modifier with 'Merge' property enabled. This may cause a problem."
            if errorInfoHint:
                errorInfoHint = "\n\nHint: " + errorInfoHint
            errorInfo = ("Shape keys ended up with different number of vertices!\n"
                         "All shape keys needs to have the same number of vertices after modifier is applied.\n"
                         "Otherwise joining such shape keys will fail!%s" % errorInfoHint)
            return (False, errorInfo)
    
        # Join with originalObject
        copyObject.select_set(False)
        context.view_layer.objects.active = originalObject
        originalObject.select_set(True)
        bpy.ops.object.join_shapes()
        originalObject.select_set(False)
        context.view_layer.objects.active = tmpObject
        
        # Remove tmpObject
        tmpMesh = tmpObject.data
        bpy.ops.object.delete(use_global=False)
        bpy.data.meshes.remove(tmpMesh)
    
    # Restore shape key properties like name, mute etc.
    context.view_layer.objects.active = originalObject
    for i in range(0, shapesCount):
        key_b = context.view_layer.objects.active.data.shape_keys.key_blocks[i]
        # name needs to be restored before relative_key
        key_b.name = list_properties[i]["name"]
        
    for i in range(0, shapesCount):
        key_b = context.view_layer.objects.active.data.shape_keys.key_blocks[i]
        key_b.interpolation = list_properties[i]["interpolation"]
        key_b.mute = list_properties[i]["mute"]
        key_b.slider_max = list_properties[i]["slider_max"]
        key_b.slider_min = list_properties[i]["slider_min"]
        key_b.value = list_properties[i]["value"]
        key_b.vertex_group = list_properties[i]["vertex_group"]
        rel_key = list_properties[i]["relative_key"]
    
        for j in range(0, shapesCount):
            key_brel = context.view_layer.objects.active.data.shape_keys.key_blocks[j]
            if rel_key == key_brel.name:
                key_b.relative_key = key_brel
                break
    
    # Remove copyObject.
    originalObject.select_set(False)
    context.view_layer.objects.active = copyObject
    copyObject.select_set(True)
    tmpMesh = copyObject.data
    bpy.ops.object.delete(use_global=False)
    bpy.data.meshes.remove(tmpMesh)
    
    # Select originalObject.
    context.view_layer.objects.active = originalObject
    context.view_layer.objects.active.select_set(True)
    
    if disable_armatures:
        for modifier in disabled_armature_modifiers:
            modifier.show_viewport = True
    
    return (True, None)

# Find modifier names
def find_modifier_names(obj, keywords):
    if obj.type != 'MESH':
        return []
    keywords_lower = [k.lower() for k in keywords]
    return [mod.name for mod in obj.modifiers
            if any(kw in mod.name.lower() for kw in keywords_lower)]

# Get target file dictionary
def get_target_dict(file):
    target_dict = {}
    for line in file:
        line = str(line.strip())
        if line.startswith("#") or line.startswith("\""):
            continue
        parts = line.split()
        key = int(parts[0])
        values = (
            float(parts[1]),
            -float(parts[3]),
            float(parts[2])
        )
        target_dict[key] = values
    return target_dict

# Bake target
def bake_target(mpfb, name, dict, mesh, limit_size = 1e-3):

    # MPFB services and entities
    ObjectService = mpfb.services.objectservice.ObjectService
    TargetService = mpfb.services.targetservice.TargetService
    ClothesService = mpfb.services.clothesservice.ClothesService
    Mhclo = mpfb.entities.clothes.mhclo.Mhclo
    
    # Determine scale
    scale = 1.0
    is_basemesh = ObjectService.object_is_basemesh(mesh)
    is_proxy = ObjectService.object_is_body_proxy(mesh)
    if ( not is_basemesh and not is_proxy ):
        scale = 0.1

    # Calculate info based on object type
    info = {
        "name": name,
        "vertices": []
    }
    if is_basemesh:
        for vertex in dict:
            dx, dy, dz = dict[vertex]
            size = abs(dx) + abs(dy) + abs(dz)
            if size > limit_size:
                info["vertices"].append((vertex, dx, dy, dz))
    else:
        # Read mhclo file
        mhclo = None
        clothes_path = ClothesService.find_clothes_absolute_path(mesh)
        if clothes_path:
            mhclo = Mhclo()
            mhclo.load(clothes_path)
        else:
            print("No Mhclo file for mesh: " + mesh.name)
            return

        # Calculate info
        for index in mhclo.verts:
            v = mhclo.verts[index]
            v1, v2, v3 = v["verts"]
            w1, w2, w3 = v["weights"]
            t1 = dict.get(v1, (0.0, 0.0, 0.0))
            t2 = dict.get(v2, (0.0, 0.0, 0.0))
            t3 = dict.get(v3, (0.0, 0.0, 0.0))
            dx = (w1 * t1[0] + w2 * t2[0] + w3 * t3[0]) * scale
            dy = (w1 * t1[1] + w2 * t2[1] + w3 * t3[1]) * scale
            dz = (w1 * t1[2] + w2 * t2[2] + w3 * t3[2]) * scale
            size = abs(dx) + abs(dy) + abs(dz)
            if size > limit_size:
                info["vertices"].append((index, dx, dy, dz))

    # Create/update shape key
    if info["vertices"]:
        shape_key = None
        if TargetService.has_target(mesh, name):
            shape_key = mesh.data.shape_keys.key_blocks[name]
        else:
            shape_key = TargetService.create_shape_key(mesh, name)
        TargetService._set_shape_key_coords_from_dict(mesh, shape_key, info)
        shape_key.value = 0


# Build targets
def build_targets(mpfb, meshes, zip_path):
    with ZipFile(zip_path, "r") as zf:
        for name in zf.namelist():
            if name.startswith("__MACOSX/"):
                continue
            if name.lower().endswith(".target"):
                target_name = os.path.splitext(os.path.basename(name))[0]
                with zf.open(name) as raw:
                    with io.TextIOWrapper(raw, encoding="utf-8") as target_file:
                        target_dict = get_target_dict(target_file)
                        for mesh in meshes:
                            bake_target(mpfb, target_name, target_dict, mesh)

# Copy pose
def copy_pose(bones, only_selected = True, decimal_places = 4, skip = ["Buttock", "Breast", "Eye", "Jaw", "Orbicularis", "_End", "4"]):
    output = {}

    # Hips position
    hips = next( (bone for bone in bones if bone.name == "Hips"), None )
    if hips:
        parent_matrix = hips.parent.matrix if hips.parent else Matrix.Identity(4)
        local_matrix = parent_matrix.inverted() @ hips.matrix
        pos = local_matrix.to_translation()
        output["Hips.position"] = {
            "x": round(pos.x, decimal_places),
            "y": round(pos.z, decimal_places),
            "z": round(pos.y, decimal_places)
        }

    # Bone quaternions
    ROOT_FIX = Quaternion((1, 0, 0), -pi / 2)  # -90° X
    for bone in bones:
        # Only selected bones
        if only_selected and not bone.select:
            continue

        # Skip certain bones
        if any(k in bone.name for k in skip):
            continue

        parent_matrix = bone.parent.matrix if bone.parent else Matrix.Identity(4)
        local_matrix = parent_matrix.inverted() @ bone.matrix
        q = local_matrix.to_quaternion()

        # Apply fix ONLY to Hips
        if bone.name == "Hips":
            q = ROOT_FIX @ q

        output[f"{bone.name}.quaternion"] = {
            "x": round(q.x, decimal_places),
            "y": round(q.y, decimal_places),
            "z": round(q.z, decimal_places),
            "w": round(q.w, decimal_places)
        }

    # Copy to clipboard
    bpy.context.window_manager.clipboard = dumps(output)


# Fix bone axes
def scale_character(selected_objects, bone_name = "Hips", target_z = 1.0 ):
    if not selected_objects:
        return
    arm = selected_objects[0]
    if arm.type != 'ARMATURE':
        return

    # Get pose bone
    pose_bone = arm.pose.bones.get(bone_name)
    if not pose_bone:
        raise RuntimeError(f'Bone "{bone_name}" not found')

    # World-space Z of the bone head
    bone_head_world = arm.matrix_world @ pose_bone.head
    current_z = bone_head_world.z

    if abs(current_z) < 1e-6:
        raise RuntimeError("Invalid Hips Z height")

    scale_factor = target_z / current_z

    # Scale ONLY the armature
    arm.scale *= scale_factor

    bpy.context.view_layer.update()

    # Apply transforms
    bpy.ops.object.select_all(action='DESELECT')
    arm.select_set(True)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.transform_apply(scale=True)

    print(f"Scaled character by {scale_factor:.6f}")

# Bone axis data from brunette.glb reference model
BONE_AXES_DATA_A = {
    "Hips": [-5.2e-05, -0.998203, 0.059929], "Spine": [0.0, -0.996171, 0.087425],
    "Spine1": [0.0, -0.987185, 0.159581], "Spine2": [0.0, -0.999456, 0.032991],
    "Neck": [0.0, -0.969599, -0.244701], "Head": [0.0, -0.990155, -0.139976],
    "HeadTop_End": [0.0, -0.999963, 0.008631], "LeftEye": [0.0, -1.0, -1e-06],
    "RightEye": [0.0, -1.0, -1e-06], "LeftShoulder": [-0.151138, -0.082852, -0.985034],
    "LeftArm": [-0.815869, -0.021867, -0.577823], "LeftForeArm": [-0.834663, -0.033902, -0.549716],
    "LeftHand": [-0.871253, -0.240784, -0.427717], "LeftHandThumb1": [-0.979576, 0.01469, -0.200537],
    "LeftHandThumb2": [-0.990165, 0.050792, -0.130362], "LeftHandThumb3": [-0.990548, 0.133887, -0.029803],
    "LeftHandThumb4": [-0.982724, 0.143109, -0.117362], "LeftHandIndex1": [-0.952265, -0.172639, -0.251768],
    "LeftHandIndex2": [-0.997518, 0.069974, 0.00784], "LeftHandIndex3": [-0.952339, 0.112914, 0.283375],
    "LeftHandIndex4": [-0.981243, 0.138231, 0.134369], "LeftHandMiddle1": [-0.95345, -0.167392, -0.250825],
    "LeftHandMiddle2": [-0.999991, -0.003639, 0.002207], "LeftHandMiddle3": [-0.957252, 0.115679, 0.265117],
    "LeftHandMiddle4": [-0.990951, 0.050408, 0.124401], "LeftHandRing1": [-0.973135, -0.11216, -0.201068],
    "LeftHandRing2": [-0.992599, 0.026764, 0.118453], "LeftHandRing3": [-0.982528, 0.021169, 0.184907],
    "LeftHandRing4": [-0.988071, 0.017294, 0.153022], "LeftHandPinky1": [-0.991241, -0.110026, -0.073046],
    "LeftHandPinky2": [-0.995879, -0.021261, 0.088166], "LeftHandPinky3": [-0.95455, -0.050898, 0.293674],
    "LeftHandPinky4": [-0.977236, -0.023028, 0.210903], "RightShoulder": [0.151135, -0.082851, -0.985035],
    "RightArm": [0.815869, -0.021866, -0.577823], "RightForeArm": [0.834662, -0.033902, -0.549718],
    "RightHand": [0.871253, -0.240786, -0.427716], "RightHandThumb1": [0.979575, 0.01469, -0.200541],
    "RightHandThumb2": [0.990162, 0.050799, -0.130378], "RightHandThumb3": [0.990548, 0.133889, -0.029803],
    "RightHandThumb4": [0.982726, 0.143103, -0.11735], "RightHandIndex1": [0.952265, -0.172638, -0.25177],
    "RightHandIndex2": [0.997517, 0.069984, 0.007823], "RightHandIndex3": [0.952336, 0.112908, 0.283387],
    "RightHandIndex4": [0.981243, 0.138224, 0.134377], "RightHandMiddle1": [0.95345, -0.167392, -0.250825],
    "RightHandMiddle2": [0.999991, -0.003634, 0.002195], "RightHandMiddle3": [0.957253, 0.115682, 0.265111],
    "RightHandMiddle4": [0.990952, 0.050412, 0.124391], "RightHandRing1": [0.973135, -0.112159, -0.20107],
    "RightHandRing2": [0.992599, 0.026759, 0.118457], "RightHandRing3": [0.982531, 0.02118, 0.184889],
    "RightHandRing4": [0.98807, 0.017285, 0.153033], "RightHandPinky1": [0.991241, -0.110026, -0.07305],
    "RightHandPinky2": [0.99588, -0.021254, 0.088156], "RightHandPinky3": [0.954545, -0.050908, 0.293686],
    "RightHandPinky4": [0.977238, -0.023023, 0.210895], "LeftUpLeg": [-7.5e-05, -0.998602, -0.052867],
    "LeftLeg": [0.004224, -0.991791, -0.127801], "LeftFoot": [0.001783, -0.615151, 0.788407],
    "LeftToeBase": [0.003772, 0.011869, 0.999922], "LeftToe_End": [-0.999999, 0.000551, -0.001637],
    "RightUpLeg": [8.2e-05, -0.998602, -0.052868], "RightLeg": [-0.004216, -0.99179, -0.127804],
    "RightFoot": [-0.001774, -0.615152, 0.788406], "RightToeBase": [-0.003964, 0.011892, 0.999921],
    "RightToe_End": [0.999998, 0.000574, -0.001683]
}

BONE_AXES_DATA_T = {
    "Head": [3.81044e-07, -0.990155, -0.139976], "HeadTop_End": [2.93097e-07, -0.999963, 0.00863087],
    "Hips": [-5.23035e-05, -0.998203, 0.0599285], "LeftArm": [0.00021426, 0.022599, -0.999745],
    "LeftEye": [3.09573e-07, -1, -4.76837e-07], "LeftFoot": [0.0541387, -0.600338, 0.797912],
    "LeftForeArm": [-0.0341937, 0.0119785, -0.999343], "LeftHand": [0.0907265, -0.16043, -0.982869],
    "LeftHandIndex1": [-0.0292601, -0.187298, -0.981867], "LeftHandIndex2": [-0.0339214, -0.121124, -0.992058],
    "LeftHandIndex3": [-0.0334821, -0.213779, -0.976308], "LeftHandIndex4": [0.091196, -0.124351, -0.988039],
    "LeftHandMiddle1": [-0.0301688, -0.174304, -0.98423], "LeftHandMiddle2": [-0.033935, -0.128504, -0.991128],
    "LeftHandMiddle3": [-0.0339587, -0.142883, -0.989157], "LeftHandMiddle4": [0.124358, -0.132995, -0.983284],
    "LeftHandPinky1": [-0.029454, -0.149489, -0.988325], "LeftHandPinky2": [-0.0339946, -0.0815342, -0.996091],
    "LeftHandPinky3": [-0.0338747, -0.15072, -0.987996], "LeftHandPinky4": [0.045214, -0.107585, -0.993167],
    "LeftHandRing1": [-0.0294886, -0.135611, -0.990323], "LeftHandRing2": [-0.034015, -0.0966198, -0.99474],
    "LeftHandRing3": [-0.0340394, -0.122593, -0.991873], "LeftHandRing4": [-0.00197432, -0.116866, -0.993146],
    "LeftHandThumb1": [-0.454559, 0.115889, -0.883145], "LeftHandThumb2": [-0.47989, 0.0847829, -0.873222],
    "LeftHandThumb3": [-0.477725, 0.0894662, -0.873942], "LeftHandThumb4": [-0.39936, 0.107931, -0.910419],
    "LeftLeg": [-0.0025901, -0.997624, -0.0688498], "LeftShoulder": [0.0955264, -0.0356792, -0.994787],
    "LeftToeBase": [0.0485404, 0.0274734, 0.998443], "LeftToe_End": [-0.999978, 0.00660707, 0.000249416],
    "LeftUpLeg": [-0.00191275, -0.999998, 0.000967459], "Neck": [2.55582e-07, -0.969599, -0.244701],
    "RightArm": [-0.000215599, 0.0225984, -0.999745], "RightEye": [3.09573e-07, -1, -4.76837e-07],
    "RightFoot": [-0.0541308, -0.600241, 0.797985], "RightForeArm": [0.0341911, 0.0119773, -0.999344],
    "RightHand": [-0.0907132, -0.160435, -0.982869], "RightHandIndex1": [0.0292433, -0.187301, -0.981867],
    "RightHandIndex2": [0.0339327, -0.121103, -0.99206], "RightHandIndex3": [0.0334897, -0.213786, -0.976306],
    "RightHandIndex4": [-0.0911881, -0.124356, -0.988039], "RightHandMiddle1": [0.0301564, -0.174307, -0.984229],
    "RightHandMiddle2": [0.0338937, -0.128498, -0.99113], "RightHandMiddle3": [0.0339647, -0.142883, -0.989157],
    "RightHandMiddle4": [-0.124356, -0.132992, -0.983285], "RightHandPinky1": [0.0294101, -0.149479, -0.988327],
    "RightHandPinky2": [0.0339885, -0.0815093, -0.996093], "RightHandPinky3": [0.0339319, -0.150714, -0.987995],
    "RightHandPinky4": [-0.045171, -0.107558, -0.993172], "RightHandRing1": [0.0294796, -0.135614, -0.990323],
    "RightHandRing2": [0.034038, -0.0966193, -0.994739], "RightHandRing3": [0.0340057, -0.12257, -0.991877],
    "RightHandRing4": [0.00196401, -0.11687, -0.993145], "RightHandThumb1": [0.454551, 0.115871, -0.883152],
    "RightHandThumb2": [0.479888, 0.0847768, -0.873224], "RightHandThumb3": [0.477711, 0.0894437, -0.873952],
    "RightHandThumb4": [0.399355, 0.1079, -0.910425], "RightLeg": [0.00260206, -0.997627, -0.0687953],
    "RightShoulder": [-0.0955169, -0.0356809, -0.994788], "RightToeBase": [-0.0487178, 0.0275893, 0.998431],
    "RightToe_End": [0.99906, 0.00601406, 0.0429352], "RightUpLeg": [0.00192306, -0.999998, 0.00102428],
    "Spine": [3.02932e-07, -0.996171, 0.0874251], "Spine1": [4.99894e-07, -0.987185, 0.159582],
    "Spine2": [2.4899e-07, -0.999456, 0.0329908],
}

# Fix bone axes
def fix_bone_axes(selected_objects, reference_data = BONE_AXES_DATA_A):
    if not selected_objects:
        return
    arm = selected_objects[0]
    if arm.type != 'ARMATURE':
        return
    bpy.context.view_layer.objects.active = arm

    # Save previous mode and enter EDIT mode
    prev_mode = arm.mode
    bpy.ops.object.mode_set(mode='EDIT')
    edit_bones = arm.data.edit_bones

    EPSILON = 1e-6

    applied = 0
    skipped = 0

    for name, ref_z in reference_data.items():
        if name not in edit_bones:
            skipped += 1
            continue

        bone = edit_bones[name]

        # Align bone roll so Z points along projected reference
        bone.align_roll(ref_z)
        applied += 1

    # Restore previous mode
    bpy.ops.object.mode_set(mode=prev_mode)

    print(f"Applied: {applied}, skipped: {skipped}")

# Operator: Build ARKit and Oculus
class OPERATIONS_OT_build_targets(bpy.types.Operator):
    bl_idname = "talkinghead.build_targets"
    bl_label = "Build ARKit and Oculus"
    bl_description = "Builds ARKit and Oculus shapekeys to selected objects."
    @classmethod
    def poll(cls, context):
        # Ensure there is at least one selected mesh object
        selected_meshes = [obj for obj in context.selected_objects if obj.type == 'MESH']
        return bool(selected_meshes)
    def execute(self, context):
        mpfb = None
        for name, mod in sys.modules.items():
            if "mpfb" in name.lower() and hasattr(mod, "services"):
                mpfb = mod
                break
        if mpfb is None:
            self.report({"ERROR"}, "MPFB module not found.")
            return {"CANCELLED"}
        selected_meshes = [obj for obj in context.selected_objects if obj.type == 'MESH']
        if not selected_meshes:
            self.report({"ERROR"}, "Select at least one mesh object")
            return {"CANCELLED"}
        data_dir = get_data_dir()
        if data_dir is None:
            self.report({"ERROR"}, "Data directory not set")
            return {"CANCELLED"}
        zip_path = data_dir / "talkinghead-targets.zip"
        print(zip_path)
        if not zip_path.exists() or not zip_path.is_file():
            self.report({"ERROR"}, "The file 'talkinghead-targets.zip' not found")
            return {"CANCELLED"}
        self.report({"INFO"}, "Started building targets...")
        build_targets(mpfb, selected_meshes, zip_path)
        self.report({"INFO"}, "Targets built for all selected objects")
        return {"FINISHED"}

# Operator: Apply modifiers
class OPERATIONS_OT_apply_modifiers(bpy.types.Operator):
    bl_idname = "talkinghead.apply_modifiers"
    bl_label = "Apply modifiers"
    bl_description = "Apply modifiers with shape keys to selected object."
    @classmethod
    def poll(cls, context):
        selected = context.selected_objects
        return len(selected) == 1 and selected[0].type == 'MESH'
    def execute(self, context):
        selected = context.selected_objects
        if len(selected) != 1 or selected[0].type != 'MESH':
            self.report({"ERROR"}, "Select only one mesh object")
            return {"CANCELLED"}
        modifiers = find_modifier_names(selected[0], ["delete", "hide helpers"])
        if not modifiers:
            self.report({"ERROR"}, "The mesh has no 'delete' or 'hide helpers' modifiers")
            return {"CANCELLED"}
        self.report({"INFO"}, "Started applying modifiers...")
        apply_modifiers(context, modifiers)
        self.report({"INFO"}, "Modifiers applied for all selected objects")
        return {"FINISHED"}

# Operator: Scale character
class OPERATIONS_OT_scale_character(bpy.types.Operator):
    bl_idname = "talkinghead.scale_character"
    bl_label = "Scale character"
    bl_description = "Scale the selected armature and linked meshes to correct Hips height."
    @classmethod
    def poll(cls, context):
        selected = context.selected_objects
        return len(selected) == 1 and selected[0].type == 'ARMATURE'
    def execute(self, context):
        selected = context.selected_objects
        if len(selected) != 1 or selected[0].type != 'ARMATURE':
            self.report({"ERROR"}, "Select only one armature object")
            return {"CANCELLED"}
        scale_character(selected)
        self.report({"INFO"}, "Character scaled.")
        return {"FINISHED"}

# Operator: Fix bone axes
class OPERATIONS_OT_fix_bone_axes_a(bpy.types.Operator):
    bl_idname = "talkinghead.fix_bone_axes_a"
    bl_label = "Fix bone axes (A-pose)"
    bl_description = "Fix the bone axes of the selected armature (A-pose)."
    @classmethod
    def poll(cls, context):
        selected = context.selected_objects
        return len(selected) == 1 and selected[0].type == 'ARMATURE'
    def execute(self, context):
        selected = context.selected_objects
        if len(selected) != 1 or selected[0].type != 'ARMATURE':
            self.report({"ERROR"}, "Select only one armature object")
            return {"CANCELLED"}
        fix_bone_axes(selected, BONE_AXES_DATA_A)
        self.report({"INFO"}, "Bone axes fixed.")
        return {"FINISHED"}

class OPERATIONS_OT_fix_bone_axes_t(bpy.types.Operator):
    bl_idname = "talkinghead.fix_bone_axes_t"
    bl_label = "Fix bone axes (T-pose)"
    bl_description = "Fix the bone axes of the selected armature (T-pose)."
    @classmethod
    def poll(cls, context):
        selected = context.selected_objects
        return len(selected) == 1 and selected[0].type == 'ARMATURE'
    def execute(self, context):
        selected = context.selected_objects
        if len(selected) != 1 or selected[0].type != 'ARMATURE':
            self.report({"ERROR"}, "Select only one armature object")
            return {"CANCELLED"}
        fix_bone_axes(selected, BONE_AXES_DATA_T)
        self.report({"INFO"}, "Bone axes fixed.")
        return {"FINISHED"}

# Operator: Apply modifiers
class OPERATIONS_OT_copy_pose(bpy.types.Operator):
    bl_idname = "talkinghead.copy_pose"
    bl_label = "Copy pose"
    bl_description = "Copy the selected bones of the pose to clipboard."
    @classmethod
    def poll(cls, context):
        obj = context.active_object
        if obj is None or obj.type != 'ARMATURE' or context.mode != 'POSE':
            return False
        return bool(context.selected_pose_bones)
    def execute(self, context):
        selected = context.selected_pose_bones
        copy_pose(selected)
        self.report({"INFO"}, "Output copied to clipboard")
        return {"FINISHED"}

# Panel: where the button appears
class OPERATIONS_PT_panel(bpy.types.Panel):
    bl_label = "Operations"
    bl_idname = "OPERATIONS_PT_panel"
    bl_space_type = "VIEW_3D"
    bl_region_type = "UI"
    bl_category = "TalkingHead"
    def draw(self, context):
        layout = self.layout
        layout.operator("talkinghead.scale_character")
        layout.operator("talkinghead.fix_bone_axes_a")
        layout.operator("talkinghead.fix_bone_axes_t")
        layout.operator("talkinghead.build_targets")
        layout.operator("talkinghead.apply_modifiers")
        layout.operator("talkinghead.copy_pose")

def get_addon_dir():
    return Path(__file__).parent

def get_data_dir():
    prefs = bpy.context.preferences.addons[__name__].preferences
    if prefs.data_path:
        path = Path(prefs.data_path)
        if path.exists() and path.is_dir():
            return path
    return get_addon_dir()

# Preferences
class TALKINGHEAD_Preferences(bpy.types.AddonPreferences):
    bl_idname = __name__
    data_path: bpy.props.StringProperty(
        name="Data Directory",
        description="Directory containing data files",
        subtype='DIR_PATH',
    )
    def draw(self, context):
        layout = self.layout
        layout.prop(self, "data_path")

# Classes
classes = (
    TALKINGHEAD_Preferences,
    OPERATIONS_OT_scale_character,
    OPERATIONS_OT_fix_bone_axes_a,
    OPERATIONS_OT_fix_bone_axes_t,
    OPERATIONS_OT_copy_pose,
    OPERATIONS_OT_build_targets,
    OPERATIONS_OT_apply_modifiers,
    OPERATIONS_PT_panel
)

# Register/unregister
def register():
    for cls in classes:
        bpy.utils.register_class(cls)

def unregister():
    for cls in reversed(classes):
        bpy.utils.unregister_class(cls)

if __name__ == "__main__":
    register()