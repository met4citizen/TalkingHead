# Talking Head (Finnish/3D)

**UNDER CONSTRUCTION**

<img src="screenshot.jpg" width="512"><br/>

This is a small side-project featuring a 3D talking head capable of speaking and lip-syncing in Finnish. It also knows a set of emojis, which it can convert them into facial expressions of the avatar.

This version UNDER DEVELOPMENT uses [Google Text-to-Speech](https://cloud.google.com/text-to-speech), [Ready Player Me](https://readyplayer.me/) 3D avatar, and [ThreeJS](https://github.com/mrdoob/three.js/)/WebGL for 3D rendering.

The file `tester.html` is only for testing, but it can also serve as an example of how to initialize and use the class `TalkingHead` in the Javascript module `talkinghead.mjs`.

To utilize the tester and make the avatar speak, you need to specify the URL for your own text-to-speech backend/proxy. Alternatively, you can use the Google's original endpoint and initialize the class with your Google Text-to-Speech API key, but it's not recommended to put your API key in any client-side code.

Why focus only on Finnish? Well, the primary reason is that Finnish is my native language. Additionally, it's relatively easy to convert Finnish text into phonemes and visemes, because there is mostly a very consistent one-to-one mapping between individual characters and phonemes/visemes. Achieving a similar level of lip-sync accuracy in English would likely require an extensive English word vocabulary.

The parameters and options for initializing the class are as follows:

Parameter | Description
--- | ---
`nodeAvatar` | DOM element for the talking head.
`nodeSubtitles` | DOM element for subtitles. If the value is `null`, subtitles won't be displayed during speech.
`urlAvatar3D` | URL for the Ready Player Me avatar.
`opt` | Object for options. Refer to the next table for available options.
`success` | Callback function triggered when the avatar has been successfully loaded.
`error` | Callback function triggered if there's an initialization error. The first parameter is the error message string.

The available options are as follows:

Option | Description
--- | ---
`gttsEndpoint` | Text-to-speech backend/endpoint/proxy implementing the Google Text-to-Speech API. Required if you want the talking head to actually speak.
`gttsApikey` | Google Text-to-Speech API key when using the Google TTS endpoint. **NOTE: Don't use this in client-side code**.
`gttsLang` | Google text-to-speech language. Default is `"fi-FI"`.
`gttsVoice` | Google text-to-speech voice. Default is `"fi-FI-Standard-A"`.
`gttsRate` | Google text-to-speech rate. Default is `0.85`.
`gttsPitch` | Google text-to-speech pitch. Default is `0`.
`gttsSilenceStart` | Silence at the start of the Google text-to-speech audio file in milliseconds. Default is `200`.
`gttsSilenceEnd`| Silence at the end of the Google text-to-speech audio file in milliseconds. Default is `350`.
`avatarRootObject` | The name of the Ready Player Me avatar root object. Default is `'AvatarRoot'`.
`avatarMeshObject` | The name of the Ready Player Me mesh object. Default is `'Wolf3D_Avatar'`.
`avatarHeadObject` | The name of the Ready Player Me head object. Default is 'Head'.
`avatarHideObjects` | An array of names to hide from the 3D model. Default is ['LeftHand', 'RightHand'].
`avatarOffset` | The margin size of the talking head. Default is 0.8.
`avatarMood` | The initial mood of the avatar. Supported moods: `"neutral"`, `"happy"`, `"angry"`, `"sad"`, `"fear"`, `"disgust"`, `"sleep"`. Default is `"neutral"`.
`avatarPixelRatio` | Sets the device's pixel ratio. Default is `1`.
`avatarRotateEnable` | True if the user is allowed to rotate the 3D model. Default is `true`.
`avatarPanEnable` | True if the user is allowed to pan the 3D model. Default is `false`.
`avatarZoomEnable` | True if the user is allowed to zoom the 3D model. Default is `false`.
