import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

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

    // Kiểm tra email đã tồn tại
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email này đã được đăng ký tài khoản' },
        { status: 409 }
      );
    }

    // Hash mật khẩu
    const passwordHash = await bcrypt.hash(password, 12);

    // Tạo user và khởi tạo ngay 50.000 Credits Free Onboarding
    const newUser = await prisma.user.create({
      data: {
        name: name || email.split('@')[0],
        email,
        passwordHash,
        role: 'FREE_USER',
        language: 'vi',
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
            currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    return NextResponse.json(
      {
        message: 'Đăng ký tài khoản thành công! Bạn đã nhận được 50.000 Credits.',
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
