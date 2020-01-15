// native-messaging-espeak-ng-bash guest271314 1-11-2020
const hostName = "native_messaging_espeak_ng_bash";
const button = document.querySelector("input#connect");
// const audio = document.querySelector("audio");
const ac = new AudioContext({
  sampleRate: 22050
});
ac.onstatechange = e => {
  console.log(e.target.state, e.target.currentTime, audioTrack.enabled, audioTrack.readyState);
}
ac.suspend();
const gainNode = new GainNode(ac, {
  gain: 0
});
const [msd, {
  stream: audioStream
} = msd, [audioTrack] = audioStream.getAudioTracks()] = [
  new MediaStreamAudioDestinationNode(ac, {
    channelCount: 1,
    channelCountMode: "explicit",
    channelInterpretation: "speakers"
  })
];
audioTrack.type = "TTS";
let port, dir, status, inputFileHandle, outputFileHandle, writer, processorOptions = {
  i: 0,
  len: 0,
  data: void 0,
  fileName: ""
};
audioTrack.enabled = false;
// audio.muted = true;
// audio.srcObject = audioStream;
// audio.pause();
// audio.onloadedmetadata = audio.onplay = audio.onpause = audio.onended = 
//  e => console.log(e.type, e.target.srcObject.getAudioTracks()[0]);
audioStream.oninactive = audioStream.onactive = e => console.log(e);
audioTrack.onmute = audioTrack.onunmute = audioTrack.onended = e => console.log(e);
let aw = ac.audioWorklet.addModule("audioWorklet.js").then(_ => {
  const aw = new AudioWorkletNode(ac, "audio-data-worklet-stream", {
    processorOptions
  });
  aw.port.addEventListener("message", async e => {
    if (e.data === "stop") {
      audioTrack.stop();
      await ac.close();
    }
  });
  gainNode.connect(msd);
  aw.connect(gainNode);
  gainNode.connect(ac.destination);
  return aw;
});

const playAudioDataWorkletStream = async buffer => {
  try {
    const audioBuffer = await ac.decodeAudioData(buffer);
    const data = audioBuffer.getChannelData(0);
    return await new Promise(async resolve => {
      const {
        name: fileName
      } = outputFileHandle;
      aw.port.onmessage = async({
        data: message
      }) => {
        aw.port.onmessage = null;
        // audio.pause();
        // audio.muted = true;
        audioTrack.enabled = false;
        gainNode.gain.value = 0;
        await ac.suspend();
        resolve(message);
      };
      console.log(ac.state, ac.currentTime, audioTrack.enabled, audioTrack.readyState);
      audioTrack.enabled = true;
      // audio.muted = false;
      gainNode.gain.value = 1;
      await ac.resume();
      aw.port.postMessage({
        data, fileName
      }, [data.buffer]);
      // await audio.play();
      // console.log(`speech synthesis audio output playing`, data, ac.currentTime);
    }).catch(e => {
      throw e;
    })
  } catch (e) {
    console.error(e);
    throw e;
  }
}

const getFileSystem = async _ => {
  try {
    port = chrome.runtime.connectNative(hostName);
    dir = await self.chooseFileSystemEntries({
      type: "openDirectory"
    });
    status = await dir.requestPermission({
      // https://bugs.chromium.org/p/chromium/issues/detail?id=1042018#c3
      writable: true
    });
    // create file handle reference here to get, persist write permission
    inputFileHandle = await dir.getFile("input.txt", {
      create: true
    });
    return status;
  } catch (e) {
    console.error(e);
    throw e;
  }
}

const nativeMessagingEspeakNG = async input => {
  try {
    if (!dir && !status || status !== "granted") {
      throw new Error(`Directory ("host") read/write permission not granted`);
    }
    if (status === "granted") {
      writer = await inputFileHandle.createWriter({
        keepExistingData: false
      });
        if (input === "") {
          reject(Error("No input to synthesize"));
        }
        input = `${input instanceof Document 
                 ? input.documentElement.outerHTML 
                 : input
                 }`.replace(/[\n\s]+/g, " ");
      const writerResult = await writer.write(0, new File([input.trim()], "input.txt", {
          type: "text/plain"
        }))
        .catch(console.error);
      // close() writer to avoid .crswap files being written at filesystem
      // https://bugs.chromium.org/p/chromium/issues/detail?id=993597#c14
      await writer.close();

      const phonemes = await new Promise(resolve => {
        const handleMessage = e => {
          resolve(atob(e).trim());
          port.onMessage.removeListener(handleMessage);
        }
        port.onMessage.addListener(handleMessage);
        port.postMessage(0);
      }).catch(e => {
        throw e
      });
      outputFileHandle = await (await dir.getFile("output.wav", {
        create: false
      })).getFile();
      const result = await outputFileHandle.arrayBuffer();
      await Promise.all(["input.txt", "output.wav"].map(fn => dir.removeEntry(fn)));
      aw = await aw;
      return {
        input,
        phonemes,
        result
      };
    }
  } catch (e) {
    console.error(e.message);
    console.trace();
    throw e;
  }
}

const externalConnection = _ => {
  chrome.runtime.onConnectExternal.addListener(externalPort => {
    console.log(externalPort);
    externalPort.onMessage.addListener(async message => {
      if (nativeMessagingEspeakNG) {
        // result: ArrayBuffer, not transferrable
        const {
          input, phonemes, result
          // message: Text, or SSML markup
        } = await nativeMessagingEspeakNG(message);
        externalPort.postMessage({
          input, phonemes, result: [...new Uint8Array(result)]
        }, externalPort.sender.url);
      };
    });
  });
}

button.onclick = async e => {
    status = await getFileSystem();
    if (status === "granted") {
      button.disabled = true;
      button.value = `Read/Write permission to "${dir.name}" directory ${status}`;
      chrome.runtime.nativeMessagingEspeakNG = nativeMessagingEspeakNG;
      externalConnection();
    }
  }
