import React from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export const metadata = {
  title: 'Chính Sách Hoàn Tiền (Refund Policy)',
  description: 'Chính sách hoàn tiền và bồi hoàn Credits minh bạch, bảo vệ quyền lợi người dùng của DubbingStation AI Studio.',
};

export default function RefundPage() {
  return (
    <div className="min-h-screen bg-canvas-base flex flex-col text-on-surface">
      <Header />
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-12 lg:py-16">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-text-muted text-body-xs mb-6">
          <Link href="/" className="hover:text-primary transition-colors">Trang chủ</Link>
          <span>/</span>
          <span className="text-on-surface font-semibold">Chính sách hoàn tiền</span>
        </div>

        {/* Header */}
        <div className="space-y-3 mb-10 pb-8 border-b border-border-glass">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary-container/20 text-secondary text-label-sm font-bold">
            <span className="material-symbols-outlined text-[16px]">currency_exchange</span>
            <span>Cam Kết Bảo Vệ Quyền Lợi Khách Hàng</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg font-extrabold text-on-surface">
            Chính Sách Hoàn Tiền (Refund Policy)
          </h1>
          <p className="text-body-md text-text-secondary">
            DubbingStation luôn cam kết mang lại sự hài lòng tối đa cho khách hàng khi sử dụng các dịch vụ tổng hợp giọng nói và lồng tiếng video AI.
          </p>
        </div>

        {/* Content */}
        <div className="space-y-8 text-body-md text-text-secondary leading-relaxed">
          <section className="space-y-3">
            <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface flex items-center gap-2">
              <span className="text-primary-container font-mono">1.</span>
              Điều Kiện Áp Dụng Hoàn Tiền
            </h2>
            <p>
              Khách hàng được quyền yêu cầu hoàn tiền trong các trường hợp sau:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-body-sm">
              <li><strong>Lỗi kỹ thuật hệ thống:</strong> Đã trừ Credits nhưng không tạo được tệp âm thanh hoặc tệp video bị lỗi hỏng do máy chủ DubbingStation.</li>
              <li><strong>Giao dịch thanh toán trùng lặp:</strong> Do sự cố đường truyền ngân hàng dẫn đến việc tài khoản bị trừ tiền 2 lần cho cùng một gói cước.</li>
              <li><strong>Chưa sử dụng Credits:</strong> Bạn vừa nâng cấp gói cước trong vòng <strong>7 ngày</strong> và chưa tiêu thụ quá 10% số Credits của gói cước đó.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface flex items-center gap-2">
              <span className="text-primary-container font-mono">2.</span>
              Cơ Chế Bồi Hoàn Credits Tự Động
            </h2>
            <div className="p-4 rounded-xl bg-surface-card border border-border-glass text-text-primary text-body-sm flex items-start gap-3">
              <span className="material-symbols-outlined text-signal-success text-[20px] shrink-0 mt-0.5">verified_user</span>
              <div>
                Nếu một tác vụ (TTS, Video Dubbing hoặc Whisper STT) bị gián đoạn hoặc thất bại trong quá trình xử lý, hệ thống giao dịch nguyên tử (Atomic Database Transaction) sẽ <strong>tự động hoàn lại 100% số Credits</strong> đã tạm giữ vào ví của bạn mà không cần phải gửi yêu cầu thủ công.
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface flex items-center gap-2">
              <span className="text-primary-container font-mono">3.</span>
              Quy Trình & Thời Gian Xử Lý Hoàn Tiền
            </h2>
            <p>
              Để yêu cầu hoàn tiền, vui lòng gửi email tới <strong className="text-primary-container">billing@dubbingstation.com</strong> kèm theo:
            </p>
            <ol className="list-decimal pl-6 space-y-2 text-body-sm">
              <li>Địa chỉ email đăng ký tài khoản DubbingStation.</li>
              <li>Mã giao dịch chuyển khoản VietQR hoặc biên lai thanh toán.</li>
              <li>Mô tả ngắn gọn lý do yêu cầu hoàn tiền.</li>
            </ol>
            <p>
              Bộ phận Chăm sóc khách hàng sẽ tiếp nhận và xử lý hoàn tiền về tài khoản ngân hàng của bạn trong vòng <strong>24 - 48 giờ làm việc</strong>.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
