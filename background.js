// https://stackoverflow.com/a/62364519
function base64ToBytesArr(str) {
  const abc = [
    ...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',
  ]; // base64 alphabet
  let result = [];

  for (let i = 0; i < str.length / 4; i++) {
    let chunk = [...str.slice(4 * i, 4 * i + 4)];
    let bin = chunk
      .map((x) => abc.indexOf(x).toString(2).padStart(6, 0))
      .join('');
    let bytes = bin.match(/.{1,8}/g).map((x) => +('0b' + x));
    result.push(
      ...bytes.slice(0, 3 - (str[4 * i + 2] == '=') - (str[4 * i + 3] == '='))
    );
  }
  return result;
}

globalThis.name = chrome.runtime.getManifest().short_name;
globalThis.externallyConnectablePort = null;
globalThis.nativeMessagingPort = null;
chrome.runtime.onConnectExternal.addListener((port) => {
  globalThis.externallyConnectablePort = port;
  globalThis.externallyConnectablePort.onMessage.addListener((message) => {
    if (message === 'disconnect') {
      globalThis.nativeMessagingPort.disconnect();
      globalThis.externallyConnectablePort.disconnect();
    }
    if (!globalThis.nativeMessagingPort) {
      globalThis.nativeMessagingPort = chrome.runtime.connectNative(globalThis.name);
      globalThis.nativeMessagingPort.onMessage.addListener((nativeMessage) => {
        const {
          done,
          value
        } = nativeMessage;
        if (!done) {
          nativeMessage.value = base64ToBytesArr(nativeMessage.value);
        }
        globalThis.externallyConnectablePort.postMessage(nativeMessage)
        if (done) {
          globalThis.nativeMessagingPort.disconnect();
        }
      });
      globalThis.nativeMessagingPort.postMessage(message);
    }
  });
  globalThis.externallyConnectablePort.onDisconnect.addListener((_) => {
    console.log('Disconnected');
    globalThis.externallyConnectablePort = null;
    globalThis.nativeMessagingPort = null;
    if (chrome.runtime.lastError) {
      console.warn(chrome.runtime.lastError);
    }
  });
});

chrome.runtime.onInstalled.addListener((reason) => {
  console.log(reason);
});

// Dynamically set "externally_connectable"
chrome.action.onClicked.addListener(async (tab) => {

  const url = new URL(tab.url);
  const manifest = chrome.runtime.getManifest();
  manifest.externally_connectable.matches = [
    ...new Set([`${url.origin}/*`, ...manifest.externally_connectable.matches]),
  ];
  manifest.web_accessible_resources[0].matches = [
    ...new Set([`${url.origin}/*`, ...manifest.web_accessible_resources[0].matches]),
  ];
  try {
    const [{
      result
    }] = await chrome.scripting.executeScript({
      target: {
        tabId: tab.id
      },
      world: 'MAIN',
      args: [
        [...new TextEncoder().encode(JSON.stringify(manifest, null, 2))]
      ],
      func: async (manifest) => {
        try {
          const dir = await showDirectoryPicker({
            mode: 'readwrite',
            id: 'update'
          });
          const handle = await dir.getFileHandle('manifest.json', {
            create: false
          });
          await new Blob([new Uint8Array(manifest)], {
              type: 'application/json'
            })
            .stream()
            .pipeTo(
              await handle.createWritable()
            );
          console.log(`${handle.name} updated`);
          return `${handle.name} updated`;
        } catch (e) {
          console.warn(e);
          throw e;
        }
      }
    });

    if (result == 'manifest.json updated') {
      chrome.runtime.reload();
    };

  } catch (e) {
    console.warn(e);
  }

});
