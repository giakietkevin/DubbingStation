// Client-Side Web Audio API & Audio Processing Utilities
// 100% Client-Side, No Credits Deducted, Complete Privacy

/**
 * Trim Audio Buffer from startSec to endSec
 */
export async function trimAudioBuffer(
  audioBuffer: AudioBuffer,
  startSec: number,
  endSec: number,
  audioContext: AudioContext
): Promise<AudioBuffer> {
  const sampleRate = audioBuffer.sampleRate;
  const numberOfChannels = audioBuffer.numberOfChannels;
  const startOffset = Math.floor(startSec * sampleRate);
  const endOffset = Math.floor(endSec * sampleRate);
  const frameCount = Math.max(0, endOffset - startOffset);

  const trimmedBuffer = audioContext.createBuffer(
    numberOfChannels,
    frameCount,
    sampleRate
  );

  for (let channel = 0; channel < numberOfChannels; channel++) {
    const channelData = audioBuffer.getChannelData(channel);
    const newChannelData = trimmedBuffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      newChannelData[i] = channelData[startOffset + i] || 0;
    }
  }

  return trimmedBuffer;
}

/**
 * Adjust Volume / Gain on AudioBuffer
 */
export async function changeVolumeBuffer(
  audioBuffer: AudioBuffer,
  volumeMultiplier: number, // e.g. 1.5 = 150%, 3.0 = 300%
  audioContext: AudioContext
): Promise<AudioBuffer> {
  const sampleRate = audioBuffer.sampleRate;
  const numberOfChannels = audioBuffer.numberOfChannels;
  const frameCount = audioBuffer.length;

  const resultBuffer = audioContext.createBuffer(
    numberOfChannels,
    frameCount,
    sampleRate
  );

  for (let channel = 0; channel < numberOfChannels; channel++) {
    const channelData = audioBuffer.getChannelData(channel);
    const newChannelData = resultBuffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      // Clamping between -1.0 and 1.0 to prevent severe distortion
      const val = channelData[i] * volumeMultiplier;
      newChannelData[i] = Math.max(-1, Math.min(1, val));
    }
  }

  return resultBuffer;
}

/**
 * Change Playback Speed (Resample approach or Time-stretch)
 */
export async function changeSpeedBuffer(
  audioBuffer: AudioBuffer,
  speedFactor: number, // 0.5x to 2.0x
  audioContext: AudioContext
): Promise<AudioBuffer> {
  const sampleRate = audioBuffer.sampleRate;
  const numberOfChannels = audioBuffer.numberOfChannels;
  const newLength = Math.round(audioBuffer.length / speedFactor);

  const resultBuffer = audioContext.createBuffer(
    numberOfChannels,
    newLength,
    sampleRate
  );

  for (let channel = 0; channel < numberOfChannels; channel++) {
    const oldData = audioBuffer.getChannelData(channel);
    const newData = resultBuffer.getChannelData(channel);

    for (let i = 0; i < newLength; i++) {
      const oldIndex = i * speedFactor;
      const indexFloor = Math.floor(oldIndex);
      const indexCeil = Math.min(oldData.length - 1, Math.ceil(oldIndex));
      const fraction = oldIndex - indexFloor;

      // Linear interpolation
      newData[i] = (1 - fraction) * oldData[indexFloor] + fraction * oldData[indexCeil];
    }
  }

  return resultBuffer;
}

/**
 * Reverse AudioBuffer
 */
export async function reverseAudioBuffer(
  audioBuffer: AudioBuffer,
  audioContext: AudioContext
): Promise<AudioBuffer> {
  const sampleRate = audioBuffer.sampleRate;
  const numberOfChannels = audioBuffer.numberOfChannels;
  const frameCount = audioBuffer.length;

  const resultBuffer = audioContext.createBuffer(
    numberOfChannels,
    frameCount,
    sampleRate
  );

  for (let channel = 0; channel < numberOfChannels; channel++) {
    const channelData = audioBuffer.getChannelData(channel);
    const newChannelData = resultBuffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      newChannelData[i] = channelData[frameCount - 1 - i];
    }
  }

  return resultBuffer;
}

/**
 * Convert AudioBuffer to WAV Blob for download
 */
export function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const out = new DataView(new ArrayBuffer(length));
  const channels: Float32Array[] = [];
  let sampleRate = buffer.sampleRate;
  let offset = 0;
  let pos = 0;

  function setUint16(data: number) {
    out.setUint16(pos, data, true);
    pos += 2;
  }

  function setUint32(data: number) {
    out.setUint32(pos, data, true);
    pos += 4;
  }

  // write WAVE header
  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8); // file length - 8
  setUint32(0x45564157); // "WAVE"

  setUint32(0x20746d66); // "fmt " chunk
  setUint32(16); // length = 16
  setUint16(1); // PCM (uncompressed)
  setUint16(numOfChan);
  setUint32(sampleRate);
  setUint32(sampleRate * 2 * numOfChan); // avg. bytes/sec
  setUint16(numOfChan * 2); // block-align
  setUint16(16); // 16-bit int

  setUint32(0x61746164); // "data" - chunk
  setUint32(length - pos - 4); // chunk length

  for (let i = 0; i < buffer.numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  while (pos < length) {
    for (let i = 0; i < numOfChan; i++) {
      let sample = Math.max(-1, Math.min(1, channels[i][offset] || 0));
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
      out.setInt16(pos, sample, true);
      pos += 2;
    }
    offset++;
  }

  return new Blob([out.buffer], { type: 'audio/wav' });
}
