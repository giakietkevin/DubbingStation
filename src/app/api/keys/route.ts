import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

/**
 * GET /api/keys
 * Lấy danh sách API Keys của người dùng hiện tại
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        apiKeys: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Người dùng không tồn tại' }, { status: 404 });
    }

    return NextResponse.json({
      keys: user.apiKeys.map((k) => ({
        id: k.id,
        name: k.name,
        maskedKey: k.maskedKey,
        isActive: k.isActive,
        lastUsedAt: k.lastUsedAt,
        createdAt: k.createdAt,
      })),
    });
  } catch (error) {
    console.error('Fetch API Keys Error:', error);
    return NextResponse.json({ error: 'Lỗi tải danh sách API Keys' }, { status: 500 });
  }
}

/**
 * POST /api/keys
 * Tạo mới một API Key cho người dùng
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { name = 'Production API Key' } = body;

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'Người dùng không tồn tại' }, { status: 404 });
    }

    // Sinh khóa bí mật ngẫu nhiên: ds_live_32 ký tự hex
    const randomHex = crypto.randomBytes(16).toString('hex');
    const secretKey = `ds_live_${randomHex}`;
    const maskedKey = `ds_live_${randomHex.slice(0, 4)}••••••••${randomHex.slice(-4)}`;

    const newApiKey = await prisma.apiKey.create({
      data: {
        userId: user.id,
        name: name.trim() || 'Production API Key',
        keyHash: secretKey,
        maskedKey: maskedKey,
      },
    });

    return NextResponse.json({
      success: true,
      apiKey: {
        id: newApiKey.id,
        name: newApiKey.name,
        secretKey: secretKey, // Chỉ trả về 1 lần duy nhất khi tạo
        maskedKey: maskedKey,
        createdAt: newApiKey.createdAt,
      },
    });
  } catch (error) {
    console.error('Create API Key Error:', error);
    return NextResponse.json({ error: 'Lỗi tạo mới API Key' }, { status: 500 });
  }
}

/**
 * DELETE /api/keys
 * Thu hồi / Xóa bỏ API Key
 */
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const keyId = searchParams.get('id');

    if (!keyId) {
      return NextResponse.json({ error: 'Thiếu key ID' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'Người dùng không tồn tại' }, { status: 404 });
    }

    await prisma.apiKey.deleteMany({
      where: {
        id: keyId,
        userId: user.id,
      },
    });

    return NextResponse.json({ success: true, message: 'Đã thu hồi API Key thành công' });
  } catch (error) {
    console.error('Delete API Key Error:', error);
    return NextResponse.json({ error: 'Lỗi thu hồi API Key' }, { status: 500 });
  }
}
