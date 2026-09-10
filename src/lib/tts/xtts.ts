import { execFile } from 'child_process';
import { promisify } from 'util';
import { existsSync } from 'fs';
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
};

export async function synthesizeWithXTTS({
  text,
  speakerWav,
  language,
  outputPath,
}: {
  text: string;
  speakerWav: string;
  language: string;
  outputPath: string;
}): Promise<Buffer | null> {
  if (!existsSync(speakerWav)) {
    throw new Error('Không tìm thấy audio reference của voice clone.');
  }

  const python = process.env.XTTS_PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
  const script = path.join(process.cwd(), 'scripts', 'xtts_synthesize.py');
  const { promises: fs } = await import('fs');
  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  try {
    const { stdout, stderr } = await execFileAsync(
      python,
      [script, '--text', text.slice(0, 4000), '--speaker-wav', speakerWav, '--language', languageMap[language] || language.split('-')[0], '--output', outputPath],
      {
        timeout: 180000,
        maxBuffer: 1024 * 1024 * 4,
        env: {
          ...process.env,
          PYTHONUNBUFFERED: '1',
          COQUI_TOS_AGREED: '1',
          TTS_HOME: process.env.TTS_HOME || path.join(process.cwd(), '.tts-cache'),
        },
      },
    );
    if (stderr) {
      console.warn('[XTTS stderr]:', stderr);
    }
    return await fs.readFile(outputPath);
  } catch (error) {
    console.error('[XTTS] synthesis failed:', error);
    return null;
  } finally {
    await fs.rm(outputPath, { force: true }).catch(() => undefined);
  }
}
