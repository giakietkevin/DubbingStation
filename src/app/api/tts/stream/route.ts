import { NextResponse } from 'next/server';
import { Communicate } from 'edge-tts-universal';
import { voicePersonaProfiles } from '@/data/voiceProfiles';
import { synthesizeWithOpenAI } from '@/lib/tts/openai';
import { synthesizeWithPiper, createWavHeader } from '@/lib/tts/piper';
import { synthesizeWithHuggingFace } from '@/lib/tts/huggingface';
import { applyVocalTimbreDSP } from '@/lib/tts/dsp';
import { join, isAbsolute } from 'path';

export const dynamic = 'force-dynamic';

type TTSProvider = 'microsoft' | 'openai' | 'piper' | 'google' | 'huggingface';

const MODELS_DIR = join(process.cwd(), 'models', 'piper');

function calculateCombinedRate(personaRateStr: string, speedMultiplier: number): string {
  const personaPercent = parseInt(personaRateStr.replace('%', ''), 10) || 0;
  const userPercent = Math.round((speedMultiplier - 1.0) * 100);
  const totalPercent = personaPercent + userPercent;
  return totalPercent >= 0 ? `+${totalPercent}%` : `${totalPercent}%`;
}

function cleanAndChunkText(input: string, maxLen = 220): string[] {
  const normalized = input
    .replace(/\[pause\s+[0-9.]+s\]/gi, ' ... ')
    .replace(/\[thì_thầm\]/gi, '')
    .replace(/\[nhấn_mạnh\]/gi, '')
    .replace(/\[.*?\]/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\n+/g, '. ')
    .replace(/["“”«»]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const sentences = normalized.split(/(?<=[.?!;])\s+/);
  const chunks: string[] = [];
  let current = '';

  for (const s of sentences) {
    if (!s.trim()) continue;
    if ((current + ' ' + s).trim().length <= maxLen) {
      current = (current + ' ' + s).trim();
    } else {
      if (current) chunks.push(current);
      if (s.length > maxLen) {
        const words = s.split(' ');
        let sub = '';
        for (const w of words) {
          if ((sub + ' ' + w).trim().length <= maxLen) {
            sub = (sub + ' ' + w).trim();
          } else {
            if (sub) chunks.push(sub);
            sub = w;
          }
        }
        current = sub;
      } else {
        current = s;
      }
    }
  }
  if (current && current.trim()) chunks.push(current.trim());
  return chunks;
}

async function synthesizeWithMicrosoftNeural(
  chunkText: string,
  voice: string,
  pitch: string,
  rate: string,
  volume: string
): Promise<Buffer | null> {
  // Ensure valid Microsoft Neural voice name
  let safeVoice = voice;
  if (!safeVoice.includes('Neural')) {
    safeVoice = voice.toLowerCase().includes('female') ? 'vi-VN-HoaiMyNeural' : 'vi-VN-NamMinhNeural';
  }

  // Tier 1: With persona pitch, rate, volume
  try {
    const comm = new Communicate(chunkText, { voice: safeVoice, pitch, rate, volume });
    const audioChunks: Buffer[] = [];
    for await (const ch of comm.stream()) {
      if (ch.type === 'audio' && ch.data) {
        audioChunks.push(ch.data as Buffer);
      }
    }
    if (audioChunks.length > 0) {
      return Buffer.concat(audioChunks);
    }
  } catch (e) {
    console.warn('[TTS] Tier 1 Microsoft pitch/rate failed, attempting Tier 2 clean voice', e);
  }

  // Tier 2: Clean voice without custom pitch/rate
  try {
    const comm = new Communicate(chunkText, { voice: safeVoice });
    const audioChunks: Buffer[] = [];
    for await (const ch of comm.stream()) {
      if (ch.type === 'audio' && ch.data) {
        audioChunks.push(ch.data as Buffer);
      }
    }
    if (audioChunks.length > 0) {
      return Buffer.concat(audioChunks);
    }
  } catch (e) {
    console.warn('[TTS] Tier 2 Microsoft clean voice failed, attempting local Piper real human model fallback', e);
  }

  // Tier 3: Local Piper VIVOS/25H real human dataset model fallback
  try {
    const isVietnamese = !safeVoice.startsWith('en') && !safeVoice.startsWith('ja') && !safeVoice.startsWith('ko') && !safeVoice.startsWith('zh');
    if (isVietnamese) {
      const modelFile = safeVoice.includes('female') || safeVoice.includes('HoaiMy')
        ? 'vi_VN-vivos-x_low.onnx'
        : 'vi_VN-25hours_single-low.onnx';
      const modelPath = join(MODELS_DIR, modelFile);
      const result = await synthesizeWithPiper({
        text: chunkText,
        modelPath,
        outputFormat: 'wav',
        lengthScale: 1.0,
      });
      if (result?.audio) {
        return result.audio;
      }
    }
  } catch (err) {
    console.error('[TTS] Tier 3 Piper fallback failed', err);
  }

  return null;
}

interface ChunkSynthesisResult {
  buffer?: Buffer | null;
  rawPcm?: Buffer | null;
  sampleRate?: number;
}

async function synthesizeChunk(
  chunkText: string,
  provider: TTSProvider,
  profile: any,
  speed: number
): Promise<ChunkSynthesisResult> {
  const combinedRate = calculateCombinedRate(profile.rate || '+0%', speed);

  if (provider === 'huggingface') {
    const hfModel = profile.hfModel || 'facebook/mms-tts-vie';
    const hfResult = await synthesizeWithHuggingFace({
      text: chunkText,
      modelId: hfModel,
      speed,
      gender: profile.gender || (chunkText.toLowerCase().includes('phương thảo') || chunkText.toLowerCase().includes('bảo trâm') ? 'female' : 'male'),
    });
    if (hfResult?.audio) {
      return {
        buffer: hfResult.audio,
        sampleRate: hfResult.sampleRate,
      };
    }
    // Fallback to local Piper VIVOS/25H ONNX model
    const modelFile = profile.piperModel || (profile.gender === 'female' ? 'vi_VN-vivos-x_low.onnx' : 'vi_VN-25hours_single-low.onnx');
    const modelPath = join(MODELS_DIR, modelFile);
    const piperFallback = await synthesizeWithPiper({
      text: chunkText,
      modelPath,
      outputFormat: 'wav',
      lengthScale: speed > 0 ? 1.0 / speed : 1.0,
    });
    if (piperFallback) {
      return {
        buffer: piperFallback.audio,
        rawPcm: piperFallback.rawPcm,
        sampleRate: piperFallback.sampleRate,
      };
    }
  }

  if (provider === 'google') {
    // Legacy provider mapped to Microsoft Neural instead of Google Translate
    const fallbackBuffer = await synthesizeWithMicrosoftNeural(
      chunkText,
      'vi-VN-HoaiMyNeural',
      profile.pitch || '+0Hz',
      combinedRate,
      profile.volume || '+0%'
    );
    return { buffer: fallbackBuffer };
    return { buffer: fallbackBuffer };
  }

  if (provider === 'openai') {
    const openAIVoice = profile.openAIVoice || 'nova';
    const result = await synthesizeWithOpenAI({
      text: chunkText,
      model: 'tts-1-hd',
      voice: openAIVoice,
      speed,
    });
    if (result?.buffer) {
      return { buffer: result.buffer };
    }
    // If OpenAI is unavailable (e.g. no API key), fallback to Microsoft
    console.warn('[TTS] OpenAI failed or not configured, falling back to Microsoft Neural');
    const fallbackBuffer = await synthesizeWithMicrosoftNeural(
      chunkText,
      profile.neuralModel || 'vi-VN-NamMinhNeural',
      profile.pitch || '+0Hz',
      combinedRate,
      profile.volume || '+0%'
    );
    return { buffer: fallbackBuffer };
  }

  if (provider === 'piper') {
    const modelFile = profile.piperModel || 'en_US-lessac-medium.onnx';
    const modelPath = isAbsolute(modelFile) ? modelFile : join(MODELS_DIR, modelFile);
    const lengthScale = speed > 0 ? 1.0 / speed : 1.0;

    const result = await synthesizeWithPiper({
      text: chunkText,
      modelPath,
      outputFormat: 'wav',
      lengthScale,
    });

    if (result) {
      return {
        buffer: result.audio,
        rawPcm: result.rawPcm,
        sampleRate: result.sampleRate,
      };
    }
    // Fallback to Microsoft if Piper fails
    console.warn('[TTS] Piper failed, falling back to Microsoft Neural');
    const fallbackBuffer = await synthesizeWithMicrosoftNeural(
      chunkText,
      profile.neuralModel || 'vi-VN-NamMinhNeural',
      profile.pitch || '+0Hz',
      combinedRate,
      profile.volume || '+0%'
    );
    return { buffer: fallbackBuffer };
  }

  const buf = await synthesizeWithMicrosoftNeural(
    chunkText,
    profile.neuralModel,
    profile.pitch,
    combinedRate,
    profile.volume
  );
  return { buffer: buf };
}

function getProvider(voiceId: string, profile: any): TTSProvider {
  if (profile.provider) return profile.provider;
  if (voiceId === 'chi-google') return 'google';
  if (voiceId.startsWith('openai-')) return 'openai';
  if (voiceId.startsWith('piper-')) return 'piper';
  if (voiceId.startsWith('vivos-') || voiceId.startsWith('cv-') || voiceId.startsWith('openslr-')) return 'huggingface';
  return 'microsoft';
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const text = searchParams.get('text') || 'Xin chào, đây là phòng thu giọng nói DubbingStation.';
    const voiceId = searchParams.get('voiceId') || 'vivos-nam-saigon';
    const speed = parseFloat(searchParams.get('speed') || '1.0');
    const customPitch = searchParams.get('pitch');
    const customRate = searchParams.get('rate');
    const customVolume = searchParams.get('volume');
    const customModel = searchParams.get('model');
    const customWarmth = searchParams.get('warmth') ? parseInt(searchParams.get('warmth')!, 10) : undefined;
    const customBrightness = searchParams.get('brightness') ? parseInt(searchParams.get('brightness')!, 10) : undefined;
    const customFullness = searchParams.get('fullness') ? parseInt(searchParams.get('fullness')!, 10) : undefined;
    const customF1 = searchParams.get('f1') ? parseInt(searchParams.get('f1')!, 10) : undefined;
    const customF2 = searchParams.get('f2') ? parseInt(searchParams.get('f2')!, 10) : undefined;
    const providerParam = searchParams.get('provider') as TTSProvider | null;

    const baseProfile = voicePersonaProfiles[voiceId] || {
      neuralModel: customModel || (voiceId.includes('female') ? 'vi-VN-HoaiMyNeural' : 'vi-VN-NamMinhNeural'),
      pitch: '+0Hz',
      rate: '+0%',
      volume: '+0%',
      samplePhrase: '',
      provider: (providerParam || (customModel?.includes('onnx') ? 'piper' : 'microsoft')) as TTSProvider,
      piperModel: customModel?.includes('onnx') ? customModel : undefined,
    };

    const profile = {
      ...baseProfile,
      neuralModel: customModel || baseProfile.neuralModel,
      pitch: customPitch !== null && customPitch !== undefined ? customPitch : baseProfile.pitch,
      rate: customRate !== null && customRate !== undefined ? customRate : baseProfile.rate,
      volume: customVolume !== null && customVolume !== undefined ? customVolume : baseProfile.volume,
      provider: providerParam || baseProfile.provider,
      piperModel: customModel?.includes('onnx') ? customModel : baseProfile.piperModel,
    };

    const provider = providerParam || getProvider(voiceId, profile);

    const chunks = cleanAndChunkText(text, 220);
    if (chunks.length === 0) {
      return NextResponse.json({ error: 'Nội dung văn bản trống' }, { status: 400 });
    }

    const audioBuffers: Buffer[] = [];
    const rawPcmChunks: Buffer[] = [];
    let detectedSampleRate = 22050;

    for (const chunk of chunks) {
      const res = await synthesizeChunk(chunk, provider, profile, speed);
      if (res.rawPcm && res.rawPcm.length > 0) {
        rawPcmChunks.push(res.rawPcm);
        if (res.sampleRate) detectedSampleRate = res.sampleRate;
      } else if (res.buffer && res.buffer.length > 0) {
        audioBuffers.push(res.buffer);
      }
    }

    const isWav = provider === 'piper' && rawPcmChunks.length > 0;
    let fullBuffer: Buffer;

    if (isWav) {
      let totalRawPcm: ReturnType<typeof applyVocalTimbreDSP> = Buffer.concat(rawPcmChunks);
      if (
        customWarmth !== undefined ||
        customBrightness !== undefined ||
        customFullness !== undefined ||
        customF1 !== undefined ||
        customF2 !== undefined
      ) {
        totalRawPcm = applyVocalTimbreDSP(totalRawPcm, detectedSampleRate, {
          warmth: customWarmth,
          brightness: customBrightness,
          fullness: customFullness,
          formantF1: customF1,
          formantF2: customF2,
        });
      }
      const header = createWavHeader(totalRawPcm.length, detectedSampleRate);
      fullBuffer = Buffer.concat([header, totalRawPcm]);
    } else if (audioBuffers.length > 0) {
      fullBuffer = Buffer.concat(audioBuffers);
    } else {
      return NextResponse.json(
        {
          error: 'Không thể tạo âm thanh. Tất cả chunk đều thất bại.',
          details: 'Kiểm tra console server.',
          chunksTried: chunks.length,
          voice: voiceId,
          provider,
        },
        { status: 500 }
      );
    }

    const isWavFormat = isWav || fullBuffer.subarray(0, 4).toString() === 'RIFF';
    const uint8 = new Uint8Array(fullBuffer);

    return new NextResponse(uint8, {
      status: 200,
      headers: {
        'Content-Type': isWavFormat ? 'audio/wav' : 'audio/mpeg',
        'Content-Length': uint8.byteLength.toString(),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=3600',
        'X-Voice-Profile': voiceId,
        'X-Provider': provider,
        'X-Engine':
          provider === 'huggingface'
            ? 'HuggingFace-MetaMMS-VITS'
            : provider === 'google'
            ? 'Google-TTS-Viral'
            : provider === 'openai'
            ? 'OpenAI-TTS-HD'
            : provider === 'piper'
            ? 'Piper-Offline-Neural'
            : 'Microsoft-Azure-Neural-TTS',
      },
    });
  } catch (error) {
    console.error('TTS Master Stream Error:', error);
    return NextResponse.json({ error: 'Lỗi tạo âm thanh' }, { status: 500 });
  }
}
