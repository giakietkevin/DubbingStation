import { promises as fs } from 'fs';
import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import ffmpegPath from 'ffmpeg-static';
import type { SubtitleCue } from '@/lib/subtitleParser';

const execFileAsync = promisify(execFile);
export const ffmpegExecutable =
  ffmpegPath ||
  path.join(
    process.cwd(),
    'node_modules',
    'ffmpeg-static',
    process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg'
  );

/**
 * Kiểm tra xem file video đầu vào có chứa stream Audio hay không
 */
export async function checkHasAudio(filePath: string): Promise<boolean> {
  try {
    await execFileAsync(ffmpegExecutable, ['-i', filePath]);
    return false;
  } catch (error: any) {
    const stderr = String(error?.stderr || '');
    return /Stream #0:\d+.*Audio:/i.test(stderr);
  }
}

/**
 * Lấy chính xác thời lượng (duration theo giây) của file audio bằng ffmpeg
 */
export async function getAudioDuration(filePath: string): Promise<number> {
  try {
    const { stderr } = await execFileAsync(ffmpegExecutable, ['-i', filePath]);
    const match = /Duration:\s*(\d+):(\d+):(\d+\.\d+)/.exec(stderr);
    if (match) {
      const hours = Number(match[1]);
      const minutes = Number(match[2]);
      const seconds = Number(match[3]);
      return hours * 3600 + minutes * 60 + seconds;
    }
  } catch (error: any) {
    const stderr = String(error?.stderr || '');
    const match = /Duration:\s*(\d+):(\d+):(\d+\.\d+)/.exec(stderr);
    if (match) {
      const hours = Number(match[1]);
      const minutes = Number(match[2]);
      const seconds = Number(match[3]);
      return hours * 3600 + minutes * 60 + seconds;
    }
  }
  return 2.0;
}

/**
 * Tạo luồng âm thanh lồng tiếng chuẩn nhịp thoại (Timeline-Aligned Studio Dubbed Audio)
 */
export async function createTimedDubbedAudio({
  cues,
  speakerVoiceMap,
  workDir,
  origin,
  cookieHeader,
}: {
  cues: SubtitleCue[];
  speakerVoiceMap: Record<string, string>;
  workDir: string;
  origin: string;
  cookieHeader?: string | null;
}): Promise<string> {
  const audioFiles: string[] = [];

  for (let i = 0; i < cues.length; i++) {
    const cue = cues[i];
    const ttsUrl = new URL('/api/tts/stream', origin);
    ttsUrl.searchParams.set('text', cue.text);
    ttsUrl.searchParams.set('voiceId', speakerVoiceMap[cue.speaker || ''] || 'capcut-nam-film');

    // Căn chỉnh tốc độ đọc tự nhiên tương ứng với thời lượng cue
    const cueDuration = Math.max(0.6, cue.endTime - cue.startTime);
    const estimatedSpeechDuration = Math.max(0.5, cue.text.trim().length / 13);
    const targetSpeed = Math.max(0.9, Math.min(1.65, estimatedSpeechDuration / cueDuration));
    ttsUrl.searchParams.set('speed', targetSpeed.toFixed(2));

    const response = await fetch(ttsUrl, {
      cache: 'no-store',
      headers: {
        ...(cookieHeader ? { cookie: cookieHeader } : {}),
      },
    });

    if (!response.ok) {
      const details = (await response.text()).slice(0, 300);
      throw new Error(`TTS thất bại ở cue #${cue.id} (${response.status}) tại ${ttsUrl.pathname}. ${details}`);
    }

    const contentType = response.headers.get('content-type') || '';
    const ext = contentType.includes('wav') ? 'wav' : 'mp3';
    const audioPath = path.join(workDir, `cue-${cue.id}.${ext}`);
    await fs.writeFile(audioPath, Buffer.from(await response.arrayBuffer()));
    audioFiles.push(audioPath);
  }

  const outputPath = path.join(workDir, 'dubbed-audio.m4a');
  const args = ['-y'];
  for (const audioFile of audioFiles) args.push('-i', audioFile);

  const filterParts: string[] = [];

  for (let index = 0; index < cues.length; index++) {
    const cue = cues[index];
    const nextCue = cues[index + 1];
    const audioPath = audioFiles[index];
    const actualDuration = await getAudioDuration(audioPath);

    const availableTime = nextCue
      ? Math.max(0.5, nextCue.startTime - cue.startTime)
      : Math.max(actualDuration, cue.endTime - cue.startTime + 2.5);

    const delayMs = Math.max(0, Math.round(cue.startTime * 1000));

    let tempoFilter = '';
    if (actualDuration > availableTime && availableTime > 0.3) {
      const speedRatio = Math.min(1.85, actualDuration / (availableTime - 0.04));
      if (speedRatio > 1.05) {
        if (speedRatio <= 2.0) {
          tempoFilter = `atempo=${speedRatio.toFixed(3)},`;
        } else {
          tempoFilter = `atempo=2.0,atempo=${(speedRatio / 2.0).toFixed(3)},`;
        }
      }
    }

    filterParts.push(
      `[${index}:a]${tempoFilter}afade=t=in:st=0:d=0.03,asetpts=PTS-STARTPTS,adelay=${delayMs}:all=1[a${index}]`
    );
  }

  // Cinema Vocal Mastering Chain: amix, highpass, equalizer (presence & warmth), acompressor
  const inputsStr = cues.map((_, index) => `[a${index}]`).join('');
  const studioVocalChain = `amix=inputs=${cues.length}:duration=longest:dropout_transition=0:normalize=0,highpass=f=75,equalizer=f=3000:t=q:w=1.2:g=2.2,equalizer=f=260:t=q:w=1.0:g=1.4,acompressor=threshold=0.12:ratio=2.5:attack=15:release=140:makeup=1.4,volume=2.5dB[dub]`;
  filterParts.push(`${inputsStr}${studioVocalChain}`);

  const filterScriptPath = path.join(workDir, 'dubbed-audio-filter.txt');
  await fs.writeFile(filterScriptPath, filterParts.join(';\n'), 'utf8');
  args.push(
    '-filter_complex_script',
    filterScriptPath,
    '-map',
    '[dub]',
    '-c:a',
    'aac',
    '-b:a',
    '192k',
    '-movflags',
    '+faststart',
    outputPath
  );

  await execFileAsync(ffmpegExecutable, args, { maxBuffer: 10 * 1024 * 1024 });
  return outputPath;
}

/**
 * Hòa trộn luồng âm thanh lồng tiếng vào video gốc có Sidechain Ducking
 */
export async function renderDubbedMedia({
  inputVideoPath,
  dubbedAudioPath,
  outputPath,
  duckingPreset = 'sfx_preserve',
  keepOriginalAudio = true,
}: {
  inputVideoPath?: string;
  dubbedAudioPath: string;
  outputPath: string;
  duckingPreset?: string;
  keepOriginalAudio?: boolean;
}): Promise<string> {
  // Nếu không có video gốc (chỉ cần xuất file audio lồng tiếng MP3/M4A)
  if (!inputVideoPath) {
    const isMp3 = outputPath.endsWith('.mp3');
    const args = isMp3
      ? ['-y', '-i', dubbedAudioPath, '-c:a', 'libmp3lame', '-b:a', '192k', outputPath]
      : ['-y', '-i', dubbedAudioPath, '-c:a', 'copy', outputPath];
    await execFileAsync(ffmpegExecutable, args);
    return outputPath;
  }

  const hasAudio = keepOriginalAudio && duckingPreset !== 'replace_all'
    ? await checkHasAudio(inputVideoPath)
    : false;

  let sidechainThreshold = 0.035;
  let sidechainRatio = 3.5;
  let sidechainAttack = 100;
  let sidechainRelease = 450;

  if (duckingPreset === 'sfx_duck_half') {
    sidechainThreshold = 0.045;
    sidechainRatio = 2.2;
    sidechainAttack = 120;
    sidechainRelease = 500;
  } else if (duckingPreset === 'mute_dialogue') {
    sidechainThreshold = 0.02;
    sidechainRatio = 8.0;
    sidechainAttack = 60;
    sidechainRelease = 300;
  }

  if (hasAudio) {
    const audioFilter = `[0:a][1:a]sidechaincompress=threshold=${sidechainThreshold}:ratio=${sidechainRatio}:attack=${sidechainAttack}:release=${sidechainRelease}:makeup=1[ducked_orig];[ducked_orig][1:a]amix=inputs=2:duration=first:dropout_transition=0:normalize=0[mixed_raw];[mixed_raw]alimiter=limit=0.96:attack=5:release=50:asc=true[mixed]`;
    const ffmpegArgs = [
      '-y',
      '-i',
      inputVideoPath,
      '-i',
      dubbedAudioPath,
      '-filter_complex',
      audioFilter,
      '-map',
      '0:v:0',
      '-map',
      '[mixed]',
      '-c:v',
      'copy',
      '-c:a',
      'aac',
      '-b:a',
      '192k',
      '-movflags',
      '+faststart',
      outputPath,
    ];
    await execFileAsync(ffmpegExecutable, ffmpegArgs, { maxBuffer: 10 * 1024 * 1024 });
  } else {
    // Video không có audio hoặc chọn thay thế 100%
    const ffmpegArgs = [
      '-y',
      '-i',
      inputVideoPath,
      '-i',
      dubbedAudioPath,
      '-map',
      '0:v:0',
      '-map',
      '1:a:0',
      '-c:v',
      'copy',
      '-c:a',
      'aac',
      '-b:a',
      '192k',
      '-movflags',
      '+faststart',
      outputPath,
    ];
    await execFileAsync(ffmpegExecutable, ffmpegArgs, { maxBuffer: 10 * 1024 * 1024 });
  }

  return outputPath;
}
