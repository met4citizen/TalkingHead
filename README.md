# Talking Head (Finnish/3D)

**UNDER CONSTRUCTION**

<img src="screenshot.jpg" width="512"><br/>

This is a small side-project featuring a 3D talking avatar capable of speaking and lip-syncing in Finnish. The Talking Head supports markdown text, subtitles and knows a set of emojis, which it can convert into facial expressions.

The current version of the app uses [Google Text-to-Speech](https://cloud.google.com/text-to-speech), [ThreeJS](https://github.com/mrdoob/three.js/)/WebGL for 3D rendering, and [Marked](https://github.com/markedjs/marked) markdown parser. The app supports [Ready Player Me](https://readyplayer.me/) full-body 3D avatars (GLB) and can play [Mixamo](https://www.mixamo.com) animations (FBX).

### Introduction

Everything is packaged in one JavaScript class called `TalkingHead` that can be found in the module `talkinghead.mjs`. The file `tester.html` is intended for development/testing, but it also serves as an example of how to initialize and use the class.

**NOTE**: In order too make the avatar speak, you need to add the URL for your own text-to-speech backend that operates as a proxy to the Google Text-to-Speech API. Alternatively, it is possible to use Google's original endpoint directly and initialize the class with your own Google Text-to-Speech API key. However, it is NOT recommended to include your API key in any client-side code.

### Create Your Own 3D Avatar (free)

1. Create your own full-body avatar at [https://readyplayer.me](https://readyplayer.me)

2. Copy the given URL and add the following URL parameters in order to include all the needed morph targets:<br>`morphTargets=ARKit,Oculus+Visemes,mouthOpen,mouthSmile,eyesClosed,eyesLookUp,eyesLookDown&textureSizeLimit=1024&textureFormat=png`<br><br>Your final URL should look something like this:<br>`https://models.readyplayer.me/64bfa15f0e72c63d7c3934a6.glb?morphTargets=ARKit,Oculus+Visemes,mouthOpen,mouthSmile,eyesClosed,eyesLookUp,eyesLookDown&textureSizeLimit=1024&textureFormat=png`

3. Use the URL to download the GLB file to your own web server.

### Make Your Own Google Text-to-speech Proxy

TO BE SPECIFIED.

### Add Talking Head to Your App

Init parameter | Description
--- | ---
`url` | URL for the Ready Player Me avatar GLB file.
`node` | DOM element for the talking head.
`opt` | Object for options. Refer to the next table for available options.
`onsuccess` | Callback function triggered when the avatar has been successfully loaded.
`onprogress` | Callback function for load progress with arguments `url`, `loaded`, and `total`.
`onerror` | Callback function triggered if there's an initialization error. The first parameter is the error message string.

Option | Description
--- | ---
`ttsEndpoint` | Text-to-speech backend/endpoint/proxy implementing the Google Text-to-Speech API. Required if you want the talking head to actually speak.
`ttsApikey` | Google Text-to-Speech API key when using the Google TTS endpoint. **NOTE: Don't use this in client-side code in production**
`ttsLang` | Google text-to-speech language. Default is `"fi-FI"`.
`ttsVoice` | Google text-to-speech voice. Default is `"fi-FI-Standard-A"`.
`ttsRate` | Google text-to-speech rate in the range [0.25, 4.0]. Default is `0.95`.
`ttsPitch` | Google text-to-speech pitch in the range [-20.0, 20.0]. Default is `0`.
`ttsVolume` | Google text-to-speech volume gain (in dB) in the range [-96.0, 16.0]. Default is `0`.
`ttsTrimStart` | Trim the viseme sequence start relative to the beginning of the audio (shift in milliseconds). Default is `0`.
`ttsTrimEnd`| Trim the viseme sequence end relative to the end of the audio (shift in milliseconds). Default is `200`.
`modelPixelRatio` | Sets the device's pixel ratio. Default is `1`.
`modelFPS` | Frames per second. Default is `30`.
`cameraView` | Initial view. Supported views are `"closeup"` and `"fullbody"`. Default is `"closeup"`.
`cameraDistance` | Camera distance offset for initial view in meters. Default is `0`.
`cameraX` | Camera position offset in X direction in meters. Default is `0`.
`cameraY` | Camera position offset in Y direction in meters. Default is `0`.
`cameraRotateX` | Camera rotation offset in X direction in relative units [1,1]. Default is `0`.
`cameraRotateY` | Camera rotation offset in Y direction in relative units [-1,1]. Default is `0`.
`cameraRotateEnable` | True if the user is allowed to rotate the 3D model. Default is `true`.
`cameraPanEnable` | True if the user is allowed to pan the 3D model. Default is `false`.
`cameraZoomEnable` | True if the user is allowed to zoom the 3D model. Default is `false`.
`avatarMood` | The mood of the avatar. Supported moods: `"neutral"`, `"happy"`, `"angry"`, `"sad"`, `"fear"`, `"disgust"`, `"love"`, `"sleep"`. Default is `"neutral"`.
`avatarMute`| Mute the avatar. This can be helpful option if you want to output subtitles without audio and lip-sync. Default is `false`.
`markedOptions` | Options for Marked markdown parser. Default is `{ mangle:false, headerIds:false, breaks: true }`.

### Control Your Talking Head

Method | Description
--- | ---
`loadModel(url,[onsuccess],[onprogress],[onerror])` | Load new GLB avatar `url` with callback functions `success`, `progress` and `error`.
`setView(view, [opt])` | Set view. Supported views: `"closeup"` (default) and `"fullbody"`. Options `opt` can be used to set `cameraDistance`, `cameraX`, `cameraY`, `cameraRotateX`, `cameraRotateY`.
`lookAt(x,y,t)` | Make the avatar's head turn to look at the screen position (`x`,`y`) for `t` milliseconds.
`setMood(mood)` | Set avatar mood. Supported moods: `"neutral"`, `"happy"`, `"angry"`, `"sad"`, `"fear"`, `"disgust"`, `"love"`, `"sleep"`.
`getMood()` | Get avatar mood.
`speak(text, [opt={}], [nodeSubtitles=null], [onsubtitles=null], [excludes=[]])` | Add the `text` string to the speech queue. The text can contain face emojis. Options `opt` can be used to set text-specific `ttsLang`, `ttsVoice`, `ttsRate`, `ttsPitch`, `ttsVolume`, `avatarMood`, `avatarMute`. If the DOM element `nodeSubtitles` is specified, subtitles are displayed. Optional callback function `onsubtitles` is called whenever a new subtitle is written with the parameter of the target DOM node. The optional `excludes` is an array of [start,end] indices to be excluded from audio but includes in the subtitles.
`start` | Start/re-start the Talking Head.
`stop` | Stop the Talking Head.
`startSpeaking()` | Start speaking.
`pauseSpeaking()` | Pause speaking.
`stopSpeaking()` | Stop speaking and clear the speech queue.
`playAnimation(url,[repeat=1],[ndx=0],[scale=0.01])` | Play Mixamo animation file. Repeat `repeat` times. If the FBX file includes several animations, the parameter `ndx` specifies the index. Since Mixamo rigs have a scale 100 and RPM a scale 1, the `scale` factor can be used to scale the positions.
`stopAnimation()` | Stop the current animation started by `playAnimation`.
`playPose(url, [dur=5], [ndx=0], [scale=0.01])` | Play the initial pose of a Mixamo animation file for `dur` seconds. If the FBX file includes several animations, the parameter `ndx` specifies the index. Since Mixamo rigs have a scale 100 and RPM a scale 1, the `scale` factor can be used to scale the positions.
`stopPose()` | Stop the current pose started by `playPose`.


### FAQ

**Why only Finnish?**

The primary reason is that Finnish is my native language, and I just happened to have a use case for a Finnish-speaking avatar. The reason why English is not supported is because the Finnish language is very special in that it maintains a consistent one-to-one mapping between individual letters and phonemes/visemes. Achieving a similar level of lip-sync accuracy in English would likely demand an extensive English word database/vocabulary.

**Why Google TTS? Why not use Web Speech API, which is free?**

Currently the timing and durations of the individual visemes are calculated based on the length of the TTS audio file. As far as I know, there is no easy way to get Web Speech API speech synthesis as an audio file or otherwise determine its duration in advance. At some point I tried to use the Web Speech API events for syncronization, but the results were not consistent across different browsers.


### See also

[Finnish pronunciation](https://en.wiktionary.org/wiki/Appendix:Finnish_pronunciation), Wiktionary
