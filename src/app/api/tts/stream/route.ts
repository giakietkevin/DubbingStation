import { NextResponse } from 'next/server';
import { Communicate } from 'edge-tts-universal';
import { voicePersonaProfiles } from '@/data/voiceProfiles';

export const dynamic = 'force-dynamic';

function calculateCombinedRate(personaRateStr: string, speedMultiplier: number): string {
  const personaPercent = parseInt(personaRateStr.replace('%', ''), 10) || 0;
  const userPercent = Math.round((speedMultiplier - 1.0) * 100);
  const totalPercent = personaPercent + userPercent;
  return totalPercent >= 0 ? `+${totalPercent}%` : `${totalPercent}%`;
}

function cleanAndChunkText(input: string, maxLen = 220): string[] {
  const normalized = input
    .replace(/\[pause\s+[0-9.]+s\]/gi, ' ... ')
    .replace(/\[thì_thầm\]/gi, '')
    .replace(/\[nhấn_mạnh\]/gi, '')
    .replace(/\[.*?\]/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\n+/g, '. ')
    .replace(/["“”«»]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const sentences = normalized.split(/(?<=[.?!;])\s+/);
  const chunks: string[] = [];
  let current = '';

  for (const s of sentences) {
    if (!s.trim()) continue;
    if ((current + ' ' + s).trim().length <= maxLen) {
      current = (current + ' ' + s).trim();
    } else {
      if (current) chunks.push(current);
      if (s.length > maxLen) {
        const words = s.split(' ');
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
  return chunks;
}

/**
 * Tầng 1: Microsoft Neural TTS với biến thiên âm sắc persona (pitch, rate, volume)
 * Tầng 2: Microsoft Neural TTS nguyên bản (giữ nguyên chất lượng phòng thu gốc)
 * Tầng 3: Dự phòng khẩn cấp
 */
async function synthesizeWithMicrosoftNeural(
  chunkText: string,
  voice: string,
  pitch: string,
  rate: string,
  volume: string
): Promise<Buffer | null> {
  // Thử 1: Với đặc tính cá nhân hóa (pitch + rate)
  try {
    const comm = new Communicate(chunkText, {
      voice,
      pitch,
      rate,
      volume,
    });
    const audioChunks: Buffer[] = [];
    for await (const ch of comm.stream()) {
      if (ch.type === 'audio' && ch.data) {
        audioChunks.push(ch.data as Buffer);
      }
    }
    if (audioChunks.length > 0) {
      return Buffer.concat(audioChunks);
    }
  } catch {
    // Nếu pitch/rate khiến Microsoft WebSocket từ chối, chuyển ngay sang Thử 2
  }

  // Thử 2: Microsoft Neural Voice nguyên bản (hoàn toàn tự nhiên, không phải tiếng robot Google)
  try {
    const comm = new Communicate(chunkText, { voice });
    const audioChunks: Buffer[] = [];
    for await (const ch of comm.stream()) {
      if (ch.type === 'audio' && ch.data) {
        audioChunks.push(ch.data as Buffer);
      }
    }
    if (audioChunks.length > 0) {
      return Buffer.concat(audioChunks);
    }
  } catch {
    // Dự phòng khi mất kết nối mạng
  }

  // Thử 3: Fallback Google chỉ khi mất kết nối mạng hoàn toàn
  try {
    let lang = 'vi';
    if (voice.startsWith('en')) lang = 'en';
    else if (voice.startsWith('ja')) lang = 'ja';
    else if (voice.startsWith('ko')) lang = 'ko';
    else if (voice.startsWith('zh')) lang = 'zh-CN';

    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(
      chunkText.slice(0, 200)
    )}&tl=${lang}&client=tw-ob`;
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });
    if (res.ok) {
      const arrayBuffer = await res.arrayBuffer();
      return Buffer.from(arrayBuffer);
    }
  } catch {}

  return null;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const text = searchParams.get('text') || 'Xin chào, đây là phòng thu giọng nói DubbingStation.';
    const voiceId = searchParams.get('voiceId') || 'minh-khang';
    const speed = parseFloat(searchParams.get('speed') || '1.0');

    const profile = voicePersonaProfiles[voiceId] || {
      neuralModel: voiceId.includes('female') ? 'vi-VN-HoaiMyNeural' : 'vi-VN-NamMinhNeural',
      pitch: '+0Hz',
      rate: '+0%',
      volume: '+0%',
      samplePhrase: '',
    };

    const combinedRate = calculateCombinedRate(profile.rate, speed);

    const chunks = cleanAndChunkText(text, 220);
    if (chunks.length === 0) {
      return NextResponse.json({ error: 'Nội dung văn bản trống' }, { status: 400 });
    }

    const audioBuffers: Buffer[] = [];
    for (const chunk of chunks) {
      const buf = await synthesizeWithMicrosoftNeural(
        chunk,
        profile.neuralModel,
        profile.pitch,
        combinedRate,
        profile.volume
      );
      if (buf && buf.length > 0) {
        audioBuffers.push(buf);
      }
    }

    if (audioBuffers.length === 0) {
      return NextResponse.json({ error: 'Không thể tạo âm thanh' }, { status: 500 });
    }

    const fullBuffer = Buffer.concat(audioBuffers);
    const uint8 = new Uint8Array(fullBuffer);

    return new NextResponse(uint8, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': uint8.byteLength.toString(),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=3600',
        'X-Voice-Profile': voiceId,
        'X-Engine': 'Microsoft-Azure-Neural-TTS',
      },
    });
  } catch (error) {
    console.error('TTS Master Stream Error:', error);
    return NextResponse.json({ error: 'Lỗi tạo âm thanh' }, { status: 500 });
  }
}
