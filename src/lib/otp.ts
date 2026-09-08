import { prisma } from './prisma';

/**
 * Sinh mã OTP ngẫu nhiên gồm 6 chữ số
 */
export function generateOtpCode(length = 6): string {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  return otp;
}

/**
 * Lưu mã OTP vào bảng VerificationToken trong CSDL SQLite Prisma
 * Mặc định hết hạn sau 10 phút
 */
export async function createAndSaveOtp(identifier: string, expiresInMinutes = 10): Promise<string> {
  const code = generateOtpCode(6);
  const expires = new Date(Date.now() + expiresInMinutes * 60 * 1000);

  // Xóa các mã OTP cũ chưa sử dụng của email này
  try {
    await prisma.verificationToken.deleteMany({
      where: { identifier },
    });
  } catch (err) {
    console.warn('Lỗi khi dọn dẹp mã OTP cũ:', err);
  }

  // Lưu mã OTP mới vào CSDL
  await prisma.verificationToken.create({
    data: {
      identifier,
      token: code,
      expires,
    },
  });

  // Log mã OTP ra console để quản trị viên / lập trình viên dễ dàng kiểm thử
  console.log(`\n======================================================`);
  console.log(`🔑 [DUBBINGSTATION OTP SYSTEM]`);
  console.log(`📨 Gửi mã kích hoạt tới email: ${identifier}`);
  console.log(`🔢 MÃ OTP 6 SỐ: [ ${code} ]`);
  console.log(`⏳ Thời hạn hiệu lực: ${expiresInMinutes} phút (đến ${expires.toLocaleTimeString('vi-VN')})`);
  console.log(`======================================================\n`);

  return code;
}

/**
 * Xác thực mã OTP người dùng nhập vào
 */
export async function verifyOtp(
  identifier: string,
  code: string
): Promise<{ success: boolean; error?: string }> {
  if (!identifier || !code) {
    return { success: false, error: 'Vui lòng cung cấp đầy đủ email và mã OTP' };
  }

  const cleanCode = code.trim();

  // Tìm kiếm mã OTP khớp với email trong CSDL
  const tokenRecord = await prisma.verificationToken.findFirst({
    where: {
      identifier,
      token: cleanCode,
    },
  });

  if (!tokenRecord) {
    return { success: false, error: 'Mã OTP không chính xác. Vui lòng kiểm tra lại.' };
  }

  // Kiểm tra thời hạn hết hạn
  if (tokenRecord.expires < new Date()) {
    // Xóa mã đã hết hạn
    await prisma.verificationToken.deleteMany({
      where: { identifier },
    });
    return { success: false, error: 'Mã OTP đã hết hạn (quá 10 phút). Vui lòng nhấn gửi lại mã mới.' };
  }

  // Mã hợp lệ -> Kích hoạt tài khoản trong CSDL
  await prisma.user.updateMany({
    where: { email: identifier },
    data: {
      emailVerified: new Date(),
    },
  });

  // Xóa mã OTP sau khi sử dụng thành công (One-Time Password)
  await prisma.verificationToken.deleteMany({
    where: { identifier },
  });

  return { success: true };
}
