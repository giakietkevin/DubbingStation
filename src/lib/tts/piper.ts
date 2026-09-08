import { spawn } from 'child_process';
import { existsSync, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';

export interface PiperTTSOptions {
  text: string;
  modelPath: string;
  outputFormat?: 'wav' | 'mp3' | 'ogg';
  lengthScale?: number;
  noiseScale?: number;
  noiseWScale?: number;
  sentenceSilence?: number;
  speakerId?: number;
}

export interface PiperTTSResult {
  audio: Buffer;
  rawPcm: Buffer;
  sampleRate: number;
  durationMs: number;
  model: string;
}

export function createWavHeader(
  dataLength: number,
  sampleRate: number = 22050,
  channels: number = 1,
  bitsPerSample: number = 16
): Buffer {
  const header = Buffer.alloc(44);
  const byteRate = sampleRate * channels * (bitsPerSample / 8);
  const blockAlign = channels * (bitsPerSample / 8);

  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataLength, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM format
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataLength, 40);

  return header;
}

const MODELS_DIR = join(process.cwd(), 'models', 'piper');

function ensureModelsDir(): void {
  if (!existsSync(MODELS_DIR)) {
    mkdirSync(MODELS_DIR, { recursive: true });
  }
}

function getPiperCommand(): string {
  if (process.platform === 'win32') {
    return 'python';
  }
  return 'python3';
}

export async function synthesizeWithPiper(options: PiperTTSOptions): Promise<PiperTTSResult | null> {
  const {
    text,
    modelPath,
    outputFormat = 'wav',
    lengthScale = 1.0,
    noiseScale = 0.667,
    noiseWScale = 0.8,
    sentenceSilence = 0.2,
    speakerId,
  } = options;

  ensureModelsDir();

  let resolvedModelPath = modelPath;
  if (!existsSync(resolvedModelPath)) {
    const candidateInModels = join(MODELS_DIR, modelPath);
    if (existsSync(candidateInModels)) {
      resolvedModelPath = candidateInModels;
    } else {
      const isVietnamese =
        modelPath.toLowerCase().includes('vi') ||
        /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(text);
      const defaultVietnamese = join(MODELS_DIR, 'vi_VN-25hours_single-low.onnx');
      const defaultEnglish = join(MODELS_DIR, 'en_US-lessac-medium.onnx');

      if (isVietnamese && existsSync(defaultVietnamese)) {
        resolvedModelPath = defaultVietnamese;
      } else if (existsSync(defaultEnglish)) {
        resolvedModelPath = defaultEnglish;
      } else {
        console.error('[Piper TTS] Model not found and no fallback available:', modelPath);
        return null;
      }
    }
  }

  const configPath = resolvedModelPath.replace(/\.onnx$/i, '.onnx.json');
  if (!existsSync(configPath)) {
    console.error('[Piper TTS] Config not found:', configPath);
    return null;
  }

  let sampleRate = 22050;
  try {
    const rawConfig = readFileSync(configPath, 'utf8');
    const parsedConfig = JSON.parse(rawConfig);
    if (parsedConfig.audio?.sample_rate) {
      sampleRate = parsedConfig.audio.sample_rate;
    }
  } catch (err) {
    console.warn('[Piper TTS] Failed to parse config sample_rate, defaulting to 22050', err);
  }

  const piperCmd = getPiperCommand();
  const args = [
    '-m', 'piper',
    '--model', resolvedModelPath,
    '--config', configPath,
    '--output-raw',
    '--length-scale', String(lengthScale),
    '--noise-scale', String(noiseScale),
    '--noise-w-scale', String(noiseWScale),
    '--sentence-silence', String(sentenceSilence),
  ];

  if (speakerId !== undefined) {
    args.push('--speaker-id', String(speakerId));
  }

  const startTime = Date.now();
  const audioChunks: Buffer[] = [];

  try {
    const child = spawn(piperCmd, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        PYTHONIOENCODING: 'utf-8',
        PYTHONUTF8: '1',
      },
    });

    child.stdin.setDefaultEncoding('utf-8');
    child.stdin.write(text + '\n', 'utf-8');
    child.stdin.end();

    child.stdout.on('data', (chunk) => {
      audioChunks.push(chunk);
    });

    child.stderr.on('data', (data) => {
      console.error('[Piper TTS] stderr:', data.toString());
    });

    await new Promise<void>((resolve, reject) => {
      child.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Piper exited with code ${code}`));
        }
      });
      child.on('error', reject);
    });

    if (audioChunks.length === 0) {
      console.error('[Piper TTS] No audio output');
      return null;
    }

    const rawPcm = Buffer.concat(audioChunks);
    const audioBuffer =
      outputFormat === 'wav'
        ? Buffer.concat([createWavHeader(rawPcm.length, sampleRate), rawPcm])
        : rawPcm;
    const durationMs = Date.now() - startTime;

    return {
      audio: audioBuffer,
      rawPcm,
      sampleRate,
      durationMs,
      model: resolvedModelPath,
    };
  } catch (error) {
    console.error('[Piper TTS] Synthesis failed:', error);
    return null;
  }
}

export async function isPiperAvailable(): Promise<boolean> {
  try {
    const cmd = getPiperCommand();
    const child = spawn(cmd, ['-m', 'piper', '--help'], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    await new Promise<void>((resolve) => {
      child.on('close', () => resolve());
      child.on('error', () => resolve());
    });

    return true;
  } catch {
    return false;
  }
}
