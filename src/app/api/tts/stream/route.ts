import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * API Endpoint chuyển văn bản thành giọng nói thật (Real TTS Streaming)
 * Sử dụng Google Neural TTS Engine chất lượng cao chuẩn tiếng Việt và đa ngôn ngữ.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const text = searchParams.get('text') || 'Xin chào, đây là giọng đọc trí tuệ nhân tạo trên DubbingStation.';
    const lang = searchParams.get('lang') || 'vi';

    // Xóa các thẻ ngữ điệu SSML trước khi đưa vào TTS engine
    const cleanText = text
      .replace(/\[pause\s+[0-9.]+s\]/gi, ' ... ')
      .replace(/\[thì_thầm\]/gi, '')
      .replace(/\[nhấn_mạnh\]/gi, '')
      .replace(/\[.*?\]/g, '')
      .trim();

    if (!cleanText) {
      return NextResponse.json({ error: 'Nội dung văn bản trống' }, { status: 400 });
    }

    // Google TTS hỗ trợ tối đa ~200 ký tự mỗi request, nếu dài hơn ta cắt thành các câu
    const chunks: string[] = [];
    if (cleanText.length <= 180) {
      chunks.push(cleanText);
    } else {
      // Tách theo dấu câu hoặc khoảng trắng
      const sentences = cleanText.match(/[^.!?\n,]+[.!?\n,]*/g) || [cleanText];
      let currentChunk = '';

      for (const sentence of sentences) {
        if ((currentChunk + sentence).length < 180) {
          currentChunk += (currentChunk ? ' ' : '') + sentence.trim();
        } else {
          if (currentChunk) chunks.push(currentChunk);
          currentChunk = sentence.trim();
        }
      }
      if (currentChunk) chunks.push(currentChunk);
    }

    // Lấy audio buffers cho từng chunk
    const audioBuffers: Buffer[] = [];

    for (const chunk of chunks.slice(0, 10)) {
      // Giới hạn demo tối đa 10 chunks (~1.800 ký tự)
      const encodedText = encodeURIComponent(chunk);
      const googleTtsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodedText}&tl=${lang}&client=tw-ob`;

      const response = await fetch(googleTtsUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });

      if (response.ok) {
        const arrayBuf = await response.arrayBuffer();
        audioBuffers.push(Buffer.from(arrayBuf));
      }
    }

    if (audioBuffers.length === 0) {
      return NextResponse.json({ error: 'Không thể tạo âm thanh' }, { status: 500 });
    }

    const combinedBuffer = Buffer.concat(audioBuffers);
    const uint8Array = new Uint8Array(combinedBuffer);

    return new NextResponse(uint8Array, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': uint8Array.byteLength.toString(),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('TTS Stream Error:', error);
    return NextResponse.json({ error: 'Lỗi phát âm thanh TTS' }, { status: 500 });
  }
}
