import { NextResponse } from 'next/server';
import { Communicate } from 'edge-tts-universal';
import { voicePersonaProfiles } from '@/data/voiceProfiles';
import { synthesizeWithOpenAI } from '@/lib/tts/openai';

export const dynamic = 'force-dynamic';

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

    if (provider === 'openai') {
      const result = await synthesizeWithOpenAI({
        text: sampleText,
        model: 'tts-1-hd',
        voice: profile.openAIVoice || 'nova',
        speed: 1.0,
      });
      audioBuffer = result?.buffer || null;
    } else {
      const comm = new Communicate(sampleText, {
        voice: profile.neuralModel,
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
    }

    if (!audioBuffer) {
      return NextResponse.json({ error: 'Không nhận được dữ liệu âm thanh' }, { status: 500 });
    }

    const fullBuffer = audioBuffer;
    const uint8 = new Uint8Array(fullBuffer);

    return new Response(uint8, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': uint8.byteLength.toString(),
        'Cache-Control': 'public, max-age=86400, immutable',
        'X-Voice-Profile': voiceId,
        'X-Provider': provider,
        'X-Engine': provider === 'openai' ? 'OpenAI-TTS-HD' : 'Microsoft-Azure-Neural-TTS',
      },
    });
  } catch (error) {
    console.error('Voice Preview Error:', error);
    return NextResponse.json({ error: 'Lỗi tạo âm thanh mẫu' }, { status: 500 });
  }
}
