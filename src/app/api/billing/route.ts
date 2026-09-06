import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET: Lấy thông tin số dư ví credits, gói đăng ký hiện tại và lịch sử giao dịch
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        wallet: {
          include: {
            transactions: {
              orderBy: { createdAt: 'desc' },
              take: 20,
            },
          },
        },
        subscription: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Người dùng không tồn tại' }, { status: 404 });
    }

    return NextResponse.json({
      wallet: user.wallet,
      subscription: user.subscription,
      transactions: user.wallet?.transactions || [],
    });
  } catch (error) {
    console.error('Fetch billing info error:', error);
    return NextResponse.json({ error: 'Lỗi máy chủ khi lấy thông tin thanh toán' }, { status: 500 });
  }
}

// POST: Nâng cấp gói cước hoặc Nạp thêm Credits
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Vui lòng đăng nhập để thực hiện thanh toán' }, { status: 401 });
    }

    const body = await req.json();
    const { planId, promoCode, billingCycle = 'monthly' } = body;

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { wallet: true, subscription: true },
    });

    if (!user || !user.wallet) {
      return NextResponse.json({ error: 'Không tìm thấy thông tin ví credits' }, { status: 404 });
    }

    // Bảng quy đổi gói cước ra Credits & Giá
    const planCreditsMap: Record<string, { name: string; credits: number; priceUSD: number }> = {
      free: { name: 'Free', credits: 50000, priceUSD: 0 },
      lite: { name: 'Lite', credits: 99000, priceUSD: 1.0 },
      starter: { name: 'Starter', credits: 999000, priceUSD: 4.5 },
      growth: { name: 'Growth', credits: 4999000, priceUSD: 14.5 },
      pro: { name: 'Pro Studio', credits: 19999000, priceUSD: 39.5 },
    };

    const targetPlan = planCreditsMap[planId?.toLowerCase()] || planCreditsMap.starter;

    // Tính giá sau mã giảm giá
    let discount = 0;
    if (promoCode && promoCode.toUpperCase() === 'LAUNCH50') {
      discount = 0.5; // Giảm 50%
    }

    let finalPrice = targetPlan.priceUSD * (1 - discount);
    if (billingCycle === 'annual') {
      finalPrice = finalPrice * 0.7 * 12; // Chiết khấu thêm 30% khi thanh toán cả năm
    }

    const addedCredits = targetPlan.credits;
    const newBalance = user.wallet.balance + addedCredits;

    // Transaction cập nhật ví + tạo giao dịch + cập nhật gói
    const periodEndDate = new Date();
    periodEndDate.setMonth(periodEndDate.getMonth() + (billingCycle === 'annual' ? 12 : 1));

    const [updatedWallet, updatedSub] = await prisma.$transaction([
      prisma.creditWallet.update({
        where: { id: user.wallet.id },
        data: {
          balance: newBalance,
          totalEarned: user.wallet.totalEarned + addedCredits,
          transactions: {
            create: {
              amount: addedCredits,
              balanceAfter: newBalance,
              type: 'SUBSCRIPTION_TOPUP',
              description: `Nâng cấp gói ${targetPlan.name} (${billingCycle === 'annual' ? 'Năm' : 'Tháng'})${discount > 0 ? ' [Mã LAUNCH50 -50%]' : ''}`,
            },
          },
        },
      }),
      prisma.subscription.upsert({
        where: { userId: user.id },
        update: {
          tier: targetPlan.name.toUpperCase(),
          status: 'ACTIVE',
          currentPeriodStart: new Date(),
          currentPeriodEnd: periodEndDate,
        },
        create: {
          userId: user.id,
          tier: targetPlan.name.toUpperCase(),
          status: 'ACTIVE',
          currentPeriodStart: new Date(),
          currentPeriodEnd: periodEndDate,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: `Đã kích hoạt gói ${targetPlan.name} thành công! +${addedCredits.toLocaleString('vi-VN')} Credits.`,
      plan: targetPlan.name,
      creditsAdded: addedCredits,
      newBalance: newBalance,
      finalPrice,
    });
  } catch (error) {
    console.error('Billing processing error:', error);
    return NextResponse.json({ error: 'Lỗi máy chủ khi xử lý thanh toán' }, { status: 500 });
  }
}
