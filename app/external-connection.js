// native-messaging-espeak-ng guest271314 1-4-2020
// espeak-ng using Native Messaging, Native File System, JavaScript
const externalConnection = _ => {
  chrome.runtime.onConnectExternal.addListener(externalPort => {
    console.log({
      externalPort
    });
    externalPort.onMessage.addListener(async message => {
      if (nativeMessagingEspeakNG) {
        // result: ArrayBuffer, not transferable here
        const {
          input, phonemes, result
        // message: Text, or SSML markup
        } = await nativeMessagingEspeakNG(message);
        externalPort.postMessage({
          input, phonemes, result: [...new Uint8Array(result)]
        });
      };
    });
  });
}
window.onload = externalConnection;
