import type { SubtitleCue } from '@/lib/subtitleParser';

interface SpeakerFeature {
  cue: SubtitleCue;
  pitch: number;
  energy: number;
  zeroCrossingRate: number;
  spectralCentroid: number;
}

function estimatePitch(samples: Float32Array, sampleRate: number): number {
  const minLag = Math.floor(sampleRate / 360);
  const maxLag = Math.floor(sampleRate / 70);
  let bestLag = 0;
  let bestCorrelation = 0;

  for (let lag = minLag; lag <= maxLag; lag += 1) {
    let correlation = 0;
    let energy = 0;
    for (let index = 0; index < samples.length - lag; index += 4) {
      correlation += samples[index] * samples[index + lag];
      energy += samples[index] * samples[index];
    }
    const normalized = energy > 0 ? correlation / energy : 0;
    if (normalized > bestCorrelation) {
      bestCorrelation = normalized;
      bestLag = lag;
    }
  }

  return bestLag > 0 && bestCorrelation > 0.2 ? sampleRate / bestLag : 0;
}

function estimateSpectralFeatures(samples: Float32Array, sampleRate: number): { zeroCrossingRate: number; spectralCentroid: number } {
  if (samples.length < 2) return { zeroCrossingRate: 0, spectralCentroid: 0 };

  let zeroCrossings = 0;
  let weightedFrequency = 0;
  let totalWeight = 0;
  const windowSize = Math.min(samples.length, 2048);
  const step = Math.max(1, Math.floor(samples.length / windowSize));

  for (let index = step; index < samples.length; index += step) {
    if ((samples[index - step] < 0) !== (samples[index] < 0)) zeroCrossings += 1;
  }

  // A small sampled DFT gives a useful vocal brightness feature without another audio library.
  for (let bin = 1; bin <= 32; bin += 1) {
    let real = 0;
    let imaginary = 0;
    for (let index = 0; index < samples.length; index += step) {
      const angle = (2 * Math.PI * bin * index) / samples.length;
      real += samples[index] * Math.cos(angle);
      imaginary -= samples[index] * Math.sin(angle);
    }
    const magnitude = Math.sqrt(real * real + imaginary * imaginary);
    const frequency = (bin * sampleRate) / (samples.length / step);
    weightedFrequency += frequency * magnitude;
    totalWeight += magnitude;
  }

  return {
    zeroCrossingRate: zeroCrossings / Math.max(1, samples.length / step),
    spectralCentroid: totalWeight > 0 ? weightedFrequency / totalWeight : 0,
  };
}

export async function detectSpeakersFromVideo(file: File, cues: SubtitleCue[]): Promise<SubtitleCue[]> {
  const AudioContextConstructor = window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextConstructor) throw new Error('Trình duyệt không hỗ trợ phân tích speaker.');

  const context = new AudioContextConstructor();
  try {
    const decoded = await context.decodeAudioData(await file.arrayBuffer());
    const mono = new Float32Array(decoded.length);
    for (let channel = 0; channel < decoded.numberOfChannels; channel += 1) {
      const data = decoded.getChannelData(channel);
      for (let index = 0; index < data.length; index += 1) mono[index] += data[index] / decoded.numberOfChannels;
    }

    const features: SpeakerFeature[] = cues.map((cue) => {
      const start = Math.max(0, Math.floor(cue.startTime * decoded.sampleRate));
      const end = Math.min(mono.length, Math.ceil(cue.endTime * decoded.sampleRate));
      const segment = mono.slice(start, end);
      let energy = 0;
      for (let index = 0; index < segment.length; index += 1) energy += segment[index] * segment[index];
      const spectral = estimateSpectralFeatures(segment, decoded.sampleRate);
      return {
        cue,
        pitch: estimatePitch(segment, decoded.sampleRate),
        energy: Math.sqrt(energy / Math.max(1, segment.length)),
        ...spectral,
      };
    });

    const speakerProfiles: Array<SpeakerFeature> = [];
    const assignments = features.map((feature) => {
      const candidates = speakerProfiles
        .map((profile, index) => {
          const pitchDistance = feature.pitch > 0 && profile.pitch > 0
            ? Math.min(2, Math.abs(profile.pitch - feature.pitch) / 70)
            : 0.5;
          const energyDistance = Math.min(2, Math.abs(profile.energy - feature.energy) / 0.08);
          const zcrDistance = Math.min(2, Math.abs(profile.zeroCrossingRate - feature.zeroCrossingRate) / 0.08);
          const centroidDistance = Math.min(2, Math.abs(profile.spectralCentroid - feature.spectralCentroid) / 700);
          return { index, distance: pitchDistance * 0.45 + energyDistance * 0.15 + zcrDistance * 0.2 + centroidDistance * 0.2 };
        })
        .filter((candidate) => candidate.distance < 0.72)
        .sort((a, b) => a.distance - b.distance);
      const profileIndex = candidates[0]?.index ?? speakerProfiles.length;
      if (!speakerProfiles[profileIndex]) speakerProfiles.push({ ...feature });
      else {
        speakerProfiles[profileIndex].pitch = (speakerProfiles[profileIndex].pitch + feature.pitch) / 2;
        speakerProfiles[profileIndex].energy = (speakerProfiles[profileIndex].energy + feature.energy) / 2;
        speakerProfiles[profileIndex].zeroCrossingRate = (speakerProfiles[profileIndex].zeroCrossingRate + feature.zeroCrossingRate) / 2;
        speakerProfiles[profileIndex].spectralCentroid = (speakerProfiles[profileIndex].spectralCentroid + feature.spectralCentroid) / 2;
      }
      return { cue: feature.cue, speaker: `Speaker ${profileIndex + 1}` };
    });

    return assignments.map(({ cue, speaker }, index) => ({ ...cue, id: index + 1, speaker }));
  } finally {
    await context.close();
  }
}
