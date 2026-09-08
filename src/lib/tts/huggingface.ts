import { join } from 'path';
import { existsSync, readFileSync } from 'fs';
import { createWavHeader, synthesizeWithPiper } from './piper';

export interface HuggingFaceTTSOptions {
  text: string;
  modelId?: string;
  speed?: number;
  speakerId?: number;
  gender?: 'male' | 'female';
}

export interface HuggingFaceTTSResult {
  audio: Buffer;
  sampleRate: number;
  model: string;
  durationMs: number;
}

// Danh sách các mô hình TTS tiếng Việt chất lượng cao trên Hugging Face
export const HUGGING_FACE_VIETNAMESE_MODELS = {
  // Meta Massively Multilingual Speech (VITS architecture train trên hàng nghìn giờ thu âm người thật)
  mms: 'facebook/mms-tts-vie',
  mmsOnnx: 'Xenova/mms-tts-vie',
  // VIVOS Corpus từ AILAB - ĐHQG TP.HCM (65 người nói tự nhiên từ Hugging Face rhasspy/piper-voices)
  vivosPiper: 'rhasspy/piper-voices/vi/vi_VN/vivos/x_low',
  // 25 Hours Single Speaker Vietnamese Corpus (Nam Bộ mộc mạc từ Hugging Face rhasspy/piper-voices)
  single25hPiper: 'rhasspy/piper-voices/vi/vi_VN/25hours_single/low',
  // Capleaf Vietnamese TTS model
  capleaf: 'capleaf/vi-TTS',
};

let pipelineInstance: any = null;

/**
 * Khởi tạo pipeline Transformers.js chạy mô hình TTS từ Hugging Face
 */
async function getTransformersPipeline(modelId: string = 'Xenova/mms-tts-vie') {
  if (pipelineInstance) return pipelineInstance;

  try {
    const dynamicImport = new Function('specifier', 'return import(specifier)');
    const { pipeline, env } = await dynamicImport('@huggingface/transformers');
    // Cấu hình đường dẫn cache mô hình trong thư mục models/huggingface
    env.cacheDir = join(process.cwd(), 'models', 'huggingface');

    pipelineInstance = await pipeline('text-to-speech', modelId, {
      quantized: false,
    });
    return pipelineInstance;
  } catch (err) {
    console.warn('[HuggingFace TTS] Local pipeline initialization warning:', err);
    return null;
  }
}

/**
 * Chuyển đổi Float32Array sang 16-bit PCM Buffer
 */
function float32ToPcm16(float32Array: Float32Array): Buffer {
  const pcm16 = Buffer.alloc(float32Array.length * 2);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    pcm16.writeInt16LE(s < 0 ? s * 0x8000 : s * 0x7fff, i * 2);
  }
  return pcm16;
}

/**
 * Tổng hợp giọng nói người thật từ các mô hình Hugging Face
 * Chuỗi xử lý 3 tầng:
 * 1. Hugging Face Inference API (Meta MMS vie / VITS)
 * 2. Transformers.js cục bộ (@huggingface/transformers)
 * 3. Hugging Face Piper ONNX models (rhasspy/piper-voices VIVOS & 25H Nam Bộ)
 */
export async function synthesizeWithHuggingFace(
  options: HuggingFaceTTSOptions
): Promise<HuggingFaceTTSResult | null> {
  const { text, modelId = 'facebook/mms-tts-vie', speed = 1.0, gender } = options;
  const startTime = Date.now();

  // Tier 1: Gọi Hugging Face Serverless Inference API cho mô hình MMS/VITS
  try {
    const cleanModel = modelId.replace('Xenova/', 'facebook/');
    const hfToken = process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN || '';
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'DubbingStation-TTS/2.0',
    };
    if (hfToken) {
      headers['Authorization'] = `Bearer ${hfToken}`;
    }

    const apiUrl = `https://api-inference.huggingface.co/models/${cleanModel}`;
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ inputs: text }),
      signal: AbortSignal.timeout(6000),
    });

    if (res.ok) {
      const arrayBuf = await res.arrayBuffer();
      const audioBuffer = Buffer.from(arrayBuf);
      if (audioBuffer.length > 200) {
        return {
          audio: audioBuffer,
          sampleRate: 16000,
          model: `HuggingFace-API-${cleanModel}`,
          durationMs: Date.now() - startTime,
        };
      }
    }
  } catch (apiErr) {
    // Inference API rate-limit or network timeout, proceed to Tier 2
  }

  // Tier 2: Sử dụng Transformers.js cục bộ với @huggingface/transformers
  try {
    const synthesizer = await getTransformersPipeline(modelId);
    if (synthesizer) {
      const output = await synthesizer(text);
      if (output?.audio && output?.sampling_rate) {
        const floatData: Float32Array = output.audio;
        const sampleRate = output.sampling_rate;
        const pcm16 = float32ToPcm16(floatData);
        const wavBuffer = Buffer.concat([
          createWavHeader(pcm16.length, sampleRate),
          pcm16,
        ]);

        return {
          audio: wavBuffer,
          sampleRate,
          model: `HuggingFace-Transformers-${modelId}`,
          durationMs: Date.now() - startTime,
        };
      }
    }
  } catch (localErr) {
    console.warn('[HuggingFace TTS] Local Transformers.js synthesis failed:', localErr);
  }

  // Tier 3: Sử dụng các mô hình Hugging Face Piper ONNX đã tải về (rhasspy/piper-voices)
  try {
    const isFemale =
      gender === 'female' ||
      modelId.includes('female') ||
      modelId.includes('vivos') ||
      modelId.includes('nu') ||
      modelId.includes('HoaiMy');

    const modelFile = isFemale ? 'vi_VN-vivos-x_low.onnx' : 'vi_VN-25hours_single-low.onnx';
    const modelPath = join(process.cwd(), 'models', 'piper', modelFile);

    if (existsSync(modelPath)) {
      const piperResult = await synthesizeWithPiper({
        text,
        modelPath,
        outputFormat: 'wav',
        lengthScale: speed > 0 ? 1.0 / speed : 1.0,
      });

      if (piperResult) {
        return {
          audio: piperResult.audio,
          sampleRate: piperResult.sampleRate,
          model: `HuggingFace-Piper-${modelFile}`,
          durationMs: Date.now() - startTime,
        };
      }
    }
  } catch (onnxErr) {
    console.warn('[HuggingFace TTS] Tier 3 Hugging Face Piper ONNX failed:', onnxErr);
  }

  return null;
}
