import { promises as fs } from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getGeneratedDir(): string {
  return process.env.GENERATED_DIR || path.join(process.cwd(), 'public', 'generated');
}

export async function GET(
  _request: Request,
  { params }: { params: { filename: string } },
) {
  const filename = path.basename(params.filename);
  if (!filename || filename !== params.filename || !filename.toLowerCase().endsWith('.mp4')) {
    return NextResponse.json({ error: 'Tên file video không hợp lệ.' }, { status: 400 });
  }

  try {
    const filePath = path.join(getGeneratedDir(), filename);
    const file = await fs.readFile(filePath);
    return new NextResponse(file, {
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Length': file.byteLength.toString(),
        'Content-Disposition': `inline; filename="${filename.replace(/"/g, '')}"`,
        'Cache-Control': 'no-store',
        'Accept-Ranges': 'bytes',
      },
    });
  } catch (error: any) {
    if (error?.code === 'ENOENT') {
      return NextResponse.json({ error: 'Video đã hết hạn hoặc không còn trên máy chủ.' }, { status: 404 });
    }
    console.error('Generated video download error:', error);
    return NextResponse.json({ error: 'Không thể đọc video đã lồng tiếng.' }, { status: 500 });
  }
}