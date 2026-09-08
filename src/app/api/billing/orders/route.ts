import crypto from 'crypto';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { billingPlans, calculateBillingAmount } from '@/lib/billing';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Vui lòng đăng nhập.' }, { status: 401 });

  const body = await req.json() as { planId?: string; billingCycle?: string; promoCode?: string };
  const planId = body.planId?.toLowerCase() || '';
  const billingCycle = body.billingCycle === 'annual' ? 'annual' : 'monthly';
  const plan = billingPlans[planId];
  if (!plan || planId === 'free') return NextResponse.json({ error: 'Gói thanh toán không hợp lệ.' }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: 'Người dùng không tồn tại.' }, { status: 404 });

  const amountVnd = calculateBillingAmount(planId, billingCycle, body.promoCode);
  const userTag = (user.email || user.id).split('@')[0].toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10) || 'USER';
  const transferContent = `DUBBING ${planId.toUpperCase()} ${userTag} ${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const order = await prisma.paymentOrder.create({
    data: { userId: user.id, planId, billingCycle, amountVnd, credits: plan.credits, transferContent },
  });

  return NextResponse.json({
    order: { id: order.id, planId, amountVnd, credits: plan.credits, transferContent, status: order.status },
    bank: {
      bankId: process.env.PAYMENT_BANK_ID || 'MB',
      accountNo: process.env.PAYMENT_ACCOUNT_NO || '0905884303',
      accountName: process.env.PAYMENT_ACCOUNT_NAME || 'VO PHAM GIA KIET',
    },
  });
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Vui lòng đăng nhập.' }, { status: 401 });
  const orderId = new URL(req.url).searchParams.get('orderId');
  if (!orderId) return NextResponse.json({ error: 'Thiếu orderId.' }, { status: 400 });

  const order = await prisma.paymentOrder.findFirst({
    where: { id: orderId, user: { email: session.user.email } },
    select: { id: true, status: true, credits: true, amountVnd: true, paidAt: true },
  });
  if (!order) return NextResponse.json({ error: 'Không tìm thấy đơn thanh toán.' }, { status: 404 });
  return NextResponse.json({ order });
}