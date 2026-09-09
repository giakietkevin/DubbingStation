import { synthesizeWithHuggingFace } from './huggingface';
import { synthesizeWithGoogle } from './google';

export interface CapCutTTSOptions {
  text: string;
  speakerId: string; // e.g. 'vi_male_01', 'vi_male_02', 'vi_female_01', 'vi_female_02'
  speed?: number;
}

export interface CapCutTTSResult {
  audio: Buffer;
  format: 'mp3';
  speaker: string;
  durationMs: number;
}

/**
 * Danh mục giọng đọc CapCut / TikTok ByteDance chính thức
 */
export const CAPCUT_VOICES = {
  // Tiếng Việt
  'capcut-vi-male-film': {
    id: 'capcut-vi-male-film',
    speaker: 'vi_male_01',
    name: 'Nam Trầm Ấm (CapCut Phim)',
    gender: 'male' as const,
    description: 'Giọng nam trầm ấm truyền cảm, phong cách tóm tắt phim điện ảnh và review kinh điển trên CapCut/TikTok',
    samplePhrase: 'Chào mừng các bạn đã quay trở lại, hôm nay chúng ta sẽ cùng khám phá một bộ phim vô cùng kịch tính.',
  },
  'capcut-vi-male-reviewer': {
    id: 'capcut-vi-male-reviewer',
    speaker: 'vi_male_02',
    name: 'Nam Hoạt Ngôn (CapCut Reviewer)',
    gender: 'male' as const,
    description: 'Giọng nam năng động, nhịp điệu dứt khoát, chuyên review đồ công nghệ và tin tức xu hướng TikTok',
    samplePhrase: 'Đây chính là món đồ công nghệ đáng mua nhất trong tầm giá mà bạn không nên bỏ lỡ!',
  },
  'capcut-vi-female-sweet': {
    id: 'capcut-vi-female-sweet',
    speaker: 'vi_female_01',
    name: 'Nữ Ngọt Ngào (CapCut Viral)',
    gender: 'female' as const,
    description: 'Giọng nữ trong trẻo, tự nhiên, phổ biến hàng đầu trong các video đời sống, ẩm thực và mẹo vặt',
    samplePhrase: 'Hôm nay mình sẽ hướng dẫn các bạn làm món ăn siêu ngon và cực kỳ đơn giản này nhé!',
  },
  'capcut-vi-female-story': {
    id: 'capcut-vi-female-story',
    speaker: 'vi_female_02',
    name: 'Nữ Kể Chuyện (CapCut Truyền Cảm)',
    gender: 'female' as const,
    description: 'Giọng nữ truyền cảm, dịu dàng, phù hợp đọc truyện ngắn, podcast tâm sự và tản văn',
    samplePhrase: 'Có những ngày bình yên như thế, chỉ cần một góc nhỏ tĩnh lặng để cảm nhận cuộc sống.',
  },
};

// Các gateway API phân tán của ByteDance / TikTok
const BYTEDANCE_TTS_ENDPOINTS = [
  'https://api16-normal-c-useast1a.tiktokv.com/media/api/text/speech/invoke/',
  'https://api22-normal-c-useast1a.tiktokv.com/media/api/text/speech/invoke/',
  'https://api16-core-c-useast1a.tiktokv.com/media/api/text/speech/invoke/',
  'https://api16-normal-v2.tiktokv.com/media/api/text/speech/invoke/',
];

/**
 * Chia nhỏ đoạn văn bản thành các câu ngắn dưới 200 ký tự để phù hợp giới hạn API CapCut
 */
function splitTextForCapCut(text: string, maxChunkLen: number = 200): string[] {
  const clean = text.trim();
  if (clean.length <= maxChunkLen) return [clean];

  const sentences = clean.split(/([.!?,;\n\r]+)/g);
  const chunks: string[] = [];
  let currentChunk = '';

  for (let i = 0; i < sentences.length; i++) {
    const part = sentences[i];
    if (!part) continue;

    if ((currentChunk + part).length <= maxChunkLen) {
      currentChunk += part;
    } else {
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }
      // Nếu một từ đơn lẻ quá dài
      if (part.length > maxChunkLen) {
        const words = part.split(/\s+/);
        let subChunk = '';
        for (const w of words) {
          if ((subChunk + ' ' + w).length <= maxChunkLen) {
            subChunk += (subChunk ? ' ' : '') + w;
          } else {
            if (subChunk) chunks.push(subChunk);
            subChunk = w;
          }
        }
        currentChunk = subChunk;
      } else {
        currentChunk = part;
      }
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks.filter((c) => c.length > 0);
}

/**
 * Gọi API ByteDance/CapCut cho một đoạn văn bản ngắn (dưới 200 ký tự)
 */
async function synthesizeSingleChunk(
  chunk: string,
  speaker: string
): Promise<Buffer | null> {
  const encodedText = encodeURIComponent(chunk);

  for (const endpoint of BYTEDANCE_TTS_ENDPOINTS) {
    try {
      const targetUrl = `${endpoint}?text_speaker=${speaker}&req_text=${encodedText}&speaker_map_type=0&aid=1233`;
      const res = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'User-Agent':
            'com.zhiliaoapp.musically/2022600030 (Linux; U; Android 7.1.2; es_ES; SM-G988N; Build/NRD90M;tt-ok/3.12.13.1)',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        signal: AbortSignal.timeout(7000),
      });

      if (!res.ok) continue;

      const data = (await res.json()) as any;
      if (data && data.status_code === 0 && data.data?.v_str) {
        const base64Audio = data.data.v_str;
        return Buffer.from(base64Audio, 'base64');
      }
    } catch (err) {
      // Endpoint error, try next gateway
      continue;
    }
  }

  return null;
}

/**
 * Hàm tổng hợp âm thanh giọng đọc CapCut / TikTok
 * Hỗ trợ tự động phân đoạn văn bản dài, ghép nối MP3 và fallback sang Hugging Face người thật nếu cần
 */
export async function synthesizeWithCapCut(
  options: CapCutTTSOptions
): Promise<CapCutTTSResult | null> {
  const { text, speakerId, speed = 1.0 } = options;
  const startTime = Date.now();

  if (!text || !text.trim()) return null;

  // Lấy speaker code thực tế của ByteDance
  let rawSpeaker = speakerId;
  if (CAPCUT_VOICES[speakerId as keyof typeof CAPCUT_VOICES]) {
    rawSpeaker = CAPCUT_VOICES[speakerId as keyof typeof CAPCUT_VOICES].speaker;
  }

  const chunks = splitTextForCapCut(text);
  const audioBuffers: Buffer[] = [];

  // Gọi lần lượt các chunk để giữ đúng ngữ tự và tránh rate-limit
  for (const chunk of chunks) {
    const buf = await synthesizeSingleChunk(chunk, rawSpeaker);
    if (buf && buf.length > 100) {
      audioBuffers.push(buf);
    } else {
      // Nếu 1 chunk gọi API CapCut thất bại, fallback sang Hugging Face hoặc Google
      const isFemale = rawSpeaker.includes('female');
      const hfResult = await synthesizeWithHuggingFace({
        text: chunk,
        modelId: isFemale ? 'facebook/mms-tts-vie' : 'facebook/mms-tts-vie',
        gender: isFemale ? 'female' : 'male',
        speed,
      });
      if (hfResult?.audio) {
        audioBuffers.push(hfResult.audio);
      } else {
        const gRes = await synthesizeWithGoogle({ text: chunk, lang: 'vi' });
        if (gRes?.audio) {
          audioBuffers.push(gRes.audio);
        }
      }
    }
  }

  if (audioBuffers.length > 0) {
    const combinedBuffer = Buffer.concat(audioBuffers);
    return {
      audio: combinedBuffer,
      format: 'mp3',
      speaker: rawSpeaker,
      durationMs: Date.now() - startTime,
    };
  }

  // Nếu toàn bộ CapCut gateway bị gián đoạn, fallback toàn văn bản sang Google
  const gFallback = await synthesizeWithGoogle({ text, lang: 'vi' });
  if (gFallback?.audio) {
    return {
      audio: gFallback.audio,
      format: 'mp3',
      speaker: `google-fallback-${rawSpeaker}`,
      durationMs: Date.now() - startTime,
    };
  }

  return null;
}
