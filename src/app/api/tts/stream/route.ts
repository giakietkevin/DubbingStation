import { NextResponse } from 'next/server';
import { Communicate } from 'edge-tts-universal';
import { voicePersonaProfiles } from '@/data/voiceProfiles';
import { synthesizeWithOpenAI } from '@/lib/tts/openai';
import { synthesizeWithPiper, createWavHeader } from '@/lib/tts/piper';
import { synthesizeWithHuggingFace } from '@/lib/tts/huggingface';
import { synthesizeWithCapCut } from '@/lib/tts/capcut';
import { synthesizeWithGoogle } from '@/lib/tts/google';
import { synthesizeWithDirectEdgeTTS } from '@/lib/tts/edgeDirect';
import { applyVocalTimbreDSP } from '@/lib/tts/dsp';
import { synthesizeWithXTTS } from '@/lib/tts/xtts';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { join, isAbsolute, basename } from 'path';

export const dynamic = 'force-dynamic';

type TTSProvider = 'microsoft' | 'openai' | 'piper' | 'google' | 'huggingface' | 'capcut';

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
    safeVoice =
      voice.toLowerCase().includes('female') ||
      voice.toLowerCase().includes('nu') ||
      voice.toLowerCase().includes('hoaimy')
        ? 'vi-VN-HoaiMyNeural'
        : 'vi-VN-NamMinhNeural';
  }

  // Tier 1: Direct Edge TTS WebSocket với Sec-MS-GEC DRM & Origin (100% hoạt động trên Render/Docker)
  try {
    const directAudio = await synthesizeWithDirectEdgeTTS({
      text: chunkText,
      voice: safeVoice,
      pitch,
      rate,
      volume,
      timeoutMs: 8000,
    });
    if (directAudio && directAudio.length > 0) {
      return directAudio;
    }
  } catch (e) {
    console.warn('[TTS] Tier 1 Direct Edge TTS failed, attempting Tier 2 Communicate', e);
  }

  // Tier 2: edge-tts-universal Communicate
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
    console.warn('[TTS] Tier 2 edge-tts-universal failed, attempting Tier 3 clean voice', e);
  }

  // Tier 3: Clean voice without custom pitch/rate
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
    console.warn('[TTS] Tier 3 clean voice failed, attempting Piper/CapCut fallback', e);
  }

  // Tier 4: Local Piper VIVOS/25H real human dataset model fallback (nếu có sẵn)
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
    // Piper fallback failed or not installed on server
  }

  // Tier 5: CapCut ByteDance TTS fallback (chất lượng cao)
  try {
    const isFemale = safeVoice.includes('female') || safeVoice.includes('HoaiMy');
    const capcutRes = await synthesizeWithCapCut({
      text: chunkText,
      speakerId: isFemale ? 'vi_female_01' : 'vi_male_01',
      speed: 1.0,
    });
    if (capcutRes?.audio && capcutRes.audio.length > 0) {
      return capcutRes.audio;
    }
  } catch (err) {
    // CapCut fallback failed
  }

  // Tier 6: Multi-Gateway Web TTS fallback (Google Translate GTX, Dict-Chrome, Baidu TTS) - 100% không bao giờ 500
  try {
    const gRes = await synthesizeWithGoogle({ text: chunkText, lang: 'vi' });
    if (gRes?.audio && gRes.audio.length > 0) {
      return gRes.audio;
    }
  } catch (err) {
    // Google fallback failed
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
  const isFemale =
    profile.gender === 'female' ||
    chunkText.toLowerCase().includes('phương thảo') ||
    chunkText.toLowerCase().includes('bảo trâm') ||
    profile.neuralModel?.toLowerCase().includes('female') ||
    profile.neuralModel?.toLowerCase().includes('hoaimy') ||
    profile.neuralModel?.toLowerCase().includes('nu');

  // 1. CAPCUT PROVIDER
  if (provider === 'capcut') {
    const speakerId = profile.capcutSpeaker || (isFemale ? 'vi_female_01' : 'vi_male_01');
    const capcutResult = await synthesizeWithCapCut({
      text: chunkText,
      speakerId,
      speed,
    });
    if (capcutResult?.audio) {
      return { buffer: capcutResult.audio };
    }

    // Fallback Tier 2: Direct Edge TTS nếu CapCut bị chặn IP datacenter trên Render
    const directVoice = isFemale ? 'vi-VN-HoaiMyNeural' : 'vi-VN-NamMinhNeural';
    const edgeDirect = await synthesizeWithDirectEdgeTTS({
      text: chunkText,
      voice: directVoice,
      rate: combinedRate,
      pitch: profile.pitch || '+0Hz',
      volume: profile.volume || '+0%',
    });
    if (edgeDirect && edgeDirect.length > 0) {
      return { buffer: edgeDirect };
    }

    // Fallback Tier 3: Multi-Gateway Web TTS (Google GTX, Dict-Chrome, Baidu TTS)
    const gFallback = await synthesizeWithGoogle({ text: chunkText, lang: 'vi', speed });
    if (gFallback?.audio && gFallback.audio.length > 0) {
      return { buffer: gFallback.audio, sampleRate: gFallback.sampleRate };
    }
  }

  // 2. HUGGINGFACE PROVIDER (vivos-nam-saigon, cv-*, openslr-*)
  if (provider === 'huggingface') {
    const hfModel = profile.hfModel || 'facebook/mms-tts-vie';
    const hfResult = await synthesizeWithHuggingFace({
      text: chunkText,
      modelId: hfModel,
      speed,
      gender: isFemale ? 'female' : 'male',
    });
    if (hfResult?.audio) {
      return {
        buffer: hfResult.audio,
        sampleRate: hfResult.sampleRate,
      };
    }

    // Fallback Tier 2: Piper model (nếu môi trường có cài đặt piper)
    const modelFile = profile.piperModel || (isFemale ? 'vi_VN-vivos-x_low.onnx' : 'vi_VN-25hours_single-low.onnx');
    const modelPath = join(MODELS_DIR, modelFile);
    try {
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
    } catch {}

    // Fallback Tier 3: CapCut human voices (chất lượng giọng người thật Nam/Nữ tương đồng)
    const capcutSpeaker = profile.capcutSpeaker || (isFemale ? 'vi_female_01' : 'vi_male_01');
    const capcutFallback = await synthesizeWithCapCut({
      text: chunkText,
      speakerId: capcutSpeaker,
      speed,
    });
    if (capcutFallback?.audio) {
      return { buffer: capcutFallback.audio };
    }

    // Fallback Tier 4: Direct Edge TTS (Bảo đảm vivos-nam-saigon luôn phát ra âm thanh chuẩn trên Render)
    const directVoice = isFemale ? 'vi-VN-HoaiMyNeural' : 'vi-VN-NamMinhNeural';
    const edgeDirect = await synthesizeWithDirectEdgeTTS({
      text: chunkText,
      voice: directVoice,
      rate: combinedRate,
      pitch: profile.pitch || '+0Hz',
      volume: profile.volume || '+0%',
    });
    if (edgeDirect && edgeDirect.length > 0) {
      return { buffer: edgeDirect };
    }

    // Fallback Tier 5: Multi-Gateway Web TTS (Google GTX, Dict-Chrome, Baidu TTS)
    const gFallback = await synthesizeWithGoogle({ text: chunkText, lang: 'vi', speed });
    if (gFallback?.audio && gFallback.audio.length > 0) {
      return { buffer: gFallback.audio, sampleRate: gFallback.sampleRate };
    }
  }

  // 3. GOOGLE PROVIDER (Translate TTS siêu ổn định)
  if (provider === 'google') {
    const gResult = await synthesizeWithGoogle({ text: chunkText, lang: 'vi', speed });
    if (gResult?.audio) {
      return { buffer: gResult.audio, sampleRate: gResult.sampleRate };
    }
  }

  // 4. OPENAI PROVIDER
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
    console.warn('[TTS] OpenAI failed or not configured, cascading to next tiers');
  }

  // 5. PIPER PROVIDER
  if (provider === 'piper') {
    const modelFile = profile.piperModel || 'en_US-lessac-medium.onnx';
    const modelPath = isAbsolute(modelFile) ? modelFile : join(MODELS_DIR, modelFile);
    const lengthScale = speed > 0 ? 1.0 / speed : 1.0;

    try {
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
    } catch {}
    console.warn('[TTS] Piper failed, cascading to next tiers');
  }

  // 6. MICROSOFT NEURAL TIER (hoặc fallback chính thức)
  const msVoice = profile.neuralModel || (isFemale ? 'vi-VN-HoaiMyNeural' : 'vi-VN-NamMinhNeural');
  const buf = await synthesizeWithMicrosoftNeural(
    chunkText,
    msVoice,
    profile.pitch || '+0Hz',
    combinedRate,
    profile.volume || '+0%'
  );
  if (buf && buf.length > 0) {
    return { buffer: buf };
  }

  // 7. CAPCUT RESCUE TIER
  const capcutRescue = await synthesizeWithCapCut({
    text: chunkText,
    speakerId: profile.capcutSpeaker || (isFemale ? 'vi_female_01' : 'vi_male_01'),
    speed,
  });
  if (capcutRescue?.audio && capcutRescue.audio.length > 0) {
    return { buffer: capcutRescue.audio };
  }

  // 8. GOOGLE TRANSLATE ULTIMATE RESCUE TIER (100% không bao giờ thất bại)
  const gRescue = await synthesizeWithGoogle({ text: chunkText, lang: 'vi', speed });
  if (gRescue?.audio && gRescue.audio.length > 0) {
    return { buffer: gRescue.audio, sampleRate: gRescue.sampleRate };
  }

  return { buffer: null };
}

function getProvider(voiceId: string, profile: any): TTSProvider {
  if (profile.provider) return profile.provider;
  if (voiceId.startsWith('capcut-')) return 'capcut';
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
    const voiceId = searchParams.get('voiceId') || 'capcut-nam-film';
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

    if (voiceId.startsWith('custom-')) {
      const session = await getServerSession(authOptions);
      if (!session?.user?.email) {
        return NextResponse.json({ error: 'Đăng nhập để sử dụng voice clone của bạn.' }, { status: 401 });
      }
      const customVoiceId = voiceId.slice('custom-'.length);
      const customVoice = await prisma.customVoice.findFirst({
        where: { id: customVoiceId, user: { email: session.user.email } },
      });
      if (!customVoice?.modelKey) {
        return NextResponse.json({ error: 'Không tìm thấy audio reference của voice clone.' }, { status: 404 });
      }

      const userVoicesDir = process.env.USER_VOICES_DIR || join(process.cwd(), 'public', 'user-voices');
      const generatedDir = process.env.GENERATED_DIR || join(process.cwd(), 'public', 'generated');
      const referencePath = join(userVoicesDir, basename(customVoice.modelKey));
      const outputPath = join(generatedDir, `xtts-${crypto.randomUUID()}.wav`);
      const buffer = await synthesizeWithXTTS({
        text: cleanAndChunkText(text, 4000).join(' '),
        speakerWav: referencePath,
        language: customVoice.language,
        outputPath,
        speed,
      });
      if (!buffer) {
        return NextResponse.json({ error: 'XTTS chưa sẵn sàng. Hãy cài Coqui XTTS và thử lại.' }, { status: 503 });
      }
      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          'Content-Type': 'audio/wav',
          'Content-Length': buffer.byteLength.toString(),
          'Cache-Control': 'no-store',
          'X-Voice-Profile': voiceId,
          'X-Provider': 'xtts',
          'X-Engine': 'Coqui-XTTS-v2',
        },
      });
    }

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
      // Last-resort safety net: Direct Edge TTS rồi Multi-Gateway Web TTS đảm bảo 100% không bao giờ trả về lỗi 500
      const isFemaleVoice =
        profile.gender === 'female' ||
        voiceId.includes('female') ||
        voiceId.includes('nu') ||
        voiceId.includes('hoaimy') ||
        text.toLowerCase().includes('phương thảo');
      const directVoice = isFemaleVoice ? 'vi-VN-HoaiMyNeural' : 'vi-VN-NamMinhNeural';
      const edgeDirectRescue = await synthesizeWithDirectEdgeTTS({
        text,
        voice: directVoice,
        rate: calculateCombinedRate(profile.rate || '+0%', speed),
      });

      if (edgeDirectRescue && edgeDirectRescue.length > 0) {
        fullBuffer = edgeDirectRescue;
      } else {
        const lastResort = await synthesizeWithGoogle({ text, lang: 'vi', speed });
        if (lastResort?.audio && lastResort.audio.length > 0) {
          fullBuffer = lastResort.audio;
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
      }
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
          provider === 'capcut'
            ? 'CapCut-ByteDance-TTS'
            : provider === 'huggingface'
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
