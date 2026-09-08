import nodemailer from 'nodemailer';

/**
 * Khởi tạo Transporter gửi email qua Gmail SMTP
 */
function getEmailTransporter() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: user.trim(),
      pass: pass.trim().replace(/\s+/g, ''), // Loại bỏ khoảng trắng nếu copy từ Google App Password
    },
  });
}

/**
 * Kiểm tra xem cấu hình Gmail SMTP đã sẵn sàng chưa
 */
export function isSmtpConfigured(): boolean {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
}

/**
 * Gửi email chứa mã OTP kích hoạt tài khoản thật qua Gmail SMTP
 */
export async function sendOtpEmail(
  toEmail: string,
  otpCode: string,
  userName?: string
): Promise<{ success: boolean; sentRealEmail: boolean; error?: string }> {
  const transporter = getEmailTransporter();

  // Nếu chưa cấu hình SMTP_USER và SMTP_PASS trong .env
  if (!transporter) {
    console.warn(`\n⚠️ [GMAIL SMTP CHƯA CẤU HÌNH]`);
    console.warn(`Để gửi email OTP thật tới hộp thư Gmail của người dùng:`);
    console.warn(`1. Mở tệp .env`);
    console.warn(`2. Điền email của bạn vào SMTP_USER="your-email@gmail.com"`);
    console.warn(`3. Điền Mật khẩu ứng dụng 16 ký tự vào SMTP_PASS="xxxx xxxx xxxx xxxx"`);
    console.warn(`(Lấy App Password tại: https://myaccount.google.com/apppasswords)\n`);

    return {
      success: true,
      sentRealEmail: false,
      error: 'SMTP credentials not configured in .env',
    };
  }

  const fromAddress = process.env.SMTP_FROM || `"DubbingStation AI" <${process.env.SMTP_USER}>`;

  // HTML Email Template chuẩn thương hiệu DubbingStation
  const htmlContent = `
  <!DOCTYPE html>
  <html lang="vi">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mã kích hoạt tài khoản DubbingStation</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0b0f19; padding: 40px 15px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" style="max-width: 560px; background-color: #121826; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);">
            <!-- Header with Gradient Border -->
            <tr>
              <td style="height: 4px; background: linear-gradient(90deg, #00f2fe 0%, #4facfe 50%, #8b5cf6 100%);"></td>
            </tr>
            <tr>
              <td style="padding: 36px 32px 20px 32px; text-align: center;">
                <h1 style="margin: 0 0 8px 0; font-size: 26px; font-weight: 800; color: #00f2fe; letter-spacing: -0.5px;">
                  DubbingStation AI
                </h1>
                <p style="margin: 0; font-size: 13px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">
                  Nền Tảng Phòng Thu Giọng Nói & Lồng Tiếng AI
                </p>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding: 10px 32px 30px 32px;">
                <p style="font-size: 16px; line-height: 24px; color: #e2e8f0; margin-bottom: 20px;">
                  Xin chào <strong>${userName || toEmail.split('@')[0]}</strong>,
                </p>
                <p style="font-size: 14px; line-height: 22px; color: #94a3b8; margin-bottom: 28px;">
                  Cảm ơn bạn đã tham gia DubbingStation. Vui lòng sử dụng mã xác thực OTP 6 chữ số dưới đây để kích hoạt tài khoản và nhận ngay <strong style="color: #00f2fe;">+50.000 Credits</strong>:
                </p>

                <!-- OTP Code Display Box -->
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 24px 0;">
                  <tr>
                    <td align="center">
                      <div style="background: rgba(0, 242, 254, 0.08); border: 2px dashed #00f2fe; border-radius: 16px; padding: 20px 30px; display: inline-block;">
                        <span style="font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 900; letter-spacing: 12px; color: #00f2fe; text-shadow: 0 0 16px rgba(0, 242, 254, 0.4); margin-right: -12px;">
                          ${otpCode}
                        </span>
                      </div>
                    </td>
                  </tr>
                </table>

                <p style="font-size: 13px; line-height: 20px; color: #94a3b8; text-align: center; margin: 20px 0 10px 0;">
                  ⏳ Mã xác thực này có hiệu lực trong vòng <strong>10 phút</strong>.
                </p>

                <div style="background: rgba(239, 68, 68, 0.1); border-left: 3px solid #ef4444; border-radius: 8px; padding: 12px 16px; margin: 24px 0 10px 0;">
                  <p style="margin: 0; font-size: 12px; line-height: 18px; color: #fca5a5;">
                    🔒 <strong>Lưu ý bảo mật:</strong> Không chia sẻ mã OTP này cho bất kỳ ai, kể cả nhân viên DubbingStation. Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email.
                  </p>
                </div>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="background-color: #0a0e17; padding: 24px 32px; text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.06);">
                <p style="margin: 0 0 6px 0; font-size: 12px; color: #64748b;">
                  © 2026 DubbingStation AI Studio. Mọi quyền được bảo lưu.
                </p>
                <p style="margin: 0; font-size: 11px; color: #475569;">
                  Email được gửi tự động, vui lòng không trả lời thư này.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;

  try {
    const info = await transporter.sendMail({
      from: fromAddress,
      to: toEmail,
      subject: `[DubbingStation] Mã OTP kích hoạt tài khoản của bạn: ${otpCode}`,
      html: htmlContent,
      text: `Mã OTP kích hoạt tài khoản DubbingStation của bạn là: ${otpCode}. Mã có hiệu lực trong 10 phút. Vui lòng không chia sẻ mã này cho bất kỳ ai.`,
    });

    console.log(`✅ [GMAIL SMTP THÀNH CÔNG] Đã gửi mã OTP [${otpCode}] tới hộp thư thực tế: ${toEmail} (Message ID: ${info.messageId})`);

    return {
      success: true,
      sentRealEmail: true,
    };
  } catch (error: any) {
    console.error(`❌ [GMAIL SMTP LỖI] Không thể gửi email tới ${toEmail}:`, error);
    return {
      success: false,
      sentRealEmail: false,
      error: error.message || 'Lỗi gửi email qua Gmail SMTP',
    };
  }
}
