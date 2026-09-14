import { execFile } from 'child_process';
import { promisify } from 'util';
import { existsSync, promises as fs } from 'fs';
import path from 'path';

const execFileAsync = promisify(execFile);

const languageMap: Record<string, string> = {
  'vi-VN': 'vi',
  vi: 'vi',
  'en-US': 'en',
  en: 'en',
  'ja-JP': 'ja',
  ja: 'ja',
  'ko-KR': 'ko',
  ko: 'ko',
  'zh-CN': 'zh-cn',
  zh: 'zh-cn',
  'es-ES': 'es',
  es: 'es',
  'fr-FR': 'fr',
  fr: 'fr',
  'de-DE': 'de',
  de: 'de',
  'it-IT': 'it',
  it: 'it',
  'pt-BR': 'pt',
  pt: 'pt',
  'ru-RU': 'ru',
  ru: 'ru',
  'tr-TR': 'tr',
  tr: 'tr',
};

export interface XTTSSynthesizeOptions {
  text: string;
  speakerWav: string | string[];
  latentsPath?: string;
  language: string;
  outputPath: string;
  speed?: number;
  temperature?: number;
  repetitionPenalty?: number;
}

export async function synthesizeWithXTTS({
  text,
  speakerWav,
  latentsPath,
  language,
  outputPath,
  speed = 1.0,
  temperature = 0.75,
  repetitionPenalty = 5.0,
}: XTTSSynthesizeOptions): Promise<Buffer | null> {
  const safeLang = languageMap[language] || language.split('-')[0].toLowerCase() || 'vi';

  // 1. Kiểm tra nếu có XTTS API Server độc lập (ví dụ: RunPod, GPU worker, hoặc local FastAPI)
  const xttsApiUrl = process.env.XTTS_API_URL;
  if (xttsApiUrl && xttsApiUrl.trim().startsWith('http')) {
    try {
      const wavList = Array.isArray(speakerWav) ? speakerWav : [speakerWav];
      const res = await fetch(`${xttsApiUrl.replace(/\/$/, '')}/synthesize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          speaker_wavs: wavList,
          language: safeLang,
          speed,
          temperature,
          repetition_penalty: repetitionPenalty,
        }),
      });

      if (res.ok) {
        const arrayBuf = await res.arrayBuffer();
        if (arrayBuf.byteLength > 1024) {
          const buf = Buffer.from(arrayBuf);
          await fs.mkdir(path.dirname(outputPath), { recursive: true });
          await fs.writeFile(outputPath, buf);
          return buf;
        }
      }
    } catch (apiErr) {
      console.warn('[XTTS] API server call failed, trying local Python:', apiErr);
    }
  }

  // 2. Chạy Python CLI cục bộ (scripts/xtts_synthesize.py)
  const wavList = Array.isArray(speakerWav) ? speakerWav : [speakerWav];
  const validWavs = wavList.filter((p) => existsSync(p));

  if (validWavs.length === 0 && (!latentsPath || !existsSync(latentsPath))) {
    console.error('[XTTS] Không tìm thấy audio reference hoặc latents file của voice clone.');
    return null;
  }

  const python =
    process.env.XTTS_PYTHON ||
    process.env.PYTHON_PATH ||
    (process.platform === 'win32' ? 'python' : 'python3');
  const script = path.join(process.cwd(), 'scripts', 'xtts_synthesize.py');

  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  const args = [
    script,
    '--text',
    text.slice(0, 4000),
    '--language',
    safeLang,
    '--output',
    outputPath,
  ];

  if (latentsPath && existsSync(latentsPath)) {
    args.push('--latents-path', latentsPath);
  }

  if (validWavs.length > 0) {
    args.push('--speaker-wav', ...validWavs);
  }

  if (speed && speed !== 1.0) {
    args.push('--speed', speed.toFixed(2));
  }

  if (temperature) {
    args.push('--temperature', temperature.toFixed(2));
  }

  if (repetitionPenalty) {
    args.push('--repetition-penalty', repetitionPenalty.toFixed(2));
  }

  const ttsHome =
    process.env.TTS_HOME ||
    (process.env.USER_VOICES_DIR
      ? path.join(path.dirname(process.env.USER_VOICES_DIR), 'tts-cache')
      : path.join(process.cwd(), '.tts-cache'));

  try {
    const { stdout, stderr } = await execFileAsync(python, args, {
      timeout: 240000,
      maxBuffer: 1024 * 1024 * 16,
      env: {
        ...process.env,
        PYTHONUNBUFFERED: '1',
        COQUI_TOS_AGREED: '1',
        TTS_HOME: ttsHome,
      },
    });

    if (stdout) {
      console.log('[XTTS stdout]:', stdout.trim());
    }
    if (stderr) {
      console.warn('[XTTS stderr]:', stderr.trim());
    }

    if (existsSync(outputPath)) {
      const buffer = await fs.readFile(outputPath);
      if (buffer.length > 1024) {
        return buffer;
      }
    }
    return null;
  } catch (error: any) {
    console.warn('[XTTS] Local python synthesis execution failed:', error?.message || error);
    return null;
  }
}
