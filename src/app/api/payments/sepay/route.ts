import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

function authorized(req: Request): boolean {
  const configured = process.env.SEPAY_WEBHOOK_API_KEY;
  if (!configured) return false;
  const apiKey = req.headers.get('x-sepay-api-key');
  const authorization = req.headers.get('authorization');
  return apiKey === configured || authorization === `Apikey ${configured}`;
}

export async function POST(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: 'Webhook không được ủy quyền.' }, { status: 401 });

  const payload = await req.json() as {
    id?: string | number;
    transferType?: string;
    transferAmount?: number | string;
    content?: string;
    description?: string;
  };
  if (payload.transferType && payload.transferType.toLowerCase() !== 'in') {
    return NextResponse.json({ ignored: true, reason: 'Không phải giao dịch tiền vào.' });
  }

  const providerTransactionId = String(payload.id || '').trim();
  const content = String(payload.content || payload.description || '').toUpperCase();
  const amount = Math.round(Number(payload.transferAmount || 0));
  if (!providerTransactionId || !content || !Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: 'Payload giao dịch không hợp lệ.' }, { status: 400 });
  }

  const existing = await prisma.paymentOrder.findUnique({ where: { providerTransactionId } });
  if (existing) return NextResponse.json({ success: true, status: existing.status, duplicate: true });

  const order = await prisma.paymentOrder.findFirst({
    where: { status: 'PENDING', amountVnd: amount, transferContent: { equals: content } },
  });
  if (!order) return NextResponse.json({ error: 'Không tìm thấy đơn thanh toán phù hợp.' }, { status: 404 });

  const paid = await prisma.$transaction(async (tx) => {
    const current = await tx.paymentOrder.updateMany({
      where: { id: order.id, status: 'PENDING' },
      data: { status: 'PAID', providerTransactionId, paidAt: new Date() },
    });
    if (current.count !== 1) return false;

    const wallet = await tx.creditWallet.findUnique({ where: { userId: order.userId } });
    if (!wallet) throw new Error('Không tìm thấy ví Credits.');
    const newBalance = wallet.balance + order.credits;
    await tx.creditWallet.update({
      where: { id: wallet.id },
      data: {
        balance: newBalance,
        totalEarned: wallet.totalEarned + order.credits,
        transactions: {
          create: {
            amount: order.credits,
            balanceAfter: newBalance,
            type: 'BANK_TRANSFER_TOPUP',
            description: `Nạp ${order.planId.toUpperCase()} qua chuyển khoản (${providerTransactionId})`,
          },
        },
      },
    });
    return true;
  });

  return NextResponse.json({ success: true, paid });
}