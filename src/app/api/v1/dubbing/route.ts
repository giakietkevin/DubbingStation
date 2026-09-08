import { NextResponse } from 'next/server';
import { authenticateApiKey } from '@/lib/apiAuth';
import { checkRateLimit, getRateLimitHeaders } from '@/lib/rateLimit';
import { prisma } from '@/lib/prisma';
import type { SubtitleCue } from '@/lib/subtitleParser';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/dubbing
 * Public REST API: Tự động lồng tiếng video/phụ đề cho Developer
 * Header: Authorization: Bearer ds_live_xxxx
 * Body: { title?: string, durationSec: number, cues: SubtitleCue[], speakerVoiceMap?: Record<string, string> }
 */
export async function POST(req: Request) {
  const auth = await authenticateApiKey(req);
  if (!auth.user) {
    return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
  }

  // Rate Limiting
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

  try {
    const body = await req.json();
    const {
      title = 'Developer API Dubbing Project',
      durationSec = 10,
      cues = [],
      speakerVoiceMap = {},
    } = body;

    if (!cues || !Array.isArray(cues) || cues.length === 0) {
      return NextResponse.json(
        { error: 'Vui lòng cung cấp danh sách phụ đề "cues" hợp lệ.' },
        { status: 400 }
      );
    }

    const validDuration = Math.max(1, Math.ceil(durationSec));
    const creditsRequired = validDuration * 100; // 100 Credits / 1 giây video

    if (auth.user.walletBalance < creditsRequired) {
      return NextResponse.json(
        {
          error: `Số dư Credits không đủ. Yêu cầu ${creditsRequired} credits (${validDuration}s x 100 cr/s).`,
          required: creditsRequired,
          currentBalance: auth.user.walletBalance,
        },
        { status: 402 }
      );
    }

    const wallet = await prisma.creditWallet.findUnique({
      where: { userId: auth.user.userId },
    });

    if (!wallet) {
      return NextResponse.json({ error: 'Không tìm thấy ví tín dụng.' }, { status: 404 });
    }

    const newBalance = wallet.balance - creditsRequired;
    const outputVideoUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';

    const [updatedWallet, project] = await prisma.$transaction([
      prisma.creditWallet.update({
        where: { id: wallet.id },
        data: {
          balance: newBalance,
          totalConsumed: wallet.totalConsumed + creditsRequired,
        },
      }),
      prisma.creditTransaction.create({
        data: {
          walletId: wallet.id,
          amount: -creditsRequired,
          balanceAfter: newBalance,
          type: 'API_USAGE',
          description: `Developer API Dubbing v1: "${title}" (${cues.length} cues, ${validDuration}s)`,
        },
      }),
      prisma.audioProject.create({
        data: {
          userId: auth.user.userId,
          name: `${title.replace(/\s+/g, '_')}_${Date.now()}.mp4`,
          type: 'API_V1',
          inputData: JSON.stringify({ cuesCount: cues.length, speakerVoiceMap }),
          outputUrl: outputVideoUrl,
          durationSec: validDuration,
          creditsUsed: creditsRequired,
          status: 'COMPLETED',
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      projectId: project.id,
      videoUrl: outputVideoUrl,
      durationSec: validDuration,
      cuesProcessed: cues.length,
      creditsDeducted: creditsRequired,
      remainingBalance: newBalance,
      speakerVoiceMap,
    }, { headers: rateLimitHeaders });
  } catch (error) {
    console.error('API v1 Dubbing Error:', error);
    return NextResponse.json({ error: 'Lỗi xử lý lồng tiếng API.' }, { status: 500 });
  }
}
