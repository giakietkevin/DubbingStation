'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export const PromoRail: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText('LAUNCH50');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <aside className="w-full bg-surface-container-low shadow-[0_2px_12px_rgba(0,0,0,0.4)]">
      <div className="max-w-max-width-content mx-auto px-gutter-desktop py-2.5 flex flex-wrap items-center justify-between gap-space-xs text-body-sm font-body-sm">
        <div className="flex items-center gap-space-xs text-text-primary flex-wrap">
          <span
            aria-hidden="true"
            className="flex h-2 w-2 rounded-full bg-signal-warning animate-ping"
          />
          <span className="px-2 py-0.5 rounded-full bg-signal-warning/15 text-signal-warning font-label-sm text-label-sm uppercase tracking-wider font-bold">
            Launch Offer
          </span>
          <span className="text-on-surface">
            Tặng ngay <strong className="text-primary font-bold">50.000 Credits</strong> khi tạo
            tài khoản hôm nay • Sử dụng mã{' '}
            <button
              type="button"
              onClick={handleCopy}
              title="Nhấn để sao chép"
              className="px-1.5 py-0.5 rounded bg-surface-container font-code-xs text-code-xs text-primary-container font-semibold hover:bg-surface-container-high transition-colors inline-flex items-center gap-1 cursor-pointer"
            >
              <code>LAUNCH50</code>
              {copied && <span className="text-[10px] text-signal-success">✓ Đã chép</span>}
            </button>{' '}
            để giảm 50% tháng đầu tiên
          </span>
        </div>

        <Link
          href="#pricing-section"
          className="inline-flex items-center gap-1 font-label-sm text-label-sm text-primary-container hover:text-primary transition-colors"
        >
          <span>Xem biểu phí &amp; Nhận ưu đãi</span>
          <span aria-hidden="true" className="material-symbols-outlined text-[15px]">
            arrow_forward
          </span>
        </Link>
      </div>
    </aside>
  );
};
