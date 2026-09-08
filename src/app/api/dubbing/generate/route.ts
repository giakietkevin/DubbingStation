import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import { execFile } from 'child_process';
import { promisify } from 'util';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const execFileAsync = promisify(execFile);

interface DubbingCue {
  id: number;
  startTime: number;
  endTime: number;
  text: string;
  speaker?: string;
}

async function createTimedAudio(req: Request, cues: DubbingCue[], speakerVoiceMap: Record<string, string>, workDir: string) {
  const audioFiles: string[] = [];
  const origin = new URL(req.url).origin;

  for (const cue of cues) {
    const ttsUrl = new URL('/api/tts/stream', origin);
    ttsUrl.searchParams.set('text', cue.text);
    ttsUrl.searchParams.set('voiceId', speakerVoiceMap[cue.speaker || ''] || 'minh-khang');
    const cueDuration = Math.max(0.25, cue.endTime - cue.startTime);
    const estimatedSpeechDuration = Math.max(0.25, cue.text.trim().length / 14);
    const speed = Math.max(0.75, Math.min(2.5, estimatedSpeechDuration / cueDuration));
    ttsUrl.searchParams.set('speed', speed.toFixed(2));
    const response = await fetch(ttsUrl);
    if (!response.ok) throw new Error(`TTS thất bại ở cue #${cue.id} (${response.status}).`);
    const audioPath = path.join(workDir, `cue-${cue.id}.mp3`);
    await fs.writeFile(audioPath, Buffer.from(await response.arrayBuffer()));
    audioFiles.push(audioPath);
  }

  const outputPath = path.join(workDir, 'dubbed-audio.m4a');
  const args = ['-y'];
  for (const audioFile of audioFiles) args.push('-i', audioFile);
  const filterParts = cues.map((cue, index) => {
    const cueDuration = Math.max(0.1, cue.endTime - cue.startTime);
    const fadeDuration = Math.min(0.08, cueDuration / 4);
    return `[${index}:a]atrim=duration=${cueDuration.toFixed(3)},asetpts=PTS-STARTPTS,afade=t=out:st=${Math.max(0, cueDuration - fadeDuration).toFixed(3)}:d=${fadeDuration.toFixed(3)},adelay=${Math.max(0, Math.round(cue.startTime * 1000))}:all=1[a${index}]`;
  });
  filterParts.push(`${cues.map((_, index) => `[a${index}]`).join('')}amix=inputs=${cues.length}:duration=longest:dropout_transition=0,loudnorm=I=-14:TP=-1.0:LRA=7,volume=9dB[dub]`);
  args.push('-filter_complex', filterParts.join(';'), '-map', '[dub]', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', outputPath);
  await execFileAsync('ffmpeg', args, { maxBuffer: 10 * 1024 * 1024 });
  return outputPath;
}

export async function POST(req: Request) {
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dubbingstation-'));
  try {
    const formData = await req.formData();
    const video = formData.get('video');
    const cues = JSON.parse(String(formData.get('cues') || '[]')) as DubbingCue[];
    const speakerVoiceMap = JSON.parse(String(formData.get('speakerVoiceMap') || '{}')) as Record<string, string>;
    const title = String(formData.get('title') || 'Video Dubbing Project');

    if (!(video instanceof File) || video.size === 0) return NextResponse.json({ error: 'Vui lòng tải lên video gốc trước khi lồng tiếng.' }, { status: 400 });
    if (!Array.isArray(cues) || cues.length === 0) return NextResponse.json({ error: 'Vui lòng cung cấp phụ đề hợp lệ.' }, { status: 400 });
    if (cues.length > 300) return NextResponse.json({ error: 'Video tối đa 300 cue mỗi lần lồng tiếng.' }, { status: 400 });

    const inputPath = path.join(workDir, `${crypto.randomUUID()}-${video.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`);
    await fs.writeFile(inputPath, Buffer.from(await video.arrayBuffer()));
    const dubbedAudioPath = await createTimedAudio(req, cues, speakerVoiceMap, workDir);
    const outputName = `${title.replace(/[^a-zA-Z0-9._-]/g, '_')}-dubbed-${Date.now()}.mp4`;
    const outputDir = path.join(process.cwd(), 'public', 'generated');
    const outputPath = path.join(outputDir, outputName);
    await fs.mkdir(outputDir, { recursive: true });
    await execFileAsync('ffmpeg', ['-y', '-i', inputPath, '-i', dubbedAudioPath, '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'aac', '-shortest', '-movflags', '+faststart', outputPath], { maxBuffer: 10 * 1024 * 1024 });

    const session = await getServerSession(authOptions);
    const durationSec = Math.max(1, Math.ceil(Math.max(...cues.map((cue) => cue.endTime))));
    const requiredCredits = durationSec * 100;
    let remainingCredits = Math.max(0, 50000 - requiredCredits);
    let projectId: string | undefined;

    if (session?.user?.email) {
      const user = await prisma.user.findUnique({ where: { email: session.user.email }, include: { wallet: true } });
      if (!user) return NextResponse.json({ error: 'Người dùng không tồn tại.' }, { status: 404 });
      if (!user.wallet || user.wallet.balance < requiredCredits) return NextResponse.json({ error: `Số dư credits không đủ. Cần ${requiredCredits.toLocaleString('vi-VN')} credits.`, requiredCredits }, { status: 402 });
      const newBalance = user.wallet.balance - requiredCredits;
      const [wallet, project] = await prisma.$transaction([
        prisma.creditWallet.update({ where: { id: user.wallet.id }, data: { balance: newBalance, totalConsumed: user.wallet.totalConsumed + requiredCredits, transactions: { create: { amount: -requiredCredits, balanceAfter: newBalance, type: 'DUBBING_USAGE', description: `Lồng tiếng video thật (${cues.length} cues, ${durationSec}s)` } } } }),
        prisma.audioProject.create({ data: { userId: user.id, name: outputName, type: 'DUBBING', inputData: JSON.stringify({ cues, speakerVoiceMap }), outputUrl: `/generated/${outputName}`, durationSec, creditsUsed: requiredCredits, status: 'COMPLETED' } }),
      ]);
      remainingCredits = wallet.balance;
      projectId = project.id;
    }

    return NextResponse.json({ success: true, projectId, videoUrl: `/generated/${outputName}`, fileName: outputName, durationSec, creditsDeducted: requiredCredits, remainingCredits });
  } catch (error) {
    console.error('Video Dubbing Generation Error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Đã xảy ra lỗi trong quá trình lồng tiếng video.' }, { status: 500 });
  } finally {
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => undefined);
  }
}