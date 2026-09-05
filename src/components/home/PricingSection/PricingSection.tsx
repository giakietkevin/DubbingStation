'use client';

import React, { useState } from 'react';
import { pricingPlans } from '@/data/pricing';
import { PricingCard } from './PricingCard';
import { UnifiedCreditsMatrix } from './UnifiedCreditsMatrix';

export const PricingSection: React.FC = () => {
  const [isAnnual, setIsAnnual] = useState(false);

  return (
    <section id="pricing-section" className="w-full py-space-3xl">
      <div className="max-w-max-width-content mx-auto px-gutter-desktop">
        {/* Pricing Header */}
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto mb-space-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-signal-warning/10 text-signal-warning font-label-sm text-label-sm font-bold">
            <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
              local_fire_department
            </span>
            <span>Launch Offer: 50% OFF Tháng Đầu Tiên • Mã: LAUNCH50</span>
          </div>

          <h2 className="mt-space-xs font-headline-lg text-headline-lg font-bold text-text-primary">
            Bảng Giá Linh Hoạt • Hệ Thống Unified Credits
          </h2>
          <p className="mt-space-2xs font-body-md text-body-md text-text-muted">
            Sử dụng 1 quỹ credits chung duy nhất cho toàn bộ các dịch vụ: TTS, Video Dubbing và
            Speech to Text. Nâng cấp hoặc hủy bất kỳ lúc nào.
          </p>

          {/* Monthly / Annual Switcher */}
          <div className="mt-space-md p-1 rounded-full bg-surface-container-low inline-flex items-center">
            <button
              type="button"
              onClick={() => setIsAnnual(false)}
              className={`px-space-md py-1.5 rounded-full font-label-md text-label-md font-bold transition-all ${
                !isAnnual
                  ? 'bg-surface-container-highest text-primary'
                  : 'text-text-muted hover:text-on-surface'
              }`}
            >
              Hàng Tháng
            </button>
            <button
              type="button"
              onClick={() => setIsAnnual(true)}
              className={`flex items-center gap-1.5 px-space-md py-1.5 rounded-full font-label-md text-label-md transition-all ${
                isAnnual
                  ? 'bg-surface-container-highest text-primary font-bold'
                  : 'text-text-muted hover:text-on-surface'
              }`}
            >
              <span>Hàng Năm</span>
              <span className="px-2 py-0.5 rounded-full bg-signal-success/20 text-signal-success font-code-xs text-code-xs font-bold">
                Tiết kiệm 30%
              </span>
            </button>
          </div>
        </div>

        {/* 5 Tiers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-space-sm items-stretch">
          {pricingPlans.map((plan) => (
            <PricingCard key={plan.id} plan={plan} isAnnual={isAnnual} />
          ))}
        </div>

        {/* Unified Credit Conversion Formula Matrix Box */}
        <UnifiedCreditsMatrix />
      </div>
    </section>
  );
};
