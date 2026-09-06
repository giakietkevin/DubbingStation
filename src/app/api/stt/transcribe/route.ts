import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { mockWhisperTranscribe } from '@/lib/whisper';

/**
 * POST /api/stt/transcribe
 * Endpoint nhận diện giọng nói thành văn bản (Speech to Text):
 * 1. Nhận thông tin file audio/video, ngôn ngữ (vi, en, auto)
 * 2. Tính toán Credits: 50 Credits / 1 giây audio
 * 3. Trừ credits atomic trong database của user
 * 4. Tạo bản ghi AudioProject loại STT
 * 5. Trả về transcript đầy đủ kèm danh sách segments có timestamp
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const body = await req.json();
    const { fileName = 'audio_record.mp3', durationSec = 20, language = 'vi' } = body;

    const validDuration = Math.max(1, Math.ceil(durationSec));
    // Công thức Unified Credits cho STT: 50 credits / 1 giây audio
    const requiredCredits = validDuration * 50;

    // Chạy engine nhận diện Whisper
    const transcription = mockWhisperTranscribe(validDuration, language);

    // Nếu người dùng đã đăng nhập, kiểm tra và trừ credit
    if (session?.user?.email) {
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        include: { wallet: true },
      });

      if (!user) {
        return NextResponse.json({ error: 'Người dùng không tồn tại' }, { status: 404 });
      }

      if (!user.wallet || user.wallet.balance < requiredCredits) {
        return NextResponse.json(
          {
            error: `Số dư credits không đủ. Yêu cầu ${requiredCredits.toLocaleString('vi-VN')} credits (${validDuration}s x 50 cr/s), hiện có ${(user.wallet?.balance ?? 0).toLocaleString('vi-VN')} credits.`,
            currentBalance: user.wallet?.balance ?? 0,
            requiredCredits,
          },
          { status: 402 }
        );
      }

      const newBalance = user.wallet.balance - requiredCredits;

      const [updatedWallet, project] = await prisma.$transaction([
        prisma.creditWallet.update({
          where: { id: user.wallet.id },
          data: {
            balance: newBalance,
            totalConsumed: user.wallet.totalConsumed + requiredCredits,
            transactions: {
              create: {
                amount: -requiredCredits,
                balanceAfter: newBalance,
                type: 'STT_USAGE',
                description: `Nhận diện giọng nói Whisper (${fileName}, ${validDuration}s, ${language})`,
              },
            },
          },
        }),
        prisma.audioProject.create({
          data: {
            userId: user.id,
            name: `${fileName.replace(/\.[^/.]+$/, '')}_Transcript_${Date.now()}`,
            type: 'STT',
            inputData: transcription.text,
            outputUrl: null,
            durationSec: validDuration,
            charCount: transcription.text.length,
            creditsUsed: requiredCredits,
            status: 'COMPLETED',
          },
        }),
      ]);

      return NextResponse.json({
        success: true,
        projectId: project.id,
        fileName: project.name,
        transcription,
        durationSec: validDuration,
        creditsDeducted: requiredCredits,
        remainingCredits: updatedWallet.balance,
      });
    }

    // Nếu là khách dùng thử demo (chưa đăng nhập)
    if (validDuration > 30) {
      return NextResponse.json(
        { error: 'Bản dùng thử nhận diện giọng nói giới hạn tối đa 30 giây. Vui lòng đăng nhập để sử dụng không giới hạn.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      transcription,
      fileName: `${fileName}_Demo_Transcript`,
      durationSec: validDuration,
      creditsDeducted: requiredCredits,
      remainingCredits: Math.max(0, 50000 - requiredCredits),
      isGuest: true,
    });
  } catch (error: any) {
    console.error('STT Transcription Error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi nhận diện giọng nói. Vui lòng thử lại.' },
      { status: 500 }
    );
  }
}
