// Client-Side Web Audio API & Audio Processing Utilities
// 100% Client-Side, No Credits Deducted, Complete Privacy

/**
 * 1. Trim Audio Buffer from startSec to endSec
 */
export async function trimAudioBuffer(
  audioBuffer: AudioBuffer,
  startSec: number,
  endSec: number,
  audioContext: AudioContext | BaseAudioContext
): Promise<AudioBuffer> {
  const sampleRate = audioBuffer.sampleRate;
  const numberOfChannels = audioBuffer.numberOfChannels;
  const startOffset = Math.floor(Math.max(0, startSec) * sampleRate);
  const endOffset = Math.min(audioBuffer.length, Math.floor(Math.max(startSec, endSec) * sampleRate));
  const frameCount = Math.max(0, endOffset - startOffset);

  const trimmedBuffer = audioContext.createBuffer(
    numberOfChannels,
    Math.max(1, frameCount),
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
 * 2. Adjust Volume / Gain on AudioBuffer
 */
export async function changeVolumeBuffer(
  audioBuffer: AudioBuffer,
  volumeMultiplier: number, // e.g. 1.5 = 150%, 3.0 = 300%
  audioContext: AudioContext | BaseAudioContext
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
      const val = channelData[i] * volumeMultiplier;
      newChannelData[i] = Math.max(-1, Math.min(1, val));
    }
  }

  return resultBuffer;
}

/**
 * 3. Change Playback Speed (Resample linear interpolation)
 */
export async function changeSpeedBuffer(
  audioBuffer: AudioBuffer,
  speedFactor: number, // 0.25x to 3.0x
  audioContext: AudioContext | BaseAudioContext
): Promise<AudioBuffer> {
  const sampleRate = audioBuffer.sampleRate;
  const numberOfChannels = audioBuffer.numberOfChannels;
  const safeSpeed = Math.max(0.2, Math.min(3.5, speedFactor));
  const newLength = Math.round(audioBuffer.length / safeSpeed);

  const resultBuffer = audioContext.createBuffer(
    numberOfChannels,
    Math.max(1, newLength),
    sampleRate
  );

  for (let channel = 0; channel < numberOfChannels; channel++) {
    const oldData = audioBuffer.getChannelData(channel);
    const newData = resultBuffer.getChannelData(channel);

    for (let i = 0; i < newLength; i++) {
      const oldIndex = i * safeSpeed;
      const indexFloor = Math.floor(oldIndex);
      const indexCeil = Math.min(oldData.length - 1, Math.ceil(oldIndex));
      const fraction = oldIndex - indexFloor;

      newData[i] = (1 - fraction) * (oldData[indexFloor] || 0) + fraction * (oldData[indexCeil] || 0);
    }
  }

  return resultBuffer;
}

/**
 * 4. Reverse AudioBuffer
 */
export async function reverseAudioBuffer(
  audioBuffer: AudioBuffer,
  audioContext: AudioContext | BaseAudioContext
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
 * 5. 5-Band Equalizer (Low 80Hz, Low-Mid 300Hz, Mid 1000Hz, High-Mid 3500Hz, High 10000Hz)
 * Uses BiquadFilterNode in OfflineAudioContext for fast rendering
 */
export async function equalizer5BandBuffer(
  audioBuffer: AudioBuffer,
  lowDb = 0,
  lowMidDb = 0,
  midDb = 0,
  highMidDb = 0,
  highDb = 0
): Promise<AudioBuffer> {
  const offlineCtx = new OfflineAudioContext(
    audioBuffer.numberOfChannels,
    audioBuffer.length,
    audioBuffer.sampleRate
  );

  const source = offlineCtx.createBufferSource();
  source.buffer = audioBuffer;

  // 1. Low Shelf: 80 Hz
  const lowShelf = offlineCtx.createBiquadFilter();
  lowShelf.type = 'lowshelf';
  lowShelf.frequency.value = 80;
  lowShelf.gain.value = lowDb;

  // 2. Low-Mid Peaking: 300 Hz
  const lowMid = offlineCtx.createBiquadFilter();
  lowMid.type = 'peaking';
  lowMid.frequency.value = 300;
  lowMid.Q.value = 1.0;
  lowMid.gain.value = lowMidDb;

  // 3. Mid Peaking: 1000 Hz
  const mid = offlineCtx.createBiquadFilter();
  mid.type = 'peaking';
  mid.frequency.value = 1000;
  mid.Q.value = 1.0;
  mid.gain.value = midDb;

  // 4. High-Mid Peaking: 3500 Hz
  const highMid = offlineCtx.createBiquadFilter();
  highMid.type = 'peaking';
  highMid.frequency.value = 3500;
  highMid.Q.value = 1.0;
  highMid.gain.value = highMidDb;

  // 5. High Shelf: 10000 Hz
  const highShelf = offlineCtx.createBiquadFilter();
  highShelf.type = 'highshelf';
  highShelf.frequency.value = 10000;
  highShelf.gain.value = highDb;

  // Chain: source -> lowShelf -> lowMid -> mid -> highMid -> highShelf -> destination
  source.connect(lowShelf);
  lowShelf.connect(lowMid);
  lowMid.connect(mid);
  mid.connect(highMid);
  highMid.connect(highShelf);
  highShelf.connect(offlineCtx.destination);

  source.start(0);
  return offlineCtx.startRendering();
}

/**
 * 6. Audio Dynamic Range Compressor (DynamicsCompressorNode)
 */
export async function compressAudioBuffer(
  audioBuffer: AudioBuffer,
  thresholdDb = -24,
  ratio = 4,
  attackSec = 0.003,
  releaseSec = 0.25,
  kneeDb = 10
): Promise<AudioBuffer> {
  const offlineCtx = new OfflineAudioContext(
    audioBuffer.numberOfChannels,
    audioBuffer.length,
    audioBuffer.sampleRate
  );

  const source = offlineCtx.createBufferSource();
  source.buffer = audioBuffer;

  const compressor = offlineCtx.createDynamicsCompressor();
  compressor.threshold.value = thresholdDb;
  compressor.knee.value = kneeDb;
  compressor.ratio.value = ratio;
  compressor.attack.value = attackSec;
  compressor.release.value = releaseSec;

  source.connect(compressor);
  compressor.connect(offlineCtx.destination);

  source.start(0);
  return offlineCtx.startRendering();
}

/**
 * 7. Reverb & Space Simulator (ConvolverNode with synthetic impulse response)
 */
export async function reverbEchoBuffer(
  audioBuffer: AudioBuffer,
  preset: 'studio' | 'room' | 'hall' | 'cathedral' = 'hall',
  mixRatio = 0.35 // 0.0 = Dry only, 1.0 = Wet only
): Promise<AudioBuffer> {
  const durationMap = {
    studio: 0.8,
    room: 1.5,
    hall: 2.8,
    cathedral: 4.5,
  };
  const decayDuration = durationMap[preset] || 2.0;

  const offlineCtx = new OfflineAudioContext(
    audioBuffer.numberOfChannels,
    audioBuffer.length + Math.round(decayDuration * audioBuffer.sampleRate),
    audioBuffer.sampleRate
  );

  // Tạo synthetic impulse response
  const sampleRate = offlineCtx.sampleRate;
  const impulseLength = Math.round(sampleRate * decayDuration);
  const impulseBuffer = offlineCtx.createBuffer(2, impulseLength, sampleRate);
  const leftImpulse = impulseBuffer.getChannelData(0);
  const rightImpulse = impulseBuffer.getChannelData(1);

  for (let i = 0; i < impulseLength; i++) {
    const t = i / sampleRate;
    const decay = Math.exp(-t * (4 / decayDuration));
    leftImpulse[i] = (Math.random() * 2 - 1) * decay;
    rightImpulse[i] = (Math.random() * 2 - 1) * decay;
  }

  const source = offlineCtx.createBufferSource();
  source.buffer = audioBuffer;

  const convolver = offlineCtx.createConvolver();
  convolver.buffer = impulseBuffer;

  const dryGain = offlineCtx.createGain();
  const wetGain = offlineCtx.createGain();

  const safeMix = Math.max(0, Math.min(1, mixRatio));
  dryGain.gain.value = 1.0 - safeMix * 0.5;
  wetGain.gain.value = safeMix;

  source.connect(dryGain);
  dryGain.connect(offlineCtx.destination);

  source.connect(convolver);
  convolver.connect(wetGain);
  wetGain.connect(offlineCtx.destination);

  source.start(0);
  return offlineCtx.startRendering();
}

/**
 * 8. Silence Remover: scans energy in 20ms frames and truncates silent gaps
 */
export async function removeSilenceBuffer(
  audioBuffer: AudioBuffer,
  thresholdDb = -40,
  minSilenceSec = 0.35,
  audioContext?: AudioContext | BaseAudioContext
): Promise<AudioBuffer> {
  const ctx = audioContext || new AudioContext();
  const sampleRate = audioBuffer.sampleRate;
  const numChannels = audioBuffer.numberOfChannels;
  const channelData = audioBuffer.getChannelData(0); // Dò tìm theo channel 0

  const linearThreshold = Math.pow(10, thresholdDb / 20);
  const frameSize = Math.round(sampleRate * 0.02); // 20ms window
  const minSilenceFrames = Math.round(minSilenceSec / 0.02);

  const keepFlags = new Uint8Array(Math.ceil(channelData.length / frameSize));
  let silentFrameCount = 0;

  for (let f = 0; f < keepFlags.length; f++) {
    const start = f * frameSize;
    const end = Math.min(channelData.length, start + frameSize);
    let rms = 0;

    for (let i = start; i < end; i++) {
      rms += channelData[i] * channelData[i];
    }
    rms = Math.sqrt(rms / (end - start || 1));

    if (rms < linearThreshold) {
      silentFrameCount++;
      // Giữ lại 3 frame đệm đầu/cuối để không bị giật âm thanh
      keepFlags[f] = silentFrameCount < 3 ? 1 : 0;
    } else {
      silentFrameCount = 0;
      keepFlags[f] = 1;
    }
  }

  // Đếm tổng số sample giữ lại
  let keptSampleCount = 0;
  for (let f = 0; f < keepFlags.length; f++) {
    if (keepFlags[f]) {
      const start = f * frameSize;
      const end = Math.min(channelData.length, start + frameSize);
      keptSampleCount += (end - start);
    }
  }

  const resultBuffer = ctx.createBuffer(
    numChannels,
    Math.max(1, keptSampleCount),
    sampleRate
  );

  for (let ch = 0; ch < numChannels; ch++) {
    const src = audioBuffer.getChannelData(ch);
    const dst = resultBuffer.getChannelData(ch);
    let dstIdx = 0;

    for (let f = 0; f < keepFlags.length; f++) {
      if (keepFlags[f]) {
        const start = f * frameSize;
        const end = Math.min(src.length, start + frameSize);
        for (let i = start; i < end; i++) {
          dst[dstIdx++] = src[i];
        }
      }
    }
  }

  return resultBuffer;
}

/**
 * 9. Audio Normalizer (Peak Normalization to target dB)
 */
export async function normalizeAudioBuffer(
  audioBuffer: AudioBuffer,
  targetPeakDb = -1.0,
  audioContext?: AudioContext | BaseAudioContext
): Promise<AudioBuffer> {
  const ctx = audioContext || new AudioContext();
  const numChannels = audioBuffer.numberOfChannels;
  const frameCount = audioBuffer.length;

  let peak = 0;
  for (let ch = 0; ch < numChannels; ch++) {
    const data = audioBuffer.getChannelData(ch);
    for (let i = 0; i < frameCount; i++) {
      const abs = Math.abs(data[i]);
      if (abs > peak) peak = abs;
    }
  }

  if (peak <= 0.00001) return audioBuffer;

  const targetLinear = Math.pow(10, targetPeakDb / 20);
  const gain = targetLinear / peak;

  const resultBuffer = ctx.createBuffer(numChannels, frameCount, audioBuffer.sampleRate);
  for (let ch = 0; ch < numChannels; ch++) {
    const src = audioBuffer.getChannelData(ch);
    const dst = resultBuffer.getChannelData(ch);
    for (let i = 0; i < frameCount; i++) {
      dst[i] = Math.max(-1, Math.min(1, src[i] * gain));
    }
  }

  return resultBuffer;
}

/**
 * 10. Pitch Shifter (Semitone pitch transposition)
 */
export async function pitchShiftBuffer(
  audioBuffer: AudioBuffer,
  semitones = 0, // -12 to +12
  audioContext?: AudioContext | BaseAudioContext
): Promise<AudioBuffer> {
  if (semitones === 0) return audioBuffer;
  const factor = Math.pow(2, semitones / 12);
  const ctx = audioContext || new AudioContext();

  // Resample approach with length preservation
  const originalLength = audioBuffer.length;
  const sampleRate = audioBuffer.sampleRate;
  const numChannels = audioBuffer.numberOfChannels;

  const resampledLength = Math.round(originalLength / factor);
  const resultBuffer = ctx.createBuffer(numChannels, originalLength, sampleRate);

  for (let ch = 0; ch < numChannels; ch++) {
    const src = audioBuffer.getChannelData(ch);
    const dst = resultBuffer.getChannelData(ch);

    for (let i = 0; i < originalLength; i++) {
      const srcIdx = (i * factor) % originalLength;
      const f = Math.floor(srcIdx);
      const c = Math.min(originalLength - 1, Math.ceil(srcIdx));
      const frac = srcIdx - f;
      dst[i] = (1 - frac) * src[f] + frac * src[c];
    }
  }

  return resultBuffer;
}

/**
 * 11. Voice Changer (Robot, Chipmunk, Monster, Megaphone)
 */
export async function voiceChangeBuffer(
  audioBuffer: AudioBuffer,
  effect: 'robot' | 'chipmunk' | 'monster' | 'megaphone' = 'chipmunk'
): Promise<AudioBuffer> {
  if (effect === 'chipmunk') {
    return pitchShiftBuffer(audioBuffer, 8);
  }

  if (effect === 'monster') {
    // Pitch shift down -6 semitones + low shelf boost
    const lowered = await pitchShiftBuffer(audioBuffer, -7);
    return equalizer5BandBuffer(lowered, 8, 4, 0, -4, -10);
  }

  if (effect === 'megaphone') {
    // Bandpass 400Hz - 3000Hz + clipping saturation
    const filtered = await equalizer5BandBuffer(audioBuffer, -24, -10, 8, 4, -20);
    const ctx = new AudioContext();
    const result = ctx.createBuffer(filtered.numberOfChannels, filtered.length, filtered.sampleRate);
    for (let ch = 0; ch < filtered.numberOfChannels; ch++) {
      const src = filtered.getChannelData(ch);
      const dst = result.getChannelData(ch);
      for (let i = 0; i < filtered.length; i++) {
        // Soft clipping
        const x = src[i] * 2.5;
        dst[i] = Math.tanh(x);
      }
    }
    return result;
  }

  // Robot: Ring modulator modulation (50Hz sine carrier)
  const ctx = new AudioContext();
  const sampleRate = audioBuffer.sampleRate;
  const numChannels = audioBuffer.numberOfChannels;
  const frameCount = audioBuffer.length;
  const result = ctx.createBuffer(numChannels, frameCount, sampleRate);

  const modFreq = 50; // 50 Hz drone
  for (let ch = 0; ch < numChannels; ch++) {
    const src = audioBuffer.getChannelData(ch);
    const dst = result.getChannelData(ch);
    for (let i = 0; i < frameCount; i++) {
      const carrier = Math.sin((2 * Math.PI * modFreq * i) / sampleRate);
      dst[i] = src[i] * carrier * 1.3;
    }
  }

  return result;
}

/**
 * 12. Ringtone Maker (Trim + Fade-in + Fade-out)
 */
export async function ringtoneMakerBuffer(
  audioBuffer: AudioBuffer,
  startSec = 0,
  endSec = 30,
  fadeInSec = 1.5,
  fadeOutSec = 2.0,
  audioContext?: AudioContext | BaseAudioContext
): Promise<AudioBuffer> {
  const ctx = audioContext || new AudioContext();
  const trimmed = await trimAudioBuffer(audioBuffer, startSec, endSec, ctx);
  const sampleRate = trimmed.sampleRate;
  const numChannels = trimmed.numberOfChannels;
  const totalFrames = trimmed.length;

  const fadeInFrames = Math.round(fadeInSec * sampleRate);
  const fadeOutFrames = Math.round(fadeOutSec * sampleRate);
  const fadeOutStart = Math.max(0, totalFrames - fadeOutFrames);

  for (let ch = 0; ch < numChannels; ch++) {
    const data = trimmed.getChannelData(ch);

    // Fade In
    for (let i = 0; i < fadeInFrames && i < totalFrames; i++) {
      data[i] *= (i / fadeInFrames);
    }

    // Fade Out
    for (let i = fadeOutStart; i < totalFrames; i++) {
      const remaining = totalFrames - i;
      data[i] *= (remaining / fadeOutFrames);
    }
  }

  return trimmed;
}

/**
 * 13. Vocal Remover / Karaoke Beat Isolation (Out of Phase Stereo Cancellation)
 */
export async function vocalRemoverBuffer(
  audioBuffer: AudioBuffer,
  mode: 'karaoke_beat' | 'isolate_vocal' = 'karaoke_beat',
  audioContext?: AudioContext | BaseAudioContext
): Promise<AudioBuffer> {
  const ctx = audioContext || new AudioContext();
  const sampleRate = audioBuffer.sampleRate;
  const frameCount = audioBuffer.length;

  // Cần ít nhất 2 kênh (Stereo) để triệt tiêu pha giữa
  if (audioBuffer.numberOfChannels < 2) {
    // Mono: dùng bộ lọc band-reject dải vocal 300Hz - 3400Hz
    if (mode === 'karaoke_beat') {
      return equalizer5BandBuffer(audioBuffer, 2, -18, -18, -4, 2);
    } else {
      return equalizer5BandBuffer(audioBuffer, -24, 6, 6, -2, -20);
    }
  }

  const left = audioBuffer.getChannelData(0);
  const right = audioBuffer.getChannelData(1);

  const resultBuffer = ctx.createBuffer(2, frameCount, sampleRate);
  const outLeft = resultBuffer.getChannelData(0);
  const outRight = resultBuffer.getChannelData(1);

  for (let i = 0; i < frameCount; i++) {
    const l = left[i];
    const r = right[i];

    if (mode === 'karaoke_beat') {
      // Triệt tiêu giọng hát ở giữa (L - R)
      const diff = (l - r) * 0.707;
      outLeft[i] = diff;
      outRight[i] = diff;
    } else {
      // Trích xuất giọng hát trung tâm (L + R) / 2
      const center = (l + r) * 0.5;
      outLeft[i] = center;
      outRight[i] = center;
    }
  }

  return resultBuffer;
}

/**
 * 14. 4-Stems Splitter (Vocals, Drums, Bass, Other) via frequency band isolation
 */
export async function fourStemsBuffer(
  audioBuffer: AudioBuffer,
  stem: 'vocals' | 'drums' | 'bass' | 'other' = 'vocals'
): Promise<AudioBuffer> {
  if (stem === 'bass') {
    // Dải trầm < 200 Hz
    return equalizer5BandBuffer(audioBuffer, 12, 4, -24, -36, -40);
  }
  if (stem === 'vocals') {
    // Dải trung 300 Hz - 3500 Hz
    return equalizer5BandBuffer(audioBuffer, -24, 6, 8, 2, -18);
  }
  if (stem === 'drums') {
    // Dải kích thích âm gõ: kết hợp sub-bass + transient highs
    return equalizer5BandBuffer(audioBuffer, 8, -6, -4, 6, 8);
  }
  // Other (Instrumental / Synth / Air)
  return equalizer5BandBuffer(audioBuffer, -6, 2, 0, 4, 10);
}

/**
 * 15. Noise Reducer (Noise Floor Gate & High-frequency hiss reduction)
 */
export async function noiseReductionBuffer(
  audioBuffer: AudioBuffer,
  level: 'light' | 'medium' | 'strong' = 'medium'
): Promise<AudioBuffer> {
  const dbMap = { light: -45, medium: -35, strong: -25 };
  const threshold = Math.pow(10, dbMap[level] / 20);

  const ctx = new AudioContext();
  const numChannels = audioBuffer.numberOfChannels;
  const frameCount = audioBuffer.length;
  const result = ctx.createBuffer(numChannels, frameCount, audioBuffer.sampleRate);

  for (let ch = 0; ch < numChannels; ch++) {
    const src = audioBuffer.getChannelData(ch);
    const dst = result.getChannelData(ch);

    for (let i = 0; i < frameCount; i++) {
      const abs = Math.abs(src[i]);
      if (abs < threshold) {
        // Suy hao 85% biên độ nếu nằm dưới ngưỡng sàn nhiễu
        dst[i] = src[i] * 0.15;
      } else {
        dst[i] = src[i];
      }
    }
  }

  // Áp dụng thêm bộ lọc khử tiếng rít cao tần (hiss)
  return equalizer5BandBuffer(result, 0, 0, 0, -3, -8);
}

/**
 * 16. Audio Mixer: Mix multiple buffers together with custom volume gains
 */
export async function mixAudioBuffers(
  buffers: AudioBuffer[],
  gains: number[] = [1.0, 1.0],
  audioContext?: AudioContext | BaseAudioContext
): Promise<AudioBuffer> {
  if (buffers.length === 0) throw new Error('Không có track nào để trộn.');
  if (buffers.length === 1) return buffers[0];

  const ctx = audioContext || new AudioContext();
  const sampleRate = buffers[0].sampleRate;
  const maxLength = Math.max(...buffers.map((b) => b.length));
  const numChannels = Math.max(...buffers.map((b) => b.numberOfChannels));

  const result = ctx.createBuffer(numChannels, maxLength, sampleRate);

  for (let ch = 0; ch < numChannels; ch++) {
    const outData = result.getChannelData(ch);

    for (let b = 0; b < buffers.length; b++) {
      const buf = buffers[b];
      const gain = gains[b] ?? 1.0;
      const srcData = buf.getChannelData(Math.min(ch, buf.numberOfChannels - 1));

      for (let i = 0; i < buf.length; i++) {
        outData[i] += srcData[i] * gain;
      }
    }

    // Clamping to avoid distortion
    for (let i = 0; i < maxLength; i++) {
      outData[i] = Math.max(-1, Math.min(1, outData[i]));
    }
  }

  return result;
}

/**
 * 17. Convert AudioBuffer to WAV Blob for download
 */
export function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const out = new DataView(new ArrayBuffer(length));
  let sampleRate = buffer.sampleRate;
  let pos = 0;

  function setUint16(data: number) {
    out.setUint16(pos, data, true);
    pos += 2;
  }

  function setUint32(data: number) {
    out.setUint32(pos, data, true);
    pos += 4;
  }

  // RIFF header
  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8);
  setUint32(0x45564157); // "WAVE"

  // fmt chunk
  setUint32(0x20746d66); // "fmt "
  setUint32(16);
  setUint16(1); // PCM
  setUint16(numOfChan);
  setUint32(sampleRate);
  setUint32(sampleRate * 2 * numOfChan);
  setUint16(numOfChan * 2);
  setUint16(16);

  // data chunk
  setUint32(0x61746164); // "data"
  setUint32(length - pos - 4);

  const channels: Float32Array[] = [];
  for (let i = 0; i < numOfChan; i++) {
    channels.push(buffer.getChannelData(i));
  }

  let offset = 0;
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
