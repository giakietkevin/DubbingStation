import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import { execFile } from 'child_process';
import { promisify } from 'util';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import ffmpegPath from 'ffmpeg-static';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { deduplicateSubtitleCues, type SubtitleCue } from '@/lib/subtitleParser';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 7200;

const MAX_DUBBING_CUES = 2000;

const execFileAsync = promisify(execFile);
const ffmpegExecutable = ffmpegPath || path.join(process.cwd(), 'node_modules', 'ffmpeg-static', process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');

/**
 * Kiểm tra xem file video đầu vào có chứa stream Audio hay không
 */
async function checkHasAudio(filePath: string): Promise<boolean> {
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
async function getAudioDuration(filePath: string): Promise<number> {
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

interface TimeInterval {
  start: number;
  end: number;
}

/**
 * Hợp nhất các khoảng thời gian có phụ đề thoại (Dialogue Windows)
 * Thêm padding lead-in (0.08s) và lead-out (0.15s) để chuyển tiếp âm thanh mượt mà
 */
function mergeDialogueIntervals(cues: SubtitleCue[], leadInSec = 0.08, leadOutSec = 0.15): TimeInterval[] {
  if (cues.length === 0) return [];
  const raw = cues.map((c) => ({
    start: Math.max(0, c.startTime - leadInSec),
    end: c.endTime + leadOutSec,
  })).sort((a, b) => a.start - b.start);

  const merged: TimeInterval[] = [raw[0]];
  for (let i = 1; i < raw.length; i++) {
    const last = merged[merged.length - 1];
    const curr = raw[i];
    if (curr.start <= last.end) {
      last.end = Math.max(last.end, curr.end);
    } else {
      merged.push(curr);
    }
  }
  return merged;
}

async function createTimedAudio(
  req: Request,
  cues: SubtitleCue[],
  speakerVoiceMap: Record<string, string>,
  workDir: string
): Promise<string> {
  const audioFiles: string[] = [];
  const requestUrl = new URL(req.url);
  const forwardedHost = req.headers.get('x-forwarded-host');
  const forwardedProto = req.headers.get('x-forwarded-proto') || 'https';
  const origin = forwardedHost
    ? `${forwardedProto.split(',')[0].trim()}://${forwardedHost.split(',')[0].trim()}`
    : requestUrl.origin;

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

    const response = await fetch(ttsUrl, { cache: 'no-store' });
    if (!response.ok) {
      const details = (await response.text()).slice(0, 300);
      throw new Error(`TTS thất bại ở cue #${cue.id} (${response.status}) tại ${ttsUrl.pathname}. ${details}`);
    }
    const audioPath = path.join(workDir, `cue-${cue.id}.mp3`);
    await fs.writeFile(audioPath, Buffer.from(await response.arrayBuffer()));
    audioFiles.push(audioPath);
  }

  const outputPath = path.join(workDir, 'dubbed-audio.m4a');
  const args = ['-y'];
  for (const audioFile of audioFiles) args.push('-i', audioFile);

  // Xử lý timeline chuẩn điện ảnh: KHÔNG CẮT CỤT TỪ (Zero word truncation)
  // Tính toán thời lượng thực tế của từng câu thoại và co giãn tốc độ tự nhiên bằng atempo
  const filterParts: string[] = [];

  for (let index = 0; index < cues.length; index++) {
    const cue = cues[index];
    const nextCue = cues[index + 1];
    const audioPath = audioFiles[index];
    const actualDuration = await getAudioDuration(audioPath);

    // Thời gian cho phép từ khi bắt đầu cue này cho đến khi câu thoại tiếp theo bắt đầu
    const availableTime = nextCue
      ? Math.max(0.5, nextCue.startTime - cue.startTime)
      : Math.max(actualDuration, cue.endTime - cue.startTime + 2.5);

    const delayMs = Math.max(0, Math.round(cue.startTime * 1000));

    // Nếu âm thanh đọc dài hơn khoảng thời gian trước khi câu tiếp theo xuất hiện:
    // Dùng atempo để co giãn nhịp điệu mượt mà, KHÔNG BỊ CẮT PHỤT MẤT CHỮ!
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

    // afade=t=in:st=0:d=0.03 để chống click/pop khi mix, adelay để khớp chính xác timeline
    filterParts.push(
      `[${index}:a]${tempoFilter}afade=t=in:st=0:d=0.03,asetpts=PTS-STARTPTS,adelay=${delayMs}:all=1[a${index}]`
    );
  }

  // Cinema Studio Vocal Mastering Chain:
  // 1. amix với normalize=0 để giữ 100% âm lượng đồng đều cho mọi nhân vật
  // 2. highpass=f=75: loại bỏ tạp âm ù dải siêu trầm (sub-bass rumble)
  // 3. equalizer 3kHz (+2.2dB): tăng độ nét (presence & clarity), giúp thoại cắt qua nhạc nền
  // 4. equalizer 260Hz (+1.4dB): làm dày âm trầm, tạo độ ấm truyền cảm chuẩn cinema (warmth)
  // 5. acompressor: nén nhẹ broadcast để âm lượng các câu nói đồng đều, tự nhiên, không bị hụt tiếng
  const inputsStr = cues.map((_, index) => `[a${index}]`).join('');
  const studioVocalChain = `amix=inputs=${cues.length}:duration=longest:dropout_transition=0:normalize=0,highpass=f=75,equalizer=f=3000:t=q:w=1.2:g=2.2,equalizer=f=260:t=q:w=1.0:g=1.4,acompressor=threshold=0.12:ratio=2.5:attack=15:release=140:makeup=1.4,volume=2.5dB[dub]`;
  filterParts.push(`${inputsStr}${studioVocalChain}`);

  const filterScriptPath = path.join(workDir, 'dubbed-audio-filter.txt');
  await fs.writeFile(filterScriptPath, filterParts.join(';\n'), 'utf8');
  args.push('-filter_complex_script', filterScriptPath, '-map', '[dub]', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', outputPath);
  await execFileAsync(ffmpegExecutable, args, { maxBuffer: 10 * 1024 * 1024 });
  return outputPath;
}

export async function POST(req: Request) {
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dubbingstation-'));
  try {
    const formData = await req.formData();
    const video = formData.get('video');
    const rawCuesInput = JSON.parse(String(formData.get('cues') || '[]')) as any[];

    // Khử trùng lặp thông minh và căn sát timeline video, không làm mất thoại
    const normalizedRawCues: SubtitleCue[] = rawCuesInput.map((c, i) => ({
      id: c.id || i + 1,
      startTime: Number(c.startTime || 0),
      endTime: Number(c.endTime || 0),
      startTimeFormatted: c.startTimeFormatted || '',
      endTimeFormatted: c.endTimeFormatted || '',
      durationSec: Math.max(0.5, Number(c.endTime || 0) - Number(c.startTime || 0)),
      speaker: c.speaker || 'Speaker 1',
      text: String(c.text || '').trim(),
    }));

    const cues = deduplicateSubtitleCues(normalizedRawCues);
    const speakerVoiceMap = JSON.parse(String(formData.get('speakerVoiceMap') || '{}')) as Record<string, string>;
    const title = String(formData.get('title') || 'Video Dubbing Project');

    // Tùy chọn giữ âm thanh nền / hiệu ứng SFX phim
    const keepOriginalAudio = formData.get('keepOriginalAudio') !== 'false';
    const duckingPreset = String(formData.get('duckingLevel') || 'sfx_preserve');

    // Cấu hình Sidechain Compressor chuẩn âm thanh điện ảnh
    // Âm thanh gốc [0:a] sẽ tự động giảm nhẹ khi giọng lồng tiếng [1:a] cất lên
    // và mượt mà tăng trở lại khi giọng lồng tiếng kết thúc (smooth dynamic ducking)
    let sidechainThreshold = 0.035;
    let sidechainRatio = 3.5; // Giảm ~7dB, giữ lại 45% âm thanh nền/SFX sống động
    let sidechainAttack = 100; // ms
    let sidechainRelease = 450; // ms

    if (duckingPreset === 'sfx_duck_half') {
      sidechainThreshold = 0.045;
      sidechainRatio = 2.2; // Giảm nhẹ ~4dB
      sidechainAttack = 120;
      sidechainRelease = 500;
    } else if (duckingPreset === 'mute_dialogue') {
      sidechainThreshold = 0.02;
      sidechainRatio = 8.0; // Giảm sâu ~16dB cho video có nhiều thoại gốc
      sidechainAttack = 60;
      sidechainRelease = 300;
    }

    if (!(video instanceof File) || video.size === 0) {
      return NextResponse.json({ error: 'Vui lòng tải lên video gốc trước khi lồng tiếng.' }, { status: 400 });
    }
    if (!Array.isArray(cues) || cues.length === 0) {
      return NextResponse.json({ error: 'Vui lòng cung cấp phụ đề hợp lệ.' }, { status: 400 });
    }
    if (cues.length > MAX_DUBBING_CUES) {
      return NextResponse.json({ error: `Video tối đa ${MAX_DUBBING_CUES} cue mỗi lần lồng tiếng.` }, { status: 400 });
    }

    const inputPath = path.join(workDir, `${crypto.randomUUID()}-${video.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`);
    await fs.writeFile(inputPath, Buffer.from(await video.arrayBuffer()));

    const dubbedAudioPath = await createTimedAudio(req, cues, speakerVoiceMap, workDir);
    const outputName = `${title.replace(/[^a-zA-Z0-9._-]/g, '_')}-dubbed-${Date.now()}.mp4`;
    const outputDir = path.join(process.cwd(), 'public', 'generated');
    const outputPath = path.join(outputDir, outputName);
    await fs.mkdir(outputDir, { recursive: true });

    // Kiểm tra xem file video gốc có âm thanh hay không
    const hasOriginalAudio = keepOriginalAudio && duckingPreset !== 'replace_all'
      ? await checkHasAudio(inputPath)
      : false;

    if (hasOriginalAudio) {
      // Dynamic Sidechain Compression:
      // [0:a][1:a]sidechaincompress tự động lắng nghe giọng nói thực tế trên [1:a]
      // để hạ nhạc nền [0:a] một cách êm ái, KHÔNG BỊ NGẮT QUÃNG ĐỘT NGỘT, KHÔNG HẪNG TIẾNG.
      // Sau đó mix với giọng lồng tiếng và qua alimiter (mastering limiter) chống vỡ tiếng tuyệt đối!
      const audioFilter = `[0:a][1:a]sidechaincompress=threshold=${sidechainThreshold}:ratio=${sidechainRatio}:attack=${sidechainAttack}:release=${sidechainRelease}:makeup=1[ducked_orig];[ducked_orig][1:a]amix=inputs=2:duration=first:dropout_transition=0:normalize=0[mixed_raw];[mixed_raw]alimiter=limit=0.96:attack=5:release=50:asc=true[mixed]`;

      await execFileAsync(
        ffmpegExecutable,
        [
          '-y',
          '-i', inputPath,
          '-i', dubbedAudioPath,
          '-filter_complex', audioFilter,
          '-map', '0:v:0',
          '-map', '[mixed]',
          '-c:v', 'copy',
          '-c:a', 'aac',
          '-b:a', '192k',
          '-shortest',
          '-movflags', '+faststart',
          outputPath,
        ],
        { maxBuffer: 10 * 1024 * 1024 }
      );
    } else {
      // Video không có âm thanh gốc hoặc người dùng chọn thay thế toàn bộ
      await execFileAsync(
        ffmpegExecutable,
        [
          '-y',
          '-i', inputPath,
          '-i', dubbedAudioPath,
          '-map', '0:v:0',
          '-map', '1:a:0',
          '-c:v', 'copy',
          '-c:a', 'aac',
          '-b:a', '192k',
          '-shortest',
          '-movflags', '+faststart',
          outputPath,
        ],
        { maxBuffer: 10 * 1024 * 1024 }
      );
    }

    const session = await getServerSession(authOptions);
    const durationSec = Math.max(1, Math.ceil(Math.max(...cues.map((cue) => cue.endTime))));
    const requiredCredits = durationSec * 100;
    let remainingCredits = Math.max(0, 50000 - requiredCredits);
    let projectId: string | undefined;

    if (session?.user?.email) {
      const user = await prisma.user.findUnique({ where: { email: session.user.email }, include: { wallet: true } });
      if (!user) return NextResponse.json({ error: 'Người dùng không tồn tại.' }, { status: 404 });
      if (!user.wallet || user.wallet.balance < requiredCredits) {
        return NextResponse.json({ error: `Số dư credits không đủ. Cần ${requiredCredits.toLocaleString('vi-VN')} credits.`, requiredCredits }, { status: 402 });
      }
      const newBalance = user.wallet.balance - requiredCredits;
      const [wallet, project] = await prisma.$transaction([
        prisma.creditWallet.update({
          where: { id: user.wallet.id },
          data: {
            balance: newBalance,
            totalConsumed: user.wallet.totalConsumed + requiredCredits,
            transactions: {
              create: {
                amount: -requiredCredits,
                balanceAfter: newBalance,
                type: 'DUBBING_USAGE',
                description: `Lồng tiếng video phim (${cues.length} cues, ${durationSec}s, ducking: ${duckingPreset})`,
              },
            },
          },
        }),
        prisma.audioProject.create({
          data: {
            userId: user.id,
            name: outputName,
            type: 'DUBBING',
            inputData: JSON.stringify({ cues, speakerVoiceMap, duckingPreset }),
            outputUrl: `/generated/${outputName}`,
            durationSec,
            creditsUsed: requiredCredits,
            status: 'COMPLETED',
          },
        }),
      ]);
      remainingCredits = wallet.balance;
      projectId = project.id;
    }

    return NextResponse.json({
      success: true,
      projectId,
      videoUrl: `/generated/${outputName}`,
      fileName: outputName,
      durationSec,
      creditsDeducted: requiredCredits,
      remainingCredits,
      cuesCount: cues.length,
      hasOriginalAudio,
      duckingPreset,
    });
  } catch (error) {
    console.error('Video Dubbing Generation Error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Đã xảy ra lỗi trong quá trình lồng tiếng video.' }, { status: 500 });
  } finally {
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => undefined);
  }
}