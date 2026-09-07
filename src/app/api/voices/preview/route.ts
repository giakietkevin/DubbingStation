import { NextResponse } from 'next/server';
import { Communicate } from 'edge-tts-universal';
import { voicePersonaProfiles } from '@/data/voiceProfiles';

export const dynamic = 'force-dynamic';

async function synthesizePreview(text: string, voice: string, pitch: string, rate: string, volume: string): Promise<Buffer | null> {
  // Thử 1: Với đặc tính cá nhân hóa (pitch + rate)
  try {
    const comm = new Communicate(text, {
      voice,
      pitch,
      rate,
      volume,
    });
    const audioChunks: Buffer[] = [];
    for await (const ch of comm.stream()) {
      if (ch.type === 'audio' && ch.data) {
        audioChunks.push(ch.data as Buffer);
      }
    }
    if (audioChunks.length > 0) {
      return Buffer.concat(audioChunks);
    }
  } catch {}

  // Thử 2: Microsoft Neural Voice gốc
  try {
    const comm = new Communicate(text, { voice });
    const audioChunks: Buffer[] = [];
    for await (const ch of comm.stream()) {
      if (ch.type === 'audio' && ch.data) {
        audioChunks.push(ch.data as Buffer);
      }
    }
    if (audioChunks.length > 0) {
      return Buffer.concat(audioChunks);
    }
  } catch {}

  return null;
}

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

    const fullBuffer = await synthesizePreview(
      sampleText,
      profile.neuralModel,
      profile.pitch,
      profile.rate,
      profile.volume
    );

    if (!fullBuffer || fullBuffer.length === 0) {
      return NextResponse.json({ error: 'Không nhận được dữ liệu âm thanh' }, { status: 500 });
    }

    const uint8 = new Uint8Array(fullBuffer);

    return new NextResponse(uint8, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': uint8.byteLength.toString(),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=86400, immutable',
        'X-Voice-Profile': voiceId,
        'X-Engine': 'Microsoft-Azure-Neural-TTS',
      },
    });
  } catch (error) {
    console.error('Voice Preview Error:', error);
    return NextResponse.json({ error: 'Lỗi tạo âm thanh mẫu' }, { status: 500 });
  }
}
