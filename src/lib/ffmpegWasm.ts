import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

let ffmpegSingleton: FFmpeg | null = null;
let ffmpegLoadingPromise: Promise<FFmpeg> | null = null;

export async function getClientFFmpeg(onLog?: (msg: string) => void, onProgress?: (percent: number) => void): Promise<FFmpeg> {
  if (ffmpegSingleton && ffmpegSingleton.loaded) {
    return ffmpegSingleton;
  }

  if (!ffmpegLoadingPromise) {
    const ffmpeg = new FFmpeg();
    if (onLog) {
      ffmpeg.on('log', ({ message }) => onLog(message));
    }
    if (onProgress) {
      ffmpeg.on('progress', ({ progress }) => onProgress(Math.round(progress * 100)));
    }

    ffmpegLoadingPromise = ffmpeg.load().then(() => {
      ffmpegSingleton = ffmpeg;
      return ffmpeg;
    });
  }

  return ffmpegLoadingPromise;
}

/**
 * 1. Chuyển đổi định dạng âm thanh (MP3, AAC, FLAC, OGG, WAV) bằng FFmpeg Client-side
 */
export async function convertAudioWithFFmpeg(
  file: File,
  targetFormat: 'mp3' | 'aac' | 'flac' | 'ogg' | 'wav' = 'mp3',
  onProgress?: (msg: string) => void
): Promise<{ blob: Blob; fileName: string; mimeType: string }> {
  const ffmpeg = await getClientFFmpeg((msg) => {
    if (onProgress) onProgress(`[FFmpeg] ${msg.slice(0, 80)}`);
  });

  const ext = file.name.split('.').pop()?.toLowerCase() || 'wav';
  const inputName = `input_${Date.now()}.${ext}`;
  const outputName = `output_${Date.now()}.${targetFormat}`;

  try {
    if (onProgress) onProgress('Đang tải tệp vào bộ nhớ WebAssembly...');
    await ffmpeg.writeFile(inputName, await fetchFile(file));

    const codecMap: Record<string, string[]> = {
      mp3: ['-c:a', 'libmp3lame', '-b:a', '192k'],
      aac: ['-c:a', 'aac', '-b:a', '192k'],
      flac: ['-c:a', 'flac'],
      ogg: ['-c:a', 'libvorbis', '-q:a', '5'],
      wav: ['-c:a', 'pcm_s16le'],
    };

    const args = ['-i', inputName, ...(codecMap[targetFormat] || ['-c:a', 'copy']), outputName];
    if (onProgress) onProgress(`Đang chuyển đổi sang định dạng ${targetFormat.toUpperCase()}...`);
    await ffmpeg.exec(args);

    const data = await ffmpeg.readFile(outputName);
    const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(data);

    const mimeMap: Record<string, string> = {
      mp3: 'audio/mpeg',
      aac: 'audio/aac',
      flac: 'audio/flac',
      ogg: 'audio/ogg',
      wav: 'audio/wav',
    };

    const mimeType = mimeMap[targetFormat] || 'audio/wav';
    const blob = new Blob([bytes], { type: mimeType });
    const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || 'converted';
    const finalFileName = `${baseName}.${targetFormat}`;

    return { blob, fileName: finalFileName, mimeType };
  } finally {
    await ffmpeg.deleteFile(inputName).catch(() => undefined);
    await ffmpeg.deleteFile(outputName).catch(() => undefined);
  }
}

/**
 * 2. Trích xuất âm thanh từ Video (MP4, MKV, WebM, AVI) sang MP3 hoặc WAV
 */
export async function extractAudioFromVideoWithFFmpeg(
  videoFile: File,
  outputFormat: 'mp3' | 'wav' = 'mp3',
  onProgress?: (msg: string) => void
): Promise<{ blob: Blob; fileName: string; mimeType: string }> {
  const ffmpeg = await getClientFFmpeg((msg) => {
    if (onProgress) onProgress(`[FFmpeg] ${msg.slice(0, 80)}`);
  });

  const ext = videoFile.name.split('.').pop()?.toLowerCase() || 'mp4';
  const inputName = `video_${Date.now()}.${ext}`;
  const outputName = `extracted_${Date.now()}.${outputFormat}`;

  try {
    if (onProgress) onProgress('Đang nạp video vào bộ nhớ WebAssembly...');
    await ffmpeg.writeFile(inputName, await fetchFile(videoFile));

    const args =
      outputFormat === 'mp3'
        ? ['-i', inputName, '-vn', '-c:a', 'libmp3lame', '-q:a', '2', outputName]
        : ['-i', inputName, '-vn', '-c:a', 'pcm_s16le', '-ar', '44100', outputName];

    if (onProgress) onProgress('Đang bóc tách luồng âm thanh nguyên bản...');
    await ffmpeg.exec(args);

    const data = await ffmpeg.readFile(outputName);
    const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(data);
    const mimeType = outputFormat === 'mp3' ? 'audio/mpeg' : 'audio/wav';
    const blob = new Blob([bytes], { type: mimeType });

    const baseName = videoFile.name.substring(0, videoFile.name.lastIndexOf('.')) || 'audio_extracted';
    const finalFileName = `${baseName}.${outputFormat}`;

    return { blob, fileName: finalFileName, mimeType };
  } finally {
    await ffmpeg.deleteFile(inputName).catch(() => undefined);
    await ffmpeg.deleteFile(outputName).catch(() => undefined);
  }
}

/**
 * 3. Ghép nối nhiều tệp âm thanh (Audio Joiner / Concatenation)
 */
export async function joinAudioFilesWithFFmpeg(
  files: File[],
  outputFormat: 'mp3' | 'wav' = 'mp3',
  onProgress?: (msg: string) => void
): Promise<{ blob: Blob; fileName: string; mimeType: string }> {
  if (files.length < 2) {
    throw new Error('Vui lòng chọn ít nhất 2 tệp âm thanh để ghép nối.');
  }

  const ffmpeg = await getClientFFmpeg((msg) => {
    if (onProgress) onProgress(`[FFmpeg] ${msg.slice(0, 80)}`);
  });

  const timestamp = Date.now();
  const inputNames: string[] = [];

  try {
    let concatListContent = '';

    for (let i = 0; i < files.length; i++) {
      const ext = files[i].name.split('.').pop()?.toLowerCase() || 'mp3';
      const safeName = `track_${timestamp}_${i}.${ext}`;
      inputNames.push(safeName);
      if (onProgress) onProgress(`Đang tải tệp ${i + 1}/${files.length}: ${files[i].name}...`);
      await ffmpeg.writeFile(safeName, await fetchFile(files[i]));
      concatListContent += `file '${safeName}'\n`;
    }

    const listFileName = `concat_list_${timestamp}.txt`;
    await ffmpeg.writeFile(listFileName, new TextEncoder().encode(concatListContent));

    const outputName = `joined_${timestamp}.${outputFormat}`;
    if (onProgress) onProgress('Đang ghép nối các track âm thanh...');

    // Dùng concat demuxer của ffmpeg
    const args =
      outputFormat === 'mp3'
        ? ['-f', 'concat', '-safe', '0', '-i', listFileName, '-c:a', 'libmp3lame', '-q:a', '2', outputName]
        : ['-f', 'concat', '-safe', '0', '-i', listFileName, '-c:a', 'pcm_s16le', outputName];

    await ffmpeg.exec(args);
    await ffmpeg.deleteFile(listFileName).catch(() => undefined);

    const data = await ffmpeg.readFile(outputName);
    const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(data);
    const mimeType = outputFormat === 'mp3' ? 'audio/mpeg' : 'audio/wav';
    const blob = new Blob([bytes], { type: mimeType });

    return { blob, fileName: `joined_audio_${timestamp}.${outputFormat}`, mimeType };
  } finally {
    for (const name of inputNames) {
      await ffmpeg.deleteFile(name).catch(() => undefined);
    }
  }
}
