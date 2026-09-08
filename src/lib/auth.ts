import { NextAuthOptions } from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma';
import { ensureAdminUserExists, ADMIN_CREDENTIALS } from './adminSeed';
import { createAndSaveOtp } from './otp';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
    newUser: '/dashboard?welcome=true',
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Tài khoản / Email', type: 'text' },
        password: { label: 'Mật khẩu', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Vui lòng nhập đầy đủ tài khoản/email và mật khẩu');
        }

        const rawInput = credentials.email.trim();
        const lowerInput = rawInput.toLowerCase();

        // 1. KIỂM TRA ĐĂNG NHẬP VỚI TƯ CÁCH ADMIN DUY NHẤT:
        // Tài khoản: admin hoặc admin@dubbingstation.com, Mật khẩu: Giakiet@123
        const isAdminAttempt =
          lowerInput === ADMIN_CREDENTIALS.username ||
          lowerInput === ADMIN_CREDENTIALS.email;

        if (isAdminAttempt) {
          if (credentials.password !== ADMIN_CREDENTIALS.password) {
            throw new Error('Tài khoản hoặc mật khẩu Quản trị viên không chính xác');
          }

          // Đảm bảo dữ liệu Admin được lưu trữ đồng bộ trong CSDL SQLite
          await ensureAdminUserExists();

          const adminUser = await prisma.user.findFirst({
            where: {
              OR: [
                { email: ADMIN_CREDENTIALS.email },
                { email: ADMIN_CREDENTIALS.username },
              ],
            },
          });

          if (!adminUser) {
            throw new Error('Lỗi khởi tạo tài khoản quản trị viên');
          }

          return {
            id: adminUser.id,
            name: adminUser.name || 'Quản Trị Viên (Admin)',
            email: adminUser.email,
            image: adminUser.image,
            role: 'ADMIN', // CHỈ DUY NHẤT TÀI KHOẢN NÀY ĐẠT ROLE ADMIN
          };
        }

        // 2. KIỂM TRA ĐĂNG NHẬP TÀI KHOẢN NGƯỜI DÙNG THÔNG THƯỜNG
        const user = await prisma.user.findUnique({
          where: { email: lowerInput },
          include: {
            wallet: true,
            subscription: true,
          },
        });

        if (!user || !user.passwordHash) {
          throw new Error('Email hoặc mật khẩu không chính xác');
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );

        if (!isPasswordValid) {
          throw new Error('Email hoặc mật khẩu không chính xác');
        }

        // 3. KIỂM TRA KÍCH HOẠT TÀI KHOẢN BẰNG MÃ OTP
        if (!user.emailVerified) {
          // Tự động tạo và gửi mã OTP kích hoạt mới vào CSDL
          try {
            await createAndSaveOtp(user.email as string, 10);
          } catch (err) {
            console.error('Lỗi khi tự động gửi OTP lúc đăng nhập:', err);
          }

          // Trả về thông báo kèm email để giao diện Client tự động chuyển sang trang xác thực OTP
          throw new Error(`CHUA_KICH_HOAT_OTP:${user.email}`);
        }

        // Đảm bảo không có tài khoản nào khác có thể giả mạo quyền ADMIN
        const verifiedRole = user.role === 'ADMIN' ? 'FREE_USER' : user.role;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: verifiedRole,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;

        // Lấy số dư ví realtime từ CSDL SQLite
        try {
          const wallet = await prisma.creditWallet.findUnique({
            where: { userId: token.id as string },
            select: { balance: true },
          });

          (session.user as any).credits = wallet?.balance ?? 50000;
        } catch (err) {
          (session.user as any).credits = (token.role === 'ADMIN') ? 9999999 : 50000;
        }
      }
      return session;
    },
  },
  events: {
    // Tự động nạp 50.000 credits cho tài khoản OAuth mới (Google)
    async createUser({ user }) {
      await prisma.creditWallet.create({
        data: {
          userId: user.id,
          balance: 50000,
          totalEarned: 50000,
          transactions: {
            create: {
              amount: 50000,
              balanceAfter: 50000,
              type: 'FREE_ONBOARDING',
              description: 'Tặng 50.000 Credits trải nghiệm khi đăng ký tài khoản mới',
            },
          },
        },
      });

      await prisma.subscription.create({
        data: {
          userId: user.id,
          tier: 'FREE',
          status: 'ACTIVE',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 năm
        },
      });
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
