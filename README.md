# Talking Head (Finnish/3D)

**UNDER CONSTRUCTION**

<img src="screenshot.jpg" width="512"><br/>

This is a small side-project featuring a 3D talking head capable of speaking and lip-syncing in Finnish. The Talking Head supports markdown and it knows a set of emojis, which it can convert into facial expressions.

The current version uses [Ready Player Me](https://readyplayer.me/) 3D full-body avatar, [Google Text-to-Speech](https://cloud.google.com/text-to-speech), [ThreeJS](https://github.com/mrdoob/three.js/)/WebGL for 3D rendering, and [Marked](https://github.com/markedjs/marked) markdown parser.

### Introduction

Everything is packaged in one JavaScript class called `TalkingHead` that can be found in the module `talkinghead.mjs`. The file `tester.html` is intended for testing, but it also serves as an example of how to initialize and use the class.

**NOTE**: In order too make the avatar speak, you need to add the URL for your own text-to-speech backend that operates as a proxy to the Google Text-to-Speech API. Alternatively, it is possible to use Google's original endpoint directly and initialize the class with your own Google Text-to-Speech API key. However, it is NOT recommended to include your API key in any client-side code.

### Create Your Own 3D Avatar (free)

1. Create your own full-body avatar at [https://readyplayer.me](https://readyplayer.me)

2. Copy the given URL and add the following URL parameters in order to include all the needed morph targets:<br>`morphTargets=ARKit,Oculus+Visemes,mouthOpen,mouthSmile,eyesClosed,eyesLookUp,eyesLookDown&textureSizeLimit=1024&textureFormat=png&pose=A`<br><br>Your final URL should look something like this:<br>`https://models.readyplayer.me/64bfa15f0e72c63d7c3934a6.glb?morphTargets=ARKit,Oculus+Visemes,mouthOpen,mouthSmile,eyesClosed,eyesLookUp,eyesLookDown&textureSizeLimit=1024&textureFormat=png&pose=A`

3. Use the URL directly or use it to download the GLB file to your own web server.

### Make Your Own Google Text-to-speech Proxy

TO BE SPECIFIED.

### Add Talking Head to Your App

Init parameter | Description
--- | ---
`url` | URL for the Ready Player Me avatar GLB file.
`node` | DOM element for the talking head.
`opt` | Object for options. Refer to the next table for available options.
`onSuccess` | Callback function triggered when the avatar has been successfully loaded.
`onError` | Callback function triggered if there's an initialization error. The first parameter is the error message string.

Option | Description
--- | ---
`ttsEndpoint` | Text-to-speech backend/endpoint/proxy implementing the Google Text-to-Speech API. Required if you want the talking head to actually speak.
`ttsApikey` | Google Text-to-Speech API key when using the Google TTS endpoint. **NOTE: Don't use this in client-side code in production**.
`ttsLang` | Google text-to-speech language. Default is `"fi-FI"`.
`ttsVoice` | Google text-to-speech voice. Default is `"fi-FI-Standard-A"`.
`ttsRate` | Google text-to-speech rate in the range [0.25, 4.0]. Default is `0.90`.
`ttsPitch` | Google text-to-speech pitch in the range [-20.0, 20.0]. Default is `0`.
`ttsVolume` | Google text-to-speech volume gain (in dB) in the range [-96.0, 16.0]. Default is `0`.
`ttsTrimStart` | Trim the viseme sequence start relative to the beginning of the audio (shift in milliseconds). Default is `0`.
`ttsTrimEnd`| Trim the viseme sequence end relative to the end of the audio (shift in milliseconds). Default is `200`.
`modelPixelRatio` | Sets the device's pixel ratio. Default is `1`.
`cameraView` | Initial view. Supported views: `"closeup"` (default), `"left"`, `"right"`, `"fullbody"`. Note: Currently lower body is not animated.
`cameraX` | Camera position offset in X direction. Default is `0`.
`cameraY` | Camera position offset in Y direction. Default is `0`.
`cameraZ` | Camera position offset in Z direction. Default is `0`.
`cameraRotateEnable` | True if the user is allowed to rotate the 3D model. Default is `true`.
`cameraPanEnable` | True if the user is allowed to pan the 3D model. Default is `false`.
`cameraZoomEnable` | True if the user is allowed to zoom the 3D model. Default is `false`.
`cameraShowfull` | Show the avatar in full-body view. Default is `false` i.e. only the upper body is shown.
`avatarMood` | The initial mood of the avatar. Supported moods: `"neutral"`, `"happy"`, `"angry"`, `"sad"`, `"fear"`, `"disgust"`, `"love"`, `"sleep"`. Default is `"neutral"`.
`markedOptions` | Options for Marked markdown parser. Default is `{ mangle:false, headerIds:false, breaks: true }`.

### Control Your Talking Head

Method | Description
--- | ---
`loadModel(url,[success],[error])` | Load new GLB avatar `url` with callback functions `success` and `error`.
`setView(view, [opt])` | Set view. Supported views: `"closeup"` (default), `"profile"`, `"fullbody"`. Options `opt` can be used to set `cameraX`, `cameraY`, `cameraZ`. Note: Currently lower body is not animated.
`lookAt(x,y,t)` | Make the avatar's head turn to look at the screen position (`x`,`y`) for `t` milliseconds. Note: The point is calculated relative to `"closeup"` view.
`setMood(mood)` | Set avatar mood. Supported moods: `"neutral"`, `"happy"`, `"angry"`, `"sad"`, `"fear"`, `"disgust"`, `"love"`, `"sleep"`.
`getMood(mood)` | Get avatar mood.
`speak(text, [opt], [nodeSubtitles], [onsubtitles])` | Add the `text` string to the speech queue. The text can contain face emojis. Options `opt` can be used to set text-specific `ttsLang`, `ttsVoice`, `ttsRate`, `ttsPitch`, `ttsVolume`. If the DOM element `nodeSubtitles` is specified, subtitles are displayed. Optional callback function `onsubtitles` is called whenever a new subtitle is written with the parameter of the target DOM node.
`startSpeaking()` | Start speaking.
`pauseSpeaking()` | Pause speaking.
`stopSpeaking()` | Stop speaking and clear the speech queue.
`startAnimation()` | Start/re-start the animation.
`stopAnimation()` | Stop the animation.

### FAQ

**Why only Finnish?**

The primary reason is that Finnish is my native language, and I just happened to have a use case for a Finnish-speaking avatar. The reason why English is not supported is because the Finnish language is very special in that it maintains a consistent one-to-one mapping between individual letters and phonemes/visemes. Achieving a similar level of lip-sync accuracy in English would likely demand an extensive English word database/vocabulary.

**Why Google TTS? Why not use Web Speech API, which is free?**

Currently the timing and durations of the individual visemes are calculated based on the length of the TTS audio file. As far as I know, there is no easy way to get Web Speech API speech synthesis as an audio file or otherwise determine its duration in advance. At some point I tried to use the Web Speech API events for syncronization, but the results were not consistent across different browsers.


### See also

[Finnish pronunciation](https://en.wiktionary.org/wiki/Appendix:Finnish_pronunciation), Wiktionary
