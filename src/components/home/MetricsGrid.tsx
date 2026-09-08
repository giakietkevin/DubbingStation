import React from 'react';
import Link from 'next/link';
import { metricPillars } from '@/data/services';

export const MetricsGrid: React.FC = () => {
  return (
    <section className="w-full py-space-xl bg-surface-container-lowest">
      <div className="max-w-max-width-content mx-auto px-gutter-desktop">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
          {metricPillars.map((pillar) => (
            <Link
              key={pillar.id}
              href={pillar.href || '/dashboard'}
              className="p-space-lg rounded-xl bg-surface-container-low shadow-sm hover:bg-surface-container hover:shadow-[0_8px_30px_rgba(0,242,254,0.12)] transition-all flex flex-col gap-space-xs group cursor-pointer hover:-translate-y-1"
            >
              <div className="flex items-center justify-between">
                <div
                  className={`w-12 h-12 rounded-xl ${pillar.iconBgClass} flex items-center justify-center ${pillar.iconColorClass} group-hover:scale-110 transition-transform`}
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-[28px]">
                    {pillar.icon}
                  </span>
                </div>
                <span className="material-symbols-outlined text-[18px] text-text-muted opacity-0 group-hover:opacity-100 group-hover:text-primary-container transition-all">
                  arrow_forward
                </span>
              </div>
              <span className="mt-space-xs font-headline-lg text-headline-lg font-bold text-text-primary tracking-tight">
                {pillar.value}
              </span>
              <span className={`font-headline-sm text-headline-sm font-semibold ${pillar.titleColorClass}`}>
                {pillar.title}
              </span>
              <p className="font-body-sm text-body-sm text-text-muted leading-relaxed">
                {pillar.description}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};
