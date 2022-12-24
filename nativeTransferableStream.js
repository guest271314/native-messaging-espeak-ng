onload = () => {
  chrome.runtime.sendNativeMessage(
    'native_messaging_espeakng',
    {},
    async (nativeMessage) => {
      parent.postMessage(nativeMessage, name);
      await new Promise((resolve) => setTimeout(resolve, 100));
      const controller = new AbortController();
      const { signal } = controller;
      parent.postMessage('Ready.', name);
      onmessage = async (e) => {
        console.log(e.data);
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
            chrome.runtime.sendNativeMessage(
              'native_messaging_espeakng',
              {},
              (nativeMessage) => {
                parent.postMessage(nativeMessage, name);
              }
            );
          }
          if (e.data === 'Abort.') {
            controller.abort();
          }
        }
      };
    }
  );
};
