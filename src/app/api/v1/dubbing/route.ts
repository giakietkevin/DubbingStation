import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { authenticateApiKey } from '@/lib/apiAuth';
import { checkRateLimit, getRateLimitHeaders } from '@/lib/rateLimit';
import { prisma } from '@/lib/prisma';
import { deduplicateSubtitleCues, type SubtitleCue } from '@/lib/subtitleParser';
import {
  createTimedDubbedAudio,
  renderDubbedMedia,
  getAudioDuration,
} from '@/lib/dubbingEngine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 7200;

const MAX_DUBBING_CUES = 2000;

/**
 * POST /api/v1/dubbing
 * Public REST API: Tự động lồng tiếng video / phụ đề cho Developer (Xử lý FFmpeg thực tế)
 * Header: Authorization: Bearer ds_live_xxxx
 * Body JSON:
 * {
 *   title?: string,
 *   cues: SubtitleCue[],
 *   speakerVoiceMap?: Record<string, string>,
 *   videoUrl?: string,
 *   audioUrl?: string,
 *   duckingLevel?: 'sfx_preserve' | 'sfx_duck_half' | 'mute_dialogue' | 'replace_all',
 *   keepOriginalAudio?: boolean
 * }
 */
export async function POST(req: Request) {
  const auth = await authenticateApiKey(req);
  if (!auth.user) {
    return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
  }

  // Rate Limiting (60 req/min)
  const rateLimit = checkRateLimit(auth.user.apiKeyId, { limit: 60, windowMs: 60000 });
  const rateLimitHeaders = getRateLimitHeaders(rateLimit);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: 'Quá giới hạn tần suất gọi API (Rate limit exceeded: 60 req/min). Vui lòng thử lại sau.',
        retryAfter: rateLimit.retryAfter,
      },
      {
        status: 429,
        headers: rateLimitHeaders,
      }
    );
  }

  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ds-api-dubbing-'));

  try {
    const body = await req.json();
    const {
      title = 'Developer API Dubbing Project',
      cues: rawCues = [],
      speakerVoiceMap = {},
      videoUrl,
      audioUrl,
      duckingLevel = 'sfx_preserve',
      keepOriginalAudio = true,
    } = body;

    if (!Array.isArray(rawCues) || rawCues.length === 0) {
      return NextResponse.json(
        { error: 'Vui lòng cung cấp danh sách phụ đề "cues" hợp lệ (SubtitleCue[]).' },
        { status: 400, headers: rateLimitHeaders }
      );
    }

    if (rawCues.length > MAX_DUBBING_CUES) {
      return NextResponse.json(
        { error: `Tối đa ${MAX_DUBBING_CUES} cues mỗi yêu cầu API.` },
        { status: 400, headers: rateLimitHeaders }
      );
    }

    // Chuẩn hóa và khử trùng lặp các cues
    const normalizedRawCues: SubtitleCue[] = rawCues.map((c: any, i: number) => ({
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
    if (cues.length === 0) {
      return NextResponse.json(
        { error: 'Không tìm thấy nội dung thoại hợp lệ trong cues.' },
        { status: 400, headers: rateLimitHeaders }
      );
    }

    // Tính toán thời lượng ước tính theo cue cuối cùng
    const maxCueTime = Math.max(...cues.map((c) => c.endTime));
    const estimatedDuration = Math.max(2, Math.ceil(maxCueTime));
    const validDuration = Math.max(1, estimatedDuration);
    const creditsRequired = validDuration * 100; // 100 Credits / 1 giây

    if (auth.user.walletBalance < creditsRequired) {
      return NextResponse.json(
        {
          error: `Số dư Credits không đủ. Yêu cầu ${creditsRequired} credits (${validDuration}s x 100 cr/s).`,
          required: creditsRequired,
          currentBalance: auth.user.walletBalance,
        },
        { status: 402, headers: rateLimitHeaders }
      );
    }

    const wallet = await prisma.creditWallet.findUnique({
      where: { userId: auth.user.userId },
    });

    if (!wallet) {
      return NextResponse.json({ error: 'Không tìm thấy ví tín dụng.' }, { status: 404, headers: rateLimitHeaders });
    }

    // Tải tệp video hoặc audio nguồn nếu developer truyền URL
    let inputMediaPath: string | undefined;
    const mediaSourceUrl = videoUrl || audioUrl;

    if (mediaSourceUrl && typeof mediaSourceUrl === 'string' && mediaSourceUrl.startsWith('http')) {
      try {
        const mediaRes = await fetch(mediaSourceUrl);
        if (mediaRes.ok) {
          const mediaBuffer = Buffer.from(await mediaRes.arrayBuffer());
          const ext = videoUrl ? 'mp4' : 'mp3';
          inputMediaPath = path.join(workDir, `source_${Date.now()}.${ext}`);
          await fs.writeFile(inputMediaPath, mediaBuffer);
        }
      } catch (dlErr) {
        console.warn('[API v1 Dubbing] Không thể tải mediaSourceUrl, tiến hành xuất âm thanh lồng tiếng:', dlErr);
      }
    }

    // Xác định URL gốc cho TTS fetch
    const requestUrl = new URL(req.url);
    const forwardedHost = req.headers.get('x-forwarded-host');
    const forwardedProto = req.headers.get('x-forwarded-proto') || 'https';
    const origin = forwardedHost
      ? `${forwardedProto.split(',')[0].trim()}://${forwardedHost.split(',')[0].trim()}`
      : requestUrl.origin;

    // Sinh âm thanh lồng tiếng chuẩn nhịp thoại (Timeline-Aligned Studio Vocal Mastering)
    const dubbedAudioPath = await createTimedDubbedAudio({
      cues,
      speakerVoiceMap,
      workDir,
      origin,
    });

    const isVideoOutput = Boolean(inputMediaPath && videoUrl);
    const fileExt = isVideoOutput ? 'mp4' : 'm4a';
    const safeTitle = title.replace(/[^a-zA-Z0-9._-]/g, '_');
    const outputFileName = `api_dubbed_${safeTitle}_${Date.now()}.${fileExt}`;
    const outputDir = process.env.GENERATED_DIR || path.join(process.cwd(), 'public', 'generated');
    const finalOutputPath = path.join(outputDir, outputFileName);
    await fs.mkdir(outputDir, { recursive: true });

    // Hòa trộn media với sidechain ducking
    await renderDubbedMedia({
      inputVideoPath: inputMediaPath,
      dubbedAudioPath,
      outputPath: finalOutputPath,
      duckingPreset: duckingLevel,
      keepOriginalAudio,
    });

    const actualDuration = await getAudioDuration(finalOutputPath);
    const finalDurationSec = Math.max(1, Math.round(actualDuration));
    const finalCredits = finalDurationSec * 100;

    const newBalance = wallet.balance - finalCredits;
    const outputRelativeUrl = `/api/generated/${outputFileName}`;

    // Cập nhật Prisma Atomic Transaction
    const [updatedWallet, , project] = await prisma.$transaction([
      prisma.creditWallet.update({
        where: { id: wallet.id },
        data: {
          balance: newBalance,
          totalConsumed: wallet.totalConsumed + finalCredits,
        },
      }),
      prisma.creditTransaction.create({
        data: {
          walletId: wallet.id,
          amount: -finalCredits,
          balanceAfter: newBalance,
          type: 'API_USAGE',
          description: `Developer API Dubbing v1: "${title}" (${cues.length} cues, ${finalDurationSec}s)`,
        },
      }),
      prisma.audioProject.create({
        data: {
          userId: auth.user.userId,
          name: outputFileName,
          type: 'API_V1',
          inputData: JSON.stringify({ cuesCount: cues.length, speakerVoiceMap, duckingLevel }),
          outputUrl: outputRelativeUrl,
          durationSec: finalDurationSec,
          creditsUsed: finalCredits,
          status: 'COMPLETED',
        },
      }),
    ]);

    return NextResponse.json(
      {
        success: true,
        project: {
          id: project.id,
          name: project.name,
          outputUrl: outputRelativeUrl,
          durationSec: finalDurationSec,
          creditsUsed: finalCredits,
          cuesProcessed: cues.length,
          status: 'COMPLETED',
          createdAt: project.createdAt,
        },
        remainingCredits: updatedWallet.balance,
      },
      { headers: rateLimitHeaders }
    );
  } catch (error: any) {
    console.error('[API v1 Dubbing Error]:', error);
    return NextResponse.json(
      { error: error?.message || 'Lỗi xử lý pipeline lồng tiếng âm thanh.' },
      { status: 500, headers: rateLimitHeaders }
    );
  } finally {
    // Dọn dẹp thư mục tạm
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => undefined);
  }
}
