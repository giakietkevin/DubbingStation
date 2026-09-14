import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { billingPlans } from '@/lib/billing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/payments/stripe/checkout
 * Tạo Stripe Checkout Session cho thanh toán quốc tế bằng thẻ tín dụng (Visa, Mastercard, AMEX)
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Vui lòng đăng nhập để tiếp tục thanh toán.' }, { status: 401 });
    }

    const body = (await req.json()) as {
      planId?: string;
      billingCycle?: 'monthly' | 'annual';
      promoCode?: string;
    };

    const planId = body.planId?.toLowerCase() || '';
    const billingCycle = body.billingCycle === 'annual' ? 'annual' : 'monthly';
    const plan = billingPlans[planId];

    if (!plan || planId === 'free') {
      return NextResponse.json({ error: 'Gói thanh toán không hợp lệ.' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { wallet: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'Không tìm thấy thông tin tài khoản người dùng.' }, { status: 404 });
    }

    // Tính toán số tiền USD
    const discount = body.promoCode?.toUpperCase() === 'LAUNCH50' ? 0.5 : 0;
    const baseMonthly = plan.priceUSD * (1 - discount);
    const annualMultiplier = billingCycle === 'annual' ? 0.7 * 12 : 1.0;
    const finalUsdPrice = Number((baseMonthly * annualMultiplier).toFixed(2));
    const amountInCents = Math.round(finalUsdPrice * 100);
    const amountVnd = Math.round((finalUsdPrice * 25500) / 1000) * 1000;

    // Tạo bản ghi đơn hàng PENDING trong CSDL
    const userTag = (user.email || user.id).split('@')[0].toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10) || 'USER';
    const orderCode = `STRIPE_${planId.toUpperCase()}_${userTag}_${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    const order = await prisma.paymentOrder.create({
      data: {
        userId: user.id,
        planId,
        billingCycle,
        amountVnd,
        credits: plan.credits,
        transferContent: orderCode,
        status: 'PENDING',
      },
    });

    const origin =
      req.headers.get('origin') ||
      req.headers.get('x-forwarded-host') ||
      process.env.NEXTAUTH_URL ||
      'http://localhost:3000';
    const normalizedOrigin = origin.startsWith('http') ? origin : `https://${origin}`;

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

    // Nếu chưa cấu hình Stripe Secret Key trong môi trường
    if (!stripeSecretKey || stripeSecretKey.trim() === '') {
      return NextResponse.json({
        success: true,
        simulated: true,
        orderId: order.id,
        amountUsd: finalUsdPrice,
        credits: plan.credits,
        message:
          'Chưa cấu hình STRIPE_SECRET_KEY trong file .env. Đơn hàng đã được tạo sẵn trong hệ thống (ID: ' +
          order.id +
          '). Vui lòng bổ sung STRIPE_SECRET_KEY để chuyển hướng đến cổng thanh toán Stripe thực tế.',
      });
    }

    // Gọi Stripe REST API tạo Checkout Session
    const stripeParams = new URLSearchParams();
    stripeParams.append('payment_method_types[0]', 'card');
    stripeParams.append('mode', 'payment');
    if (user.email) {
      stripeParams.append('customer_email', user.email);
    }
    stripeParams.append('client_reference_id', order.id);
    stripeParams.append('success_url', `${normalizedOrigin}/dashboard/billing?payment=success&orderId=${order.id}&session_id={CHECKOUT_SESSION_ID}`);
    stripeParams.append('cancel_url', `${normalizedOrigin}/dashboard/billing?payment=cancelled&orderId=${order.id}`);
    stripeParams.append('line_items[0][price_data][currency]', 'usd');
    stripeParams.append(
      'line_items[0][price_data][product_data][name]',
      `DubbingStation ${plan.name} (${billingCycle === 'annual' ? 'Gói 1 Năm -30%' : 'Gói 1 Tháng'})`
    );
    stripeParams.append(
      'line_items[0][price_data][product_data][description]',
      `Nạp ngay +${plan.credits.toLocaleString('vi-VN')} Unified Credits vào ví tài khoản.`
    );
    stripeParams.append('line_items[0][price_data][unit_amount]', String(amountInCents));
    stripeParams.append('line_items[0][quantity]', '1');
    stripeParams.append('metadata[orderId]', order.id);
    stripeParams.append('metadata[userId]', user.id);
    stripeParams.append('metadata[planId]', planId);
    stripeParams.append('metadata[credits]', String(plan.credits));

    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: stripeParams.toString(),
    });

    if (!stripeRes.ok) {
      const errorText = await stripeRes.text();
      console.error('[Stripe Session Create Error]:', errorText);
      return NextResponse.json(
        { error: 'Không thể khởi tạo phiên thanh toán Stripe: ' + errorText.slice(0, 150) },
        { status: 502 }
      );
    }

    const stripeData = (await stripeRes.json()) as { id: string; url: string };

    // Cập nhật session ID vào đơn hàng
    await prisma.paymentOrder.update({
      where: { id: order.id },
      data: { providerTransactionId: stripeData.id },
    });

    return NextResponse.json({
      success: true,
      url: stripeData.url,
      sessionId: stripeData.id,
      orderId: order.id,
    });
  } catch (error: any) {
    console.error('[Stripe Checkout Error]:', error);
    return NextResponse.json(
      { error: error?.message || 'Lỗi xử lý tạo đơn thanh toán Stripe.' },
      { status: 500 }
    );
  }
}
