class AudioStream {
  constructor({ stdin, recorder = false }) {
    if (!/^espeak-ng/.test(stdin)) {
      throw new Error(`stdin should begin with "espeak-ng" command`);
    }
    this.command = stdin;
    this.stdin = new ReadableStream({
      start(c) {
        c.enqueue(
          new File([stdin], 'espeakng', {
            type: 'application/octet-stream',
          })
        );
        c.close();
      },
    });
    this.readOffset = 0;
    this.duration = 0;
    this.channelDataLength = 440;
    this.sampleRate = 22050;
    this.numberOfChannels = 1;
    this.init = false;
    this.src =
      'chrome-extension://<id>/nativeTransferableStream.html';
    this.ac = new AudioContext({
      latencyHint: 0,
    });
    this.ac.suspend();
    this.msd = new MediaStreamAudioDestinationNode(this.ac, {
      channelCount: this.numberOfChannels,
    });
    this.inputController = void 0;
    this.inputStream = new ReadableStream({
      start: (_) => {
        return (this.inputController = _);
      },
    });
    this.inputReader = this.inputStream.getReader();
    const { stream } = this.msd;
    this.stream = stream;
    const [track] = stream.getAudioTracks();
    this.track = track;
    this.osc = new OscillatorNode(this.ac, { frequency: 0 });
    this.processor = new MediaStreamTrackProcessor({ track });
    this.generator = new MediaStreamTrackGenerator({ kind: 'audio' });
    const { writable } = this.generator;
    this.writable = writable;
    const { readable: audioReadable } = this.processor;
    this.audioReadable = audioReadable;
    this.audioWriter = this.writable.getWriter();
    this.mediaStream = new MediaStream([this.generator]);
    if (recorder) {
      this.recorder = new MediaRecorder(this.mediaStream);
      this.recorder.ondataavailable = ({ data }) => {
        this.data = data;
      };
    }
    this.outputSource = new MediaStreamAudioSourceNode(this.ac, {
      mediaStream: this.mediaStream,
    });
    this.outputSource.connect(this.ac.destination);
    this.resolve = void 0;
    this.promise = new Promise((_) => (this.resolve = _));
    this.osc.connect(this.msd);
    this.osc.start();
    this.track.onmute = this.track.onunmute = this.track.onended = (e) =>
      console.log(e);
    this.abortable = new AbortController();
    const { signal } = this.abortable;
    this.signal = signal;
    this.audioReadableAbortable = new AbortController();
    const { signal: audioReadableSignal } = this.audioReadableAbortable;
    this.audioReadableSignal = audioReadableSignal;
    this.audioReadableSignal.onabort = (e) => console.log(e.type);
    this.abortHandler = async (e) => {
      try {
        await this.disconnect(true);
      } catch (err) {
        console.warn(err.message);
      }
      console.log(
        `readOffset:${this.readOffset}, duration:${this.duration}, ac.currentTime:${this.ac.currentTime}`,
        `generator.readyState:${this.generator.readyState}, audioWriter.desiredSize:${this.audioWriter.desiredSize}`,
        `inputController.desiredSize:${this.inputController.desiredSize}, ac.state:${this.ac.state}`
      );
      if (
        this.transferableWindow ||
        document.body.querySelector(`iframe[src="${this.src}"]`)
      ) {
        document.body.removeChild(this.transferableWindow);
      }
      this.resolve('Stream aborted.');
    };
    this.signal.onabort = this.abortHandler;
  }
  async disconnect(abort = false) {
    if (abort) {
      this.audioReadableAbortable.abort();
    }
    this.msd.disconnect();
    this.osc.disconnect();
    this.outputSource.disconnect();
    this.track.stop();
    try {
      await this.audioWriter.close();
      await this.audioWriter.closed;
      await this.inputReader.cancel();
    } catch (err) {
      throw err;
    }
    this.generator.stop();
    if (this.recorder && this.recorder.state === 'recording') {
      this.recorder.stop();
    }
    return this.ac.close();
  }
  async start() {
    return this.nativeTransferableStream();
  }
  async abort() {
    this.abortable.abort();
    if (this.source) {
      this.source.postMessage('Abort.', '*');
    }
    return this.promise;
  }
  async nativeTransferableStream() {
    return new Promise((resolve) => {
      onmessage = (e) => {
        this.source = e.source;
        if (typeof e.data === 'string') {
          console.log(e.data);
          if (e.data === 'Ready.') {
            this.source.postMessage(this.stdin, '*', [this.stdin]);
          }
          if (e.data === 'Local server off.') {
            document.body.removeChild(this.transferableWindow);
            this.transferableWindow = onmessage = null;
          }
        }
        if (e.data instanceof ReadableStream) {
          this.stdout = e.data;
          resolve(this.audioStream());
        }
      };
      this.transferableWindow = document.createElement('iframe');
      this.transferableWindow.style.display = 'none';
      this.transferableWindow.name = location.href;
      this.transferableWindow.src = this.src;
      document.body.appendChild(this.transferableWindow);
    }).catch((err) => {
      throw err;
    });
  }
  async audioStream() {
    let channelData = [];
    try {
      await this.ac.resume();
      await this.audioWriter.ready;
      await Promise.allSettled([
        this.stdout.pipeTo(
          new WritableStream({
            write: async (value, c) => {
              let i = 0;
              if (!this.init) {
                this.init = true;
                i = 44;
              }
              for (; i < value.buffer.byteLength; i++, this.readOffset++) {
                if (channelData.length === this.channelDataLength) {
                  this.inputController.enqueue(
                    new Uint8Array(
                      channelData.splice(0, this.channelDataLength)
                    )
                  );
                }
                channelData.push(value[i]);
              }
            },
            abort(e) {
              console.error(e.message);
            },
            close: async () => {
              console.log('Done writing input stream.');
              if (channelData.length) {
                this.inputController.enqueue(new Uint8Array(channelData.splice(0, channelData.length)));
              }
              this.inputController.close();
              this.source.postMessage('Done writing input stream.', '*');
            },
          }),
          { signal: this.signal }
        ),
        this.audioReadable.pipeTo(
          new WritableStream({
            write: async ({ timestamp }) => {
              const { value, done } = await this.inputReader.read();
              if (done) {
                await this.inputReader.closed;
                try {
                  await this.disconnect();
                } catch (err) {
                  console.warn(err.message);
                }
                console.log(
                  `readOffset:${this.readOffset}, duration:${this.duration}, ac.currentTime:${this.ac.currentTime}`,
                  `generator.readyState:${this.generator.readyState}, audioWriter.desiredSize:${this.audioWriter.desiredSize}`
                );
                return await Promise.all([
                  new Promise((resolve) => (this.stream.oninactive = resolve)),
                  new Promise((resolve) => (this.ac.onstatechange = resolve)),
                ]);
              }
              const frame = new AudioData({
                format: 's16',
                sampleRate: 22050,
                numberOfChannels: 1,
                numberOfFrames: value.length / 2,
                timestamp,
                data: value,
              });
              this.duration += (frame.duration / 10**6);
              if (this.recorder && this.recorder.state === 'inactive') {
                this.recorder.start();
              }
              await this.audioWriter.write(frame);
            },
            abort(e) {
              console.error(e.message);
            },
            close() {
              console.log('Done reading input stream.');
            },
          }),
          { signal: this.audioReadableSignal }
        ),
      ]);
      this.resolve(
        this.recorder
          ? this.data && (await this.data.arrayBuffer())
          : 'Done streaming.'
      );
      return this.promise;
    } catch (err) {
      console.error(err);
      throw err;
    }
  }
}
