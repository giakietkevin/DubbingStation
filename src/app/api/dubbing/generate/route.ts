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
    ttsUrl.searchParams.set('voiceId', speakerVoiceMap[cue.speaker || ''] || 'minh-khang');

    // Căn chỉnh tốc độ đọc tự nhiên tương ứng với thời lượng cue
    const cueDuration = Math.max(0.6, cue.endTime - cue.startTime);
    const estimatedSpeechDuration = Math.max(0.5, cue.text.trim().length / 13);
    const targetSpeed = Math.max(0.85, Math.min(1.85, estimatedSpeechDuration / cueDuration));
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

  // Không cắt cụt âm thanh ở đuôi câu, cho phép câu nói hoàn tất tự nhiên trước khi câu sau xuất hiện
  const filterParts = cues.map((cue, index) => {
    const nextCue = cues[index + 1];
    const cueDuration = Math.max(0.6, cue.endTime - cue.startTime);
    const maxAllowedDuration = nextCue
      ? Math.max(cueDuration, Math.min(cueDuration * 1.35, nextCue.startTime - cue.startTime - 0.05))
      : cueDuration + 2.5;

    const fadeDuration = Math.min(0.08, cueDuration / 4);
    const delayMs = Math.max(0, Math.round(cue.startTime * 1000));

    return `[${index}:a]atrim=duration=${maxAllowedDuration.toFixed(3)},asetpts=PTS-STARTPTS,afade=t=out:st=${Math.max(0, maxAllowedDuration - fadeDuration).toFixed(3)}:d=${fadeDuration.toFixed(3)},adelay=${delayMs}:all=1[a${index}]`;
  });

  filterParts.push(
    `${cues.map((_, index) => `[a${index}]`).join('')}amix=inputs=${cues.length}:duration=longest:dropout_transition=0,loudnorm=I=-14:TP=-1.0:LRA=7,volume=4dB[dub]`
  );

  args.push('-filter_complex', filterParts.join(';'), '-map', '[dub]', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', outputPath);
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
    let duckingVolume = 0.15; // Mặc định giữ 15% tiếng nền (SFX, tiếng nổ, nhạc nền) ở đoạn có thoại
    if (duckingPreset === 'sfx_duck_half') {
      duckingVolume = 0.30;
    } else if (duckingPreset === 'mute_dialogue') {
      duckingVolume = 0.0;
    } else if (duckingPreset === 'replace_all') {
      duckingVolume = 0.0;
    }

    if (!(video instanceof File) || video.size === 0) {
      return NextResponse.json({ error: 'Vui lòng tải lên video gốc trước khi lồng tiếng.' }, { status: 400 });
    }
    if (!Array.isArray(cues) || cues.length === 0) {
      return NextResponse.json({ error: 'Vui lòng cung cấp phụ đề hợp lệ.' }, { status: 400 });
    }
    if (cues.length > 300) {
      return NextResponse.json({ error: 'Video tối đa 300 cue mỗi lần lồng tiếng.' }, { status: 400 });
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
      // Hợp nhất các khoảng thoại để tạo volume ducking mượt mà cho âm thanh nền
      const dialogueIntervals = mergeDialogueIntervals(cues, 0.08, 0.15);
      const dialogueWindows = dialogueIntervals
        .map((interval) => `between(t,${interval.start.toFixed(3)},${interval.end.toFixed(3)})`)
        .join('+');

      // Ở đoạn không có thoại: volume = 1.0 (100% âm thanh raw/SFX gốc)
      // Ở đoạn có thoại: volume = duckingVolume (giữ lại SFX/nhạc nền phim theo tỷ lệ)
      const audioFilter = `[0:a]volume=enable='${dialogueWindows}':volume=${duckingVolume}[ducked_orig];[ducked_orig][1:a]amix=inputs=2:duration=first:dropout_transition=0:normalize=0,loudnorm=I=-14:TP=-1.0:LRA=7[mixed]`;

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