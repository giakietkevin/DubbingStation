/**
 * Digital Signal Processing (DSP) for Vocal Timbre and Formant Reshaping
 * Enables authentic voice cloning by shaping the acoustic spectrum, formants,
 * chest warmth, and presence of synthesized audio to match uploaded voice samples.
 */

export interface VocalTimbreParams {
  warmth?: number;      // -50 to +50: Chest resonance & low-mid warmth (200Hz - 450Hz)
  brightness?: number;  // -50 to +50: Vocal tract presence & air (2.8kHz - 6kHz)
  fullness?: number;    // -50 to +50: Harmonic vocal body & resonance
  formantF1?: number;   // Measured F1 formant frequency in Hz (vocal opening)
  formantF2?: number;   // Measured F2 formant frequency in Hz (oral articulation)
}

interface BiquadCoeffs {
  b0: number;
  b1: number;
  b2: number;
  a1: number;
  a2: number;
}

/**
 * Creates peaking / bell EQ filter coefficients
 */
function createPeakingFilter(sampleRate: number, freq: number, q: number, gainDb: number): BiquadCoeffs {
  const clampedFreq = Math.max(40, Math.min(sampleRate * 0.48, freq));
  const w0 = (2 * Math.PI * clampedFreq) / sampleRate;
  const alpha = Math.sin(w0) / (2 * Math.max(0.1, q));
  const A = Math.pow(10, gainDb / 40);

  const b0 = 1 + alpha * A;
  const b1 = -2 * Math.cos(w0);
  const b2 = 1 - alpha * A;
  const a0 = 1 + alpha / A;
  const a1 = -2 * Math.cos(w0);
  const a2 = 1 - alpha / A;

  return {
    b0: b0 / a0,
    b1: b1 / a0,
    b2: b2 / a0,
    a1: a1 / a0,
    a2: a2 / a0,
  };
}

/**
 * Creates low-shelf filter for chest warmth
 */
function createLowShelfFilter(sampleRate: number, freq: number, gainDb: number): BiquadCoeffs {
  const clampedFreq = Math.max(40, Math.min(sampleRate * 0.4, freq));
  const w0 = (2 * Math.PI * clampedFreq) / sampleRate;
  const A = Math.pow(10, gainDb / 40);
  const S = 1;
  const alpha = (Math.sin(w0) / 2) * Math.sqrt((A + 1 / A) * (1 / S - 1) + 2);
  const cosW0 = Math.cos(w0);
  const twoSqrtAAlpha = 2 * Math.sqrt(A) * alpha;

  const b0 = A * (A + 1 - (A - 1) * cosW0 + twoSqrtAAlpha);
  const b1 = 2 * A * (A - 1 - (A + 1) * cosW0);
  const b2 = A * (A + 1 - (A - 1) * cosW0 - twoSqrtAAlpha);
  const a0 = A + 1 + (A - 1) * cosW0 + twoSqrtAAlpha;
  const a1 = -2 * (A - 1 + (A + 1) * cosW0);
  const a2 = A + 1 + (A - 1) * cosW0 - twoSqrtAAlpha;

  return {
    b0: b0 / a0,
    b1: b1 / a0,
    b2: b2 / a0,
    a1: a1 / a0,
    a2: a2 / a0,
  };
}

/**
 * Applies biquad filter in Direct Form II Transposed on 16-bit PCM float samples
 */
function processBiquad(samples: Float32Array, coeffs: BiquadCoeffs): void {
  let s1 = 0;
  let s2 = 0;
  const { b0, b1, b2, a1, a2 } = coeffs;

  for (let i = 0; i < samples.length; i++) {
    const x = samples[i];
    const y = b0 * x + s1;
    s1 = b1 * x - a1 * y + s2;
    s2 = b2 * x - a2 * y;
    samples[i] = y;
  }
}

/**
 * Soft saturation to simulate natural vocal cord harmonics
 */
function applyVocalSaturation(samples: Float32Array, drive: number): void {
  if (drive <= 1.0) return;
  for (let i = 0; i < samples.length; i++) {
    const x = samples[i] * drive;
    // Cubic soft-clipper curve
    if (x > 1.0) {
      samples[i] = 1.0;
    } else if (x < -1.0) {
      samples[i] = -1.0;
    } else {
      samples[i] = (1.5 * x - 0.5 * Math.pow(x, 3)) / drive;
    }
  }
}

/**
 * Main entry: Process raw 16-bit signed PCM audio buffer with vocal timbre shaping
 */
export function applyVocalTimbreDSP(
  pcmBuffer: Buffer,
  sampleRate: number = 22050,
  timbre: VocalTimbreParams
): Buffer {
  const warmth = timbre.warmth ?? 0;
  const brightness = timbre.brightness ?? 0;
  const fullness = timbre.fullness ?? 0;
  const formantF1 = timbre.formantF1 ?? 0;
  const formantF2 = timbre.formantF2 ?? 0;

  // If neutral parameters, return original buffer
  if (
    warmth === 0 &&
    brightness === 0 &&
    fullness === 0 &&
    formantF1 === 0 &&
    formantF2 === 0
  ) {
    return pcmBuffer;
  }

  const sampleCount = Math.floor(pcmBuffer.length / 2);
  const floatSamples = new Float32Array(sampleCount);

  // Convert 16-bit signed integer buffer to normalized float (-1.0 to 1.0)
  for (let i = 0; i < sampleCount; i++) {
    const int16 = pcmBuffer.readInt16LE(i * 2);
    floatSamples[i] = int16 / 32768.0;
  }

  // 1. Apply Formant F1 Shaper (Vocal tract opening: 350Hz - 850Hz)
  if (formantF1 > 0) {
    // Boost or sculpt measured F1 resonance
    const f1GainDb = (warmth > 0 ? 3.5 : 1.5);
    const f1Filter = createPeakingFilter(sampleRate, formantF1, 2.2, f1GainDb);
    processBiquad(floatSamples, f1Filter);
  }

  // 2. Apply Formant F2 Shaper (Oral vowel placement: 1200Hz - 2400Hz)
  if (formantF2 > 0) {
    const f2GainDb = (brightness > 0 ? 3.0 : 1.5);
    const f2Filter = createPeakingFilter(sampleRate, formantF2, 2.5, f2GainDb);
    processBiquad(floatSamples, f2Filter);
  }

  // 3. Apply Chest Warmth (Low-shelf around 280Hz, range -6dB to +8dB)
  if (warmth !== 0) {
    const warmthGainDb = (warmth / 50) * 6.5; // -6.5dB to +6.5dB
    const warmthFilter = createLowShelfFilter(sampleRate, 280, warmthGainDb);
    processBiquad(floatSamples, warmthFilter);
  }

  // 4. Apply Vocal Presence / Brightness (Peaking at 3.6kHz, range -6dB to +7dB)
  if (brightness !== 0) {
    const brightnessGainDb = (brightness / 50) * 6.0;
    const brightnessFilter = createPeakingFilter(sampleRate, 3600, 1.4, brightnessGainDb);
    processBiquad(floatSamples, brightnessFilter);
  }

  // 5. Apply Harmonic Fullness & Saturation
  if (fullness > 0) {
    const drive = 1.0 + (fullness / 50) * 0.45; // 1.0 to 1.45
    applyVocalSaturation(floatSamples, drive);
  }

  // 6. Output Limiter & Normalization to prevent any clipping
  let peak = 0;
  for (let i = 0; i < sampleCount; i++) {
    const abs = Math.abs(floatSamples[i]);
    if (abs > peak) peak = abs;
  }

  const outputGain = peak > 0.95 ? 0.95 / peak : 1.0;

  // Convert back to 16-bit signed integer buffer
  const outBuffer = Buffer.alloc(pcmBuffer.length);
  for (let i = 0; i < sampleCount; i++) {
    let s = floatSamples[i] * outputGain;
    s = Math.max(-1.0, Math.min(1.0, s));
    const int16Val = Math.round(s * 32767);
    outBuffer.writeInt16LE(int16Val, i * 2);
  }

  return outBuffer;
}
