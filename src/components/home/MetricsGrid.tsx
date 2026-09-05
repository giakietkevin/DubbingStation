import React from 'react';
import { metricPillars } from '@/data/services';

export const MetricsGrid: React.FC = () => {
  return (
    <section className="w-full py-space-xl bg-surface-container-lowest">
      <div className="max-w-max-width-content mx-auto px-gutter-desktop">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
          {metricPillars.map((pillar) => (
            <div
              key={pillar.id}
              className="p-space-lg rounded-xl bg-surface-container-low shadow-sm hover:bg-surface-container transition-all flex flex-col gap-space-xs group"
            >
              <div
                className={`w-12 h-12 rounded-xl ${pillar.iconBgClass} flex items-center justify-center ${pillar.iconColorClass} group-hover:scale-110 transition-transform`}
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[28px]">
                  {pillar.icon}
                </span>
              </div>
              <span className="mt-space-xs font-headline-lg text-headline-lg font-bold text-text-primary tracking-tight">
                {pillar.value}
              </span>
              <span className={`font-headline-sm text-headline-sm font-semibold ${pillar.titleColorClass}`}>
                {pillar.title}
              </span>
              <p className="font-body-sm text-body-sm text-text-muted">
                {pillar.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
