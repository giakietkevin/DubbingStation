import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET: Lấy danh sách giọng đã nhân bản của người dùng
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        customVoices: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Người dùng không tồn tại' }, { status: 404 });
    }

    return NextResponse.json({
      voices: user.customVoices,
    });
  } catch (error) {
    console.error('Fetch custom voices error:', error);
    return NextResponse.json({ error: 'Lỗi máy chủ khi lấy danh sách giọng' }, { status: 500 });
  }
}

// POST: Tạo giọng nhân bản mới (Instant Clone / Pro Clone)
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Vui lòng đăng nhập để nhân bản giọng nói' }, { status: 401 });
    }

    const body = await req.json();
    const {
      name,
      gender = 'neutral',
      language = 'vi-VN',
      cloneType = 'instant', // instant | professional
      consentAgreed,
      sampleAudioBase64,
      fileName,
    } = body;

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'Vui lòng nhập tên cho giọng nói' }, { status: 400 });
    }

    if (!consentAgreed) {
      return NextResponse.json(
        { error: 'Bạn phải đồng ý với cam kết bản quyền và sự chấp thuận sử dụng giọng nói.' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { wallet: true, customVoices: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'Không tìm thấy thông tin tài khoản' }, { status: 404 });
    }

    // Chi phí credits cho nhân bản giọng
    // Instant Clone: 5.000 Credits, Pro Clone: 20.000 Credits
    const cloneCreditsRequired = cloneType === 'professional' ? 20000 : 5000;

    if (!user.wallet || user.wallet.balance < cloneCreditsRequired) {
      return NextResponse.json(
        {
          error: `Số dư không đủ để nhân bản giọng (${cloneType === 'professional' ? 'Chuyên nghiệp' : 'Tức thì'}). Cần ${cloneCreditsRequired.toLocaleString('vi-VN')} credits, hiện có ${(user.wallet?.balance ?? 0).toLocaleString('vi-VN')} credits.`,
          requiredCredits: cloneCreditsRequired,
          currentBalance: user.wallet?.balance ?? 0,
        },
        { status: 402 }
      );
    }

    const newBalance = user.wallet.balance - cloneCreditsRequired;
    const generatedModelKey = `custom_${user.id.slice(-6)}_${Date.now()}`;
    const mockAudioSampleUrl = 'https://assets.mixkit.co/active_storage/sfx/2874/2874-preview.mp3';

    // Transaction: Trừ credit + tạo CustomVoice + tạo Project log
    const [updatedWallet, newVoice] = await prisma.$transaction([
      prisma.creditWallet.update({
        where: { id: user.wallet.id },
        data: {
          balance: newBalance,
          totalConsumed: user.wallet.totalConsumed + cloneCreditsRequired,
          transactions: {
            create: {
              amount: -cloneCreditsRequired,
              balanceAfter: newBalance,
              type: 'VOICE_CLONE_USAGE',
              description: `Nhân bản giọng AI (${cloneType.toUpperCase()}): "${name}" (${fileName || 'sample.wav'})`,
            },
          },
        },
      }),
      prisma.customVoice.create({
        data: {
          userId: user.id,
          name: name.trim(),
          gender,
          language,
          modelKey: generatedModelKey,
          sampleUrl: mockAudioSampleUrl,
          status: 'READY',
        },
      }),
      prisma.audioProject.create({
        data: {
          userId: user.id,
          name: `Voice Clone - ${name.trim()}`,
          type: 'VOICE_CLONE',
          creditsUsed: cloneCreditsRequired,
          status: 'COMPLETED',
          outputUrl: mockAudioSampleUrl,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: `Đã nhân bản giọng "${name}" thành công!`,
      voice: newVoice,
      creditsDeducted: cloneCreditsRequired,
      remainingCredits: newBalance,
    });
  } catch (error) {
    console.error('Create custom voice error:', error);
    return NextResponse.json({ error: 'Lỗi máy chủ khi tạo giọng nói AI' }, { status: 500 });
  }
}
