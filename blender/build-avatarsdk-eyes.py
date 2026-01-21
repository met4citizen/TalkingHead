import bpy
import math

# CONFIGURATION
ARMATURE_NAME = "Armature"
LEFT = {
    "mesh": "AvatarLeftEyeball",
    "bone": "LeftEye",
    "side": "Left",
    "rotations": {
        "Up":   -20,
        "Down":  30,
        "In":   -25,
        "Out":   25,
    }
}
RIGHT = {
    "mesh": "AvatarRightEyeball",
    "bone": "RightEye",
    "side": "Right",
    "rotations": {
        "Up":   -20,
        "Down":  30,
        "In":    25,   # flipped
        "Out":  -25,   # flipped
    }
}
UP_DOWN_AXIS = "X"
IN_OUT_AXIS = "Y"
OVERRIDE_EXISTING = True   # Set False if you want to keep existing keys

# UTILITIES
def ensure_basis(mesh):
    if not mesh.data.shape_keys:
        mesh.shape_key_add(name="Basis", from_mix=False)
        return
    keys = mesh.data.shape_keys.key_blocks
    if "Basis" not in keys:
        mesh.shape_key_add(name="Basis", from_mix=False)


def remove_shape_key(mesh, name):
    keys = mesh.data.shape_keys
    if not keys:
        return
    kb = keys.key_blocks.get(name)
    if kb:
        mesh.shape_key_remove(kb)


def reset_pose(arm):
    for pbone in arm.pose.bones:
        pbone.location = (0.0, 0.0, 0.0)
        pbone.rotation_mode = 'XYZ'
        pbone.rotation_euler = (0.0, 0.0, 0.0)
        pbone.scale = (1.0, 1.0, 1.0)


def set_bone_rotation(pbone, axis, degrees):
    radians = math.radians(degrees)
    pbone.rotation_mode = 'XYZ'
    pbone.rotation_euler = (0.0, 0.0, 0.0)

    if axis == "X":
        pbone.rotation_euler.x = radians
    elif axis == "Y":
        pbone.rotation_euler.y = radians
    elif axis == "Z":
        pbone.rotation_euler.z = radians


def save_armature_as_shape_key(mesh, shape_name):
    bpy.context.view_layer.objects.active = mesh
    bpy.ops.object.mode_set(mode='OBJECT')

    for mod in mesh.modifiers:
        if mod.type == 'ARMATURE' and mod.show_viewport:
            bpy.ops.object.modifier_apply_as_shapekey(
                modifier=mod.name,
                keep_modifier=True
            )
            mesh.data.shape_keys.key_blocks[-1].name = shape_name
            return

    raise RuntimeError(f"No active Armature modifier on {mesh.name}")


# MAIN BAKE FUNCTION
def bake_eye(config):
    arm = bpy.data.objects[ARMATURE_NAME]
    mesh = bpy.data.objects[config["mesh"]]
    pbone = arm.pose.bones[config["bone"]]

    # Ensure Basis exists
    ensure_basis(mesh)

    for direction, angle in config["rotations"].items():
        shape_name = f"eyeLook{direction}{config['side']}"

        # Override existing shape key if requested
        if OVERRIDE_EXISTING:
            remove_shape_key(mesh, shape_name)

        # Reset all bones, then pose this eye only
        reset_pose(arm)

        if direction in ("Up", "Down"):
            set_bone_rotation(pbone, UP_DOWN_AXIS, angle)
        else:
            set_bone_rotation(pbone, IN_OUT_AXIS, angle)

        bpy.context.view_layer.update()

        # Bake deformation into a new shape key
        save_armature_as_shape_key(mesh, shape_name)

    # Final cleanup
    reset_pose(arm)


# EXECUTION
bake_eye(LEFT)
bake_eye(RIGHT)