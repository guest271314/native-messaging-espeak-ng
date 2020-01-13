// native-messaging-espeak-ng-bash guest271314 1-11-2020
class AudioDataWorkletStream extends AudioWorkletProcessor {
  constructor(options) {
    super();
    // globalThis.console.log(options.processorOptions);
    if (options.processorOptions) {
      Object.assign(this, options.processorOptions);
    }
    this.port.onmessage = e => {
      const {
        data, fileName
      } = e.data;
      this.fileName = fileName;
      this.data = data;
      this.i = 0;
      this.len = this.data.length;
    }
  }
  process(inputs, outputs) {
    const input = inputs[0];
    const output = outputs[0];
    const inputChannel = input[0];
    const outputChannel = output[0];
    if (this.data !== undefined && this.data instanceof Float32Array && this.i < this.len) {
      for (let n = 0; n < outputChannel.length; this.i++, n++) {
        if (this.i >= this.len) {
          this.port.postMessage({currentTime, currentFrame});
          this.data = void 0;
          this.i = this.len = 0;
          return true;
        };
        outputChannel.set([this.data[this.i]], n, n + 1);
      }
      return true;
    } else {
      for (let n = 0; n < outputChannel.length; n++) {
        outputChannel.set(inputChannel);
      }
      return true;
    }
  }
}
registerProcessor("audio-data-worklet-stream", AudioDataWorkletStream);
