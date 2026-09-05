import { NextAuthOptions } from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma';

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
        email: { label: 'Email', type: 'email' },
        password: { label: 'Mật khẩu', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Vui lòng nhập đầy đủ email và mật khẩu');
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
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

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
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

        // Fetch realtime wallet balance
        const wallet = await prisma.creditWallet.findUnique({
          where: { userId: token.id as string },
          select: { balance: true },
        });

        (session.user as any).credits = wallet?.balance ?? 50000;
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

      // Tạo gói đăng ký Free mặc định
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
