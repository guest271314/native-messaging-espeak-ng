// native-messaging-espeak-ng-bash guest271314 1-11-2020
// espeak-ng using Native Messaging, Native File System, JavaScript
const nativeMessagingEspeakNGId = "mipcnacephfiaegpelgkaacicmahlmjj";
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
let input = `<speak version="1.0" xml:lang="en-US">
    Here are <say-as interpret-as="characters">SSML</say-as> samples.
    Try a date: <say-as interpret-as="date" format="dmy" detail="1">10-9-1960</say-as>
    This is a <break time="2500ms"> 2.5 second pause.
    This is a <break> sentence break.<break>
    <voice name="Storm" rate="x-slow" pitch="0.25">espeak-<say-as interpret-as="characters">ng</say-as> using Native Messaging, Native File System </voice>
    and <voice name="English_(Caribbean)"> <sub alias="JavaScript">JS</sub></voice>
  </speak>`;
// Test
nativeMessagingEspeakNG(input)
.then(async({input, phonemes, result}) => {
  console.log({input, phonemes, result});
  const audio = new Audio(URL.createObjectURL(new Blob([result])));
  await audio.play();
})
.catch(console.error);
