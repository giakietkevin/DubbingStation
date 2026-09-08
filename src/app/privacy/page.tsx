import React from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export const metadata = {
  title: 'Chính Sách Bảo Mật (Privacy Policy)',
  description: 'Cam kết bảo mật thông tin cá nhân, mẫu giọng nói và tính riêng tư 100% của người dùng tại DubbingStation AI Studio.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-canvas-base flex flex-col text-on-surface">
      <Header />
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-12 lg:py-16">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-text-muted text-body-xs mb-6">
          <Link href="/" className="hover:text-primary transition-colors">Trang chủ</Link>
          <span>/</span>
          <span className="text-on-surface font-semibold">Chính sách bảo mật</span>
        </div>

        {/* Header */}
        <div className="space-y-3 mb-10 pb-8 border-b border-border-glass">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-signal-success/15 text-signal-success text-label-sm font-bold">
            <span className="material-symbols-outlined text-[16px]">lock</span>
            <span>Bảo Mật Chuẩn Mã Hóa Cao Cấp</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg font-extrabold text-on-surface">
            Chính Sách Bảo Mật (Privacy Policy)
          </h1>
          <p className="text-body-md text-text-secondary">
            Tại <strong>DubbingStation</strong>, chúng tôi coi trọng sự riêng tư và bảo mật dữ liệu âm thanh của người dùng là ưu tiên hàng đầu.
          </p>
        </div>

        {/* Content Body */}
        <div className="space-y-8 text-body-md text-text-secondary leading-relaxed">
          <section className="space-y-3">
            <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface flex items-center gap-2">
              <span className="text-primary-container font-mono">1.</span>
              Dữ Liệu Chúng Tôi Thu Thập
            </h2>
            <ul className="list-disc pl-6 space-y-2 text-body-sm">
              <li><strong>Thông tin tài khoản:</strong> Tên hiển thị, địa chỉ email, mật khẩu được mã hóa một chiều bằng thuật toán an toàn (Bcrypt).</li>
              <li><strong>Dữ liệu âm thanh và văn bản:</strong> Các đoạn text bạn nhập để chuyển thành giọng nói (TTS), file phụ đề video (SRT, VTT) và các mẫu âm thanh tải lên để nhân bản giọng đọc.</li>
              <li><strong>Dữ liệu giao dịch nạp Credits:</strong> Lịch sử biến động Credits, thông tin gói cước và mã giao dịch ngân hàng VietQR (chúng tôi không lưu trữ số thẻ ngân hàng hay mã CVV).</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface flex items-center gap-2">
              <span className="text-primary-container font-mono">2.</span>
              Bảo Mật Riêng Tư 100% Cho Bộ 22 Công Cụ Audio WASM
            </h2>
            <div className="p-4 rounded-xl bg-surface-card border border-border-glass text-text-primary text-body-sm flex items-start gap-3">
              <span className="material-symbols-outlined text-primary-container text-[22px] shrink-0 mt-0.5">security</span>
              <div>
                <strong>Xử lý 100% trên thiết bị của bạn (Client-side WebAssembly):</strong> Toàn bộ 22 công cụ xử lý âm thanh (Cắt audio, Tăng âm lượng 300%, Đổi tốc độ, Đảo ngược, Nén tệp...) chạy trực tiếp trong RAM trình duyệt của bạn qua Web Audio API & FFmpeg WebAssembly. Dữ liệu tệp của bạn không bao giờ được tải lên bất kỳ máy chủ nào, đảm bảo tính riêng tư tuyệt đối.
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface flex items-center gap-2">
              <span className="text-primary-container font-mono">3.</span>
              Bảo Vệ Mẫu Giọng Đọc Nhân Bản (Voice Cloning Privacy)
            </h2>
            <p>
              Các tệp thu âm mẫu phục vụ Voice Cloning được lưu trữ trong không gian dữ liệu cách ly (sandbox) và chỉ phục vụ duy nhất mục đích trích xuất đặc trưng âm sắc (F0/Formants DSP) cho tài khoản của chính bạn. Chúng tôi cam kết không chia sẻ, bán hoặc sử dụng mẫu giọng của bạn cho bên thứ ba.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface flex items-center gap-2">
              <span className="text-primary-container font-mono">4.</span>
              Quyền Kiểm Soát & Xóa Dữ Liệu Của Bạn
            </h2>
            <p>
              Bạn có toàn quyền xóa các dự án âm thanh đã tạo, thu hồi API Key lập trình viên, hoặc yêu cầu xóa vĩnh viễn toàn bộ dữ liệu tài khoản khỏi hệ thống của chúng tôi bất cứ lúc nào thông qua trang Cài đặt (`/dashboard/settings`) hoặc email hỗ trợ: <strong className="text-primary-container">privacy@dubbingstation.com</strong>.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
