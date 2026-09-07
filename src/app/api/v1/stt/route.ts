import { NextResponse } from 'next/server';
import { authenticateApiKey } from '@/lib/apiAuth';
import { prisma } from '@/lib/prisma';
import { mockWhisperTranscribe } from '@/lib/whisper';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/stt
 * Public REST API: Nhận diện giọng nói bóc băng Whisper AI cho Developer
 * Header: Authorization: Bearer ds_live_xxxx
 * Body: { fileName?: string, durationSec: number, language?: string }
 */
export async function POST(req: Request) {
  const auth = await authenticateApiKey(req);
  if (!auth.user) {
    return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
  }

  try {
    const body = await req.json();
    const { fileName = 'developer_audio.mp3', durationSec = 15, language = 'vi' } = body;

    const validDuration = Math.max(1, Math.ceil(durationSec));
    const creditsRequired = validDuration * 50; // 50 credits / 1 giây audio

    if (auth.user.walletBalance < creditsRequired) {
      return NextResponse.json(
        {
          error: `Số dư Credits không đủ. Yêu cầu ${creditsRequired} credits (${validDuration}s x 50 cr/s).`,
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

    // Chạy Whisper Transcription Engine
    const transcription = mockWhisperTranscribe(validDuration, language);
    const newBalance = wallet.balance - creditsRequired;

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
          description: `Developer API STT v1: "${fileName}" (${validDuration}s, ${language})`,
        },
      }),
      prisma.audioProject.create({
        data: {
          userId: auth.user.userId,
          name: `${fileName.replace(/\.[^/.]+$/, '')}_STT_${Date.now()}`,
          type: 'API_V1',
          inputData: JSON.stringify({ fileName, language }),
          outputUrl: null,
          durationSec: validDuration,
          creditsUsed: creditsRequired,
          status: 'COMPLETED',
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      projectId: project.id,
      fileName,
      durationSec: validDuration,
      language: transcription.language,
      fullText: transcription.text,
      segments: transcription.segments,
      creditsDeducted: creditsRequired,
      remainingBalance: newBalance,
    });
  } catch (error) {
    console.error('API v1 STT Error:', error);
    return NextResponse.json({ error: 'Lỗi xử lý nhận diện giọng nói API.' }, { status: 500 });
  }
}
