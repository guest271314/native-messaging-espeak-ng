# native-messaging-espeak-ng
<h2>espeak-ng using Native Messaging, Native File System, JavaScript</h2>

<h3>Motivation</h3>
  
- [Issue 795371: Implement SSML parsing at SpeechSynthesisUtterance](https://bugs.chromium.org/p/chromium/issues/detail?id=795371)

- [Implement SSML parsing at SpeechSynthesisUtterance](https://bugzilla.mozilla.org/show_bug.cgi?id=1425523)

- [How is a complete SSML document expected to be parsed when set once at .text property of SpeechSynthesisUtterance instance?](https://github.com/WICG/speech-api/issues/10)

- [How to programmatically send a unix socket command to a system server autospawned by browser or convert JavaScript to C++ souce code for Chromium?](https://stackoverflow.com/questions/48219981/how-to-programmatically-send-a-unix-socket-command-to-a-system-server-autospawne)

- [<script type="shell"> to execute arbitrary shell commands, and import stdout or result written to local file as a JavaScript module](https://github.com/whatwg/html/issues/3443)
  
- [Add execute() to FileSystemDirectoryHandle](https://github.com/WICG/native-file-system/issues/97)

Rough-draft proof-of-concept

- [SpeechSynthesis *to* a MediaStreamTrack or: How to execute arbitrary shell commands using inotify-tools and DevTools Snippets](https://gist.github.com/guest271314/59406ad47a622d19b26f8a8c1e1bdfd5)

# Synopsis

Use [Native Messaging](https://developer.chrome.com/extensions/nativeMessaging) and [Native File System](https://github.com/WICG/native-file-system) to input text and [Speech Synthesis Markup Language](https://www.w3.org/TR/speech-synthesis11/) to execute [`espeak-ng`](https://github.com/espeak-ng/espeak-ng), get speech synthesis output as [Opus](https://github.com/xiph/opus) ([opus-tools_static_build.sh](https://gist.github.com/spvkgn/60c12010d4cae1243dfee45b0821f692)) encoded audio repersented as `ArrayBuffer` in the browser, at both the Chromium, Chrome App page, and any web page set to as URL to match in `manifest.json`. 

# Install
```
git https://github.com/guest271314/native-messaging-espeak-ng.git
cd native-maessaging-espeak-ng/host
chmod u+x install_host.sh
./install_host.sh
```

Navigate to `chrome://extensions`, set `Developer mode` to on, click `Load unpacked`, select `app` folder in `native-messaging-espeak-ng` directory.

# Launch

Navigate to `chrome://apps`, select `native-messaging-ng`, click `Connect` HTML button which will execute `chooseFileSystemEntries()`, select `data` directory in `native-messaging-espeak-ng/host`, where the text, XML, WAV, and OGG files will be written, read, then removed when processing input and output of each execution of `espeak-ng` is complete.

To launch by default when Chrome, Chromium browser is launched the command line flag `app-id` can be used `chromium-browser --app-id=pcabbmdaomgegmnmljpebgecllcgbfch`.

To create an Application or Desktop launcher right-click on the icon at `chrome://apps` and select `Create shortcuts...`.

# Usage

At the URL `chrome-extension://pcabbmdaomgegmnmljpebgecllcgbfch/native-messaging-espeak-ng.html` type text or SSML into the HTML `<textarea>`, press `Send`.

A `async` function will be globally defined `nativeMessagingEspeakNG` which expects plain text, SSML text, or an XML `Document` (`["text/plain", "application/xml", "application/ssml+xml"]`) 

```
nativeMessagingEspeakNG("Hello world")
.then(async({input, phonemes, result}) => {
  console.log({input, phonemes, result});
  const audio = new Audio(URL.createObjectURL(new Blob([result])));
  await audio.play();
})
.catch(console.error);
```

The fulfilled `Promise` will be a plain JavaScript object having three properties, `input`, `phonemes`, `result`

```
{input: "Hello world ", phonemes: "h@l'oU w'3:ld↵", result: ArrayBuffer(5495)}
```

SSML input 

```
// close <break/> tags
let input = `<speak version="1.0" xml:lang="en-US">
    Here are <say-as interpret-as="characters">SSML</say-as> samples.
    Try a date: <say-as interpret-as="date" format="dmy" detail="1">10-9-1960</say-as>
    This is a <break time="2500ms"/> 2.5 second pause.
    This is a <break/> sentence break.<break/>
    <voice name="Storm" rate="x-slow" pitch="0.25">espeak-<say-as interpret-as="characters">ng</say-as> using Native Messaging, Native File System </voice>
    and <voice name="English_(Caribbean)"> <sub alias="JavaScript">JS</sub></voice>
  </speak>`;
  
input = (new DOMParser()).parseFromString(input, "application/xml"); // XML Document
  
nativeMessagingEspeakNG(input)
.then(async({input, phonemes, result}) => {
  // do stuff with original input as text, or SSML string, phomenes of input, result: ArrayBuffer
})
.catch(console.error);
```
  
# Messaging

To use `nativeMessagingEspeakNG()` function at a web page other than `chrome-extension://pcabbmdaomgegmnmljpebgecllcgbfch/native-messaging-espeak-ng.html` set the URL ([`externally_connectable`](https://developer.chrome.com/apps/manifest/externally_connectable)) in `manifest.json` in `app` directory, set to `"https://example.com"` in the repository code for testing.

```
"externally_connectable": {
    "matches": ["https://example.com/*"],
    "ids": ["pcabbmdaomgegmnmljpebgecllcgbfch"]
}
```

If the URL is not set in `manifest.json` an error with be thrown 

```
Unchecked runtime.lastError: Could not establish connection. Receiving end does not exist.
```

when the connection is attempted at a web page not listed in `manifest.json` of the current running instance of the application.
```
const nativeMessagingEspeakNGId = "pcabbmdaomgegmnmljpebgecllcgbfch";
// Throws Unchecked runtime.lastError: Could not establish connection. Receiving end does not exist.
// if URL is not listed in matches property of manifest.json
const nativeMessagingEspeakNGPort = chrome.runtime.connect(nativeMessagingEspeakNGId);
const nativeMessagingEspeakNG = async(text_ssml) => {
  return await new Promise((resolve, reject) => {
    const handleMessage = async({
      input, phonemes, result
    }) => {
      nativeMessagingEspeakNGPort.onMessage.removeListener(handleMessage);
      resolve({
        input, phonemes, result: new Uint8Array(result).buffer
      });
    }
    nativeMessagingEspeakNGPort.onMessage.addListener(handleMessage);
    nativeMessagingEspeakNGPort.postMessage(text_ssml);
  })
}
//  input: Text, or SSML markup
let input = `<speak version="1.0" xml:lang="en-US">Hello, again!</speak>`;
// Test
nativeMessagingEspeakNG(input)
.then(async({input, phonemes, result}) => {
  console.log({input, phonemes, result});
  const audio = new Audio(URL.createObjectURL(new Blob([result])));
  await audio.play();
})
.catch(console.error);
```

the difference between the `nativeMessagingEspeakN` function at `chrome://` and the URL set at `matches` is at the web page an XML `Document` is not expected due to the serialization of the message, for that reason `ArrayBuffer` cannot be transferred from the application page to the web page(s) set in `matches` or `"externally_connectable"` property in `manifest.json`.

# `MediaStream`, `MediaStreamTrack`

`captureStream()` on an `HTMLMediaElement` and `AudioContext.createMediaStreamDestination()` can be used to get a `MediaStream` of the speech synthesis output. 

Additionally, Chrome, Chromium can be launched with 

- `--use-fake-device-for-media-stream`
- `--use-fake-ui-for-media-stream`
- `--use-file-for-fake-audio-capture=$HOME/native-messaging-espeak-ng/host/data/output.wav%noloop`

flags which provide a means to stream the local file as a `MediaStream` after `navigator.mediaDevices.getUserMedia({audio: true})` is executed when the file `native-messaging-espeak-ng.js` is modified within `onNativeMessage` function to not remove the `.wav` file after being written to `native-messaging-espeak-ng/host/data` folder

```
// Remove "output.wav"
await Promise.all(["output.wav", "output.ogg", "input.txt"].map(entry => dir.removeEntry(entry)));
```

then at any web page 

```
navigator.mediaDevices.getUserMedia({audio: true})
.then(mediaStream => {
  const audio = new Audio();
  audio.autoplay = true;
  audio.srcObject = mediaStream;
});
```
and, or

```
navigator.mediaDevices.getUserMedia({audio: true})
.then(mediaStream => {
  const ac = new AudioContext();
  const source = ac.createMediaStreamSource(mediaStream);
  source.connect(ac.destination);
});
```

One caveat being there is no default means to determine precisely when the audio output has completed due to the potential for one or more `<break/>` elements within SSML and the fact that Chrome, Chromium does not dispatch `mute` or `ended` events when the file has completed playback.

---

<h4>Related issues</h4>


- [Include test for setting an SSML document at SpeechSynthesisUtterance .text property within speech-api](https://github.com/web-platform-tests/wpt/issues/8712)

- [This is again recording from microphone, not from audiooutput device](https://github.com/guest271314/SpeechSynthesisRecorder/issues/14)

- [Support SpeechSynthesis *to* a MediaStreamTrack](https://github.com/WICG/speech-api/issues/69)

- [Clarify getUserMedia({audio:{deviceId:{exact:<audiooutput_device>}}}) in this specification mandates capability to capture of audio output device - not exclusively microphone input device](https://github.com/w3c/mediacapture-main/issues/650)

- [How to modify existing code or build with -m option set for default SSML parsing?](https://github.com/pettarin/espeakng.js-cdn/issues/1)
