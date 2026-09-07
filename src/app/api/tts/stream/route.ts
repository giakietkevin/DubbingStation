import { NextResponse } from 'next/server';
import { Communicate } from 'edge-tts-universal';
import { voicePersonaProfiles } from '@/data/voiceProfiles';
import { synthesizeWithOpenAI } from '@/lib/tts/openai';
import { synthesizeWithPiper } from '@/lib/tts/piper';
import { join } from 'path';

export const dynamic = 'force-dynamic';

type TTSProvider = 'microsoft' | 'openai' | 'piper';

const MODELS_DIR = join(process.cwd(), 'models', 'piper');

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

async function synthesizeWithMicrosoftNeural(
  chunkText: string,
  voice: string,
  pitch: string,
  rate: string,
  volume: string
): Promise<Buffer | null> {
  try {
    const comm = new Communicate(chunkText, { voice, pitch, rate, volume });
    const audioChunks: Buffer[] = [];
    for await (const ch of comm.stream()) {
      if (ch.type === 'audio' && ch.data) {
        audioChunks.push(ch.data as Buffer);
      }
    }
    if (audioChunks.length > 0) {
      return Buffer.concat(audioChunks);
    }
    console.error('[TTS] Microsoft stream empty', { voice, pitch, rate, volume });
  } catch (e) {
    console.error('[TTS] Microsoft attempt failed', e);
  }
  return null;
}

async function synthesizeChunk(
  chunkText: string,
  provider: TTSProvider,
  profile: any
): Promise<Buffer | null> {
  if (provider === 'openai') {
    const openAIVoice = profile.openAIVoice || 'nova';
    const result = await synthesizeWithOpenAI({
      text: chunkText,
      model: 'tts-1-hd',
      voice: openAIVoice,
      speed: 1.0,
    });
    return result?.buffer || null;
  }

  if (provider === 'piper') {
    const modelPath = profile.piperModel || join(MODELS_DIR, 'en_US-lessac-medium.onnx');
    const result = await synthesizeWithPiper({
      text: chunkText,
      modelPath,
      outputFormat: 'wav',
      lengthScale: 1.0,
    });
    return result?.audio || null;
  }

  return synthesizeWithMicrosoftNeural(
    chunkText,
    profile.neuralModel,
    profile.pitch,
    profile.rate,
    profile.volume
  );
}

function getProvider(voiceId: string, profile: any): TTSProvider {
  if (profile.provider === 'openai') return 'openai';
  if (profile.provider === 'piper') return 'piper';
  return 'microsoft';
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const text = searchParams.get('text') || 'Xin chào, đây là phòng thu giọng nói DubbingStation.';
    const voiceId = searchParams.get('voiceId') || 'minh-khang';
    const speed = parseFloat(searchParams.get('speed') || '1.0');
    const providerParam = searchParams.get('provider') as TTSProvider | null;

    const profile = voicePersonaProfiles[voiceId] || {
      neuralModel: voiceId.includes('female') ? 'vi-VN-HoaiMyNeural' : 'vi-VN-NamMinhNeural',
      pitch: '+0Hz',
      rate: '+0%',
      volume: '+0%',
      samplePhrase: '',
      provider: 'microsoft' as TTSProvider,
    };

    const provider = providerParam || getProvider(voiceId, profile);

    const chunks = cleanAndChunkText(text, 220);
    if (chunks.length === 0) {
      return NextResponse.json({ error: 'Nội dung văn bản trống' }, { status: 400 });
    }

    const audioBuffers: Buffer[] = [];
    for (const chunk of chunks) {
      const buf = await synthesizeChunk(chunk, provider, profile);
      if (buf && buf.length > 0) {
        audioBuffers.push(buf);
      }
    }

    if (audioBuffers.length === 0) {
      return NextResponse.json(
        {
          error: 'Không thể tạo âm thanh. Tất cả chunk đều thất bại.',
          details: 'Kiểm tra console server.',
          chunksTried: chunks.length,
          voice: voiceId,
          provider,
        },
        { status: 500 }
      );
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
        'X-Provider': provider,
        'X-Engine': provider === 'openai' ? 'OpenAI-TTS-HD' : 'Microsoft-Azure-Neural-TTS',
      },
    });
  } catch (error) {
    console.error('TTS Master Stream Error:', error);
    return NextResponse.json({ error: 'Lỗi tạo âm thanh' }, { status: 500 });
  }
}
