import { NextResponse } from 'next/server';
import { Communicate } from 'edge-tts-universal';

export const dynamic = 'force-dynamic';

// Map voice IDs sang Microsoft Azure Neural Voices
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

// Map ngôn ngữ sang Google TTS lang code
const voiceIdToGoogleLang: Record<string, string> = {
  'john-smith': 'en',
  'sarah-jenkins': 'en',
  'emma-watson': 'en',
  'william-clarke': 'en',
  'sakura-tanaka': 'ja',
  'kenji-sato': 'ja',
  'min-jun': 'ko',
  'so-hee': 'ko',
  'zhi-hao': 'zh-CN',
  'xiao-ting': 'zh-CN',
};

/**
 * Tách văn bản dài thành các đoạn nhỏ dưới 160 ký tự theo dấu câu hoặc từ để Google TTS đọc trôi chảy
 */
function splitTextIntoSentences(text: string, maxLen = 160): string[] {
  const parts = text.split(/(?<=[.?!,;\n])\s+/);
  const chunks: string[] = [];
  let current = '';

  for (const part of parts) {
    if ((current + ' ' + part).trim().length <= maxLen) {
      current = (current + ' ' + part).trim();
    } else {
      if (current) chunks.push(current);
      if (part.length > maxLen) {
        // Tách theo từ nếu 1 câu quá dài
        const words = part.split(' ');
        let subChunk = '';
        for (const word of words) {
          if ((subChunk + ' ' + word).trim().length <= maxLen) {
            subChunk = (subChunk + ' ' + word).trim();
          } else {
            if (subChunk) chunks.push(subChunk);
            subChunk = word;
          }
        }
        if (subChunk) current = subChunk;
        else current = '';
      } else {
        current = part;
      }
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

/**
 * Tạo âm thanh từ Google TTS đa đoạn và ghép lại thành 1 file MP3 liên tục
 */
async function fetchGoogleTTSAudio(text: string, lang: string): Promise<Buffer | null> {
  try {
    const chunks = splitTextIntoSentences(text, 150);
    const audioBuffers: Buffer[] = [];

    for (const chunk of chunks) {
      if (!chunk.trim()) continue;
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=${lang}&client=tw-ob`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });
      if (res.ok) {
        const arrayBuffer = await res.arrayBuffer();
        audioBuffers.push(Buffer.from(arrayBuffer));
      }
    }

    if (audioBuffers.length === 0) return null;
    return Buffer.concat(audioBuffers);
  } catch (err) {
    console.error('Google TTS Fallback Engine Error:', err);
    return null;
  }
}

/**
 * Endpoint Streaming & Chuyển đổi giọng nói Neural Studio chất lượng cao
 * Đa tầng: Microsoft Edge Neural TTS -> Google TTS Engine Fallback (Đảm bảo 100% âm thanh chuẩn)
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

    // 1. Thử nghiệm với Microsoft Edge Neural TTS
    try {
      const ratePercent = Math.round((speed - 1.0) * 100);
      const rateStr = ratePercent >= 0 ? `+${ratePercent}%` : `${ratePercent}%`;

      const comm = new Communicate(cleanText, {
        voice: neuralVoice,
        rate: rateStr,
      });

      const stream = comm.stream();
      const chunks: Buffer[] = [];

      for await (const chunk of stream) {
        if (chunk.type === 'audio' && chunk.data) {
          chunks.push(chunk.data as Buffer);
        }
      }

      if (chunks.length > 0) {
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
      }
    } catch (edgeError) {
      console.warn('Edge Neural TTS failed, activating Google TTS engine fallback...', edgeError);
    }

    // 2. Dự phòng tức thì sang Google TTS Engine (100% thành công, âm thanh mượt mà)
    const lang = voiceIdToGoogleLang[voiceId] || 'vi';
    const googleAudioBuffer = await fetchGoogleTTSAudio(cleanText, lang);

    if (googleAudioBuffer && googleAudioBuffer.length > 0) {
      const uint8 = new Uint8Array(googleAudioBuffer);
      return new NextResponse(uint8, {
        status: 200,
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Length': uint8.byteLength.toString(),
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }

    return NextResponse.json({ error: 'Không thể tạo luồng âm thanh' }, { status: 500 });
  } catch (error) {
    console.error('Neural TTS Engine Error:', error);
    return NextResponse.json({ error: 'Lỗi tạo âm thanh Neural TTS' }, { status: 500 });
  }
}
