class PlaybackWorklet extends AudioWorkletProcessor {
  constructor() {
    super();
    this.port.onmessage = this.handleMessage.bind(this);
    this.bufferQueue = [];        // Queue to hold incoming ArrayBuffers
    this.currentChunk = null;     // Int16Array view of the ArrayBuffer currently being processed
    this.currentChunkOffset = 0;  // Index offset within the currentChunk

    this.playbackStartedSignalled = false; // Flag to indicate if playback has started
    this.noMoreData = false;          // Flag indicating the main thread won't send more audio data
    this.playedAnyData = false;       // Tracks if any audio data has actually been processed/played

    // Silence Detection
    this.silenceFramesCount = 0;      // Counts consecutive process() calls with no data available from queue
    const silenceDurationSeconds = 1.0; // Duration to consider as silence
    this.silenceThresholdBlocks = Math.ceil((sampleRate * silenceDurationSeconds) / 128);
  }

  handleMessage(event) {
    const data = event.data;

      // The main thread signaled no more audio data will come.
    if (data?.type === "no-more-data") {
      this.noMoreData = true;
      return;
    }

    if (data instanceof ArrayBuffer) {
       this.bufferQueue.push(data);
       this.silenceFramesCount = 0; // Reset silence counter
    } else if (data instanceof Int16Array) {
        const bufferCopy = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
        this.bufferQueue.push(bufferCopy);
        this.silenceFramesCount = 0; // Reset silence counter
     } else {
         console.error("Unsupported data type received.");
     }
  }

  process(inputs, outputs, parameters) {
    // Assume mono output channel
    const outputChannel = outputs[0]?.[0];

    // If no output channel exists (e.g., context closing), stop processing.
    if (!outputChannel) {
        // console.warn("No output channel available. Stopping.");
        return false;
    }

    const blockSize = outputChannel.length; // Number of sample frames needed (typically 128)
    let samplesCopiedThisCycle = 0;

    // Continue until the output buffer for this cycle is full
    while (samplesCopiedThisCycle < blockSize) {
        // Check if we need a new chunk from the queue
        if (!this.currentChunk || this.currentChunkOffset >= this.currentChunk.length) {
            if (this.bufferQueue.length > 0) {
                // Take the next ArrayBuffer and create an Int16Array view
                const nextBuffer = this.bufferQueue.shift();
                this.currentChunk = new Int16Array(nextBuffer);
                this.currentChunkOffset = 0;

                // Signal playback start only once when the first chunk is ready
                if (!this.playbackStartedSignalled) {
                    this.port.postMessage({ type: "playback-started" });
                    this.playbackStartedSignalled = true;
                }
            } else {
                // Buffer queue is empty, and the current chunk (if any) is exhausted.
                // Fill the rest of the output block with silence for this cycle.
                for (let i = samplesCopiedThisCycle; i < blockSize; i++) {
                    outputChannel[i] = 0;
                }
                // Increment silence counter *only if* playback had started
                if(this.playbackStartedSignalled) {
                    this.silenceFramesCount++;
                }
                // Exit the loop for this process() call
                break;
            }
        }

        // Determine how many samples to copy from the current chunk
        const samplesToCopy = Math.min(
            blockSize - samplesCopiedThisCycle,         // Remaining space in output buffer
            this.currentChunk.length - this.currentChunkOffset // Remaining samples in current chunk
        );

        // Copy and convert samples
        for (let i = 0; i < samplesToCopy; i++) {
            outputChannel[samplesCopiedThisCycle + i] = this.currentChunk[this.currentChunkOffset + i] / 32768.0;
        }

        // Update offsets and counters
        this.currentChunkOffset += samplesToCopy;
        samplesCopiedThisCycle += samplesToCopy;
        this.playedAnyData = true;       // Mark that we've processed actual audio data
        this.silenceFramesCount = 0;     // Reset silence counter
    }

    // --- End Condition Checks ---
    const queueIsEmpty = this.bufferQueue.length === 0;
    const currentChunkFinished = !this.currentChunk || this.currentChunkOffset >= this.currentChunk.length;

    // Explicit End: 'no-more-data' received, queue empty, current chunk done, and data was played.
    if (this.noMoreData && queueIsEmpty && currentChunkFinished && this.playedAnyData) {
        this.port.postMessage({ type: "playback-ended" });
        this.resetStateAfterEnd(); // Prepare for potential reuse
        return false; // Stop processing
    }

    // Implicit End (Silence): Silence threshold exceeded after playback started.
    if (this.playbackStartedSignalled && this.silenceFramesCount > this.silenceThresholdBlocks) {
        this.port.postMessage({ type: "playback-ended" });
        console.warn("playback-ended signal detected after silence");
        this.resetStateAfterEnd();
        return false; // Stop processing
    }
    return true;
  }

  // Resets flags after playback ends, allowing potential reuse without full recreation.
  resetStateAfterEnd() {
    this.noMoreData = false;
    this.playbackStartedSignalled = false;
    this.playedAnyData = false;
    this.silenceFramesCount = 0;
  }
}

registerProcessor("playback-worklet", PlaybackWorklet);
