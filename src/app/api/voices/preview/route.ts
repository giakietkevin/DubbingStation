import { NextResponse } from 'next/server';
import { Communicate } from 'edge-tts-universal';
import { voicePersonaProfiles } from '@/data/voiceProfiles';
import { synthesizeWithOpenAI } from '@/lib/tts/openai';
import { synthesizeWithPiper, createWavHeader } from '@/lib/tts/piper';
import { applyVocalTimbreDSP } from '@/lib/tts/dsp';
import { join, isAbsolute } from 'path';

export const dynamic = 'force-dynamic';

const MODELS_DIR = join(process.cwd(), 'models', 'piper');

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const voiceId = searchParams.get('voiceId') || 'minh-khang';
    const customPitch = searchParams.get('pitch');
    const customRate = searchParams.get('rate');
    const customVolume = searchParams.get('volume');
    const customModel = searchParams.get('model');
    const customText = searchParams.get('text');
    const customWarmth = searchParams.get('warmth') ? parseInt(searchParams.get('warmth')!, 10) : undefined;
    const customBrightness = searchParams.get('brightness') ? parseInt(searchParams.get('brightness')!, 10) : undefined;
    const customFullness = searchParams.get('fullness') ? parseInt(searchParams.get('fullness')!, 10) : undefined;
    const customF1 = searchParams.get('f1') ? parseInt(searchParams.get('f1')!, 10) : undefined;
    const customF2 = searchParams.get('f2') ? parseInt(searchParams.get('f2')!, 10) : undefined;
    const customProvider = searchParams.get('provider') as any;

    const baseProfile = voicePersonaProfiles[voiceId] || {
      neuralModel: customModel || (voiceId.includes('female') ? 'vi-VN-HoaiMyNeural' : 'vi-VN-NamMinhNeural'),
      pitch: '+0Hz',
      rate: '+0%',
      volume: '+0%',
      samplePhrase: 'Xin chào, đây là giọng đọc trí tuệ nhân tạo chất lượng cao của DubbingStation.',
      provider: (customProvider || (customModel?.includes('onnx') ? 'piper' : 'microsoft')),
      piperModel: customModel?.includes('onnx') ? customModel : undefined,
    };

    const profile = {
      ...baseProfile,
      neuralModel: customModel || baseProfile.neuralModel,
      pitch: customPitch !== null && customPitch !== undefined ? customPitch : baseProfile.pitch,
      rate: customRate !== null && customRate !== undefined ? customRate : baseProfile.rate,
      volume: customVolume !== null && customVolume !== undefined ? customVolume : baseProfile.volume,
      provider: customProvider || baseProfile.provider,
      piperModel: customModel?.includes('onnx') ? customModel : baseProfile.piperModel,
    };

    const sampleText = customText || profile.samplePhrase;
    const provider = profile.provider || 'microsoft';

    let audioBuffer: Buffer | null = null;
    const isWav = provider === 'piper';

    if (provider === 'google') {
      try {
        const lang = profile.neuralModel?.startsWith('en') ? 'en' : 'vi';
        const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(
          sampleText.slice(0, 200)
        )}&tl=${lang}&client=tw-ob`;
        const res = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        });
        if (res.ok) {
          audioBuffer = Buffer.from(await res.arrayBuffer());
        }
      } catch (e) {
        console.error('[Voice Preview] Google TTS failed:', e);
      }
    } else if (provider === 'openai') {
      const result = await synthesizeWithOpenAI({
        text: sampleText,
        model: 'tts-1-hd',
        voice: profile.openAIVoice || 'nova',
        speed: 1.0,
      });
      audioBuffer = result?.buffer || null;

      // If OpenAI failed (e.g. no API key), fallback to Microsoft
      if (!audioBuffer) {
        console.warn('[Voice Preview] OpenAI unavailable, falling back to Microsoft Neural preview');
        try {
          const comm = new Communicate(sampleText, { voice: 'en-US-JennyNeural' });
          const chunks: Buffer[] = [];
          for await (const chunk of comm.stream()) {
            if (chunk.type === 'audio' && chunk.data) {
              chunks.push(chunk.data as Buffer);
            }
          }
          if (chunks.length > 0) {
            audioBuffer = Buffer.concat(chunks);
          }
        } catch {}
      }
    } else if (provider === 'piper') {
      const modelFile = profile.piperModel || 'en_US-lessac-medium.onnx';
      const modelPath = isAbsolute(modelFile) ? modelFile : join(MODELS_DIR, modelFile);
      const result = await synthesizeWithPiper({
        text: sampleText,
        modelPath,
        outputFormat: 'wav',
        lengthScale: 1.0,
      });
      if (result) {
        let pcm = result.rawPcm;
        if (
          customWarmth !== undefined ||
          customBrightness !== undefined ||
          customFullness !== undefined ||
          customF1 !== undefined ||
          customF2 !== undefined
        ) {
          pcm = applyVocalTimbreDSP(pcm, result.sampleRate, {
            warmth: customWarmth,
            brightness: customBrightness,
            fullness: customFullness,
            formantF1: customF1,
            formantF2: customF2,
          });
        }
        audioBuffer = Buffer.concat([createWavHeader(pcm.length, result.sampleRate), pcm]);
      } else {
        audioBuffer = null;
      }
    } else {
      let safeVoice = profile.neuralModel;
      if (!safeVoice.includes('Neural')) {
        safeVoice = 'vi-VN-NamMinhNeural';
      }

      // Tier 1: Preview with persona pitch, rate and volume
      try {
        const comm = new Communicate(sampleText, {
          voice: safeVoice,
          pitch: profile.pitch || '+0Hz',
          rate: profile.rate || '+0%',
          volume: profile.volume || '+0%',
        });
        const chunks: Buffer[] = [];
        for await (const chunk of comm.stream()) {
          if (chunk.type === 'audio' && chunk.data) {
            chunks.push(chunk.data as Buffer);
          }
        }
        if (chunks.length > 0) {
          audioBuffer = Buffer.concat(chunks);
        }
      } catch (e) {
        console.warn('[Voice Preview] Microsoft pitch/rate failed, trying clean voice', e);
      }

      // Tier 2: Clean voice fallback
      if (!audioBuffer) {
        try {
          const comm = new Communicate(sampleText, { voice: safeVoice });
          const chunks: Buffer[] = [];
          for await (const chunk of comm.stream()) {
            if (chunk.type === 'audio' && chunk.data) {
              chunks.push(chunk.data as Buffer);
            }
          }
          if (chunks.length > 0) {
            audioBuffer = Buffer.concat(chunks);
          }
        } catch {}
      }

      // Emergency fallback to Google TTS for preview
      if (!audioBuffer) {
        try {
          const lang = safeVoice.startsWith('en') ? 'en' : 'vi';
          const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(
            sampleText.slice(0, 150)
          )}&tl=${lang}&client=tw-ob`;
          const res = await fetch(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
          });
          if (res.ok) {
            audioBuffer = Buffer.from(await res.arrayBuffer());
          }
        } catch {}
      }
    }

    if (!audioBuffer) {
      return NextResponse.json({ error: 'Không nhận được dữ liệu âm thanh' }, { status: 500 });
    }

    const fullBuffer = audioBuffer;
    const uint8 = new Uint8Array(fullBuffer);

    return new Response(uint8, {
      status: 200,
      headers: {
        'Content-Type': isWav ? 'audio/wav' : 'audio/mpeg',
        'Content-Length': uint8.byteLength.toString(),
        'Cache-Control': 'public, max-age=86400, immutable',
        'X-Voice-Profile': voiceId,
        'X-Provider': provider,
        'X-Engine':
          provider === 'google'
            ? 'Google-TTS-Viral'
            : provider === 'openai'
            ? 'OpenAI-TTS-HD'
            : provider === 'piper'
            ? 'Piper-Offline-Neural'
            : 'Microsoft-Azure-Neural-TTS',
      },
    });
  } catch (error) {
    console.error('Voice Preview Error:', error);
    return NextResponse.json({ error: 'Lỗi tạo âm thanh mẫu' }, { status: 500 });
  }
}
