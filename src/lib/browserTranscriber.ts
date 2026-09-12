import { cleanAndDeduplicateWhisperSegments, type WhisperSegment, type WhisperTranscriptionResult } from '@/lib/whisper';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

type ProgressHandler = (message: string) => void;

const transcriberCache = new Map<string, Promise<any>>();
let ffmpegPromise: Promise<FFmpeg> | null = null;

const languageNames: Record<string, string> = {
  vi: 'vietnamese',
  en: 'english',
  zh: 'chinese',
  ja: 'japanese',
  ko: 'korean',
  fr: 'french',
  es: 'spanish',
  ru: 'russian',
  th: 'thai',
  de: 'german',
  it: 'italian',
  pt: 'portuguese',
  id: 'indonesian',
  hi: 'hindi',
  ar: 'arabic',
  ms: 'malay',
  tl: 'tagalog',
};

export type WhisperModelLevel = 'base' | 'small' | 'tiny';

const MODEL_MAP: Record<WhisperModelLevel, { id: string; name: string }> = {
  base: { id: 'Xenova/whisper-base', name: 'Whisper Base (Chuẩn xác, khuyên dùng)' },
  small: { id: 'Xenova/whisper-small', name: 'Whisper Small (Độ chi tiết tối đa)' },
  tiny: { id: 'Xenova/whisper-tiny', name: 'Whisper Tiny (Siêu nhẹ, tốc độ cao)' },
};

async function getTranscriber(modelKey: WhisperModelLevel = 'base', onProgress: ProgressHandler): Promise<any> {
  const modelInfo = MODEL_MAP[modelKey] || MODEL_MAP.base;
  const cacheKey = modelInfo.id;

  if (!transcriberCache.has(cacheKey)) {
    const transformersModuleUrl = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.2.0/dist/transformers.min.js';
    const loadPromise = import(/* webpackIgnore: true */ transformersModuleUrl).then(async ({ pipeline }) => {
      const supportsWebGPU = 'gpu' in navigator;
      onProgress(supportsWebGPU ? `Đang tải ${modelInfo.name} (WebGPU)...` : `Đang tải ${modelInfo.name}...`);

      const pipelineOptions = {
        dtype: 'q8',
        device: supportsWebGPU ? 'webgpu' : 'wasm',
        progress_callback: (progress: { status?: string; progress?: number; file?: string }) => {
          if (progress.status === 'progress' && typeof progress.progress === 'number') {
            onProgress(`Đang nạp mô hình ${modelKey.toUpperCase()}: ${Math.round(progress.progress)}%`);
          } else if (progress.status === 'ready') {
            onProgress('Mô hình AI đã sẵn sàng phân tích âm thanh...');
          }
        },
      };

      try {
        return await pipeline('automatic-speech-recognition', modelInfo.id, pipelineOptions);
      } catch (error) {
        if (!supportsWebGPU) throw error;
        onProgress('Chuyển sang chế độ tương thích CPU WASM...');
        return pipeline('automatic-speech-recognition', modelInfo.id, {
          dtype: 'q8',
          device: 'wasm',
        });
      }
    });

    transcriberCache.set(cacheKey, loadPromise);
  }

  return transcriberCache.get(cacheKey)!;
}

async function extractAudioWithFFmpeg(file: File, onProgress: ProgressHandler): Promise<{ samples: Float32Array; durationSec: number }> {
  if (!ffmpegPromise) {
    const ffmpeg = new FFmpeg();
    ffmpeg.on('progress', ({ progress }) => {
      onProgress(`Đang giải mã audio trên thiết bị: ${Math.round(progress * 100)}%`);
    });
    ffmpegPromise = ffmpeg.load().then(() => ffmpeg);
  }

  const ffmpeg = await ffmpegPromise;
  const inputName = `input-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const outputName = `decoded-${Date.now()}.wav`;

  try {
    await ffmpeg.writeFile(inputName, await fetchFile(file));
    await ffmpeg.exec(['-i', inputName, '-vn', '-ac', '1', '-ar', '16000', '-c:a', 'pcm_s16le', outputName]);
    const output = await ffmpeg.readFile(outputName);
    const bytes = typeof output === 'string' ? new TextEncoder().encode(output) : new Uint8Array(output);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const isRiff = bytes.length >= 4 && bytes[0] === 82 && bytes[1] === 73 && bytes[2] === 70 && bytes[3] === 70;
    if (bytes.length < 44 || !isRiff) {
      throw new Error('Không thể đọc audio sau khi giải mã.');
    }

    const sampleRate = view.getUint32(24, true);
    const frameCount = Math.floor((bytes.length - 44) / 2);
    const samples = new Float32Array(frameCount);
    for (let index = 0; index < frameCount; index += 1) {
      samples[index] = view.getInt16(44 + index * 2, true) / 32768;
    }
    return { samples, durationSec: frameCount / sampleRate };
  } finally {
    await ffmpeg.deleteFile(inputName).catch(() => undefined);
    await ffmpeg.deleteFile(outputName).catch(() => undefined);
  }
}

/**
 * Tách và lấy mẫu âm thanh từ video sang 16kHz Mono bằng OfflineAudioContext khử răng cưa
 */
async function extractAudio(file: File, onProgress: ProgressHandler): Promise<{ samples: Float32Array; durationSec: number }> {
  onProgress('Đang đọc và tách âm thanh từ video...');
  const AudioContextConstructor = window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextConstructor) {
    return extractAudioWithFFmpeg(file, onProgress);
  }

  const audioContext = new AudioContextConstructor();
  try {
    let decoded: AudioBuffer;
    try {
      const arrayBuffer = await file.arrayBuffer();
      decoded = await audioContext.decodeAudioData(arrayBuffer);
    } catch {
      onProgress('Trình duyệt cần bộ giải mã tương thích sâu hơn, đang xử lý...');
      return await extractAudioWithFFmpeg(file, onProgress);
    }

    const durationSec = decoded.duration;
    const targetSampleRate = 16000;
    const targetLength = Math.ceil(durationSec * targetSampleRate);

    onProgress('Đang xử lý âm thanh chuẩn phòng thu 16kHz khử nhiễu...');

    // 1. Dùng OfflineAudioContext để resample chuẩn xác có bộ lọc khử răng cưa (Sinc / Polyphase Anti-aliasing)
    let samples: Float32Array;
    const OfflineConstructor = window.OfflineAudioContext || (window as any).webkitOfflineAudioContext;
    if (OfflineConstructor) {
      try {
        const offlineContext = new OfflineConstructor(1, targetLength, targetSampleRate);
        const bufferSource = offlineContext.createBufferSource();
        bufferSource.buffer = decoded;
        bufferSource.connect(offlineContext.destination);
        bufferSource.start(0);
        const renderedBuffer = await offlineContext.startRendering();
        samples = renderedBuffer.getChannelData(0);
      } catch {
        // Fallback: nội suy thủ công nếu offline context gặp giới hạn bộ nhớ
        samples = manualResampleToMono16k(decoded);
      }
    } else {
      samples = manualResampleToMono16k(decoded);
    }

    // 2. Chuẩn hóa âm lượng (Peak Normalization): Giúp Whisper nghe rõ cả tiếng thì thầm và đàm thoại nhỏ
    normalizeAudioSamples(samples);

    return { samples, durationSec };
  } finally {
    await audioContext.close();
  }
}

function manualResampleToMono16k(decoded: AudioBuffer): Float32Array {
  const durationSec = decoded.duration;
  const sampleCount = Math.ceil(durationSec * 16000);
  const samples = new Float32Array(sampleCount);
  const channelData = Array.from({ length: decoded.numberOfChannels }, (_, index) => decoded.getChannelData(index));
  const sourceRate = decoded.sampleRate;

  for (let index = 0; index < sampleCount; index += 1) {
    const sourcePosition = (index * sourceRate) / 16000;
    const sourceIndex = Math.floor(sourcePosition);
    const fraction = sourcePosition - sourceIndex;
    let mixedSample = 0;

    for (const channel of channelData) {
      const current = channel[Math.min(sourceIndex, channel.length - 1)] || 0;
      const next = channel[Math.min(sourceIndex + 1, channel.length - 1)] || 0;
      mixedSample += current + (next - current) * fraction;
    }

    samples[index] = mixedSample / channelData.length;
  }
  return samples;
}

/**
 * Chuẩn hóa biên độ âm thanh lên mức tối ưu 0.95 để tăng tối đa độ nhạy nhận diện của Whisper
 */
function normalizeAudioSamples(samples: Float32Array): void {
  let peak = 0;
  for (let i = 0; i < samples.length; i++) {
    const abs = Math.abs(samples[i]);
    if (abs > peak) peak = abs;
  }

  if (peak > 0.01 && peak < 0.85) {
    const gain = Math.min(0.95 / peak, 4.0);
    for (let i = 0; i < samples.length; i++) {
      samples[i] *= gain;
    }
  }
}

export async function transcribeVideoFile(
  file: File,
  language: string,
  onProgress: ProgressHandler = () => undefined,
  modelLevel: WhisperModelLevel = 'base'
): Promise<WhisperTranscriptionResult> {
  if (typeof window === 'undefined') {
    throw new Error('Nhận diện video chỉ chạy trên trình duyệt.');
  }

  const { samples, durationSec } = await extractAudio(file, onProgress);
  const transcriber = await getTranscriber(modelLevel, onProgress);
  onProgress('Whisper AI đang phân tích khẩu âm và tạo mốc thời gian chuẩn xác...');

  // Xác định ngôn ngữ giải mã cho Whisper
  // Truyền mã ngôn ngữ chuẩn ISO 639-1 (vi, en, zh, ja, ko...) cho cả language và generate_kwargs
  const langKey = language.toLowerCase().trim();
  const whisperLang = langKey !== 'auto' ? langKey : undefined;

  const generateKwargs: Record<string, any> = {
    task: 'transcribe',
  };
  if (whisperLang) {
    generateKwargs.language = whisperLang;
  }

  // Whisper kiến trúc chuẩn hoạt động tối ưu nhất ở cửa sổ 30 giây (chunk_length_s: 30)
  const output = await transcriber(samples, {
    return_timestamps: true,
    chunk_length_s: 30,
    stride_length_s: 5,
    task: 'transcribe',
    ...(whisperLang ? { language: whisperLang } : {}),
    generate_kwargs: generateKwargs,
  });

  const chunks = Array.isArray(output.chunks) ? output.chunks : [];
  const rawSegments: WhisperSegment[] = chunks
    .map((chunk: { timestamp?: [number | null, number | null]; text?: string }, index: number) => {
      const [start, end] = chunk.timestamp || [null, null];
      const text = (chunk.text || '').trim();
      const wordCount = text.split(/\s+/).filter(Boolean).length;

      const safeStart = Number(start ?? (index * 4));

      // Tính thời lượng tự nhiên dựa trên số từ thoại thay vì gán cứng 3.0s khi thiếu end timestamp
      let estimatedDuration = Math.max(0.6, Math.min(6.0, wordCount * 0.38 + 0.3));
      const nextChunk = chunks[index + 1];
      const nextStart = nextChunk?.timestamp?.[0];
      if (typeof nextStart === 'number' && nextStart > safeStart) {
        estimatedDuration = Math.min(estimatedDuration, Math.max(0.4, nextStart - safeStart));
      }

      const safeEnd = typeof end === 'number' && end > safeStart
        ? Number(end)
        : Math.min(durationSec, safeStart + estimatedDuration);

      return {
        id: index + 1,
        start: Math.max(0, safeStart),
        end: Math.max(safeStart + 0.3, safeEnd),
        text,
      };
    })
    .filter((segment: WhisperSegment) => segment.text && segment.text.length > 0 && segment.end > segment.start);

  if (rawSegments.length === 0 && output.text?.trim()) {
    rawSegments.push({ id: 1, start: 0, end: durationSec, text: output.text.trim() });
  }

  if (rawSegments.length === 0) {
    throw new Error('Whisper không tìm thấy lời thoại rõ ràng trong video này.');
  }

  // Khử trùng lặp và căn chỉnh sát timeline video, không làm mất thoại
  const segments = cleanAndDeduplicateWhisperSegments(rawSegments);

  return {
    text: output.text?.trim() || segments.map((s) => s.text).join(' '),
    language: whisperLang || String(output.language || 'auto'),
    durationSec,
    segments,
  };
}
