import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { createAndSaveOtp } from '@/lib/otp';

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Vui lòng cung cấp đầy đủ email và mật khẩu' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Mật khẩu phải có ít nhất 6 ký tự' },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();

    // Kiểm tra email đã tồn tại
    const existingUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email này đã được đăng ký tài khoản trong hệ thống' },
        { status: 409 }
      );
    }

    // Hash mật khẩu
    const passwordHash = await bcrypt.hash(password, 12);

    // Tạo user (chưa kích hoạt emailVerified: null) và khởi tạo ngay 50.000 Credits Free Onboarding
    const newUser = await prisma.user.create({
      data: {
        name: name || cleanEmail.split('@')[0],
        email: cleanEmail,
        passwordHash,
        role: 'FREE_USER',
        language: 'vi',
        emailVerified: null, // Chưa kích hoạt cho đến khi xác thực OTP
        wallet: {
          create: {
            balance: 50000,
            totalEarned: 50000,
            totalConsumed: 0,
            transactions: {
              create: {
                amount: 50000,
                balanceAfter: 50000,
                type: 'FREE_ONBOARDING',
                description: 'Tặng 50.000 Credits trải nghiệm khi đăng ký tài khoản mới',
              },
            },
          },
        },
        subscription: {
          create: {
            tier: 'FREE',
            status: 'ACTIVE',
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 năm
          },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        emailVerified: true,
      },
    });

    // Tự động sinh mã OTP và lưu vào CSDL
    const otpCode = await createAndSaveOtp(cleanEmail, 10);

    return NextResponse.json(
      {
        message: 'Đăng ký thành công! Vui lòng nhập mã OTP để kích hoạt tài khoản.',
        requireOtp: true,
        email: cleanEmail,
        previewOtp: otpCode,
        user: newUser,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Registration Error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi trong quá trình đăng ký. Vui lòng thử lại sau.' },
      { status: 500 }
    );
  }
}
