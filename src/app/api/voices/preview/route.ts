import { NextResponse } from 'next/server';
import { Communicate } from 'edge-tts-universal';
import { voicePersonaProfiles } from '@/data/voiceProfiles';
import { synthesizeWithOpenAI } from '@/lib/tts/openai';
import { synthesizeWithPiper, createWavHeader } from '@/lib/tts/piper';
import { synthesizeWithHuggingFace } from '@/lib/tts/huggingface';
import { synthesizeWithCapCut } from '@/lib/tts/capcut';
import { synthesizeWithGoogle } from '@/lib/tts/google';
import { applyVocalTimbreDSP } from '@/lib/tts/dsp';
import { join, isAbsolute } from 'path';

export const dynamic = 'force-dynamic';

const MODELS_DIR = join(process.cwd(), 'models', 'piper');

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const voiceId = searchParams.get('voiceId') || 'capcut-nam-film';
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
    const isWav = provider === 'piper' || provider === 'huggingface';

    if (provider === 'capcut') {
      const capcutResult = await synthesizeWithCapCut({
        text: sampleText,
        speakerId: profile.capcutSpeaker || 'vi_male_01',
        speed: 1.0,
      });
      if (capcutResult?.audio) {
        audioBuffer = capcutResult.audio;
      }
    } else if (provider === 'huggingface') {
      const hfModel = profile.hfModel || 'facebook/mms-tts-vie';
      const isFemale = profile.gender === 'female' || (sampleText.toLowerCase().includes('phương thảo') || sampleText.toLowerCase().includes('bảo trâm'));
      const hfResult = await synthesizeWithHuggingFace({
        text: sampleText,
        modelId: hfModel,
        speed: 1.0,
        gender: isFemale ? 'female' : 'male',
      });
      if (hfResult?.audio) {
        audioBuffer = hfResult.audio;
      } else {
        // Fallback sang CapCut rồi Google
        const capcutFallback = await synthesizeWithCapCut({
          text: sampleText,
          speakerId: profile.capcutSpeaker || (isFemale ? 'vi_female_01' : 'vi_male_01'),
          speed: 1.0,
        });
        if (capcutFallback?.audio) {
          audioBuffer = capcutFallback.audio;
        }
      }
    } else if (provider === 'google') {
      const gResult = await synthesizeWithGoogle({ text: sampleText, lang: 'vi' });
      if (gResult?.audio) {
        audioBuffer = gResult.audio;
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

      // Fallback to local Piper VIVOS/25H real human dataset model if Microsoft Neural is unavailable
      if (!audioBuffer) {
        try {
          const modelFile = safeVoice.includes('female') || safeVoice.includes('HoaiMy')
            ? 'vi_VN-vivos-x_low.onnx'
            : 'vi_VN-25hours_single-low.onnx';
          const modelPath = join(MODELS_DIR, modelFile);
          const result = await synthesizeWithPiper({
            text: sampleText,
            modelPath,
            outputFormat: 'wav',
            lengthScale: 1.0,
          });
          if (result) {
            audioBuffer = Buffer.concat([createWavHeader(result.rawPcm.length, result.sampleRate), result.rawPcm]);
          }
        } catch (piperErr) {
          console.error('[Voice Preview] Piper fallback error:', piperErr);
        }
      }
    }

    // Fallback toàn diện CapCut nếu chưa có audioBuffer
    if (!audioBuffer) {
      try {
        const isFemale = profile.gender === 'female' || sampleText.toLowerCase().includes('phương thảo') || sampleText.toLowerCase().includes('bảo trâm');
        const capcutRes = await synthesizeWithCapCut({
          text: sampleText,
          speakerId: profile.capcutSpeaker || (isFemale ? 'vi_female_01' : 'vi_male_01'),
          speed: 1.0,
        });
        if (capcutRes?.audio) {
          audioBuffer = capcutRes.audio;
        }
      } catch {}
    }

    // Ultimate fallback Google Translate TTS (bảo đảm 100% không bao giờ trả về lỗi 500)
    if (!audioBuffer) {
      try {
        const gRes = await synthesizeWithGoogle({ text: sampleText, lang: 'vi' });
        if (gRes?.audio) {
          audioBuffer = gRes.audio;
        }
      } catch {}
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
    console.error('Voice Preview Error:', error);
    return NextResponse.json({ error: 'Lỗi tạo âm thanh mẫu' }, { status: 500 });
  }
}
