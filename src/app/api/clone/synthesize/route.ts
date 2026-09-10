import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { synthesizeWithXTTS } from '@/lib/tts/xtts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

  try {
    const body = await req.json() as { voiceId?: string; text?: string };
    const text = body.text?.trim() || '';
    if (!body.voiceId || !text) return NextResponse.json({ error: 'Thiếu voice hoặc nội dung cần đọc.' }, { status: 400 });

    const voiceId = body.voiceId.startsWith('custom-') ? body.voiceId.slice('custom-'.length) : body.voiceId;
    const voice = await prisma.customVoice.findFirst({
      where: { id: voiceId, user: { email: session.user.email } },
    });
    if (!voice?.modelKey) return NextResponse.json({ error: 'Không tìm thấy voice clone.' }, { status: 404 });

    const referencePath = path.join(process.cwd(), 'public', 'user-voices', path.basename(voice.modelKey));
    const outputPath = path.join(process.cwd(), 'public', 'user-voices', `generated-${crypto.randomUUID()}.wav`);
    const audio = await synthesizeWithXTTS({
      text,
      speakerWav: referencePath,
      language: voice.language,
      outputPath,
    });
    if (!audio) {
      return NextResponse.json({ error: 'XTTS chưa sẵn sàng hoặc không thể tạo giọng từ audio này.' }, { status: 503 });
    }

    const fileName = `clone-${Date.now()}.wav`;
    const generatedPath = path.join(process.cwd(), 'public', 'generated', fileName);
    await fs.mkdir(path.dirname(generatedPath), { recursive: true });
    await fs.writeFile(generatedPath, audio);
    return NextResponse.json({ audioUrl: `/api/generated/audio/${fileName}`, voiceId: voice.id });
  } catch (error) {
    console.error('Custom voice synthesis error:', error);
    return NextResponse.json({ error: 'Không thể tạo âm thanh bằng voice clone.' }, { status: 500 });
  }
}