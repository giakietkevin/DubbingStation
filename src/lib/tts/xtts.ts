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
};

export interface XTTSSynthesizeOptions {
  text: string;
  speakerWav: string;
  language: string;
  outputPath: string;
  speed?: number;
}

export async function synthesizeWithXTTS({
  text,
  speakerWav,
  language,
  outputPath,
  speed = 1.0,
}: XTTSSynthesizeOptions): Promise<Buffer | null> {
  if (!existsSync(speakerWav)) {
    console.error(`[XTTS] Không tìm thấy audio reference tại: ${speakerWav}`);
    throw new Error('Không tìm thấy audio reference của voice clone.');
  }

  const python =
    process.env.XTTS_PYTHON ||
    process.env.PYTHON_PATH ||
    (process.platform === 'win32' ? 'python' : 'python3');
  const script = path.join(process.cwd(), 'scripts', 'xtts_synthesize.py');

  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  const safeLang = languageMap[language] || language.split('-')[0].toLowerCase() || 'vi';

  const args = [
    script,
    '--text',
    text.slice(0, 4000),
    '--speaker-wav',
    speakerWav,
    '--language',
    safeLang,
    '--output',
    outputPath,
  ];

  if (speed && speed !== 1.0) {
    args.push('--speed', speed.toFixed(2));
  }

  const ttsHome =
    process.env.TTS_HOME ||
    (process.env.USER_VOICES_DIR
      ? path.join(path.dirname(process.env.USER_VOICES_DIR), 'tts-cache')
      : path.join(process.cwd(), '.tts-cache'));

  try {
    const { stdout, stderr } = await execFileAsync(python, args, {
      timeout: 180000,
      maxBuffer: 1024 * 1024 * 8,
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
      return await fs.readFile(outputPath);
    }
    return null;
  } catch (error: any) {
    console.error('[XTTS] synthesis process failed:', error?.message || error);
    if (error?.stderr) {
      console.error('[XTTS error output]:', error.stderr);
    }
    return null;
  } finally {
    await fs.rm(outputPath, { force: true }).catch(() => undefined);
  }
}
