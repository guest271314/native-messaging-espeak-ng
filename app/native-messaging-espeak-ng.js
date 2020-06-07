// native-messaging-espeak-ng guest271314 1-4-2020
// espeak-ng using Native Messaging, Native File System, JavaScript
//
// Native Messaging example source code
// https://chromium.googlesource.com/chromium/src/+/master/chrome/common/extensions/docs/examples/api/nativeMessaging
const hostName = "native_messaging_espeak_ng";
const connectButton = document.getElementById("connect-button");
const sendMessageButton = document.getElementById("send-message-button");
const sources = document.getElementById("sources");
let dir, port, status, nativeMessagingEspeakNG;

sources.value = `<voice name="Storm">${sources.placeholder}</voice>`;

const updateUiState = _ => {
    if (port) {
      connectButton.style.display = "none";
      sendMessageButton.style.display = "block";
    } else {
      connectButton.style.display = "block";
      sendMessageButton.style.display = "none";
    }
  }
// send native message to host
const sendNativeMessage = async input => {
  try {
    console.log({
      input,
      dir,
      status
    });
    const fileHandle = await dir.getFile("input.txt", {
      create: true
    });
    const writer = await fileHandle.createWriter();
    await writer.write(0, new Blob([input], {
      type: "text/plain"
    }));
    await writer.close();

    const message = {
      "message": "write"
    };

    return {
      input,
      message
    };

  } catch (e) {
    console.error(e);
    console.trace();
    throw e;
  };
};
// handle native message from host
const onNativeMessage = async(e, resolve, input) => {
  const {
    message, body: phonemes
  } = e;
  try {
    if (message === "output") {
      // "host/data" directory
      const fileHandle = await (await dir.getFile("output.ogg", {
        create: true
      })).getFile();
      const result = await fileHandle.arrayBuffer();
      resolve({
        phonemes,
        input,
        result
      });
      // remove input, output file entries from local filesystem
      await Promise.all(["output.wav", "output.ogg", "input.txt"].map(entry => dir.removeEntry(entry)));
    } else if (message === "stderr") {
      console.error(e);
      port.disconnect();
    } else {
      console.dir(e);
    }
  } catch (e) {
    console.error(e);
    console.trace();
    throw e;
  }
};
const onDisconnected = _ => {
  console.error(chrome.runtime.lastError.message);
  port = null;
  updateUiState();
};
const connect = async e => {
  console.log("Connecting to native messaging host: " + hostName);
  port = chrome.runtime.connectNative(hostName);
  if (!status || status !== "granted") {
    // request write access to native file system "host/data" directory
    dir = await self.chooseFileSystemEntries({
      type: "open-directory",
      accepts: [{
        description: "Text or SSML",
        mimeTypes: ["text/plain", "application/xml", "application/ssml+xml"],
        extensions: ["txt", "xml"]
      }, {
        description: "Audio output",
        mimeTypes: ["audio/ogg"],
        extensions: ["ogg"]
      }]
    });
    status = await dir.requestPermission({
      writable: true
    });
  }; 
  // input: Text, SSML markup, or XML Document
  nativeMessagingEspeakNG = async input => {
    try {
      return new Promise(async(resolve, reject) => {
        if (input === "") {
          reject(Error("No input to synthesize"));
        }
        const {
          message, input:data
        } = await sendNativeMessage(
           `${input instanceof Document 
             ? input.documentElement.outerHTML 
             : input
           }`.replace(/[\n\s]+/g, " "));
        port.postMessage(message);
        const handleMessage = async e => {
          port.onMessage.removeListener(handleMessage);
          await onNativeMessage(e, resolve, data);       
        }
        port.onMessage.addListener(handleMessage);
      }).catch(e => {throw e});
    } catch (e) {
      throw e;
    }
  }
  port.onDisconnect.addListener(onDisconnected);
  updateUiState();
};
connectButton.onclick = connect;
sendMessageButton.onclick = async _ => {
  // input, phonemes: text, result: ArrayBuffer, Array at external message
  try {
    const {
      input, phonemes, result
    } = await nativeMessagingEspeakNG(sources.value).catch(e => {throw e;});
    // {input: "Hello world", phonemes: "h@l'oU w'3:ld↵", result: ArrayBuffer(5495)}
    console.log({
      input,
      phonemes,
      result
    });
    const audio = new Audio(URL.createObjectURL(new Blob([result])));
    await audio.play();
  } catch (e) {
      console.error(e);
      console.trace();
  }
}
updateUiState();
