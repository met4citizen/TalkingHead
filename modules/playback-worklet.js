class PlaybackWorklet extends AudioWorkletProcessor {
  static FSM = {
    IDLE: 0,
    PLAYING: 1,
  };

  constructor(options) {
    super();
    this.port.onmessage = this.handleMessage.bind(this);

    this._sampleRate = options?.processorOptions?.sampleRate || sampleRate;
    this._scale = 1 / 32768; // PCM16 -> float

    // Silence detection threshold (1 second) as a fallback safety net
    const silenceDurationSeconds = 1.0;
    this._silenceThresholdBlocks = Math.ceil((this._sampleRate * silenceDurationSeconds) / 128);

    // Metrics configuration via options
    const metricsCfg = options?.processorOptions?.metrics || {};
    this._metricsEnabled = metricsCfg.enabled !== false;
    const intervalHz = (typeof metricsCfg.intervalHz === "number" && metricsCfg.intervalHz > 0)
      ? metricsCfg.intervalHz : 2;
    // Metrics state (low-overhead)
    this._framesProcessed = 0;
    this._underrunBlocks = 0;
    this._maxQueueSamples = 0;
    this._lastMetricsSentAtFrame = 0;
    // Convert to frames between reports
    this._metricsIntervalFrames = Math.max(128, Math.round(this._sampleRate / intervalHz));

    this.reset();
  }

  /**
   * Resets the worklet to its initial IDLE state.
   */
  reset() {
    this._bufferQueue = [];
    this._currentChunk = null;
    this._currentChunkOffset = 0;
    this._state = PlaybackWorklet.FSM.IDLE;

    this._noMoreDataReceived = false;
    this._silenceFramesCount = 0;
    this._hasSentEnded = false;
    // Reset max queue tracker only when going idle
    this._maxQueueSamples = 0;
  }

  handleMessage(event) {
    const { type, data } = event.data;

    // INTERRUPT: The main thread wants to stop immediately.
    if (type === "stop") {
      this.reset();
      // Send final metrics showing cleared state
      if (this._metricsEnabled) {
        try {
          this.port.postMessage({
            type: "metrics",
            data: {
              state: PlaybackWorklet.FSM.IDLE,
              queuedSamples: 0,
              queuedMs: 0,
              maxQueuedMs: Math.round((this._maxQueueSamples / this._sampleRate) * 1000),
              underrunBlocks: this._underrunBlocks,
              framesProcessed: this._framesProcessed
            }
          });
        } catch (_) { }
      }
      return;
    }

    // Main thread has signaled that no more audio chunks will be sent for this utterance.
    if (type === "no-more-data") {
      this._noMoreDataReceived = true;
      return;
    }

    // Update metrics configuration at runtime
    if (type === "config-metrics" && data && typeof data === "object") {
      if ("enabled" in data) this._metricsEnabled = !!data.enabled;
      if (typeof data.intervalHz === "number" && data.intervalHz > 0) {
        const intervalHz = data.intervalHz;
        this._metricsIntervalFrames = Math.max(128, Math.round(this._sampleRate / intervalHz));
      }
      // Reset pacing so the next report aligns with new interval
      this._lastMetricsSentAtFrame = this._framesProcessed;
      return;
    }

    // New audio data has arrived.
    if (type === "audioData" && data instanceof ArrayBuffer) {
      this._noMoreDataReceived = false;
      // If we were idle, this new data kicks off the playback.
      if (this._state === PlaybackWorklet.FSM.IDLE) {
        this._state = PlaybackWorklet.FSM.PLAYING;
        this.port.postMessage({ type: "playback-started" });
      }

      // We only queue data if we are in the PLAYING state. This prevents
      // data from a previous, interrupted stream from lingering.
      if (this._state === PlaybackWorklet.FSM.PLAYING) {
        // Store as Int16Array view to avoid constructing it in process()
        this._bufferQueue.push(new Int16Array(data));
        this._silenceFramesCount = 0; // Reset silence counter on new data
      }
    }
  }

  process(inputs, outputs, parameters) {
    const outputChannel = outputs[0]?.[0];
    if (!outputChannel) {
      return true; // Keep alive even if output is temporarily disconnected
    }

    // If we are not playing, just output silence and wait.
    if (this._state !== PlaybackWorklet.FSM.PLAYING) {
      outputChannel.fill(0);
      return true; // Always return true to keep the processor alive
    }

    // Core PLAYING Logic
    const blockSize = outputChannel.length;
    let samplesCopied = 0;

    while (samplesCopied < blockSize) {
      if (!this._currentChunk || this._currentChunkOffset >= this._currentChunk.length) {
        if (this._bufferQueue.length > 0) {
          this._currentChunk = this._bufferQueue.shift();
          this._currentChunkOffset = 0;
        } else {
          // Buffer is empty. Check for end conditions.
          const isTimedOut = this._silenceFramesCount > this._silenceThresholdBlocks;

          if (this._noMoreDataReceived || isTimedOut) {
            // END OF PLAYBACK: Either explicitly signaled or timed out.
            if (!this._hasSentEnded) {
              this.port.postMessage({ type: "playback-ended" });
              this._hasSentEnded = true;
            }
            // Send final metrics showing cleared state
            if (this._metricsEnabled) {
              try {
                this.port.postMessage({
                  type: "metrics",
                  data: {
                    state: PlaybackWorklet.FSM.IDLE,
                    queuedSamples: 0,
                    queuedMs: 0,
                    maxQueuedMs: Math.round((this._maxQueueSamples / this._sampleRate) * 1000),
                    underrunBlocks: this._underrunBlocks,
                    framesProcessed: this._framesProcessed
                  }
                });
              } catch (_) { }
            }
            this.reset(); // Reset to IDLE state for reuse
            break; // Exit while loop
          } else {
            // BUFFER UNDERRUN (LAG): Play silence and wait for more data.
            this._silenceFramesCount++;
            if (this._metricsEnabled) this._underrunBlocks++;
            break; // Exit while loop
          }
        }
      }

      // If we have a chunk (could be a new one from the logic above), process it.
      if (this._currentChunk) {
        const samplesToCopy = Math.min(
          blockSize - samplesCopied,
          this._currentChunk.length - this._currentChunkOffset
        );
        // Directly write to outputChannel to avoid extra copy
        const src = this._currentChunk;
        const baseSrc = this._currentChunkOffset;
        const baseDst = samplesCopied;
        const scale = this._scale;
        for (let i = 0; i < samplesToCopy; i++) {
          outputChannel[baseDst + i] = src[baseSrc + i] * scale;
        }

        this._currentChunkOffset += samplesToCopy;
        samplesCopied += samplesToCopy;
      }
    }

    // Zero-fill the remainder, if any, once per block
    if (samplesCopied < blockSize) {
      outputChannel.fill(0, samplesCopied);
    }

    // Update metrics (optional)
    if (this._metricsEnabled) {
      this._framesProcessed += blockSize;

      // Track queue depth in samples (approximate)
      let queuedSamples = 0;
      if (this._currentChunk) queuedSamples += Math.max(0, this._currentChunk.length - this._currentChunkOffset);
      for (let i = 0; i < this._bufferQueue.length; i++) queuedSamples += this._bufferQueue[i].length;
      if (queuedSamples > this._maxQueueSamples) this._maxQueueSamples = queuedSamples;

      // Periodically send metrics to main thread
      if (this._framesProcessed - this._lastMetricsSentAtFrame >= this._metricsIntervalFrames) {
        this._lastMetricsSentAtFrame = this._framesProcessed;
        try {
          this.port.postMessage({
            type: "metrics",
            data: {
              state: this._state,
              queuedSamples,
              queuedMs: Math.round((queuedSamples / this._sampleRate) * 1000),
              maxQueuedMs: Math.round((this._maxQueueSamples / this._sampleRate) * 1000),
              underrunBlocks: this._underrunBlocks,
              framesProcessed: this._framesProcessed
            }
          });
        } catch (_) { }
        // Don't reset max tracker - keep session peak until idle
      }
    }

    // ALWAYS return true to keep the processor alive for reuse.
    return true;
  }
}

registerProcessor("playback-worklet", PlaybackWorklet);
