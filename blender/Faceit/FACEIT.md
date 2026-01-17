# Faceit

[Faceit](https://faceit-doc.readthedocs.io/en/latest/) is a paid Blender
add-on that can help you create ARKit and Oculus viseme blend shapes
to your own custom model.

### Installation

- Purchase [Faceit 2.3 (or later)](https://superhivemarket.com/products/faceit) and download the ZIP file
- In Blender, install the zipped add-on by selecting `Edit` | `Preferences` | `Add-ons` | `Install from Disk...`

### Creating ARKit and Oculus visemes

If your model already has a Rigify face rig, you can use it:

- `Setup` | `Register Face Objects` | Select "Use Existing Face Rig"

Alternatively, if your model does not have a compatible
face rig, you can create one by setting landmarks:

- `Setup`: Register the head/skin, eyes, eyeslashes, eyebrows, teeth, and tongue
- `Setup`: Assing vertex groups. Note: If you don't already have all the
needed vertex groups, you have to create them first.
- `Landmarks`: Place landmarks
- `Rig`: Generate face rig and bind

You are now ready to generate the blend shapes for your 3D model:

- `Expressions` | `Create` | `Load Faceit Expressions` | Select "ARKit" | `OK`
- `Expressions` | `Load Faceit Expressions` | Select "Phonemes" and "Append" | `OK`
- `Bake` | `Bake Shape Keys` | Select "Action" and "None" | `OK`

As a result, you should obtain 52 ARKit blend shapes (standard naming) and
21 Microsoft-compatible visemes (named *_01 through *_21). Based on
Microsoft visemes, you can create the required 15 Oculus visemes
by running the Blender script
[build-visemes-from-faceit-phonemes.py](https://github.com/met4citizen/TalkingHead/blob/main/blender/Faceit/build-visemes-from-faceit-phonemes.py).

Alternatively, you can manually rename or copy the corresponding
Microsoft visemes manually based on the following mapping:

Oculus viseme | Microsoft viseme | Description
--- | --- | ---
viseme_PP |	p_b_m_21 |/p b m/ underside (p/b/m)
viseme_FF |	f_v_18 | /f v/ labiodentals
viseme_TH |	th_dh_17 | /θ ð/ interdentals
viseme_DD |	d_t_n_19 | /d t n/ alveolars approximation
viseme_kk |	k_g_ng_20 | /k g ng/ velars
viseme_CH |	sh_ch_jh_zh_16 | /tʃ dʒ/ affricates grouped with sh/j
viseme_SS |	s_z_15 | /s z/ sibilants
viseme_nn |	d_t_n_19 | nasal alveolar grouped with d/t/n
viseme_RR |	r_13 | /r/ approximant
viseme_aa |	aa_02 |	low/back vowel
viseme_E |	ey_eh_uh_04| mid vowel — often closer to /eh/ or /ay/
viseme_I |	y_iy_ih_ix_06 | high/front vowel cluster
viseme_O |	ow_08 |	mid/back rounding
viseme_U |	w_uw_07 |	high/back rounding (w/uw)
viseme_sil |- |	Silence/neutral. Create an empty shape key if needed.

Note: Using "d_t_n_19" for both "viseme_DD" and "viseme_nn" is
intentional, not an error. However, as far as I know, Oculus hasn't
published a strict, one-to-one authoritative mapping.

You can remove the remaining Microsoft visemes if you do not need
them for other purposes.

Refer to [Faceit documentation](https://faceit-doc.readthedocs.io/en/latest/)
for additional details.
