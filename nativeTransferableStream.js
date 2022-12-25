// Deno exits child process when parent process exits
// https://github.com/denoland/deno/issues/5501
// Use runtime.connectNative()
const handleMessage = async (nativeMessage) => {
  port.onMessage.removeListener(handleMessage);
  port.onDisconnect.addListener((e) => {
    console.log(e);
    if (chrome.runtime.lastError) {
      console.log(chrome.runtime.lastError);
    }
  });
  parent.postMessage(nativeMessage, name);
  // Wait 100ms for server process to start
  await new Promise((resolve) => setTimeout(resolve, 100));
  const controller = new AbortController();
  const { signal } = controller;
  parent.postMessage('Ready.', name);
  onmessage = async (e) => {
    if (e.data instanceof Array) {
      try {
        const { body } = await fetch('https://localhost:8443', {
          method: 'post',
          cache: 'no-store',
          credentials: 'omit',
          body: JSON.stringify(e.data),
          signal,
        });
        parent.postMessage(body, name, [body]);
      } catch (err) {
        parent.postMessage(err, name);
      }
    } else {
      if (e.data === 'Done writing input stream.') {
        port.onMessage.addListener((nativeMessage) => {
          parent.postMessage(nativeMessage, name);
          port.disconnect();
        });
        port.postMessage(null);
      }
      if (e.data === 'Abort.') {
        port.disconnect();
        controller.abort();
      }
    }
  };
};
const port = chrome.runtime.connectNative('native_messaging_espeakng');
port.onMessage.addListener(handleMessage);
port.postMessage(null);
