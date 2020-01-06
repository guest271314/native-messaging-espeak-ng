# native-messaging-espeak-ng
<h2>espeak-ng using Native Messaging, Native File System, JavaScript</h2>

<h3>Motivation</h3>
  
Use local `espeak-ng` with `-m` option set in the browser. 

Output speech sythesis audio as a media stream (media stream track).

# Synopsis

Use [Native Messaging](https://developer.chrome.com/extensions/nativeMessaging) and [Native File System](https://github.com/WICG/native-file-system) to input text and [Speech Synthesis Markup Language](https://www.w3.org/TR/speech-synthesis11/) to execute [`espeak-ng`](https://github.com/espeak-ng/espeak-ng), get speech synthesis output as [Opus](https://github.com/xiph/opus) encoded audio repersented as `ArrayBuffer` in the browser, at both the Chromium, Chrome App page, and any web page set to as URL to match in `manifest.json`. 

# Install
```
git https://github.com/guest271314/native-messaging-espeak-ng.git
cd native-maessaging-espeak-ng/host
chmod u+x *.sh *.js
./install_host.sh
```

Navigate to `chrome://extensions`, set `Developer mode` to on, click `Load unpacked`, select `app` folder in `native-messaging-espeak-ng` directory.

<h3>Dependencies</h3>

`make autoconf automake libtool pkg-config  gcc` for [Building eSpeak NG](https://github.com/espeak-ng/espeak-ng/blob/master/docs/building.md).

`nodejs` for Native Messaging host [native-messaging](https://github.com/simov/native-messaging).

`libtool-bin` for `flac`.

[opus-tools_static_build.sh](https://gist.github.com/spvkgn/60c12010d4cae1243dfee45b0821f692) for downloading and building Opus audio encoding dependencies is included in the `host` directory.

# Launch

Navigate to `chrome://apps`, select `native-messaging-ng`, click `Connect` HTML button which will execute `chooseFileSystemEntries()`, select `data` directory in `native-messaging-espeak-ng/host`, where the text, XML, WAV, and OGG files will be written, read, then removed when processing input and output of each execution of `espeak-ng` is complete.

To launch by default when Chrome, Chromium browser is launched the command line flag `app-id` can be used `chromium-browser --app-id=pcabbmdaomgegmnmljpebgecllcgbfch`.

To create an Application or Desktop launcher right-click on the icon at `chrome://apps` and select `Create shortcuts...`.

# Usage

At the URL `chrome-extension://pcabbmdaomgegmnmljpebgecllcgbfch/native-messaging-espeak-ng.html` press `Connect` to connect to Native Messaging host and select `host/data` directory at Native File System 

<pre>
Let site view files?

<b>chrome-extension://pcabbmdaomgegmnmljpebgecllcgbfch</b> will 
be able to view files in <b>data</b> until you close this tab
</pre>

prompt select `View Files`, at

<pre>
Save changes to data?

<b>chrome-extension://pcabbmdaomgegmnmljpebgecllcgbfch</b> will 
be able to edit files in <b>data</b> until you close this tab
</pre>

select `Save changes`.


Type text or SSML into the HTML `<textarea>`, press `Send`. 

An `async` function `nativeMessagingEspeakNG` will be defined which expects plain text, SSML text, or an XML `Document` (`["text/plain", "application/xml", "application/ssml+xml"]`).

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
{input: "Hello world", phonemes: "h@l'oU w'3:ld↵", result: ArrayBuffer(5495)}
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
- `--use-file-for-fake-audio-capture=/path/to/native-messaging-espeak-ng/host/data/output.wav%noloop`

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

`%noloop` appened to the path to `.wav` file and used within a launcher that parses the input, two `%%` might be neccessary in order to avoid the single `%` being escaped, resulting in `wavoloop`. Executing at the command line does not exhibit that behaviour. 

`%noloop` does not affect `mute` and `ended` events of `MediaStreamTrack` which are not fired when the source `.wav` playback reaches end of file at Chromium 80.

The `MediaStreamTrack` is enabled and does not stop when the `wav` file reaches end of file with `%noloop` set. Analyzing audio output for silence to determining precisely when the audio output has completed could lead to the track being stopped before the next speech synthesis audio output or continuing beyond the playback end of the input `wav` file due to the potential for one or more `<break/>` (`<break time="5000ms"/>`) elements, or other elements or attribute values within input SSML. 

---

<h3>Related issues</h3>


- [Include test for setting an SSML document at SpeechSynthesisUtterance .text property within speech-api](https://github.com/web-platform-tests/wpt/issues/8712)

- [This is again recording from microphone, not from audiooutput device](https://github.com/guest271314/SpeechSynthesisRecorder/issues/14)

- [Support SpeechSynthesis *to* a MediaStreamTrack](https://github.com/WICG/speech-api/issues/69)

- [Clarify getUserMedia({audio:{deviceId:{exact:<audiooutput_device>}}}) in this specification mandates capability to capture of audio output device - not exclusively microphone input device](https://github.com/w3c/mediacapture-main/issues/650)

- [How to modify existing code or build with -m option set for default SSML parsing?](https://github.com/pettarin/espeakng.js-cdn/issues/1)

- [Issue 795371: Implement SSML parsing at SpeechSynthesisUtterance](https://bugs.chromium.org/p/chromium/issues/detail?id=795371)

- [Implement SSML parsing at SpeechSynthesisUtterance](https://bugzilla.mozilla.org/show_bug.cgi?id=1425523)

- [How is a complete SSML document expected to be parsed when set once at .text property of SpeechSynthesisUtterance instance?](https://github.com/WICG/speech-api/issues/10)

- [How to programmatically send a unix socket command to a system server autospawned by browser or convert JavaScript to C++ souce code for Chromium?](https://stackoverflow.com/questions/48219981/how-to-programmatically-send-a-unix-socket-command-to-a-system-server-autospawne)

- [<script type="shell"> to execute arbitrary shell commands, and import stdout or result written to local file as a JavaScript module](https://github.com/whatwg/html/issues/3443)
  
- [Add execute() to FileSystemDirectoryHandle](https://github.com/WICG/native-file-system/issues/97)

- [Issue 795371: Implement SSML parsing at SpeechSynthesisUtterance](https://bugs.chromium.org/p/chromium/issues/detail?id=795371)

- [Implement SSML parsing at SpeechSynthesisUtterance](https://bugzilla.mozilla.org/show_bug.cgi?id=1425523)

- [How is a complete SSML document expected to be parsed when set once at .text property of SpeechSynthesisUtterance instance?](https://github.com/WICG/speech-api/issues/10)

- [How to programmatically send a unix socket command to a system server autospawned by browser or convert JavaScript to C++ souce code for Chromium?](https://stackoverflow.com/questions/48219981/how-to-programmatically-send-a-unix-socket-command-to-a-system-server-autospawne)

- [<script type="shell"> to execute arbitrary shell commands, and import stdout or result written to local file as a JavaScript module](https://github.com/whatwg/html/issues/3443)
  
- [Add execute() to FileSystemDirectoryHandle](https://github.com/WICG/native-file-system/issues/97)

<h4>gist</h4>

- [SpeechSynthesis *to* a MediaStreamTrack or: How to execute arbitrary shell commands using inotify-tools and DevTools Snippets](https://gist.github.com/guest271314/59406ad47a622d19b26f8a8c1e1bdfd5)
