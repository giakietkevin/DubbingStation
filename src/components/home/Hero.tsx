import React from 'react';
import Link from 'next/link';

export const Hero: React.FC = () => {
  return (
    <section className="relative w-full overflow-hidden pt-space-xl pb-space-lg">
      {/* Ambient Radial Glows */}
      <div
        aria-hidden="true"
        className="absolute -top-24 left-1/2 -translate-x-1/2 w-[700px] h-[340px] bg-gradient-to-b from-primary-container/15 via-secondary-container/10 to-transparent blur-[110px] pointer-events-none -z-10"
      />

      <div className="max-w-max-width-content mx-auto px-gutter-desktop flex flex-col items-center text-center">
        {/* Tag Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface-container-high text-on-surface shadow-[0_0_20px_rgba(0,242,254,0.12)]">
          <span
            aria-hidden="true"
            className="material-symbols-outlined text-primary-container text-[18px]"
          >
            auto_awesome
          </span>
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-text-primary font-semibold">
            Nền tảng All-in-One AI Voice Studio thế hệ mới
          </span>
          <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-primary-container" />
        </div>

        {/* Main Headline */}
        <h1 className="mt-space-md max-w-4xl font-headline-lg text-headline-lg lg:text-display-xl lg:font-display-xl text-text-primary tracking-tight">
          Tạo Giọng Nói AI Đỉnh Cao &amp; Lồng Tiếng Video{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-container via-primary to-accent-violet-bright">
            Chuyên Nghiệp
          </span>
        </h1>

        {/* Subtitle */}
        <p className="mt-space-sm max-w-3xl font-body-lg text-body-lg text-text-secondary leading-relaxed">
          Chuyển văn bản thành giọng nói tự nhiên chân thực với hơn 3.000+ giọng đọc chuẩn bản ngữ
          trên 100+ quốc gia. Tự động lồng tiếng video theo mốc thời gian, nhân bản giọng nói và bộ
          22 công cụ âm thanh hoàn toàn miễn phí trên trình duyệt.
        </p>

        {/* Primary CTA Buttons Navigation Grid */}
        <div className="mt-space-lg flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="px-6 py-3.5 rounded-xl font-bold text-[14px] bg-gradient-to-r from-primary-container via-primary-fixed to-accent-violet-bright text-surface-card shadow-glow-cyan hover:shadow-[0_0_36px_rgba(0,242,254,0.6)] hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[20px]">mic</span>
            <span>Vào Studio TTS Ngay</span>
          </Link>

          <Link
            href="/dashboard/dubbing"
            className="px-5 py-3.5 rounded-xl font-bold text-[14px] bg-surface-container hover:bg-surface-container-high border border-border-glass text-on-surface hover:text-secondary-container transition-all flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-[20px] text-secondary">movie_edit</span>
            <span>Lồng Tiếng Video</span>
          </Link>

          <Link
            href="/dashboard/clone"
            className="px-5 py-3.5 rounded-xl font-bold text-[14px] bg-surface-container hover:bg-surface-container-high border border-border-glass text-on-surface hover:text-accent-violet-bright transition-all flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-[20px] text-accent-violet-bright">fingerprint</span>
            <span>Nhân Bản Giọng AI</span>
          </Link>

          <Link
            href="/dashboard/tools"
            className="px-5 py-3.5 rounded-xl font-bold text-[14px] bg-surface-container hover:bg-surface-container-high border border-border-glass text-on-surface hover:text-signal-success transition-all flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-[20px] text-signal-success">construction</span>
            <span>22 Công Cụ Free</span>
          </Link>
        </div>

        {/* Trust Badges */}
        <div className="mt-space-md flex flex-wrap items-center justify-center gap-space-lg text-text-muted text-body-xs font-medium">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-primary-container text-[16px]">token</span>
            <span>Tặng 50.000 Credits Trải Nghiệm</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-signal-success text-[16px]">verified</span>
            <span>3.000+ Giọng Đọc Bản Ngữ</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-accent-violet-bright text-[16px]">bolt</span>
            <span>Xử lý thời gian thực</span>
          </div>
        </div>
      </div>
    </section>
  );
};
