import { promises as fs } from 'fs';
import path from 'path';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getVoiceStorageDir(): string {
  return process.env.USER_VOICES_DIR || path.join(process.cwd(), 'public', 'user-voices');
}

const contentTypes: Record<string, string> = {
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
  '.flac': 'audio/flac',
  '.ogg': 'audio/ogg',
  '.webm': 'audio/webm',
};

export async function GET(
  _request: Request,
  { params }: { params: { voiceId: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
  }

  const voice = await prisma.customVoice.findFirst({
    where: {
      id: params.voiceId,
      user: { email: session.user.email },
    },
  });

  if (!voice?.modelKey) {
    return NextResponse.json({ error: 'Không tìm thấy audio của voice này.' }, { status: 404 });
  }

  try {
    const fileName = path.basename(voice.modelKey);
    const filePath = path.join(getVoiceStorageDir(), fileName);
    const audio = await fs.readFile(filePath);
    const extension = path.extname(fileName).toLowerCase();
    return new NextResponse(audio, {
      headers: {
        'Content-Type': contentTypes[extension] || 'application/octet-stream',
        'Content-Length': audio.byteLength.toString(),
        'Content-Disposition': `inline; filename="${fileName.replace(/"/g, '')}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error: any) {
    if (error?.code === 'ENOENT') {
      return NextResponse.json({ error: 'Audio voice không còn trên máy chủ.' }, { status: 404 });
    }
    console.error('Read custom voice audio error:', error);
    return NextResponse.json({ error: 'Không thể đọc audio voice.' }, { status: 500 });
  }
}