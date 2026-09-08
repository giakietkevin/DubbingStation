import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyOtp } from '@/lib/otp';

export async function POST(req: Request) {
  try {
    const { email, code } = await req.json();

    if (!email || !code) {
      return NextResponse.json(
        { error: 'Vui lòng cung cấp đầy đủ email và mã OTP' },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanCode = code.toString().trim();

    // Xác thực mã OTP trong CSDL
    const result = await verifyOtp(cleanEmail, cleanCode);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Mã OTP không hợp lệ' },
        { status: 400 }
      );
    }

    // Lấy thông tin user sau khi đã kích hoạt
    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        emailVerified: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Kích hoạt tài khoản thành công! Bạn có thể đăng nhập ngay.',
      user,
    });
  } catch (error: any) {
    console.error('Lỗi khi xác thực OTP:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi kiểm tra mã OTP. Vui lòng thử lại.' },
      { status: 500 }
    );
  }
}
