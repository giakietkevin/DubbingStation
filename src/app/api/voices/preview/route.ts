import { NextResponse } from 'next/server';
import { Communicate } from 'edge-tts-universal';
import { voicePersonaProfiles } from '@/data/voiceProfiles';
import { synthesizeWithOpenAI } from '@/lib/tts/openai';
import { synthesizeWithPiper } from '@/lib/tts/piper';
import { join, isAbsolute } from 'path';

export const dynamic = 'force-dynamic';

const MODELS_DIR = join(process.cwd(), 'models', 'piper');

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const voiceId = searchParams.get('voiceId') || 'minh-khang';
    const profile = voicePersonaProfiles[voiceId] || {
      neuralModel: 'vi-VN-NamMinhNeural',
      pitch: '+0Hz',
      rate: '+0%',
      volume: '+0%',
      samplePhrase: 'Xin chào, đây là giọng đọc trí tuệ nhân tạo chất lượng cao của DubbingStation.',
      provider: 'microsoft' as const,
    };

    const sampleText = profile.samplePhrase;
    const provider = profile.provider || 'microsoft';

    let audioBuffer: Buffer | null = null;
    const isWav = provider === 'piper';

    if (provider === 'openai') {
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
      audioBuffer = result?.audio || null;
    } else {
      let safeVoice = profile.neuralModel;
      if (!safeVoice.includes('Neural')) {
        safeVoice = 'vi-VN-NamMinhNeural';
      }

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
      } catch (e) {
        console.warn('[Voice Preview] Microsoft edge-tts preview failed, trying fallback', e);
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
          provider === 'openai'
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
