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

    // Yêu cầu đăng nhập để trừ credits trong CSDL
    if (!session?.user) {
      return NextResponse.json(
        {
          error: 'Vui lòng đăng nhập tài khoản để sử dụng 50.000 Credits tạo âm thanh!',
          requireLogin: true,
        },
        { status: 401 }
      );
    }

    const trimmedText = text.trim();
    const charCount = trimmedText.length;
    const provider = (body as any).provider || 'microsoft';

    // OpenAI HD tiêu tốn 3 credits/ký tự, các provider khác 1 credit/ký tự
    const creditRate = provider === 'openai' ? 3 : 1;
    const requiredCredits = Math.max(10, charCount * creditRate);

    // Tìm kiếm user trong CSDL SQLite
    const userEmail = session.user.email?.toLowerCase().trim();
    const userId = (session.user as any).id;

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          ...(userEmail ? [{ email: userEmail }] : []),
          ...(userId ? [{ id: userId }] : []),
        ],
      },
      include: { wallet: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Không tìm thấy thông tin tài khoản người dùng trong CSDL' },
        { status: 404 }
      );
    }

    const isAdmin = user.role === 'ADMIN';

    // Khởi tạo ví nếu chưa có
    let wallet = user.wallet;
    if (!wallet) {
      wallet = await prisma.creditWallet.create({
        data: {
          userId: user.id,
          balance: isAdmin ? 9999999 : 50000,
          totalEarned: isAdmin ? 9999999 : 50000,
          totalConsumed: 0,
        },
      });
    }

    // Kiểm tra số dư Credits
    if (wallet.balance < requiredCredits) {
      return NextResponse.json(
        {
          error: `Số dư Credits không đủ. Bạn cần ${requiredCredits.toLocaleString('vi-VN')} Credits nhưng chỉ còn ${wallet.balance.toLocaleString('vi-VN')} Credits. Vui lòng nạp thêm hoặc chọn văn bản ngắn hơn.`,
          currentBalance: wallet.balance,
          requiredCredits,
        },
        { status: 402 }
      );
    }

    // Trừ credits và lưu lịch sử giao dịch vào CSDL
    const newBalance = wallet.balance - requiredCredits;

    const [updatedWallet, project] = await prisma.$transaction([
      prisma.creditWallet.update({
        where: { id: wallet.id },
        data: {
          balance: newBalance,
          totalConsumed: wallet.totalConsumed + requiredCredits,
          transactions: {
            create: {
              amount: -requiredCredits,
              balanceAfter: newBalance,
              type: 'TTS_USAGE',
              description: `Tạo giọng đọc AI (${voiceName || voiceId}, ${provider}, ${charCount.toLocaleString('vi-VN')} ký tự)`,
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
          outputUrl: 'https://actions.google.com/sounds/v1/speech/greeting_male.ogg',
          charCount,
          durationSec: Math.max(3, Math.round(charCount / 15)),
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
  } catch (error: any) {
    console.error('TTS Generation Error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi tạo âm thanh: ' + error.message },
      { status: 500 }
    );
  }
}
