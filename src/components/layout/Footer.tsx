import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-surface-container-lowest pt-space-3xl pb-space-2xl text-on-surface-variant shadow-[0_-1px_12px_rgba(0,0,0,0.6)]">
      <div className="max-w-max-width-content mx-auto px-gutter-desktop">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-space-2xl pb-space-2xl">
          {/* Brand Info */}
          <div className="lg:col-span-2 flex flex-col gap-space-md">
            <div className="flex items-center gap-space-xs">
              <div className="relative h-8 w-8">
                <Image
                  src="https://lh3.googleusercontent.com/aida/AEtjO1V-UY2Vq84aP1TGSemuRsNV1QLsuv0qyihz872V7JRpt1zfIbe9cIcDboSo_rWDyuvk8eaaPBuLPjwDmmAsaaZvwip7xi_08PfNZjMWz5P5yUyrTzfJFlgXqv7qhNxrukI8RmCWfvAHRvGZAsCvXTne6arYNyYhnqHk_h9YjyTPddJTATjRAp7gdgsIk7ua_L9M7OHLBE2KOTx9F295HOnIl8F6D8O5IqMVcDOtVMA8Yy6MFVFWnIprww"
                  alt="DubbingStation Logo"
                  fill
                  sizes="32px"
                  className="object-contain"
                />
              </div>
              <span className="font-headline-sm text-headline-sm tracking-tight text-primary font-bold">
                DubbingStation
              </span>
            </div>
            <p className="font-body-md text-body-md text-text-muted max-w-sm">
              Nền tảng phòng thu AI cao cấp tổng hợp giọng nói, chuyển đổi phụ đề tự động và nhân bản giọng đọc thế hệ mới cho các nhà sáng tạo kỹ thuật số.
            </p>
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-signal-success text-[18px]">
                verified
              </span>
              <span className="font-label-sm text-label-sm uppercase tracking-wide text-text-secondary">
                Bản quyền thương mại 100% vĩnh viễn
              </span>
            </div>
          </div>

          {/* Product Col */}
          <div className="flex flex-col gap-space-sm">
            <span className="font-label-md text-label-md text-on-surface uppercase tracking-wider font-bold">
              Sản phẩm
            </span>
            <div className="flex flex-col gap-space-xs">
              <Link
                href="#demo-player"
                className="font-body-sm text-body-sm text-on-surface-variant hover:text-primary transition-colors"
              >
                Text to Speech
              </Link>
              <Link
                href="#demo-player"
                className="font-body-sm text-body-sm text-on-surface-variant hover:text-primary transition-colors"
              >
                Video Dubbing
              </Link>
              <Link
                href="#demo-player"
                className="font-body-sm text-body-sm text-on-surface-variant hover:text-primary transition-colors"
              >
                Voice Cloning
              </Link>
              <Link
                href="#audio-tools"
                className="font-body-sm text-body-sm text-on-surface-variant hover:text-primary transition-colors"
              >
                22 Free Audio Tools
              </Link>
            </div>
          </div>

          {/* Resources Col */}
          <div className="flex flex-col gap-space-sm">
            <span className="font-label-md text-label-md text-on-surface uppercase tracking-wider font-bold">
              Tài nguyên
            </span>
            <div className="flex flex-col gap-space-xs">
              <Link
                href="#api-docs"
                className="font-body-sm text-body-sm text-on-surface-variant hover:text-primary transition-colors"
              >
                Hướng dẫn sử dụng
              </Link>
              <Link
                href="#api-docs"
                className="font-body-sm text-body-sm text-on-surface-variant hover:text-primary transition-colors"
              >
                API Docs & SDK
              </Link>
              <Link
                href="#demo-player"
                className="font-body-sm text-body-sm text-on-surface-variant hover:text-primary transition-colors"
              >
                Thư viện giọng đọc
              </Link>
              <Link
                href="#audio-tools"
                className="font-body-sm text-body-sm text-on-surface-variant hover:text-primary transition-colors"
              >
                Kho tài liệu Studio
              </Link>
            </div>
          </div>

          {/* Company Col */}
          <div className="flex flex-col gap-space-sm">
            <span className="font-label-md text-label-md text-on-surface uppercase tracking-wider font-bold">
              Công ty
            </span>
            <div className="flex flex-col gap-space-xs">
              <Link
                href="#about"
                className="font-body-sm text-body-sm text-on-surface-variant hover:text-primary transition-colors"
              >
                Về DubbingStation
              </Link>
              <Link
                href="#terms"
                className="font-body-sm text-body-sm text-on-surface-variant hover:text-primary transition-colors"
              >
                Điều khoản dịch vụ
              </Link>
              <Link
                href="#privacy"
                className="font-body-sm text-body-sm text-on-surface-variant hover:text-primary transition-colors"
              >
                Chính sách bảo mật
              </Link>
              <Link
                href="#refund"
                className="font-body-sm text-body-sm text-on-surface-variant hover:text-primary transition-colors"
              >
                Chính sách hoàn tiền
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom Sub-footer */}
        <div className="pt-space-lg flex flex-col md:flex-row items-center justify-between gap-space-md border-t border-border-glass">
          <p className="font-body-sm text-body-sm text-text-muted">
            © 2026 DubbingStation AI Studio. Tất cả quyền được bảo lưu. Giấy phép thương mại tự do 100%.
          </p>
          <div className="flex items-center gap-space-md">
            <span className="font-code-xs text-code-xs text-text-muted uppercase flex items-center gap-1.5">
              System Status:
              <span className="w-1.5 h-1.5 rounded-full bg-signal-success inline-block" />
              <strong className="text-signal-success font-bold">Operational 99.99%</strong>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
