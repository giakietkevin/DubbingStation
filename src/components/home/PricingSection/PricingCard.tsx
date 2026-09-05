import React from 'react';
import type { PricingPlan } from '@/types';

interface PricingCardProps {
  plan: PricingPlan;
  isAnnual: boolean;
}

export const PricingCard: React.FC<PricingCardProps> = ({ plan, isAnnual }) => {
  const displayPrice = isAnnual ? plan.annualPrice : plan.monthlyPrice;
  const originalPrice = isAnnual ? plan.originalPrice * 0.7 : plan.originalPrice;

  if (plan.isPopular) {
    return (
      <div className="relative p-space-md rounded-xl bg-surface-container-high flex flex-col justify-between shadow-[0_0_35px_rgba(0,242,254,0.25)] transform lg:-translate-y-2">
        {/* Top Badge */}
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-primary-container to-accent-violet-bright font-label-sm text-label-sm text-canvas-base font-extrabold uppercase tracking-wider shadow-md whitespace-nowrap">
          Khuyên dùng nhất
        </div>

        <div className="flex flex-col">
          <div className="flex items-center justify-between">
            <span className="font-headline-sm text-headline-sm font-bold text-text-primary">
              {plan.name}
            </span>
            <span className={`px-2 py-0.5 rounded font-label-sm text-[10px] uppercase ${plan.badgeStyle}`}>
              {plan.badge}
            </span>
          </div>

          <div className="mt-space-sm flex items-baseline gap-1">
            <span className="font-headline-lg text-headline-lg font-bold text-primary-container">
              ${displayPrice.toFixed(1)}
            </span>
            {originalPrice > 0 && (
              <span className="font-body-sm text-body-sm text-text-muted line-through">
                ${originalPrice.toFixed(1)}
              </span>
            )}
            <span className="font-body-sm text-body-sm text-text-muted">
              /{isAnnual ? 'tháng (trả năm)' : 'th'}
            </span>
          </div>

          <div className="mt-2 p-2 rounded-lg bg-surface-container-lowest font-code-xs text-code-xs text-primary-container font-extrabold shadow-inner">
            {plan.creditsFormatted}
          </div>

          {/* Features */}
          <ul className="mt-space-md flex flex-col gap-2 font-body-sm text-body-sm text-on-surface">
            {plan.features.map((feat, idx) => (
              <li key={idx} className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary-container text-[16px]">
                  check
                </span>
                <span>{feat}</span>
              </li>
            ))}
          </ul>
        </div>

        <button
          type="button"
          className="mt-space-lg w-full py-3 rounded-lg bg-gradient-to-r from-primary-container to-accent-violet-bright hover:shadow-[0_0_24px_rgba(0,242,254,0.5)] text-canvas-base font-label-md text-label-md font-extrabold transition-all"
        >
          {plan.ctaText}
        </button>
      </div>
    );
  }

  return (
    <div className="p-space-md rounded-xl bg-surface-card flex flex-col justify-between shadow-md">
      <div className="flex flex-col">
        <div className="flex items-center justify-between">
          <span className="font-headline-sm text-headline-sm font-bold text-text-primary">
            {plan.name}
          </span>
          <span className={`px-2 py-0.5 rounded font-label-sm text-[10px] uppercase ${plan.badgeStyle}`}>
            {plan.badge}
          </span>
        </div>

        <div className="mt-space-sm flex items-baseline gap-1">
          <span className="font-headline-lg text-headline-lg font-bold text-text-primary">
            ${displayPrice === 0 ? '0' : displayPrice.toFixed(1)}
          </span>
          {originalPrice > 0 && (
            <span className="font-body-sm text-body-sm text-text-muted line-through">
              ${originalPrice.toFixed(1)}
            </span>
          )}
          <span className="font-body-sm text-body-sm text-text-muted">
            /{isAnnual ? 'tháng (trả năm)' : 'tháng'}
          </span>
        </div>

        <div className="mt-2 p-2 rounded-lg bg-surface-container-lowest font-code-xs text-code-xs text-primary font-bold">
          {plan.creditsFormatted}
        </div>

        {/* Features */}
        <ul className="mt-space-md flex flex-col gap-2 font-body-sm text-body-sm text-text-secondary">
          {plan.features.map((feat, idx) => (
            <li key={idx} className="flex items-center gap-2">
              <span className="material-symbols-outlined text-signal-success text-[16px]">
                check
              </span>
              <span>{feat}</span>
            </li>
          ))}
        </ul>
      </div>

      <button
        type="button"
        className="mt-space-lg w-full py-2.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-label-sm text-label-sm font-bold transition-all"
      >
        {plan.ctaText}
      </button>
    </div>
  );
};
