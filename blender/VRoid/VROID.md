# VRoid with TalkingHead

### Installation

[VRoid Studio](https://vroid.com/en/studio) is a free tool for creating anime-style
3D characters, and [Blender](https://www.blender.org/) is free and open-source 3D software.

- Download and install the latest version of [VRoid Studio](https://vroid.com/en/studio) (Windows/macOS/Steam/iPadOS)
- Download and install the latest version of [Blender](https://www.blender.org/) (Windows/macOS/Linux/Steam)
- Open Blender and navigate to `Edit` | `Preferences` | `Add-ons`, and enable online access (if you have not already done so). Search for the "VRM format" extension and click `Install`.
- Download the latest TalkingHead add-on [talkinghead-addon.py](https://github.com/met4citizen/TalkingHead/blob/main/blender/MPFB/talkinghead-addon.py)
to a local directory and install via `Edit` | `Preferences` | `Add-ons` | `Install from Disk...`.

After installation, return to Blender’s Layout view and enable `View` | `Sidebar`.
A new tab labeled "TalkingHead" should appear.

### Conversion Process

- Create your 3D avatar in VRoid Studio and export it as a VRM 1.0 file.
- Open Blender and select `File` | `Import` | `VRM (.vrm)`, then choose the exported VRM file.
- In the Outliner, right-click the "Colliders" collection and select `Delete Hierarchy`. <sup>\[1]</sup>
- Open the "Scripting" workspace and run [rename-vroid-bones.py](https://github.com/met4citizen/TalkingHead/blob/main/blender/VRoid/rename-vroid-bones.py) to rename the bones.
- Run [build-vroid-eyes.py](https://github.com/met4citizen/TalkingHead/blob/main/blender/VRoid/build-vroid-eyes.py) to create eye movement shape keys.
- Run [build-vroid-shapekeys.py](https://github.com/met4citizen/TalkingHead/blob/main/blender/VRoid/build-vroid-shapekeys.py) to generate the rest of the ARKit and Oculus viseme shape keys. <sup>\[2]</sup>
- Select the armature | `TalkingHead` add-on | `Operations` | `Fix bone axes (T-pose)`. <sup>\[3]</sup>
- Optional: Select the armature | `TalkingHead` add-on | `Operations` | `Scale character`.
- For all materials, change "Metallic" value to `0`. <sup>\[4]</sup>
- Select all | `Object` | `Apply` | `All Transforms`.

### Export as GLB

- Go to `File`| `Export` | `glTF 2.0`.
- Select format "glTF Binary (.glb)".
- Uncheck "Animation".
- Click `Export`.

### OPTIONAL: Compression

Use [glTF-Transform](https://github.com/donmccurdy/glTF-Transform)
to compress the file:

```bash
gltf-transform optimize avatar.glb avatar-compressed.glb \
  --compress meshopt \
  --texture-compress webp
```

### Avatar Config

Correct the head posture and eyelids using the TalkingHead avatar
configuration:

```json
baseline: {
  headRotateX: -0.1,
  eyeBlinkLeft: 0.05,
  eyeBlinkRight: 0.05
}
```

If you want to configure dynamic bones, see Appendix E of the README and check out
[an example "VRoid" config](https://github.com/met4citizen/TalkingHead/blob/main/siteconfig.js).


### Credits / Contributions

- Initial content for this guide was contributed by @ejjboon


---

### Footnotes

\[1] *VRoid includes Spring Bone collider objects for physics simulation.
Since TalkingHead does not use them, they can be removed to reduce GLB file size.*

\[2] *TODO: Some ARKit shape keys are not yet implemented.*

\[3] *This operation recalculates bone rolls based on the TalkingHead reference rig.
If skipped, the model may exhibit twisted body parts or clothing.*

\[4] *Some materials and color settings may not export correctly, as Blender's GLB exporter has limited shader node support.*

