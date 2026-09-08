import React from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export const metadata = {
  title: 'Điều Khoản Dịch Vụ (Terms of Service)',
  description: 'Điều khoản sử dụng dịch vụ và chính sách bản quyền âm thanh thương mại của DubbingStation AI Studio.',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-canvas-base flex flex-col text-on-surface">
      <Header />
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-12 lg:py-16">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-text-muted text-body-xs mb-6">
          <Link href="/" className="hover:text-primary transition-colors">Trang chủ</Link>
          <span>/</span>
          <span className="text-on-surface font-semibold">Điều khoản dịch vụ</span>
        </div>

        {/* Title */}
        <div className="space-y-3 mb-10 pb-8 border-b border-border-glass">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-container/15 text-primary-container text-label-sm font-bold">
            <span className="material-symbols-outlined text-[16px]">verified</span>
            <span>Hiệu lực từ 01/01/2026</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg font-extrabold text-on-surface">
            Điều Khoản Dịch Vụ (Terms of Service)
          </h1>
          <p className="text-body-md text-text-secondary">
            Chào mừng bạn đến với <strong>DubbingStation AI Studio</strong>. Khi truy cập hoặc sử dụng bất kỳ dịch vụ nào trên nền tảng của chúng tôi, bạn đồng ý tuân thủ toàn bộ các điều khoản được quy định dưới đây.
          </p>
        </div>

        {/* Content Body */}
        <div className="space-y-8 text-body-md text-text-secondary leading-relaxed">
          <section className="space-y-3">
            <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface flex items-center gap-2">
              <span className="text-primary-container font-mono">1.</span>
              Quyền Sở Hữu Bản Quyền Thương Mại 100%
            </h2>
            <p>
              Tất cả các tệp âm thanh (MP3, WAV), bản lồng tiếng video (MP4) và phụ đề (SRT, VTT) được tạo ra từ tài khoản của bạn thông qua <strong>DubbingStation</strong> đều thuộc quyền sở hữu độc quyền của bạn.
            </p>
            <div className="p-4 rounded-xl bg-surface-card border border-border-glass text-text-primary text-body-sm flex items-start gap-3">
              <span className="material-symbols-outlined text-signal-success text-[20px] shrink-0 mt-0.5">check_circle</span>
              <div>
                <strong>Quyền thương mại tự do vĩnh viễn:</strong> Bạn có toàn quyền đăng tải lên YouTube, TikTok, Facebook, Podcast, bán sách nói (Audiobook), phát sóng truyền thông hoặc chạy chiến dịch quảng cáo thương mại mà không phải chia sẻ doanh thu hoặc trả thêm bất kỳ khoản phí tác quyền nào cho DubbingStation.
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface flex items-center gap-2">
              <span className="text-primary-container font-mono">2.</span>
              Quy Định Nhân Bản Giọng Nói (Voice Cloning) & Trách Nhiệm
            </h2>
            <p>
              Tính năng nhân bản giọng nói (Voice Cloning) được thiết kế nhằm phục vụ mục đích sáng tạo nội dung chính đáng. Bạn cam kết:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-body-sm">
              <li>Chỉ tải lên mẫu âm thanh giọng nói của chính bạn hoặc đã nhận được sự ủy quyền bằng văn bản hợp pháp từ chủ sở hữu giọng nói.</li>
              <li>Nghiêm cấm tuyệt đối việc tạo giọng mạo danh các chính trị gia, người nổi tiếng, lãnh đạo cơ quan nhà nước nhằm mục đích lừa đảo, tung tin giả hoặc thao túng thị trường.</li>
              <li>Mọi hành vi vi phạm đạo đức AI và luật an ninh mạng sẽ dẫn đến việc khóa tài khoản vĩnh viễn và bị chuyển hồ sơ cho cơ quan chức năng có thẩm quyền.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface flex items-center gap-2">
              <span className="text-primary-container font-mono">3.</span>
              Hệ Thống Unified Credits & Thuê Bao Gói Cước
            </h2>
            <p>
              DubbingStation vận hành dựa trên cơ chế 1 quỹ tín dụng thống nhất (Unified Credits):
            </p>
            <ul className="list-disc pl-6 space-y-2 text-body-sm">
              <li><strong>Text to Speech (TTS):</strong> 1 ký tự tiêu chuẩn = 1 Credit; OpenAI HD = 3 Credits.</li>
              <li><strong>Video Dubbing & Subtitle Sync:</strong> 100 Credits / 1 giây video render.</li>
              <li><strong>Speech to Text (STT Whisper):</strong> 50 Credits / 1 giây audio/video.</li>
              <li><strong>22 WASM Client-Side Audio Tools:</strong> Hoàn toàn miễn phí (0 Credit vĩnh viễn).</li>
            </ul>
            <p>
              Credits được cộng tự động vào ví tài khoản sau khi hoàn tất thanh toán. Credits có hiệu lực theo chu kỳ gói cước và được bảo lưu trong suốt thời gian gói cước còn hoạt động.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface flex items-center gap-2">
              <span className="text-primary-container font-mono">4.</span>
              Quy Định Sử Dụng Developer API
            </h2>
            <p>
              Người dùng tích hợp Public REST API (`/api/v1/*`) phải bảo mật tuyệt đối API Key cá nhân (`ds_live_xxxx`). Giới hạn tần suất gọi API mặc định là <strong>60 requests / phút</strong>. Hệ thống có quyền từ chối các yêu cầu vượt quá hạn mức hoặc có dấu hiệu tấn công từ chối dịch vụ (DoS/DDoS).
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface flex items-center gap-2">
              <span className="text-primary-container font-mono">5.</span>
              Liên Hệ Pháp Lý & Hỗ Trợ
            </h2>
            <p>
              Nếu bạn có bất kỳ câu hỏi hoặc cần yêu cầu hỗ trợ liên quan đến Điều khoản dịch vụ, vui lòng liên hệ ban quản trị tại email: <strong className="text-primary-container">support@dubbingstation.com</strong>.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
