import React from 'react';
import Link from 'next/link';
import { coreServices } from '@/data/services';

export const CoreServices: React.FC = () => {
  return (
    <section className="w-full py-space-2xl">
      <div className="max-w-max-width-content mx-auto px-gutter-desktop">
        {/* Section Header */}
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto mb-space-xl">
          <span className="px-3 py-1 rounded-full bg-secondary-container/20 text-secondary font-code-xs text-code-xs font-bold uppercase tracking-wider">
            AI Voice Studio Ecosystem
          </span>
          <h2 className="mt-space-xs font-headline-lg text-headline-lg text-text-primary font-bold">
            4 Trụ Cột Công Nghệ Giọng Nói Đỉnh Cao
          </h2>
          <p className="mt-space-2xs font-body-md text-body-md text-text-muted">
            Tích hợp các mô hình trí tuệ nhân tạo hiện đại nhất hiện nay phục vụ sản xuất video,
            podcast, giáo dục và thương mại hóa toàn cầu.
          </p>
        </div>

        {/* 4 Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-space-md">
          {coreServices.map((service) => (
            <div
              key={service.id}
              className="p-space-lg rounded-xl bg-surface-card shadow-lg hover:shadow-[0_8px_30px_rgba(0,242,254,0.15)] transition-all flex flex-col justify-between group"
            >
              <div className="flex flex-col">
                <div className="flex items-center justify-between">
                  <div
                    className={`w-12 h-12 rounded-lg bg-surface-container-high flex items-center justify-center ${service.iconColorClass} transition-colors`}
                  >
                    <span aria-hidden="true" className="material-symbols-outlined text-[26px]">
                      {service.icon}
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded font-label-sm text-[10px] uppercase font-bold ${service.tagColorClass}`}
                  >
                    {service.tag}
                  </span>
                </div>

                <h3 className="mt-space-md font-headline-sm text-headline-sm font-bold text-text-primary">
                  {service.name}
                </h3>
                <p className="mt-space-xs font-body-sm text-body-sm text-text-muted leading-relaxed">
                  {service.description}
                </p>
              </div>

              <div className="pt-space-md mt-space-md flex items-center justify-between">
                <span className="font-code-xs text-code-xs text-text-muted">
                  {service.specs}
                </span>
                <Link
                  href="#demo-player"
                  className={`font-label-sm text-label-sm font-bold ${service.actionColorClass} group-hover:translate-x-1 transition-transform inline-flex items-center gap-1`}
                >
                  <span>{service.actionText}</span>
                  <span aria-hidden="true" className="material-symbols-outlined text-[14px]">
                    arrow_forward
                  </span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
