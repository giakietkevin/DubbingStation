import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ authenticated: false, credits: null });
    }

    const email = session.user.email.toLowerCase().trim();
    const isAdmin = (session.user as any).role === 'ADMIN' || email === 'admin@dubbingstation.com' || email === 'admin';

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { id: (session.user as any).id },
        ],
      },
      include: {
        wallet: true,
      },
    });

    if (!user) {
      return NextResponse.json({ authenticated: false, credits: null });
    }

    let wallet = user.wallet;
    if (!wallet) {
      wallet = await prisma.creditWallet.create({
        data: {
          userId: user.id,
          balance: isAdmin ? 9999999 : 50000,
          totalEarned: isAdmin ? 9999999 : 50000,
          totalConsumed: 0,
        },
      });
    }

    return NextResponse.json({
      authenticated: true,
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      credits: wallet.balance,
      totalConsumed: wallet.totalConsumed,
    });
  } catch (error: any) {
    console.error('Error fetching user credits:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
