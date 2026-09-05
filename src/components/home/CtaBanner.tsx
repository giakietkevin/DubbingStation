import React from 'react';
import Link from 'next/link';

export const CtaBanner: React.FC = () => {
  return (
    <section className="relative w-full py-space-3xl overflow-hidden">
      <div className="max-w-max-width-content mx-auto px-gutter-desktop">
        <div className="relative rounded-2xl bg-gradient-to-br from-surface-card via-surface-container-high to-surface-container-lowest p-space-xl sm:p-space-3xl text-center flex flex-col items-center shadow-[0_24px_80px_-15px_rgba(0,0,0,0.9)] overflow-hidden">
          {/* Decorative Ambient Flares */}
          <div
            aria-hidden="true"
            className="absolute -top-32 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary-container/20 rounded-full blur-[90px] pointer-events-none"
          />
          <div
            aria-hidden="true"
            className="absolute -bottom-32 right-1/4 w-80 h-80 bg-accent-violet-bright/20 rounded-full blur-[90px] pointer-events-none"
          />

          <span className="relative px-3 py-1 rounded-full bg-primary-container/15 text-primary font-code-xs text-code-xs font-bold uppercase tracking-wider">
            Bắt đầu trong 10 giây • 0 rủi ro
          </span>

          <h2 className="relative mt-space-md max-w-2xl font-headline-lg text-headline-lg lg:text-display-xl lg:font-display-xl font-black text-text-primary tracking-tight">
            Sẵn Sàng Tạo Giọng Đọc AI &amp; Lồng Tiếng Đỉnh Cao?
          </h2>

          <p className="relative mt-space-sm max-w-xl font-body-lg text-body-lg text-text-secondary leading-relaxed">
            Đăng ký miễn phí ngay hôm nay để nhận 50.000 Credits trải nghiệm kho 3.000+ giọng nói và
            bộ công cụ AI audio không giới hạn.
          </p>

          <div className="relative mt-space-xl flex flex-wrap items-center justify-center gap-space-md">
            <Link
              href="#demo-player"
              className="inline-flex items-center justify-center gap-2 px-space-xl py-3.5 rounded-xl font-label-md text-label-md font-extrabold text-canvas-base bg-gradient-to-r from-primary-container via-primary-fixed to-accent-violet-bright shadow-[0_0_32px_rgba(0,242,254,0.4)] hover:shadow-[0_0_40px_rgba(0,242,254,0.6)] hover:scale-105 active:scale-95 transition-all"
            >
              <span>Tạo Giọng Nói Ngay Miễn Phí</span>
              <span aria-hidden="true" className="material-symbols-outlined text-[20px]">
                arrow_forward
              </span>
            </Link>

            <Link
              href="#pricing-section"
              className="inline-flex items-center justify-center gap-2 px-space-lg py-3.5 rounded-xl font-label-md text-label-md font-bold bg-surface-container hover:bg-surface-container-highest text-on-surface transition-all"
            >
              <span
                aria-hidden="true"
                className="material-symbols-outlined text-[20px] text-secondary"
              >
                sell
              </span>
              <span>Xem Các Gói Ưu Đãi</span>
            </Link>
          </div>

          <div className="relative mt-space-lg flex items-center justify-center gap-space-lg text-text-muted font-body-sm text-body-sm flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-signal-success text-[18px]">
                verified
              </span>
              <span>Không cần thẻ tín dụng</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-signal-success text-[18px]">
                shield
              </span>
              <span>Bảo mật chuẩn mã hóa</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
