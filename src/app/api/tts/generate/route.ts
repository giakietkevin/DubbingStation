import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const body = await req.json();
    const { text, voiceId, voiceName, speed = 1.0, emotion = 'Tự nhiên' } = body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Vui lòng nhập nội dung văn bản cần chuyển đổi' },
        { status: 400 }
      );
    }

    const trimmedText = text.trim();
    const charCount = trimmedText.length;
    const provider = (body as any).provider || 'microsoft';
    
    // OpenAI HD cost more: 3 credits per char vs 1 credit for Microsoft/Piper
    const creditRate = provider === 'openai' ? 3 : 1;
    const requiredCredits = charCount * creditRate;

    // Nếu người dùng đã đăng nhập, kiểm tra và trừ credit trong database
    if (session?.user?.email) {
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        include: { wallet: true },
      });

      if (!user) {
        return NextResponse.json(
          { error: 'Người dùng không tồn tại' },
          { status: 404 }
        );
      }

      if (!user.wallet || user.wallet.balance < requiredCredits) {
        return NextResponse.json(
          {
            error: `Số dư credits không đủ. Yêu cầu ${requiredCredits.toLocaleString('vi-VN')} credits, hiện có ${(user.wallet?.balance ?? 0).toLocaleString('vi-VN')} credits.`,
            currentBalance: user.wallet?.balance ?? 0,
            requiredCredits,
          },
          { status: 402 }
        );
      }

      // Trừ credits và tạo bản ghi transaction atomic
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
                type: 'TTS_USAGE',
                description: `Tạo giọng đọc AI (${voiceName || voiceId}, ${provider}, ${charCount} ký tự)`,
              },
            },
          },
        }),
        prisma.audioProject.create({
          data: {
            userId: user.id,
            name: `${voiceName || 'Voice'}_${provider}_${Date.now()}.mp3`,
            type: 'TTS',
            inputData: trimmedText,
            outputUrl: 'https://actions.google.com/sounds/v1/speech/greeting_male.ogg', // Sample high quality audio URL
            charCount,
            durationSec: Math.max(3, Math.round(charCount / 15)), // Ước lượng thời lượng audio
            creditsUsed: requiredCredits,
            status: 'COMPLETED',
          },
        }),
      ]);

      return NextResponse.json({
        success: true,
        audioUrl: project.outputUrl,
        projectId: project.id,
        fileName: project.name,
        durationSec: project.durationSec,
        charCount,
        creditsDeducted: requiredCredits,
        remainingCredits: updatedWallet.balance,
        provider,
      });
    }

    // Nếu khách dùng thử vãng lai (chưa đăng nhập) trên demo console:
    if (charCount > 5000) {
      return NextResponse.json(
        { error: 'Bản dùng thử giới hạn tối đa 5.000 ký tự. Vui lòng đăng nhập để tạo không giới hạn.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      audioUrl: 'https://actions.google.com/sounds/v1/speech/greeting_male.ogg',
      fileName: `${voiceName || 'Voice'}_${provider}_Sample.mp3`,
      durationSec: 14,
      charCount,
      creditsDeducted: requiredCredits,
      remainingCredits: Math.max(0, 50000 - requiredCredits),
      isGuest: true,
      provider,
    });
  } catch (error: any) {
    console.error('TTS Generation Error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi tạo âm thanh. Vui lòng thử lại.' },
      { status: 500 }
    );
  }
}
