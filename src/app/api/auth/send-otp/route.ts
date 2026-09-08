import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createAndSaveOtp } from '@/lib/otp';
import { isSmtpConfigured } from '@/lib/email';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Vui lòng cung cấp địa chỉ email hợp lệ' },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();

    // Kiểm tra user có tồn tại trong CSDL không
    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
      select: { id: true, name: true, email: true, emailVerified: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Không tìm thấy tài khoản với email này trong hệ thống' },
        { status: 404 }
      );
    }

    if (user.emailVerified) {
      return NextResponse.json(
        { message: 'Tài khoản này đã được kích hoạt trước đó', alreadyVerified: true },
        { status: 200 }
      );
    }

    // Sinh mã OTP 6 số, lưu vào CSDL và gửi email thật qua Gmail SMTP
    const otpCode = await createAndSaveOtp(cleanEmail, 10, user.name || undefined);
    const smtpReady = isSmtpConfigured();

    return NextResponse.json({
      success: true,
      message: smtpReady
        ? `Mã OTP đã được gửi tới hộp thư ${cleanEmail}. Vui lòng kiểm tra hộp thư đến hoặc Spam.`
        : `Mã OTP đã được tạo cho email ${cleanEmail}.`,
      email: cleanEmail,
      isSmtpReady: smtpReady,
      previewOtp: !smtpReady ? otpCode : undefined,
    });
  } catch (error: any) {
    console.error('Lỗi khi gửi OTP:', error);
    return NextResponse.json(
      { error: 'Không thể tạo mã OTP lúc này. Vui lòng thử lại sau.' },
      { status: 500 }
    );
  }
}
