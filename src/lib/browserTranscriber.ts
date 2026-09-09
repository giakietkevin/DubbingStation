import { cleanAndDeduplicateWhisperSegments, type WhisperSegment, type WhisperTranscriptionResult } from '@/lib/whisper';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

type ProgressHandler = (message: string) => void;

let transcriberPromise: Promise<any> | null = null;
let ffmpegPromise: Promise<FFmpeg> | null = null;

const languageNames: Record<string, string> = {
  vi: 'vietnamese',
  en: 'english',
  ja: 'japanese',
  ko: 'korean',
  zh: 'chinese',
};

async function getTranscriber(onProgress: ProgressHandler): Promise<any> {
  if (!transcriberPromise) {
    const transformersModuleUrl = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.2.0/dist/transformers.min.js';
    transcriberPromise = import(/* webpackIgnore: true */ transformersModuleUrl).then(async ({ pipeline }) => {
      const supportsWebGPU = 'gpu' in navigator;
      onProgress(supportsWebGPU ? 'Đang khởi tạo Whisper bằng WebGPU...' : 'Đang khởi tạo Whisper bản nhẹ...');

      const pipelineOptions = {
        dtype: supportsWebGPU ? 'fp16' : 'q8',
        device: supportsWebGPU ? 'webgpu' : 'wasm',
        progress_callback: (progress: { status?: string; progress?: number }) => {
          if (progress.status === 'progress' && typeof progress.progress === 'number') {
            onProgress(`Đang tải mô hình Whisper: ${Math.round(progress.progress)}%`);
          }
        },
      };

      try {
        return await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny', pipelineOptions);
      } catch (error) {
        if (!supportsWebGPU) throw error;
        onProgress('WebGPU không khả dụng, đang chuyển sang Whisper bản nhẹ...');
        return pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny', {
          ...pipelineOptions,
          dtype: 'q8',
          device: 'wasm',
        });
      }
    });
  }

  return transcriberPromise;
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

async function extractAudio(file: File, onProgress: ProgressHandler): Promise<{ samples: Float32Array; durationSec: number }> {
  onProgress('Đang đọc audio từ video...');
  const AudioContextConstructor = window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextConstructor) {
    return extractAudioWithFFmpeg(file, onProgress);
  }

  const audioContext = new AudioContextConstructor();
  try {
    let decoded: AudioBuffer;
    try {
      decoded = await audioContext.decodeAudioData(await file.arrayBuffer());
    } catch {
      onProgress('Trình duyệt không giải mã được file này, đang chuyển sang bộ giải mã tương thích mobile...');
      return await extractAudioWithFFmpeg(file, onProgress);
    }
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

      // Yield periodically so long recordings do not freeze the page.
      if (index > 0 && index % 160000 === 0) {
        onProgress(`Đang chuẩn hóa audio: ${Math.round((index / sampleCount) * 100)}%`);
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
      }
    }

    return { samples, durationSec };
  } finally {
    await audioContext.close();
  }
}

export async function transcribeVideoFile(
  file: File,
  language: string,
  onProgress: ProgressHandler = () => undefined,
): Promise<WhisperTranscriptionResult> {
  if (typeof window === 'undefined') {
    throw new Error('Nhận diện video chỉ chạy trên trình duyệt.');
  }

  const { samples, durationSec } = await extractAudio(file, onProgress);
  const transcriber = await getTranscriber(onProgress);
  onProgress('Whisper đang nhận diện và tạo timestamp...');

  const output = await transcriber(samples, {
    return_timestamps: true,
    chunk_length_s: 15,
    stride_length_s: 3,
    task: 'transcribe',
    no_repeat_ngram_size: 3,
    repetition_penalty: 1.08,
    ...(language !== 'auto' ? { language: languageNames[language] || language } : {}),
  });

  const chunks = Array.isArray(output.chunks) ? output.chunks : [];
  const rawSegments: WhisperSegment[] = chunks
    .map((chunk: { timestamp?: [number | null, number | null]; text?: string }, index: number) => {
      const [start, end] = chunk.timestamp || [null, null];
      return {
        id: index + 1,
        start: Number(start ?? 0),
        end: Number(end ?? Math.min(durationSec, Number(start ?? 0) + 1)),
        text: (chunk.text || '').trim(),
      };
    })
    .filter((segment: WhisperSegment) => segment.text && segment.end > segment.start);

  if (rawSegments.length === 0 && output.text?.trim()) {
    rawSegments.push({ id: 1, start: 0, end: durationSec, text: output.text.trim() });
  }

  if (rawSegments.length === 0) {
    throw new Error('Whisper không tìm thấy lời thoại trong file này.');
  }

  // Khử trùng lặp và căn chỉnh sát timeline video, không làm mất thoại
  const segments = cleanAndDeduplicateWhisperSegments(rawSegments);

  return {
    text: output.text.trim(),
    language: language === 'auto' ? String(output.language || 'auto') : language,
    durationSec,
    segments,
  };
}