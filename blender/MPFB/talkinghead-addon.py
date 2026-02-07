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
BONE_AXES_DATA = {
    "Hips": { "y": [-0.0, 0.059928, 0.998203], "z": [-5.2e-05, -0.998203, 0.059929] },
    "Spine": { "y": [-0.0, 0.087425, 0.996171], "z": [0.0, -0.996171, 0.087425] },
    "Spine1": { "y": [-0.0, 0.159581, 0.987185], "z": [0.0, -0.987185, 0.159581] },
    "Spine2": { "y": [-0.0, 0.03299, 0.999456], "z": [0.0, -0.999456, 0.032991] },
    "Neck": { "y": [0.0, -0.244701, 0.969599], "z": [0.0, -0.969599, -0.244701] },
    "Head": { "y": [0.0, -0.139976, 0.990155], "z": [0.0, -0.990155, -0.139976] },
    "HeadTop_End": { "y": [-0.0, 0.008631, 0.999963], "z": [0.0, -0.999963, 0.008631] },
    "LeftEye": { "y": [0.0, -1e-06, 1.0], "z": [0.0, -1.0, -1e-06] },
    "RightEye": { "y": [0.0, -1e-06, 1.0], "z": [0.0, -1.0, -1e-06] },
    "LeftShoulder": { "y": [0.972122, 0.168253, -0.163309], "z": [-0.151138, -0.082852, -0.985034] },
    "LeftArm": { "y": [0.576703, 0.04195, -0.815876], "z": [-0.815869, -0.021867, -0.577823] },
    "LeftForeArm": { "y": [0.509918, -0.424761, -0.748039], "z": [-0.834663, -0.033902, -0.549716] },
    "LeftHand": { "y": [0.489256, -0.356176, -0.796095], "z": [-0.871253, -0.240784, -0.427717] },
    "LeftHandThumb1": { "y": [0.064555, -0.921557, -0.382839], "z": [-0.979576, 0.01469, -0.200537] },
    "LeftHandThumb2": { "y": [0.064447, -0.661443, -0.747221], "z": [-0.990165, 0.050792, -0.130362] },
    "LeftHandThumb3": { "y": [-0.048492, -0.545072, -0.836986], "z": [-0.990548, 0.133887, -0.029803] },
    "LeftHandThumb4": { "y": [0.002633, -0.623248, -0.78202], "z": [-0.982724, 0.143109, -0.117362] },
    "LeftHandIndex1": { "y": [0.30526, -0.531037, -0.790453], "z": [-0.952265, -0.172639, -0.251768] },
    "LeftHandIndex2": { "y": [-0.042284, -0.50628, -0.861332], "z": [-0.997518, 0.069974, 0.00784] },
    "LeftHandIndex3": { "y": [-0.304066, -0.42566, -0.852266], "z": [-0.952339, 0.112914, 0.283375] },
    "LeftHandIndex4": { "y": [-0.178324, -0.386053, -0.905077], "z": [-0.981243, 0.138231, 0.134369] },
    "LeftHandMiddle1": { "y": [0.295231, -0.348771, -0.889493], "z": [-0.95345, -0.167392, -0.250825] },
    "LeftHandMiddle2": { "y": [-0.000343, -0.447807, -0.89413], "z": [-0.999991, -0.003639, 0.002207] },
    "LeftHandMiddle3": { "y": [-0.288461, -0.449633, -0.845352], "z": [-0.957252, 0.115679, 0.265117] },
    "LeftHandMiddle4": { "y": [-0.134031, -0.421474, -0.896881], "z": [-0.990951, 0.050408, 0.124401] },
    "LeftHandRing1": { "y": [0.223302, -0.247092, -0.942911], "z": [-0.973135, -0.11216, -0.201068] },
    "LeftHandRing2": { "y": [-0.120658, -0.327826, -0.937002], "z": [-0.992599, 0.026764, 0.118453] },
    "LeftHandRing3": { "y": [-0.183013, -0.290536, -0.939199], "z": [-0.982528, 0.021169, 0.184907] },
    "LeftHandRing4": { "y": [-0.150101, -0.330229, -0.93189], "z": [-0.988071, 0.017294, 0.153022] },
    "LeftHandPinky1": { "y": [0.078708, -0.048026, -0.99574], "z": [-0.991241, -0.110026, -0.073046] },
    "LeftHandPinky2": { "y": [-0.082133, -0.200846, -0.976174], "z": [-0.995879, -0.021261, 0.088166] },
    "LeftHandPinky3": { "y": [-0.280078, -0.183816, -0.942214], "z": [-0.95455, -0.050898, 0.293674] },
    "LeftHandPinky4": { "y": [-0.202097, -0.201437, -0.958426], "z": [-0.977236, -0.023028, 0.210903] },
    "RightShoulder": { "y": [-0.972123, 0.168252, -0.163306], "z": [0.151135, -0.082851, -0.985035] },
    "RightArm": { "y": [-0.576703, 0.041951, -0.815876], "z": [0.815869, -0.021866, -0.577823] },
    "RightForeArm": { "y": [-0.509919, -0.42476, -0.748038], "z": [0.834662, -0.033902, -0.549718] },
    "RightHand": { "y": [-0.489255, -0.356179, -0.796094], "z": [0.871253, -0.240786, -0.427716] },
    "RightHandThumb1": { "y": [-0.064557, -0.921557, -0.382837], "z": [0.979575, 0.01469, -0.200541] },
    "RightHandThumb2": { "y": [-0.064455, -0.66144, -0.747223], "z": [0.990162, 0.050799, -0.130378] },
    "RightHandThumb3": { "y": [0.048491, -0.54506, -0.836994], "z": [0.990548, 0.133889, -0.029803] },
    "RightHandThumb4": { "y": [-0.002626, -0.623248, -0.78202], "z": [0.982726, 0.143103, -0.11735] },
    "RightHandIndex1": { "y": [-0.305261, -0.531036, -0.790453], "z": [0.952265, -0.172638, -0.25177] },
    "RightHandIndex2": { "y": [0.042274, -0.506274, -0.861336], "z": [0.997517, 0.069984, 0.007823] },
    "RightHandIndex3": { "y": [0.304074, -0.425658, -0.852264], "z": [0.952336, 0.112908, 0.283387] },
    "RightHandIndex4": { "y": [0.178329, -0.38606, -0.905073], "z": [0.981243, 0.138224, 0.134377] },
    "RightHandMiddle1": { "y": [-0.295232, -0.34877, -0.889493], "z": [0.95345, -0.167392, -0.250825] },
    "RightHandMiddle2": { "y": [0.000336, -0.447808, -0.89413], "z": [0.999991, -0.003634, 0.002195] },
    "RightHandMiddle3": { "y": [0.288457, -0.449636, -0.845352], "z": [0.957253, 0.115682, 0.265111] },
    "RightHandMiddle4": { "y": [0.134024, -0.421476, -0.896881], "z": [0.990952, 0.050412, 0.124391] },
    "RightHandRing1": { "y": [-0.223304, -0.247091, -0.942911], "z": [0.973135, -0.112159, -0.20107] },
    "RightHandRing2": { "y": [0.12066, -0.327821, -0.937003], "z": [0.992599, 0.026759, 0.118457] },
    "RightHandRing3": { "y": [0.182999, -0.290539, -0.939201], "z": [0.982531, 0.02118, 0.184889] },
    "RightHandRing4": { "y": [0.150108, -0.33024, -0.931885], "z": [0.98807, 0.017285, 0.153033] },
    "RightHandPinky1": { "y": [-0.078712, -0.048025, -0.99574], "z": [0.991241, -0.110026, -0.07305] },
    "RightHandPinky2": { "y": [0.082126, -0.200837, -0.976176], "z": [0.99588, -0.021254, 0.088156] },
    "RightHandPinky3": { "y": [0.280088, -0.183817, -0.942211], "z": [0.954545, -0.050908, 0.293686] },
    "RightHandPinky4": { "y": [0.202089, -0.201439, -0.958427], "z": [0.977238, -0.023023, 0.210895] },
    "LeftUpLeg": { "y": [0.067131, 0.052743, -0.996349], "z": [-7.5e-05, -0.998602, -0.052867] },
    "LeftLeg": { "y": [0.065026, 0.127804, -0.989666], "z": [0.004224, -0.991791, -0.127801] },
    "LeftFoot": { "y": [-0.000364, -0.788409, -0.615151], "z": [0.001783, -0.615151, 0.788407] },
    "LeftToeBase": { "y": [0.056943, -0.99831, 0.011635], "z": [0.003772, 0.011869, 0.999922] },
    "LeftToe_End": { "y": [-0.000552, -1.0, 0.000196], "z": [-0.999999, 0.000551, -0.001637] },
    "RightUpLeg": { "y": [-0.06713, 0.052743, -0.996349], "z": [8.2e-05, -0.998602, -0.052868] },
    "RightLeg": { "y": [-0.065025, 0.127807, -0.989665], "z": [-0.004216, -0.99179, -0.127804] },
    "RightFoot": { "y": [0.000384, -0.788408, -0.615153], "z": [-0.001774, -0.615152, 0.788406] },
    "RightToeBase": { "y": [-0.056966, -0.998308, 0.011647], "z": [-0.003964, 0.011892, 0.999921] },
    "RightToe_End": { "y": [0.000575, -1.0, 0.000206], "z": [0.999998, 0.000574, -0.001683] }
}

# Fix bone axes
def fix_bone_axes(selected_objects):
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

    for name, axes in BONE_AXES_DATA.items():
        if name not in edit_bones:
            skipped += 1
            continue

        bone = edit_bones[name]

        # Compute target Y axis from head -> tail
        tgt_y = (bone.tail - bone.head)
        if tgt_y.length < EPSILON:
            skipped += 1
            continue
        tgt_y.normalize()

        # Reference Z axis from export data
        ref_z = Vector(axes["z"]).normalized()

        # Project reference Z onto plane perpendicular to target Y
        proj = ref_z - ref_z.dot(tgt_y) * tgt_y
        if proj.length < EPSILON:
            skipped += 1
            continue
        proj.normalize()

        # Align bone roll so Z points along projected reference
        bone.align_roll(proj)
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
class OPERATIONS_OT_fix_bone_axes(bpy.types.Operator):
    bl_idname = "talkinghead.fix_bone_axes"
    bl_label = "Fix bone axes"
    bl_description = "Fix the bone axes of the selected armature."
    @classmethod
    def poll(cls, context):
        selected = context.selected_objects
        return len(selected) == 1 and selected[0].type == 'ARMATURE'
    def execute(self, context):
        selected = context.selected_objects
        if len(selected) != 1 or selected[0].type != 'ARMATURE':
            self.report({"ERROR"}, "Select only one armature object")
            return {"CANCELLED"}
        fix_bone_axes(selected)
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
        layout.operator("talkinghead.fix_bone_axes")
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
    OPERATIONS_OT_fix_bone_axes,
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