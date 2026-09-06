import { NextResponse } from 'next/server';
import { Communicate } from 'edge-tts-universal';

export const dynamic = 'force-dynamic';

// Map voice IDs sang Microsoft Azure Neural Voices thực tế
const voiceIdToNeuralModel: Record<string, string> = {
  // Tiếng Việt
  'minh-khang': 'vi-VN-NamMinhNeural',
  'bac-ba-review': 'vi-VN-NamMinhNeural',
  'nam-than-review': 'vi-VN-NamMinhNeural',
  'hoang-nam': 'vi-VN-NamMinhNeural',
  'quoc-bao': 'vi-VN-NamMinhNeural',
  'thay-giao-tung': 'vi-VN-NamMinhNeural',
  'truyen-ma-nguyen-ngoc': 'vi-VN-NamMinhNeural',

  'mai-anh': 'vi-VN-HoaiMyNeural',
  'chi-google': 'vi-VN-HoaiMyNeural',
  'genz-linh-dan': 'vi-VN-HoaiMyNeural',
  'em-be-bap': 'vi-VN-HoaiMyNeural',
  'my-duyen': 'vi-VN-HoaiMyNeural',
  'ngoc-lan': 'vi-VN-HoaiMyNeural',
  'thu-huong': 'vi-VN-HoaiMyNeural',

  // Tiếng Anh
  'john-smith': 'en-US-ChristopherNeural',
  'sarah-jenkins': 'en-US-JennyNeural',
  'emma-watson': 'en-GB-SoniaNeural',
  'william-clarke': 'en-GB-RyanNeural',

  // Tiếng Nhật
  'sakura-tanaka': 'ja-JP-NanamiNeural',
  'kenji-sato': 'ja-JP-KeitaNeural',

  // Tiếng Hàn
  'min-jun': 'ko-KR-InJoonNeural',
  'so-hee': 'ko-KR-SunHiNeural',

  // Tiếng Trung
  'zhi-hao': 'zh-CN-YunxiNeural',
  'xiao-ting': 'zh-CN-XiaoxiaoNeural',
};

/**
 * Endpoint Streaming & Chuyển đổi giọng nói Neural Studio chất lượng cao
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const text = searchParams.get('text') || 'Xin chào, đây là giọng đọc trí tuệ nhân tạo của DubbingStation.';
    const voiceId = searchParams.get('voiceId') || 'minh-khang';
    const speed = parseFloat(searchParams.get('speed') || '1.0');

    // Xử lý các thẻ SSML / Pause helper
    const cleanText = text
      .replace(/\[pause\s+[0-9.]+s\]/gi, ' ... ')
      .replace(/\[thì_thầm\]/gi, '')
      .replace(/\[nhấn_mạnh\]/gi, '')
      .replace(/\[.*?\]/g, '')
      .trim();

    if (!cleanText) {
      return NextResponse.json({ error: 'Nội dung văn bản trống' }, { status: 400 });
    }

    const neuralVoice = voiceIdToNeuralModel[voiceId] || (voiceId.includes('female') ? 'vi-VN-HoaiMyNeural' : 'vi-VN-NamMinhNeural');

    // Tính toán rate string cho edge-tts (ví dụ: '+20%', '-10%')
    const ratePercent = Math.round((speed - 1.0) * 100);
    const rateStr = ratePercent >= 0 ? `+${ratePercent}%` : `${ratePercent}%`;

    const comm = new Communicate(cleanText, neuralVoice, {
      rate: rateStr,
    });

    const stream = comm.stream();
    const chunks: Buffer[] = [];

    for await (const chunk of stream) {
      if (chunk.type === 'audio' && chunk.data) {
        chunks.push(chunk.data as Buffer);
      }
    }

    if (chunks.length === 0) {
      return NextResponse.json({ error: 'Không thể tạo luồng âm thanh' }, { status: 500 });
    }

    const fullBuffer = Buffer.concat(chunks);
    const uint8 = new Uint8Array(fullBuffer);

    return new NextResponse(uint8, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': uint8.byteLength.toString(),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Neural TTS Engine Error:', error);
    return NextResponse.json({ error: 'Lỗi tạo âm thanh Neural TTS' }, { status: 500 });
  }
}
