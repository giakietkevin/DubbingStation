import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { synthesizeClonedAudio, getGeneratedDir } from '@/lib/voiceCloneEngine';
import { getAudioDuration } from '@/lib/dubbingEngine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const body = (await req.json()) as {
      voiceId?: string;
      text?: string;
      language?: string;
      speed?: number;
    };

    const text = body.text?.trim() || '';
    if (!body.voiceId || !text) {
      return NextResponse.json(
        { error: 'Thiếu thông tin giọng nhân bản hoặc nội dung văn bản cần đọc.' },
        { status: 400 }
      );
    }

    if (text.length > 2000) {
      return NextResponse.json(
        { error: 'Đoạn văn bản đọc thử tối đa 2000 ký tự mỗi lần tổng hợp.' },
        { status: 400 }
      );
    }

    const rawVoiceId = body.voiceId;
    const voiceId = rawVoiceId.startsWith('custom-') ? rawVoiceId.slice('custom-'.length) : rawVoiceId;

    let voice = null;
    if (session?.user?.email) {
      voice = await prisma.customVoice.findFirst({
        where: { id: voiceId, user: { email: session.user.email } },
      });
    }
    if (!voice) {
      voice = await prisma.customVoice.findUnique({
        where: { id: voiceId },
      });
    }

    if (!voice?.modelKey) {
      return NextResponse.json(
        { error: 'Không tìm thấy hồ sơ giọng nhân bản hợp lệ.' },
        { status: 404 }
      );
    }

    // Tổng hợp giọng nói qua chuỗi Coqui XTTS-v2 & Acoustic Timbre Morphing
    const audioBuffer = await synthesizeClonedAudio({
      voiceModelKey: voice.modelKey,
      text,
      language: body.language || voice.language || 'vi-VN',
      speed: typeof body.speed === 'number' ? body.speed : 1.0,
      gender: voice.gender || undefined,
    });

    if (!audioBuffer || audioBuffer.length === 0) {
      return NextResponse.json(
        { error: 'Không thể tổng hợp giọng nói từ dữ liệu mẫu của giọng này.' },
        { status: 500 }
      );
    }

    const generatedDir = getGeneratedDir();
    await fs.mkdir(generatedDir, { recursive: true });

    const fileName = `clone-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.wav`;
    const outputPath = path.join(generatedDir, fileName);
    await fs.writeFile(outputPath, audioBuffer);

    let durationSec = 3.0;
    try {
      durationSec = await getAudioDuration(outputPath);
    } catch {
      durationSec = parseFloat((audioBuffer.length / (24000 * 2)).toFixed(2));
    }

    const audioUrl = `/api/generated/audio/${fileName}`;

    return NextResponse.json({
      success: true,
      audioUrl,
      voiceId: voice.id,
      voiceName: voice.name,
      durationSec: parseFloat(durationSec.toFixed(2)),
      fileSize: audioBuffer.length,
      message: 'Đã tổng hợp giọng nói thành công qua mô hình Coqui XTTS-v2.',
    });
  } catch (error: any) {
    console.error('Custom voice synthesis error:', error);
    return NextResponse.json(
      { error: error?.message || 'Không thể tạo âm thanh bằng voice clone.' },
      { status: 500 }
    );
  }
}
