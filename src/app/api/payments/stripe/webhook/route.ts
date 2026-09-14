import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Xác thực chữ ký Stripe Webhook chuẩn HMAC-SHA256
 */
function verifyStripeSignature(rawBody: string, signatureHeader: string | null, secret: string): boolean {
  if (!signatureHeader || !secret) return false;

  try {
    const parts = signatureHeader.split(',');
    let timestamp = '';
    let signature = '';

    for (const part of parts) {
      const [key, val] = part.trim().split('=');
      if (key === 't') timestamp = val;
      if (key === 'v1') signature = val;
    }

    if (!timestamp || !signature) return false;

    // Kiểm tra độ trễ (tránh replay attacks quá 15 phút)
    const nowSec = Math.floor(Date.now() / 1000);
    const eventSec = parseInt(timestamp, 10);
    if (Math.abs(nowSec - eventSec) > 900) {
      return false;
    }

    const signedPayload = `${timestamp}.${rawBody}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(signedPayload, 'utf8')
      .digest('hex');

    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  } catch (err) {
    console.error('[Stripe Webhook Signature Verification Error]:', err);
    return false;
  }
}

/**
 * POST /api/payments/stripe/webhook
 * Lắng nghe sự kiện thanh toán thành công từ Stripe Checkout để tự động cộng Credits
 */
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signatureHeader = req.headers.get('stripe-signature');
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    // Nếu đã cấu hình webhook secret, kiểm tra chữ ký bảo mật
    if (webhookSecret && webhookSecret.trim() !== '') {
      const isValid = verifyStripeSignature(rawBody, signatureHeader, webhookSecret);
      if (!isValid) {
        console.warn('[Stripe Webhook] Chữ ký stripe-signature không hợp lệ.');
        return NextResponse.json({ error: 'Chữ ký webhook không hợp lệ.' }, { status: 400 });
      }
    }

    const event = JSON.parse(rawBody) as {
      type: string;
      data: {
        object: {
          id: string;
          client_reference_id?: string;
          metadata?: Record<string, string>;
          payment_status?: string;
          amount_total?: number;
          currency?: string;
        };
      };
    };

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const orderId = session.client_reference_id || session.metadata?.orderId;
      const providerTransactionId = session.id;

      if (!orderId && !providerTransactionId) {
        return NextResponse.json({ error: 'Thiếu thông tin nhận diện đơn hàng.' }, { status: 400 });
      }

      // Tìm đơn hàng tương ứng trong CSDL
      const order = await prisma.paymentOrder.findFirst({
        where: {
          OR: [
            ...(orderId ? [{ id: orderId }] : []),
            { providerTransactionId },
          ],
        },
      });

      if (!order) {
        console.warn(`[Stripe Webhook] Không tìm thấy đơn hàng tương ứng với sessionId: ${providerTransactionId}`);
        return NextResponse.json({ error: 'Không tìm thấy đơn hàng.' }, { status: 404 });
      }

      // Nếu đơn đã được xử lý thanh toán trước đó
      if (order.status === 'PAID') {
        return NextResponse.json({ success: true, message: 'Đơn hàng đã được thanh toán trước đó.' });
      }

      const periodEndDate = new Date();
      periodEndDate.setMonth(periodEndDate.getMonth() + (order.billingCycle === 'annual' ? 12 : 1));

      // Thực hiện Prisma Atomic Transaction: cập nhật đơn hàng + cộng credits + nâng cấp subscription
      await prisma.$transaction(async (tx) => {
        // 1. Cập nhật PaymentOrder thành PAID
        await tx.paymentOrder.update({
          where: { id: order.id },
          data: {
            status: 'PAID',
            providerTransactionId,
            paidAt: new Date(),
          },
        });

        // 2. Tìm và cập nhật ví Credits
        const wallet = await tx.creditWallet.findUnique({
          where: { userId: order.userId },
        });

        if (!wallet) {
          throw new Error(`Không tìm thấy ví credits của userId: ${order.userId}`);
        }

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
                type: 'SUBSCRIPTION_TOPUP',
                description: `Thanh toán thành công qua Stripe Checkout (+${order.credits.toLocaleString('vi-VN')} Credits, gói ${order.planId.toUpperCase()})`,
              },
            },
          },
        });

        // 3. Kích hoạt hoặc gia hạn Subscription
        await tx.subscription.upsert({
          where: { userId: order.userId },
          update: {
            tier: order.planId.toUpperCase(),
            status: 'ACTIVE',
            currentPeriodStart: new Date(),
            currentPeriodEnd: periodEndDate,
          },
          create: {
            userId: order.userId,
            tier: order.planId.toUpperCase(),
            status: 'ACTIVE',
            currentPeriodStart: new Date(),
            currentPeriodEnd: periodEndDate,
          },
        });
      });

      console.log(`[Stripe Webhook] Nạp thành công +${order.credits} Credits cho user ${order.userId} qua đơn ${order.id}`);
      return NextResponse.json({ success: true, orderId: order.id });
    }

    return NextResponse.json({ received: true, ignored: true, eventType: event.type });
  } catch (error: any) {
    console.error('[Stripe Webhook Processing Error]:', error);
    return NextResponse.json(
      { error: error?.message || 'Lỗi khi xử lý Stripe Webhook.' },
      { status: 500 }
    );
  }
}
