# MPFB with TalkingHead

> [!IMPORTANT]
> This document is currently a work in progress. The referenced poses
have not yet been published. At this stage, the document should be
seen as a high-level description/plan of a workflow that is still
subject to refinement.

### Installation

[Blender](https://www.blender.org/) is free and open-source 3D software, and
[MPFB](https://static.makehumancommunity.org/mpfb.html) is a free and
open-source Blender extension:

- Download and install the latest version of [Blender](https://www.blender.org/)
- Start Blender
- Select `Edit` | `Preferences` | `Get extensions`, and allow online access
(if you have not already done so)
- Search for the "MPFB" extension and click `Install`.

If you now return to Blender's "Layout" view and enable `View` | `Sidebar`,
you should see a new tab labeled "MPFB v2.0" (or similar).

Install MPFB asset packs for skins, clothes, and other 3D assets:

- In Blender, open the "MPFB" tab | `System and resources` | `Web resources` | `Asset packs`
- Download the "MakeHuman system assets" and all other zipped asset packs
that you want. No need to download them all as you can always add more later.
- Install each pack to MPFB: `Apply assets` | `Library Settings` | `Load pack from zip file`

Install the TalkingHead add-on and assets:

- Download the TalkingHead add-on [talkinghead-addon.py](https://github.com/met4citizen/TalkingHead/blob/main/blender/MPFB/talkinghead-addon.py),
rig [talkinghead.mpfbskel](https://github.com/met4citizen/TalkingHead/blob/main/blender/MPFB/talkinghead.mpfbskel) <sup>\[1]</sup>,
weights [talkinghead.mpw](https://github.com/met4citizen/TalkingHead/blob/main/blender/MPFB/talkinghead.mpw), and
morph targets [talkinghead-targets.zip](https://github.com/met4citizen/TalkingHead/blob/main/blender/MPFB/talkinghead-targets.zip)
to a local directory.
- Install the TalkingHead add-on via `Edit` | `Preferences` | `Add-ons` | `Install from Disk...`.
Open preferences and set the "Data Directory" to the directory where you saved the downloaded files.
- Workaround to enable refitting with a custom rig: In the MPFB tab, click
`System and resources` | `System data` to open the system data folder.
Navigate to "./rigs/standard" and copy "talkinghead.mpfbskel" to "rig.unknown.json"
and "talkinghead.mhw" to "weights.unknown.json". <sup>\[2]</sup>


### Create A New Avatar

Create a new human model:

- Open the "MPFB" tab and select `New human` | `From scratch`.
- Specify basic options like Gender, Age, Height and other
parameters.
- Click `Create human`.
- Make more detailed adjustments to the base model in
the `Model` section.
- Load the TalkingHead rig: `Developer` | `Load rig` |
"talkinghead.mpfbskel".
- Load the TalkingHead weights : `Developer` | `Load weights` |
"talkinghead.mhw".
- Navigate to `Apply assets` | `Library Settings`. Make sure all
the material types are set to "GameEngine (PBR)" and uncheck
"Material instances".
- Select `Apply assets` and pick body parts (skin, eyes, eyebrows,
eyeslashes, teeth, tongue, hair) and an outfit.

Make changes to your design and fine-tune. If you later return
and modify the base model, click `Model` | `Refit assets to basemesh`.

### Poses and Animations

The TalkingHead rig is designed to be Mixamo-compatible.
You can simply use the Mixamo "Y-Bot" to download poses
and animations. For most use cases, this approach is good
enough.

An alternative approach is to create your own, avatar-specific
animations, poses and gestures:

- Append all TalkingHead templates [talkinghead-templates.zip (TODO)]()
to the current file: `File` | `Append...` | Select asset
file | `Append`. <sup>\[3]</sup>
- Select the avatar and switch to `Layout` | `Pose Mode`.
- Display the set of poses by enabling `View` | `Asset Shelf`.
- For each pose in the list: Select all
bones | `Apply Pose Asset` | Rotate bones | `Adjust Pose Asset`.
- For each pose, select the required bones and copy quaternions
to clipboard: `TalkingHead` | `Operations` | `Copy pose` | Paste
to your code as a part of `head.poseTemplates` or `head.gestureTemplates`.
- OPTIONAL: Create an avatar-specific "doll", export to FBX, upload to Mixamo,
and download animations.


### Export as GLB file

> [!IMPORTANT]
> Export process will break the design state, so always save
your "design" and "export" projects in separate Blender files.

Prepare for export to TalkingHead/GLB/Three.js/WebGL:

- Check that the root object is named "Armature". This is the default
value for the TalkingHead class-level option `modelRoot`.
- Select the base mesh and navigate to `Operations`| `Basemesh`.
Run both `Bake shapekeys` and `Delete helpers`.
- Optional: Select the armature | `TalkingHead` | `Operations` | `Scale character`.
- Select the armature | `TalkingHead` | `Operations` | `Fix bone axes`. <sup>\[4]</sup>
- Select all mesh objects | `TalkingHead` | `Operations` | `Build ARKit and Oculus`. <sup>\[5]</sup>
- Select the base mesh | `TalkingHead` | `Operations` | `Apply modifiers`. <sup>\[6]</sup>
- Select all | `Object` | `Apply` | `All Transforms`.

Update materials for glTF/GLB:

- OPAQUE: For meshes that do NOT require any kind of transparency,
remove alpha map textures from `Material` | `Surface` | `Alpha`
- MASK / Alpha Clip: For meshes that need cutout transparency
go to `Shading` and add a new Math node before the Principled
BSDF Alpha input: `Add` | `Utilities` | `Math` | `Math` | "Greater Than".
Adjust the threshold value until the edges look correct. <sup>\[7]</sup>
- BLEND: For meshes that must have partially transparent surfaces,
leave the material setup as it is.

Export to GLB (settings relative to defaults):

- Navigate to `File`| `Export` | `glTF 2.0`
- Select format "glTF Binary (.glb)"
- Uncheck "Animation"
- `Export`

### Compression (Optional)

Use [glTF-Transform](https://github.com/donmccurdy/glTF-Transform)
to apply compression:

```bash
gltf-transform optimize avatar.glb avatar-compressed.glb \
  --compress meshopt \
  --texture-compress webp
```


### Troubleshooting

Here are few common problems and known issues:

- Avatar is looking down instead of straight ahead:
Adjust the tilt of the "Head" bone in your exported model.
- Eyelashes extend too far when blinking: Either modify
the shape key directly or replace it with a combined mix
that provides an optimal extent.

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

\[2] This is a hack. See [MPFB2 issue](https://github.com/makehumancommunity/mpfb2/issues/305).

\[3] TODO: Find way to import all .asset.blend files at the same time.

\[4] When designing your model, the bone axes/rolls can change. If these
changes are NOT fixed before export, Blender bakes them into GLB matrices
and the final model will have twisted body parts such as twisted toes.

\[5] In future releases, this step will hopefully be supported directly
by MPFB. See [MPFB2 issue](https://github.com/makehumancommunity/mpfb2/issues/302).

\[6] Blender modifiers are Blender-specific and are not part of the glTF/GLB
specification, so they must be applied. However, Blender does not allow
applying most topology-changing modifiers when shape keys exist.

\[7] Mask mode is essentially the same as Eevee's "Alpha Clip" blend mode,
but in Blender 5.0 it must now be done with shader nodes.

