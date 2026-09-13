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
      onProgress(supportsWebGPU ? `Đang tải ${modelInfo.name} (WebGPU Siêu tốc)...` : `Đang tải ${modelInfo.name}...`);

      // WebGPU cần fp32 để giữ nguyên độ chính xác ma trận chú ý (int8 q8 trên WebGPU gây sai lệch toán học)
      // WASM (CPU) dùng q8 để tiết kiệm bộ nhớ RAM
      const pipelineOptions = {
        dtype: supportsWebGPU ? 'fp32' : 'q8',
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
        onProgress('WebGPU không khả dụng hoặc thiếu VRAM, chuyển sang CPU WASM...');
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

    // 2. Khử lệch dòng một chiều (DC offset) và lọc tần số siêu trầm (< 75Hz)
    removeDCOffsetAndSubsonics(samples);

    // 3. Chuẩn hóa âm lượng thoại (RMS Normalization): Giúp Whisper nghe rõ cả tiếng thì thầm và đàm thoại nhỏ
    normalizeAudioSamples(samples);

    return { samples, durationSec };
  } finally {
    await audioContext.close();
  }
}

/**
 * Loại bỏ độ lệch DC (DC Offset) và lọc cắt tần số siêu trầm (< 75Hz)
 * Ngăn chặn năng lượng tần số thấp làm hỏng log-mel filterbank của Whisper AI
 */
function removeDCOffsetAndSubsonics(samples: Float32Array): void {
  const len = samples.length;
  if (len === 0) return;

  // 1. Tính giá trị trung bình DC bias
  let sum = 0;
  const stride = 16;
  let count = 0;
  for (let i = 0; i < len; i += stride) {
    sum += samples[i];
    count++;
  }
  const mean = count > 0 ? sum / count : 0;

  // 2. Bộ lọc thông cao High-pass 1-pole (~75Hz ở Fs=16000)
  // Khử tiếng ù gió, rung micro và tạp âm nền tần số thấp
  const alpha = 0.97;
  let prevIn = 0;
  let prevOut = 0;

  for (let i = 0; i < len; i++) {
    const input = samples[i] - mean;
    const output = alpha * (prevOut + input - prevIn);
    prevIn = input;
    prevOut = output;
    samples[i] = output;
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
 * Chuẩn hóa biên độ âm thanh lên mức tối ưu cho Whisper AI
 * Cân bằng mức âm lượng đàm thoại RMS ~ 0.08 (-22 dBFS) mà không làm vỡ âm (clipping)
 */
function normalizeAudioSamples(samples: Float32Array): void {
  let peak = 0;
  let sumSq = 0;
  const len = samples.length;

  for (let i = 0; i < len; i++) {
    const abs = Math.abs(samples[i]);
    if (abs > peak) peak = abs;
    sumSq += abs * abs;
  }

  const rms = Math.sqrt(sumSq / Math.max(1, len));

  if (peak > 0.005) {
    let targetGain = 1.0;
    // Nâng âm lượng thoại nhỏ mà không vượt ngưỡng trần 0.95
    if (rms < 0.05) {
      targetGain = Math.min(0.07 / Math.max(0.005, rms), 0.95 / peak, 5.0);
    } else if (peak > 0.98) {
      targetGain = 0.95 / peak;
    }

    if (Math.abs(targetGain - 1.0) > 0.03) {
      for (let i = 0; i < len; i++) {
        samples[i] = Math.max(-1.0, Math.min(1.0, samples[i] * targetGain));
      }
    }
  }
}

/**
 * Tự động nhận diện ngôn ngữ nói thực tế từ âm thanh bằng logit scoring của Whisper
 * Giải quyết triệt để vấn đề Transformers.js tự ép về tiếng Anh khi language='auto'
 */
async function detectSpokenLanguage(
  transcriber: any,
  samples: Float32Array,
  onProgress: ProgressHandler
): Promise<string> {
  try {
    onProgress('Đang phân tích âm sắc để tự động nhận diện ngôn ngữ nói...');
    const model = transcriber?.model;
    const processor = transcriber?.processor;
    const genConfig = model?.generation_config;

    if (!model || !processor || !genConfig?.lang_to_id) {
      return 'vi';
    }

    // Chọn đoạn 15 giây âm thanh có năng lượng cao nhất trong 45s đầu
    const sampleRate = 16000;
    const windowSamples = Math.min(samples.length, sampleRate * 15);
    const maxSearch = Math.min(samples.length - windowSamples, sampleRate * 45);
    let bestOffset = 0;
    let maxEnergy = 0;

    const step = sampleRate * 3;
    for (let offset = 0; offset <= maxSearch; offset += step) {
      let energy = 0;
      const end = offset + windowSamples;
      for (let i = offset; i < end; i += 32) {
        energy += samples[i] * samples[i];
      }
      if (energy > maxEnergy) {
        maxEnergy = energy;
        bestOffset = offset;
      }
    }

    const probeAudio = samples.subarray(bestOffset, bestOffset + windowSamples);
    const features = await processor(probeAudio);
    const input_features = features.input_features;

    const startTokenId = genConfig.decoder_start_token_id ?? 50258;
    const TensorClass = input_features.constructor;
    const decoder_input_ids = new TensorClass('int64', new BigInt64Array([BigInt(startTokenId)]), [1, 1]);

    const output = await model({
      input_features,
      decoder_input_ids,
    });

    const logits = output.logits ?? output;
    if (logits && logits.data) {
      const data = logits.data;
      let highestScore = -Infinity;
      let detectedLang = 'vi';

      for (const [tokenStr, tokenId] of Object.entries(genConfig.lang_to_id)) {
        const id = Number(tokenId);
        const score = data[id];
        if (typeof score === 'number' && score > highestScore) {
          highestScore = score;
          const cleanCode = tokenStr.replace(/^[<|]+|[|>]+$/g, '').trim();
          if (cleanCode) detectedLang = cleanCode;
        }
      }

      onProgress(`AI đã nhận diện ngôn ngữ audio: ${detectedLang.toUpperCase()}`);
      return detectedLang;
    }
  } catch (err) {
    console.warn('[Whisper] Nhận diện ngôn ngữ qua logits không thành công, fallback an toàn vi:', err);
  }
  return 'vi';
}

/**
 * Chuyển đổi kết quả phân tích từng chunk của Whisper thành danh sách WhisperSegment chuẩn xác
 */
function parseWhisperOutputToSegments(
  output: any,
  blockStartTimeSec: number,
  blockDurationSec: number,
  startIndex: number
): WhisperSegment[] {
  const chunks = Array.isArray(output.chunks) ? output.chunks : [];
  const segments: WhisperSegment[] = [];

  for (let index = 0; index < chunks.length; index++) {
    const chunk = chunks[index];
    const [start, end] = chunk.timestamp || [null, null];
    const text = (chunk.text || '').trim();
    if (!text) continue;

    const wordCount = text.split(/\s+/).filter(Boolean).length;
    const safeStartRel = Number(start ?? (index * 4));

    let estimatedDuration = Math.max(0.6, Math.min(6.0, wordCount * 0.38 + 0.3));
    const nextChunk = chunks[index + 1];
    const nextStart = nextChunk?.timestamp?.[0];
    if (typeof nextStart === 'number' && nextStart > safeStartRel) {
      estimatedDuration = Math.min(estimatedDuration, Math.max(0.4, nextStart - safeStartRel));
    }

    const safeEndRel = typeof end === 'number' && end > safeStartRel
      ? Number(end)
      : Math.min(blockDurationSec, safeStartRel + estimatedDuration);

    const absStart = Math.max(0, Math.round((blockStartTimeSec + safeStartRel) * 1000) / 1000);
    const absEnd = Math.max(absStart + 0.3, Math.round((blockStartTimeSec + safeEndRel) * 1000) / 1000);

    if (absEnd > absStart) {
      segments.push({
        id: startIndex + segments.length + 1,
        start: absStart,
        end: absEnd,
        text,
      });
    }
  }

  if (segments.length === 0 && output.text?.trim()) {
    segments.push({
      id: startIndex + 1,
      start: Math.round(blockStartTimeSec * 1000) / 1000,
      end: Math.round((blockStartTimeSec + blockDurationSec) * 1000) / 1000,
      text: output.text.trim(),
    });
  }

  return segments;
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
  onProgress('Whisper AI đang phân tích khẩu âm và kiểm tra ngôn ngữ...');

  // 1. Tự động nhận diện ngôn ngữ nói chính xác nếu chọn 'auto'
  let resolvedLang = language.toLowerCase().trim();
  if (resolvedLang === 'auto' || !resolvedLang) {
    resolvedLang = await detectSpokenLanguage(transcriber, samples, onProgress);
  }

  const whisperLang = resolvedLang;
  const generateKwargs: Record<string, any> = {
    task: 'transcribe',
    language: whisperLang,
  };

  const allRawSegments: WhisperSegment[] = [];
  const sampleRate = 16000;
  const totalMins = Math.max(1, Math.ceil(durationSec / 60));

  // Đối với video dài (> 60s, ví dụ video 45 phút):
  // Chia thành các khối 60 giây để:
  // - Cập nhật tiến độ % và phút thực tế liên tục trên giao diện (tránh cảm giác đơ/treo)
  // - Nhường luồng cho trình duyệt cập nhật UI, không bị OOM tràn bộ nhớ WebGPU/WASM
  const BLOCK_DURATION_SEC = 60;
  const samplesPerBlock = BLOCK_DURATION_SEC * sampleRate;
  const totalBlocks = Math.ceil(durationSec / BLOCK_DURATION_SEC);

  if (totalBlocks <= 1) {
    onProgress(`Whisper AI đang bóc tách phụ đề (${whisperLang.toUpperCase()})...`);
    const output = await transcriber(samples, {
      return_timestamps: true,
      chunk_length_s: 30,
      stride_length_s: 5,
      task: 'transcribe',
      language: whisperLang,
      generate_kwargs: generateKwargs,
    });
    const segs = parseWhisperOutputToSegments(output, 0, durationSec, 0);
    allRawSegments.push(...segs);
  } else {
    for (let b = 0; b < totalBlocks; b++) {
      const startSample = b * samplesPerBlock;
      const endSample = Math.min(samples.length, (b + 1) * samplesPerBlock);
      const blockSamples = samples.subarray(startSample, endSample);
      const blockStartTimeSec = startSample / sampleRate;
      const currentBlockDurSec = (endSample - startSample) / sampleRate;

      const percent = Math.round((b / totalBlocks) * 100);
      const currentMins = Math.floor(blockStartTimeSec / 60);

      onProgress(
        `Đang bóc tách AI: ${percent}% (Đã xong ${currentMins}/${totalMins} phút) - Khối ${b + 1}/${totalBlocks}...`
      );

      const blockOutput = await transcriber(blockSamples, {
        return_timestamps: true,
        chunk_length_s: 30,
        stride_length_s: 5,
        task: 'transcribe',
        language: whisperLang,
        generate_kwargs: generateKwargs,
      });

      const blockSegs = parseWhisperOutputToSegments(
        blockOutput,
        blockStartTimeSec,
        currentBlockDurSec,
        allRawSegments.length
      );
      allRawSegments.push(...blockSegs);

      // Nhường luồng 40ms để trình duyệt cập nhật giao diện và giải phóng RAM tạm thời
      await new Promise((resolve) => setTimeout(resolve, 40));
    }
  }

  if (allRawSegments.length === 0) {
    throw new Error('Whisper không tìm thấy lời thoại rõ ràng trong video này.');
  }

  onProgress(`Đã nhận diện xong! Đang tinh chỉnh và khử lặp ${allRawSegments.length} câu thoại...`);

  // Khử trùng lặp và căn chỉnh sát timeline video, không làm mất thoại
  const segments = cleanAndDeduplicateWhisperSegments(allRawSegments);

  return {
    text: segments.map((s) => s.text).join(' '),
    language: whisperLang || String(language || 'auto'),
    durationSec,
    segments,
  };
}
