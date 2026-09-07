import { spawn } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
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
  durationMs: number;
  model: string;
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

  if (!existsSync(modelPath)) {
    console.error('[Piper TTS] Model not found:', modelPath);
    return null;
  }

  const configPath = modelPath.replace(/\.onnx$/i, '.onnx.json');
  if (!existsSync(configPath)) {
    console.error('[Piper TTS] Config not found:', configPath);
    return null;
  }

  const piperCmd = getPiperCommand();
  const args = [
    '-m', 'piper',
    '--model', modelPath,
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
    });

    child.stdin.write(text);
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

    const audioBuffer = Buffer.concat(audioChunks);
    const durationMs = Date.now() - startTime;

    return {
      audio: audioBuffer,
      durationMs,
      model: modelPath,
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
