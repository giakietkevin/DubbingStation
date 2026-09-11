import { promises as fs } from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getGeneratedDir(): string {
  return process.env.GENERATED_DIR || path.join(process.cwd(), 'public', 'generated');
}

export async function GET(_request: Request, { params }: { params: { filename: string } }) {
  const filename = path.basename(params.filename);
  if (filename !== params.filename || !filename.endsWith('.wav')) {
    return NextResponse.json({ error: 'Tên file audio không hợp lệ.' }, { status: 400 });
  }
  try {
    const audio = await fs.readFile(path.join(getGeneratedDir(), filename));
    return new NextResponse(audio, {
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Length': audio.byteLength.toString(),
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Audio không tồn tại.' }, { status: 404 });
  }
}