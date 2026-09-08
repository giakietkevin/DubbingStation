import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createAndSaveOtp } from '@/lib/otp';
import { ensureAdminUserExists } from '@/lib/adminSeed';

/**
 * Middleware kiểm tra quyền ADMIN
 */
async function checkAdminAuth() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || (session.user as any).role !== 'ADMIN') {
    return false;
  }
  return session.user;
}

/**
 * GET /api/admin/users - Lấy danh sách toàn bộ người dùng, số liệu thống kê và mã OTP
 */
export async function GET(req: Request) {
  try {
    const adminUser = await checkAdminAuth();
    if (!adminUser) {
      return NextResponse.json(
        { error: 'Truy cập bị từ chối. Chỉ tài khoản Admin mới có quyền sử dụng.' },
        { status: 403 }
      );
    }

    // Đảm bảo dữ liệu admin luôn sẵn sàng
    await ensureAdminUserExists();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim() || '';
    const roleFilter = searchParams.get('role') || 'ALL';
    const statusFilter = searchParams.get('status') || 'ALL'; // ALL, ACTIVATED, PENDING_OTP

    const whereClause: any = {};

    if (search) {
      whereClause.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
      ];
    }

    if (roleFilter !== 'ALL') {
      whereClause.role = roleFilter;
    }

    if (statusFilter === 'ACTIVATED') {
      whereClause.emailVerified = { not: null };
    } else if (statusFilter === 'PENDING_OTP') {
      whereClause.emailVerified = null;
    }

    // Truy vấn danh sách người dùng từ SQLite
    const users = await prisma.user.findMany({
      where: whereClause,
      include: {
        wallet: true,
        subscription: true,
        _count: {
          select: {
            audioProjects: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Thống kê số liệu tổng quan KPI
    const totalUsersCount = await prisma.user.count();
    const activatedCount = await prisma.user.count({
      where: { emailVerified: { not: null } },
    });
    const pendingOtpCount = totalUsersCount - activatedCount;

    const wallets = await prisma.creditWallet.findMany({
      select: { balance: true },
    });
    const totalCreditsInCirculation = wallets.reduce((acc, w) => acc + (w.balance || 0), 0);

    const totalProjectsCount = await prisma.audioProject.count();

    // Lấy danh sách các mã OTP đang có hiệu lực trong CSDL
    const recentOtps = await prisma.verificationToken.findMany({
      orderBy: {
        expires: 'desc',
      },
      take: 20,
    });

    return NextResponse.json({
      success: true,
      users,
      metrics: {
        totalUsers: totalUsersCount,
        activatedUsers: activatedCount,
        pendingOtpUsers: pendingOtpCount,
        totalCredits: totalCreditsInCirculation,
        totalProjects: totalProjectsCount,
      },
      recentOtps,
    });
  } catch (error: any) {
    console.error('Admin API GET Error:', error);
    return NextResponse.json(
      { error: 'Lỗi truy xuất CSDL người dùng: ' + error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/users - Cập nhật người dùng: nạp/trừ credits, kích hoạt/hủy kích hoạt, đổi role
 */
export async function PATCH(req: Request) {
  try {
    const adminUser = await checkAdminAuth();
    if (!adminUser) {
      return NextResponse.json(
        { error: 'Truy cập bị từ chối. Chỉ tài khoản Admin mới có quyền thực hiện.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { userId, action } = body;

    if (!userId || !action) {
      return NextResponse.json(
        { error: 'Thiếu tham số userId hoặc action' },
        { status: 400 }
      );
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { wallet: true },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: 'Không tìm thấy người dùng này trong CSDL' },
        { status: 404 }
      );
    }

    // 1. Nạp hoặc điều chỉnh Credits
    if (action === 'adjust_credits') {
      const amount = parseInt(body.amount, 10);
      const reason = body.reason || 'Admin điều chỉnh số dư';

      if (isNaN(amount) || amount === 0) {
        return NextResponse.json(
          { error: 'Số lượng Credits điều chỉnh không hợp lệ' },
          { status: 400 }
        );
      }

      let wallet = targetUser.wallet;
      if (!wallet) {
        wallet = await prisma.creditWallet.create({
          data: {
            userId: targetUser.id,
            balance: 50000,
            totalEarned: 50000,
            totalConsumed: 0,
          },
        });
      }

      const newBalance = Math.max(0, wallet.balance + amount);

      await prisma.creditWallet.update({
        where: { id: wallet.id },
        data: {
          balance: newBalance,
          totalEarned: amount > 0 ? wallet.totalEarned + amount : wallet.totalEarned,
          transactions: {
            create: {
              amount,
              balanceAfter: newBalance,
              type: 'ADMIN_ADJUSTMENT',
              description: reason,
            },
          },
        },
      });

      return NextResponse.json({
        success: true,
        message: `Đã ${amount > 0 ? 'nạp thêm' : 'khấu trừ'} ${Math.abs(amount).toLocaleString('vi-VN')} Credits. Số dư mới: ${newBalance.toLocaleString('vi-VN')}`,
        newBalance,
      });
    }

    // 2. Kích hoạt thủ công hoặc Khóa xác thực OTP
    if (action === 'toggle_activation') {
      const newStatus = !targetUser.emailVerified;
      await prisma.user.update({
        where: { id: targetUser.id },
        data: {
          emailVerified: newStatus ? new Date() : null,
        },
      });

      return NextResponse.json({
        success: true,
        message: newStatus
          ? `Đã kích hoạt tài khoản "${targetUser.name || targetUser.email}" thành công!`
          : `Đã chuyển tài khoản "${targetUser.name || targetUser.email}" về trạng thái Chưa kích hoạt OTP.`,
        isActivated: newStatus,
      });
    }

    // 3. Đổi Role (Phân quyền)
    if (action === 'change_role') {
      const newRole = body.role;
      const allowedRoles = ['FREE_USER', 'PAID_USER', 'API_DEVELOPER'];

      // Không cho phép tài khoản khác đổi thành ADMIN (vì chỉ có 1 nick duy nhất là admin)
      if (newRole === 'ADMIN' && targetUser.email !== 'admin@dubbingstation.com' && targetUser.email !== 'admin') {
        return NextResponse.json(
          { error: 'Hệ thống chỉ cho phép duy nhất 1 tài khoản đăng nhập với quyền ADMIN.' },
          { status: 400 }
        );
      }

      if (!allowedRoles.includes(newRole) && newRole !== 'ADMIN') {
        return NextResponse.json(
          { error: 'Role không hợp lệ. Các role hợp lệ: FREE_USER, PAID_USER, API_DEVELOPER' },
          { status: 400 }
        );
      }

      await prisma.user.update({
        where: { id: targetUser.id },
        data: { role: newRole },
      });

      return NextResponse.json({
        success: true,
        message: `Đã cập nhật vai trò người dùng thành: ${newRole}`,
        newRole,
      });
    }

    // 4. Phát sinh mã OTP mới cho người dùng
    if (action === 'generate_otp') {
      if (!targetUser.email) {
        return NextResponse.json(
          { error: 'Người dùng không có email hợp lệ' },
          { status: 400 }
        );
      }

      const otp = await createAndSaveOtp(targetUser.email, 10);

      return NextResponse.json({
        success: true,
        message: `Đã tạo mã OTP mới: [ ${otp} ] cho ${targetUser.email}`,
        otp,
      });
    }

    return NextResponse.json({ error: 'Action không được hỗ trợ' }, { status: 400 });
  } catch (error: any) {
    console.error('Admin API PATCH Error:', error);
    return NextResponse.json(
      { error: 'Lỗi cập nhật người dùng: ' + error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/users - Xóa tài khoản người dùng
 */
export async function DELETE(req: Request) {
  try {
    const adminUser = await checkAdminAuth();
    if (!adminUser) {
      return NextResponse.json(
        { error: 'Truy cập bị từ chối. Chỉ tài khoản Admin mới có quyền xóa.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'Thiếu userId cần xóa' }, { status: 400 });
    }

    const userToDelete = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!userToDelete) {
      return NextResponse.json({ error: 'Không tìm thấy người dùng' }, { status: 404 });
    }

    // Bảo vệ tuyệt đối: Không cho phép xóa tài khoản Admin
    if (
      userToDelete.role === 'ADMIN' ||
      userToDelete.email === 'admin@dubbingstation.com' ||
      userToDelete.email === 'admin'
    ) {
      return NextResponse.json(
        { error: 'Không thể xóa tài khoản Quản trị viên (Admin) gốc của hệ thống!' },
        { status: 403 }
      );
    }

    // Xóa user (cascade các quan hệ trong SQLite)
    await prisma.user.delete({
      where: { id: userId },
    });

    return NextResponse.json({
      success: true,
      message: `Đã xóa vĩnh viễn tài khoản "${userToDelete.name || userToDelete.email}" khỏi CSDL.`,
    });
  } catch (error: any) {
    console.error('Admin API DELETE Error:', error);
    return NextResponse.json(
      { error: 'Lỗi khi xóa người dùng: ' + error.message },
      { status: 500 }
    );
  }
}
