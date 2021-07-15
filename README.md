<h5>Motivation</h5>

Web Speech API does not support SSML input to the speech synthesis engine https://github.com/WICG/speech-api/issues/10, or the ability to capture the output of `speechSynthesis.speak()` as a`MedaiStreamTrack` or raw audio https://lists.w3.org/Archives/Public/public-speech-api/2017Jun/0000.html.

See [Issue 1115640: [FUGU] NativeTransferableStream](https://bugs.chromium.org/p/chromium/issues/detail?id=1115640).

<h5>Synopsis</h5>

Native Messaging => eSpeak NG => PHP `passthru()` => `fetch()` => Transferable Streams => `MediaStreamTrack`.

Use local `espeak-ng` with `-m` option set in the browser. 

Output speech sythesis audio as a live `MediaStreamTrack`.

Use [Native Messaging](https://developer.chrome.com/extensions/nativeMessaging), PHP `passthru()` to input text and [Speech Synthesis Markup Language](https://www.w3.org/TR/speech-synthesis11/) as STDIN to [`espeak-ng`](https://github.com/espeak-ng/espeak-ng), stream STDOUT in "real-time" as live `MediaStreamTrack`. 

<h5>Install<h5>

<h6>Dependencies</h6>

eSpeak NG [Building eSpeak NG](https://github.com/espeak-ng/espeak-ng/blob/master/docs/building.md#building-espeak-ng).

PHP is used for `passthru()`. Substitute server language of choice.

```
git clone https://github.com/guest271314/native-messaging-espeak-ng.git
cd native-messaging-espeak-ng/
chmod +x local_server.sh index.php
```

Navigate to `chrome://extensions`, set `Developer mode` to on, click `Load unpacked`, select downloaded git directory.

Note the generated extension ID, substitute that value for `<id>` in `native_messaging_espeakng.json`, `AudioStream.js`, `index.php`; add the value to `"extensions"` array in `manifest.json`.

Substitute full local path to `local_server.sh` for `/path/to` in `native_messaging_espeakng.json`.

Copy `native_messaging_espeakng.json` to `NativeMessagingHosts` directory in Chromium or Chrome configuration folder, on Linux, i.e., `~/.config/chromium`; `~/.config/google-chrome-unstable`.

`cp native_messaging_espeakng ~/.config/chromium/NativeMessagingHosts`

Reload extension.

<h5>Usage</h5>

On origins listed in `"matches"` array in `"web_accessible_resources"` object in `manifest.json`, e.g., at `console`

```
var text = `Test`;
var stdin = `espeak-ng -m --stdout "${text}"`;
var espeakng = new AudioStream({ stdin, recorder: true });
// espeakng.mediaStream: MediaStream containing MediaStreamTrack source output of espeak-ng --stdout
var ab = await espeakng.start();
console.log(
  URL.createObjectURL(new Blob([ab], { type: 'audio/webm;codecs=opus' }))
);
```
  
Abort the request and audio output.
  
```
await espeakng.abort()
```
  
To turn local server on and off with user action pin and click the extension icon on Chromium or Chrome toolbar.

<h5>References</h5>

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
- [SpeechSynthesis *to* a MediaStreamTrack or: How to execute arbitrary shell commands using inotify-tools and DevTools Snippets](https://gist.github.com/guest271314/59406ad47a622d19b26f8a8c1e1bdfd5)
