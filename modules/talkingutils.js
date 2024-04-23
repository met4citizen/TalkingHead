/**
* Convert a Base64 MP3 chunk to ArrayBuffer.
* @param {string} chunk Base64 encoded chunk
* @return {ArrayBuffer} ArrayBuffer
*/

export function b64ToArrayBuffer(chunk) {

  // Calculate the needed total buffer length
  let bufLen = 3 * chunk.length / 4;
  if (chunk[chunk.length - 1] === '=') {
    bufLen--;
    if (chunk[chunk.length - 2] === '=') {
      bufLen--;
    }
  }

  // Create the ArrayBuffer
  const arrBuf = new ArrayBuffer(bufLen);
  const arr = new Uint8Array(arrBuf);
  let i, p = 0, c1, c2, c3, c4;

  // Populate the buffer
  for (i = 0; i < chunk.length; i += 4) {
    c1 = this.b64Lookup[chunk.charCodeAt(i)];
    c2 = this.b64Lookup[chunk.charCodeAt(i+1)];
    c3 = this.b64Lookup[chunk.charCodeAt(i+2)];
    c4 = this.b64Lookup[chunk.charCodeAt(i+3)];
    arr[p++] = (c1 << 2) | (c2 >> 4);
    arr[p++] = ((c2 & 15) << 4) | (c3 >> 2);
    arr[p++] = ((c3 & 3) << 6) | (c4 & 63);
  }

  return arrBuf;
}

/**
* Concatenate an array of ArrayBuffers.
* @param {ArrayBuffer[]} bufs Array of ArrayBuffers
* @return {ArrayBuffer} Concatenated ArrayBuffer
*/
export function concatArrayBuffers(bufs) {
  let len = 0;
  for( let i=0; i<bufs.length; i++ ) {
    len += bufs[i].byteLength;
  }
  let buf = new ArrayBuffer(len);
  let arr = new Uint8Array(buf);
  let p = 0;
  for( let i=0; i<bufs.length; i++ ) {
    arr.set( new Uint8Array(bufs[i]), p);
    p += bufs[i].byteLength;
  }
  return buf;
}


/**
* Convert PCM buffer to AudioBuffer.
* NOTE: Only signed 16bit little endian supported.
* @param {ArrayBuffer} buf PCM buffer
* @return {AudioBuffer} AudioBuffer
*/
export function pcmToAudioBuffer(buf) {
  const arr = new Int16Array(buf);
  const floats = new Float32Array(arr.length);
  for( let i=0; i<arr.length; i++ ) {
    floats[i] = (arr[i] >= 0x8000) ? -(0x10000 - arr[i]) / 0x8000 : arr[i] / 0x7FFF;
  }
  const audio = this.audioCtx.createBuffer(1, floats.length, this.opt.pcmSampleRate );
  audio.copyToChannel( floats, 0 , 0 );
  return audio;
}
