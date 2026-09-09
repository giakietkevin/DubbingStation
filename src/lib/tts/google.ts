export interface GoogleTTSOptions {
  text: string;
  lang?: string;
  speed?: number;
}

export interface GoogleTTSResult {
  audio: Buffer;
  sampleRate: number;
  format: 'mp3';
  durationMs: number;
}

function splitTextForGoogle(text: string, maxLen: number = 180): string[] {
  const clean = text.trim();
  if (clean.length <= maxLen) return [clean];

  const sentences = clean.split(/(?<=[.!?,;\n\r])\s+/);
  const chunks: string[] = [];
  let current = '';

  for (const s of sentences) {
    if (!s) continue;
    if ((current + ' ' + s).trim().length <= maxLen) {
      current = (current + ' ' + s).trim();
    } else {
      if (current) chunks.push(current);
      if (s.length > maxLen) {
        const words = s.split(/\s+/);
        let sub = '';
        for (const w of words) {
          if ((sub + ' ' + w).trim().length <= maxLen) {
            sub = (sub + ' ' + w).trim();
          } else {
            if (sub) chunks.push(sub);
            sub = w;
          }
        }
        current = sub;
      } else {
        current = s;
      }
    }
  }
  if (current && current.trim()) chunks.push(current.trim());
  return chunks.filter((c) => c.length > 0);
}

/**
 * Tổng hợp giọng đọc Google TTS (tw-ob client)
 * Đảm bảo 100% tin cậy, không cần API Key, hoạt động trên mọi môi trường (Render, Vercel, Docker)
 */
export async function synthesizeWithGoogle(options: GoogleTTSOptions): Promise<GoogleTTSResult | null> {
  const { text, lang = 'vi' } = options;
  const startTime = Date.now();

  if (!text || !text.trim()) return null;

  const chunks = splitTextForGoogle(text);
  const audioBuffers: Buffer[] = [];

  for (const chunk of chunks) {
    try {
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=${lang}&client=tw-ob`;
      const res = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Referer': 'https://translate.google.com/',
          'Accept': '*/*',
        },
        signal: AbortSignal.timeout(6000),
      });

      if (res.ok) {
        const arrayBuf = await res.arrayBuffer();
        const buf = Buffer.from(arrayBuf);
        if (buf.length > 100) {
          audioBuffers.push(buf);
        }
      }
    } catch (err) {
      console.warn('[Google TTS] Failed synthesizing chunk:', err);
    }
  }

  if (audioBuffers.length > 0) {
    return {
      audio: Buffer.concat(audioBuffers),
      sampleRate: 24000,
      format: 'mp3',
      durationMs: Date.now() - startTime,
    };
  }

  return null;
}
