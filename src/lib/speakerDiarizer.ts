import type { SubtitleCue } from '@/lib/subtitleParser';

interface SpeakerFeature {
  cue: SubtitleCue;
  pitch: number;
  energy: number;
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
      return { cue, pitch: estimatePitch(segment, decoded.sampleRate), energy: Math.sqrt(energy / Math.max(1, segment.length)) };
    });

    const speakerProfiles: Array<{ pitch: number; energy: number }> = [];
    const assignments = features.map((feature) => {
      const candidates = speakerProfiles
        .map((profile, index) => ({ index, distance: Math.abs(profile.pitch - feature.pitch) + Math.abs(profile.energy - feature.energy) * 800 }))
        .filter((candidate) => feature.pitch > 0 && candidate.distance < 55)
        .sort((a, b) => a.distance - b.distance);
      const profileIndex = candidates[0]?.index ?? speakerProfiles.length;
      if (!speakerProfiles[profileIndex]) speakerProfiles.push({ pitch: feature.pitch, energy: feature.energy });
      else {
        speakerProfiles[profileIndex].pitch = (speakerProfiles[profileIndex].pitch + feature.pitch) / 2;
        speakerProfiles[profileIndex].energy = (speakerProfiles[profileIndex].energy + feature.energy) / 2;
      }
      return { cue: feature.cue, speaker: `Speaker ${profileIndex + 1}` };
    });

    return assignments.map(({ cue, speaker }, index) => ({ ...cue, id: index + 1, speaker }));
  } finally {
    await context.close();
  }
}
