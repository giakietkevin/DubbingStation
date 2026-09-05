import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET: Lấy danh sách lịch sử các file âm thanh đã tạo
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        audioProjects: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Không tìm thấy người dùng' }, { status: 404 });
    }

    return NextResponse.json({
      projects: user.audioProjects,
    });
  } catch (error) {
    console.error('Fetch Projects Error:', error);
    return NextResponse.json(
      { error: 'Lỗi khi tải danh sách dự án' },
      { status: 500 }
    );
  }
}

// DELETE: Xóa 1 tệp âm thanh
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    if (!id) {
      return NextResponse.json({ error: 'Thiếu ID tệp cần xóa' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'Không tìm thấy người dùng' }, { status: 404 });
    }

    // Đảm bảo chỉ xóa tệp thuộc sở hữu của chính user đó
    await prisma.audioProject.deleteMany({
      where: {
        id,
        userId: user.id,
      },
    });

    return NextResponse.json({ success: true, message: 'Đã xóa tệp thành công' });
  } catch (error) {
    console.error('Delete Project Error:', error);
    return NextResponse.json(
      { error: 'Lỗi khi xóa tệp' },
      { status: 500 }
    );
  }
}
