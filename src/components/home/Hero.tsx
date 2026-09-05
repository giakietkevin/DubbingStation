import React from 'react';

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
      </div>
    </section>
  );
};
