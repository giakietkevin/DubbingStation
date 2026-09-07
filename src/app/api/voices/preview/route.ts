import { NextResponse } from 'next/server';
import { Communicate } from 'edge-tts-universal';
import { voicePersonaProfiles } from '@/data/voiceProfiles';

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
    };

    const sampleText = profile.samplePhrase;

    // Tạo âm thanh Neural TTS đa dạng âm sắc với Pitch, Rate, Volume đặc trưng
    const comm = new Communicate(sampleText, {
      voice: profile.neuralModel,
      pitch: profile.pitch,
      rate: profile.rate,
      volume: profile.volume,
    });

    const chunks: Buffer[] = [];
    for await (const chunk of comm.stream()) {
      if (chunk.type === 'audio' && chunk.data) {
        chunks.push(chunk.data as Buffer);
      }
    }

    if (chunks.length === 0) {
      return NextResponse.json({ error: 'Không nhận được dữ liệu âm thanh' }, { status: 500 });
    }

    const fullBuffer = Buffer.concat(chunks);
    const uint8 = new Uint8Array(fullBuffer);

    return new NextResponse(uint8, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': uint8.byteLength.toString(),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=86400, immutable',
        'X-Voice-Profile': voiceId,
      },
    });
  } catch (error) {
    console.error('Voice Preview Error:', error);
    return NextResponse.json({ error: 'Lỗi tạo âm thanh mẫu' }, { status: 500 });
  }
}
