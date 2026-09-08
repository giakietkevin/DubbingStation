import { prisma } from './prisma';
import { sendOtpEmail, isSmtpConfigured } from './email';

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

export interface CreateOtpResult {
  code: string;
  sentRealEmail: boolean;
  error?: string;
}

/**
 * Lưu mã OTP vào bảng VerificationToken trong CSDL SQLite Prisma
 * và gửi email thật tới hòm thư người dùng qua Gmail SMTP (nếu đã cấu hình)
 */
export async function createAndSaveOtp(
  identifier: string,
  expiresInMinutes = 10,
  userName?: string
): Promise<string> {
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

  // Lưu mã OTP mới vào CSDL SQLite
  await prisma.verificationToken.create({
    data: {
      identifier,
      token: code,
      expires,
    },
  });

  // Log mã OTP ra console server
  console.log(`\n======================================================`);
  console.log(`🔑 [DUBBINGSTATION OTP SYSTEM]`);
  console.log(`📨 Email người nhận: ${identifier}`);
  console.log(`🔢 MÃ OTP 6 SỐ: [ ${code} ]`);
  console.log(`⏳ Thời hạn hiệu lực: ${expiresInMinutes} phút`);
  console.log(`📡 Gmail SMTP Configured: ${isSmtpConfigured() ? 'CÓ (Đang gửi mail thật)' : 'CHƯA (Chế độ Dev/Console)'}`);
  console.log(`======================================================\n`);

  // Gửi email thật qua Gmail SMTP bất đồng bộ
  sendOtpEmail(identifier, code, userName).catch((err) => {
    console.error('Lỗi khi gửi email OTP:', err);
  });

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
    return { success: false, error: 'Mã OTP không chính xác. Vui lòng kiểm tra lại trong hộp thư.' };
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
