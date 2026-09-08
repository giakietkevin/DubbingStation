import bcrypt from 'bcryptjs';
import { prisma } from './prisma';

export const ADMIN_CREDENTIALS = {
  username: 'admin',
  email: 'admin@dubbingstation.com',
  password: 'Giakiet@123',
  role: 'ADMIN' as const,
};

/**
 * Đảm bảo tài khoản Admin duy nhất luôn tồn tại trong CSDL SQLite
 * với thông tin chính xác: tk: admin / admin@dubbingstation.com, mk: Giakiet@123, role: ADMIN
 */
export async function ensureAdminUserExists() {
  try {
    const passwordHash = await bcrypt.hash(ADMIN_CREDENTIALS.password, 12);

    // Tìm kiếm xem tài khoản admin đã có trong CSDL chưa
    const existingAdmin = await prisma.user.findFirst({
      where: {
        OR: [
          { email: ADMIN_CREDENTIALS.email },
          { email: ADMIN_CREDENTIALS.username },
        ],
      },
      include: {
        wallet: true,
      },
    });

    if (!existingAdmin) {
      // Tạo mới tài khoản Admin với quyền tối cao
      await prisma.user.create({
        data: {
          name: 'Quản Trị Viên (Admin)',
          email: ADMIN_CREDENTIALS.email,
          passwordHash,
          role: 'ADMIN',
          emailVerified: new Date(), // Admin luôn được kích hoạt sẵn
          wallet: {
            create: {
              balance: 9999999, // Hạn mức credits vô hạn cho Admin
              totalEarned: 9999999,
              totalConsumed: 0,
              transactions: {
                create: {
                  amount: 9999999,
                  balanceAfter: 9999999,
                  type: 'ADMIN_ADJUSTMENT',
                  description: 'Khởi tạo tài khoản Quản trị viên hệ thống',
                },
              },
            },
          },
          subscription: {
            create: {
              tier: 'PRO',
              status: 'ACTIVE',
              currentPeriodStart: new Date(),
              currentPeriodEnd: new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000), // 10 năm
            },
          },
        },
      });
      console.log('✅ [ADMIN SYSTEM] Đã tự động khởi tạo tài khoản Admin duy nhất trong CSDL (tk: admin, role: ADMIN)');
    } else {
      // Đảm bảo mật khẩu và role luôn cập nhật chính xác
      const isPasswordSame = await bcrypt.compare(ADMIN_CREDENTIALS.password, existingAdmin.passwordHash || '');
      if (!isPasswordSame || existingAdmin.role !== 'ADMIN' || !existingAdmin.emailVerified) {
        await prisma.user.update({
          where: { id: existingAdmin.id },
          data: {
            role: 'ADMIN',
            passwordHash,
            emailVerified: existingAdmin.emailVerified || new Date(),
          },
        });
        console.log('✅ [ADMIN SYSTEM] Đã cập nhật role ADMIN và mật khẩu cho tài khoản Admin trong CSDL');
      }
    }
  } catch (error) {
    console.error('Lỗi khi kiểm tra tài khoản admin:', error);
  }
}
