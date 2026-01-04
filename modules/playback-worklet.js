/**
 * PlaybackWorklet
 * 
 * Handles real-time audio streaming playback.
 * 
 * Features:
 * 1. Robust Resampling: Cubic Hermite Interpolation for high-quality sample rate conversion
 *    (e.g., streaming 24kHz audio to a 48kHz AudioContext on Safari).
 * 2. Jitter Buffer: Implements a pre-roll buffer (default 50ms) to prevent underruns
 *    caused by network fluctuation in WebSocket streams.
 * 
 * @class PlaybackWorklet
 * @extends AudioWorkletProcessor
 */

class PlaybackWorklet extends AudioWorkletProcessor {
  static FSM = {
    IDLE: 0,
    PLAYING: 1,
    BUFFERING: 2,
  };

  constructor(options) {
    super();
    this.port.onmessage = this.handleMessage.bind(this);

    // Output sample rate (from AudioContext - e.g., 48000 in Safari)
    this._outputSampleRate = sampleRate;
    // Input sample rate (from incoming audio - e.g., 24000 from Gemini)
    this._inputSampleRate = options?.processorOptions?.sampleRate || sampleRate;
    this._scale = 1 / 32768; // PCM16 -> float

    // Resampling: ratio < 1 means upsampling (stretch audio)
    // e.g., 24000/48000 = 0.5 means advance 0.5 input samples per output sample
    this._resampleRatio = this._inputSampleRate / this._outputSampleRate;

    // HISTORY BUFFER for Cubic Interpolation
    this._history = new Float32Array(4);

    // We want a small "pre-roll" buffer to absorb network jitter.
    // 0.05 seconds of audio usually covers most WebSocket TCP retransmissions.
    // Using Input Sample Rate for calculation since bufferQueue holds input samples.
    const bufferDurationSeconds = 0.05;
    this._minBufferToStart = Math.ceil(this._inputSampleRate * bufferDurationSeconds);

    // Silence detection threshold (1 second) as a fallback safety net
    const silenceDurationSeconds = 1.0;
    this._silenceThresholdBlocks = Math.ceil((this._outputSampleRate * silenceDurationSeconds) / 128);

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
    this._metricsIntervalFrames = Math.max(128, Math.round(this._outputSampleRate / intervalHz));

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
    // Resampling state
    this._resampleAccum = 0; // Accumulated fractional samples
    this._history.fill(0);
  }

  /**
   * Hermite Cubic Interpolation
   * Provides smoother resampling than linear interpolation at negligible CPU cost.
   */
  hermite(y0, y1, y2, y3, mu) {
    const mu2 = mu * mu;
    const a0 = -0.5 * y0 + 1.5 * y1 - 1.5 * y2 + 0.5 * y3;
    const a1 = y0 - 2.5 * y1 + 2 * y2 - 0.5 * y3;
    const a2 = -0.5 * y0 + 0.5 * y2;
    const a3 = y1;
    return a0 * mu * mu2 + a1 * mu2 + a2 * mu + a3;
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
              maxQueuedMs: Math.round((this._maxQueueSamples / this._outputSampleRate) * 1000),
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

      // SAFETY FLUSH: If we were still buffering, force start now to play what we have.
      if (this._state === PlaybackWorklet.FSM.BUFFERING) {
        this._state = PlaybackWorklet.FSM.PLAYING;
        this.port.postMessage({ type: "playback-started" });
      }
      return;
    }

    // Update metrics configuration at runtime
    if (type === "config-metrics" && data && typeof data === "object") {
      if ("enabled" in data) this._metricsEnabled = !!data.enabled;
      if (typeof data.intervalHz === "number" && data.intervalHz > 0) {
        const intervalHz = data.intervalHz;
        this._metricsIntervalFrames = Math.max(128, Math.round(this._outputSampleRate / intervalHz));
      }
      // Reset pacing so the next report aligns with new interval
      this._lastMetricsSentAtFrame = this._framesProcessed;
      return;
    }

    // New audio data has arrived.
    if (type === "audioData" && data instanceof ArrayBuffer) {
      this._noMoreDataReceived = false;

      // If idle, start buffering
      if (this._state === PlaybackWorklet.FSM.IDLE) {
        this._state = PlaybackWorklet.FSM.BUFFERING;
      }

      // Always queue incoming data (valid for BUFFERING and PLAYING)
      if (this._state === PlaybackWorklet.FSM.PLAYING || this._state === PlaybackWorklet.FSM.BUFFERING) {
        this._bufferQueue.push(new Int16Array(data));
        this._silenceFramesCount = 0;
      }
    }
  }

  process(inputs, outputs, parameters) {
    const outputChannel = outputs[0]?.[0];
    if (!outputChannel) {
      return true; // Keep alive even if output is temporarily disconnected
    }

    // Handle BUFFERING state: Wait for enough data before starting
    if (this._state === PlaybackWorklet.FSM.BUFFERING) {
      let totalQueuedSamples = 0;
      if (this._currentChunk) {
        totalQueuedSamples += Math.max(0, this._currentChunk.length - this._currentChunkOffset);
      }
      for (const buffer of this._bufferQueue) {
        totalQueuedSamples += buffer.length;
      }

      if (totalQueuedSamples >= this._minBufferToStart) {
        // Buffer reached! Start playing.
        this._state = PlaybackWorklet.FSM.PLAYING;
        this.port.postMessage({ type: "playback-started" });
      } else {
        // Not enough data yet. Output silence and wait.
        outputChannel.fill(0);
        return true;
      }
    }

    // If we are not playing, just output silence and wait.
    if (this._state !== PlaybackWorklet.FSM.PLAYING) {
      outputChannel.fill(0);
      return true; // Always return true to keep the processor alive
    }

    // Core PLAYING Logic with resampling
    const blockSize = outputChannel.length;
    const ratio = this._resampleRatio;
    const scale = this._scale;
    let outputIdx = 0;

    while (outputIdx < blockSize) {
      // Need a chunk to read from
      if (!this._currentChunk || this._currentChunkOffset >= this._currentChunk.length) {
        if (this._bufferQueue.length > 0) {
          this._currentChunk = this._bufferQueue.shift();
          this._currentChunkOffset = 0;
        } else {
          // Buffer is empty. Check for end conditions.
          const isTimedOut = this._silenceFramesCount > this._silenceThresholdBlocks;

          if (this._noMoreDataReceived || isTimedOut) {
            // END OF PLAYBACK
            if (!this._hasSentEnded) {
              this.port.postMessage({ type: "playback-ended" });
              this._hasSentEnded = true;
            }
            if (this._metricsEnabled) {
              try {
                this.port.postMessage({
                  type: "metrics",
                  data: {
                    state: PlaybackWorklet.FSM.IDLE,
                    queuedSamples: 0,
                    queuedMs: 0,
                    maxQueuedMs: Math.round((this._maxQueueSamples / this._outputSampleRate) * 1000),
                    underrunBlocks: this._underrunBlocks,
                    framesProcessed: this._framesProcessed
                  }
                });
              } catch (_) { }
            }
            this.reset();
            break;
          } else {
            // BUFFER UNDERRUN: Play silence and wait
            // Optionally: If underrun is severe, could go back to BUFFERING?
            // For now, just silence to keep it simple.
            this._silenceFramesCount++;
            if (this._metricsEnabled) this._underrunBlocks++;
            break;
          }
        }
      }

      // Process current chunk
      const src = this._currentChunk;
      const srcLen = src.length;
      const scale = this._scale;

      // FAST PATH: No resampling needed (Input Rate = Output Rate)
      // Use direct copy for max performance (Chrome/Desktop)
      if (Math.abs(this._resampleRatio - 1.0) < 0.001) {
        const samplesToCopy = Math.min(blockSize - outputIdx, srcLen - this._currentChunkOffset);
        for (let i = 0; i < samplesToCopy; i++) {
          outputChannel[outputIdx++] = src[this._currentChunkOffset++] * scale;
        }

        // Update history buffer (just in case we switch modes or need it later)
        if (samplesToCopy > 0) {
          const lastSample = src[this._currentChunkOffset - 1] * scale;
          // Shift and push last sample
          this._history.set(this._history.subarray(1));
          this._history[3] = lastSample;
        }
      }
      // SLOW PATH: High-Quality Cubic Resampling (Safari 24k->48k)
      else {
        while (outputIdx < blockSize && this._currentChunkOffset < srcLen) {
          const mu = this._resampleAccum; // Fractional position (0..1)
          const intIdx = this._currentChunkOffset;

          // Collect 4 samples: y0, y1, y2, y3
          let y0, y1, y2, y3;

          // y1 (Current sample) - Always exists because intIdx < srcLen
          y1 = src[intIdx] * scale;

          // y0 (Previous sample)
          if (intIdx > 0) {
            y0 = src[intIdx - 1] * scale;
          } else {
            y0 = this._history[3]; // Last sample of previous chunk
          }

          // y2 (Next sample)
          if (intIdx + 1 < srcLen) {
            y2 = src[intIdx + 1] * scale;
          } else if (this._bufferQueue.length > 0 && this._bufferQueue[0].length > 0) {
            // Peek first sample of next chunk
            y2 = this._bufferQueue[0][0] * scale;
          } else {
            y2 = y1; // No future data? Clamp to current (Zero Order Hold)
          }

          // y3 (Next + 1 sample)
          if (intIdx + 2 < srcLen) {
            y3 = src[intIdx + 2] * scale;
          } else if (intIdx + 1 < srcLen && this._bufferQueue.length > 0 && this._bufferQueue[0].length > 0) {
            // We are at last sample of current, need first of next
            y3 = this._bufferQueue[0][0] * scale;
          } else if (this._bufferQueue.length > 0) {
            // We are at end of current.
            // If next chunk has at least 2 samples, take the second one.
            if (this._bufferQueue[0].length > 1) {
              y3 = this._bufferQueue[0][1] * scale;
            } else if (this._bufferQueue[0].length > 0) {
              // Next chunk is tiny (1 sample). Just reuse y2 (which is that 1 sample).
              y3 = y2;
            } else {
              y3 = y2; // Should be covered by previous if, but safety first.
            }
          } else {
            y3 = y2; // No futures? Clamp.
          }

          // Hermite Interpolation
          outputChannel[outputIdx] = this.hermite(y0, y1, y2, y3, mu);
          outputIdx++;

          // Advance
          this._resampleAccum += this._resampleRatio;

          // Move integer pointer & Update History
          while (this._resampleAccum >= 1.0) {
            this._resampleAccum -= 1.0;

            // Store 'current' sample into history before moving past it
            // Shift: [0]<-[1]<-[2]<-[3]
            this._history[0] = this._history[1];
            this._history[1] = this._history[2];
            this._history[2] = this._history[3];
            this._history[3] = src[this._currentChunkOffset] * scale;

            this._currentChunkOffset++;

            // If we finish the chunk, break to fetch next one
            if (this._currentChunkOffset >= srcLen) break;
          }
        }
      }
    }

    // Zero-fill the remainder, if any
    if (outputIdx < blockSize) {
      outputChannel.fill(0, outputIdx);
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
              queuedMs: Math.round((queuedSamples / this._outputSampleRate) * 1000),
              maxQueuedMs: Math.round((this._maxQueueSamples / this._outputSampleRate) * 1000),
              underrunBlocks: this._underrunBlocks,
              framesProcessed: this._framesProcessed
            }
          });
        } catch (_) { }
      }
    }

    // ALWAYS return true to keep the processor alive for reuse.
    return true;
  }
}

registerProcessor("playback-worklet", PlaybackWorklet);
