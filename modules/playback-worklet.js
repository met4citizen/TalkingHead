class PlaybackWorklet extends AudioWorkletProcessor {
  constructor() {
    super();
    this.port.onmessage = this.handleMessage.bind(this);
    this.port.on;
    this.buffer = [];
    this.framesOfSilence = -1;    // -1 = haven't started receiving data yet
    this.silenceThreshold = 1000;  // e.g. ~1000 blocks of silence
    this.noMoreData = false;          // flag indicating no more audio data is coming
  }

  handleMessage(event) {
    if (!event.data) {
      this.buffer = [];
      return;
    }

    if (event.data.type === 'no-more-data') {
      // The main thread says no more audio chunks will arrive
      this.noMoreData = true;
      return;
    }

    this.buffer.push(...event.data);
  }

  process(inputs, outputs, parameters) {
    const output = outputs[0];
    const channel = output[0];

    // Detect start of audio
    if(this.buffer.length > 0 && this.framesOfSilence === -1) {
      this.framesOfSilence = 0;
      this.port.postMessage({ type: 'playback-started' });
    }
    
    // Silence tracker
    if (this.buffer.length > 0) {
      this.framesOfSilence = 0;
    }
    else if (this.framesOfSilence !== -1) {
      this.framesOfSilence++;
    }
    
    // Play audio
    if (this.buffer.length > channel.length) {
      const toProcess = this.buffer.splice(0, channel.length);
      channel.set(toProcess.map((v) => v / 32768));
    } else {
      // console.log("buffer.length", this.buffer.length, "channel.length", channel.length, Date.now());
      channel.set(this.buffer.map((v) => v / 32768));
      this.buffer = [];
    }

    // If noMoreData was set AND we have fully drained the buffer => end
    if (this.noMoreData && this.buffer.length === 0) {
      this.port.postMessage({ type: 'playback-ended' });
      console.warn('[PlaybackWorklet] ended after noMoreData + buffer consumed');
      return false;
    }

    // Fallback silence detection logic
    if (this.framesOfSilence > this.silenceThreshold) {
      this.port.postMessage({ type: 'playback-ended' });
      console.warn('playback-ended signal detected after silence');
      this.framesOfSilence = -1; // Reset to avoid sending multiple signals
      return false;
    }
    return true;
  }
}

registerProcessor("playback-worklet", PlaybackWorklet);
