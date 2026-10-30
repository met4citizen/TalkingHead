# MPFB with TalkingHead

### Installation

Install [Blender](https://www.blender.org/) 3D software and
[MPFB](https://static.makehumancommunity.org/mpfb.html) extension:

- Download the latest version of [Blender](https://www.blender.org/)
- Install and start Blender
- Select `Edit` | `Preferences` | `Get extensions`, and allow online access
(if you have not already done so)
- Search for the "MPFB" extension and click `Install`.

If you now return to Blender's "Layout" view and enable `View` | `Sidebar`,
you should see a new tab labeled "MPFB v2.0.15" (or later).

Install MPFB asset packs for skins, clothes, and other 3D assets:

- In Blender, open the "MPFB" tab | `System and resources` | `Web resources` | `Asset packs`
- Download the "MakeHuman system assets" and all other zipped asset packs
that you want. No need to download them all as you can always add more later.
- IMPORTANT: From "Functional asset packs" section, download "Visemes 02" (Meta/Oculus style visemes)
and "Faceunits 01" (ARKit style face units) asset packs
- Install each pack to MPFB: `Apply assets` | `Library Settings` | `Load pack from zip file`

Install the TalkingHead Blender add-on and assets:

- Download the latest TalkingHead add-on [talkinghead-addon.py](https://github.com/met4citizen/TalkingHead/blob/main/blender/MPFB/talkinghead-addon.py),
rig [talkinghead.mpfbskel](https://github.com/met4citizen/TalkingHead/blob/main/blender/MPFB/talkinghead.mpfbskel),
and weights [talkinghead.mhw](https://github.com/met4citizen/TalkingHead/blob/main/blender/MPFB/talkinghead.mhw)
to a local directory. <sup>\[1]</sup>
- Install the TalkingHead add-on via `Edit` | `Preferences` | `Add-ons` | `Install from Disk...`.
Open preferences and set the "Data Directory" to the directory where you saved the downloaded files.
- Open the "MPFB" tab and create a dummy character `New human` | `From scratch` | `Create human`.
- Load the rig: `Create assets` | `MakeRig` | `Load/Save rig` | `Load rig` | "talkinghead.mpfbskel".
- Load the weights: `Create assets` | `MakeRig` | `Load/Save rig` | `Load weights` | "talkinghead.mhw".
- Save the custom rig and weights to library: `Create assets` | `MakeRig` | `Load/Save rig` | Set library rig name to "talkinghead" and identifying bones to e.g. "LeftToe_End" | `Save rig to library`.
- Now you can delete the dummy character.

Restart the Blender.

---

### Create A New Avatar

- Open the "MPFB" tab and select `New human` | `From scratch`.
- Specify basic options like Gender, Age, Height and other parameters.
- Click `Create human`.
- Make more detailed adjustments to the base model in
the `Model` section.
- Add the TalkingHead rig: `Rigging` | `Add rig` | Custom rig: "Custom: talkinghead" | `Add custom rig`.
- Navigate to `Apply assets` | `Library Settings`. Make sure all
the material types are set to "GameEngine (PBR)" and uncheck
"Material instances".
- Select `Apply assets` and pick body parts (skin, eyes, eyebrows,
eyeslashes, teeth, tongue, hair) and an outfit.

Make changes to your design and fine-tune. If you later return
and modify the base model, click `Model` | `Refit assets to basemesh`.

---

### Poses and Animations (OPTIONAL)

The TalkingHead rig is designed to be Mixamo-compatible.
You can simply use the Mixamo "X-Bot" character to download poses
and animations. For most use cases, this approach gives
a good enough result.

If you want to adjust the built-in poses, you can install
them as Blender assets:

- Download the TalkingHead assets [talkinghead-assets.zip](https://github.com/met4citizen/TalkingHead/blob/main/blender/MPFB/talkinghead-assets.zip),
unzip and install as a new Blender asset library: `Edit` |
`Preferences` | `File Paths` | `Asset Libraries` |  Add the folder.
- Select the avatar and switch to `Layout` | `Pose Mode`.
- Change the rotation mode of all your pose bones:
Select one bone | Select all bones | While holding
down Option/Alt key change the bone rotation mode to "Quaternion".
- Display the set of poses by enabling `View` | `Asset Shelf`.

<img src="../../images/poselibrary.jpg"/>

Now you should be able to apply a pose and adjust it. If you
want to use the adjusted pose in your app, select the required bones
and copy quaternions to clipboard: `TalkingHead` | `Operations` | `Copy pose`.
Paste data to your code as a part of `head.poseTemplates` or `head.gestureTemplates`.

If you want to create character-specific animations, you can
create an avatar-specific "doll", export it to FBX, upload to
Mixamo, and download model-specific FBX animations.

---

### Export as GLB file

Make an export copy:

- Select your design armature and navigate to "MPFB" tab | `Operations` | `Export copy`.
- For Basemesh, select "Bake mask modifiers", "Bake subdiv modifiers",
"Bake modelling shapekeys" and "Delete helpers".
- For visemes and faceunits, select "Load meta-style visemes",
"Load arkit-style visemes", and "Interpolate visemes and faceunits".
- Click `Create export copy`
- Check that the root object of the new export copy is named "Armature".
This is the default value for the TalkingHead class-level option `modelRoot`.
- OPTIONAL: Select the armature | `TalkingHead` | `Operations` | `Scale character`.
- OPTIONAL: Select the armature | `TalkingHead` | `Operations` | `Fix bone axes (A-pose)`. <sup>\[2]</sup>
- Select all | `Object` | `Apply` | `All Transforms`.

Update materials for glTF/GLB:

- OPAQUE: For meshes that do NOT require any kind of transparency,
remove alpha map textures from `Material` | `Surface` | `Alpha`
- MASK / Alpha Clip: For meshes that need cutout transparency
go to `Shading` and add a new Math node before the Principled
BSDF Alpha input: `Add` | `Utilities` | `Math` | `Math` | "Greater Than".
Adjust the threshold value until the edges look correct. <sup>\[3]</sup>
- BLEND: For meshes that must have partially transparent surfaces,
leave the material setup as it is.

Note: By default, the original design and the export copy share
materials data-blocks. If you want a separate material for you export
copy, navigate to the material and click the number of its users to make
a single-user copy.

Export to GLB (settings relative to defaults):

- Select all objects in the export copy and navigate to `File`| `Export` | `glTF 2.0`.
- Select format "glTF Binary (.glb)".
- Check `Include` | Limit to "Selected Objects".
- Uncheck "Animation".
- Click `Export`.

---

### Compression (OPTIONAL)

Use [glTF-Transform](https://github.com/donmccurdy/glTF-Transform)
to apply compression:

```bash
gltf-transform optimize avatar.glb avatar-compressed.glb \
  --compress meshopt \
  --texture-compress webp
```

---

### Troubleshooting

Here are few common problems and known issues:

- Avatar is looking down instead of straight ahead:
Adjust the tilt of the "Head" bone in your export copy.
Remember to apply all transforms.
- Eyelashes extend too far when blinking: Either modify
the shape key directly or replace it with a combined mix
that provides an optimal extent.
- Teeth do not open enough on some visemes:
See [#171](https://github.com/met4citizen/TalkingHead/issues/171).

This document does not (and cannot) cover all details or possible
situations. If you encounter difficulties, please consult the
[Blender manual](https://docs.blender.org/manual/en/latest/) and/or
[MPFB documentation](https://static.makehumancommunity.org/mpfb.html).

---

### Footnotes

\[1] Custom rig was necessary because the standard MPFB rigs (Mixamo with and
without Unity extensions) had bone rolls that were not aligned with
Mixamo's de facto standard. Minor adjustments were also made
to the naming (removed mixamorig prefix), spine, neck alignment,
head tilt, toes, and other places.

\[2] When designing your model, the bone axes/rolls can change. If these
changes are NOT fixed before export, Blender bakes them into GLB matrices
and the final model will have twisted body parts such as twisted toes.

\[3] Mask mode is essentially the same as Eevee's "Alpha Clip" blend mode,
but in Blender 5.0 it must now be done with shader nodes.

