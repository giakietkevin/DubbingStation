import React from 'react';
import Link from 'next/link';
import { audioTools } from '@/data/audioTools';

export const AudioToolsShowcase: React.FC = () => {
  return (
    <section id="audio-tools" className="w-full py-space-2xl bg-surface-container-lowest">
      <div className="max-w-max-width-content mx-auto px-gutter-desktop">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md mb-space-xl">
          <div className="flex flex-col gap-space-xs">
            <div className="inline-flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-signal-success/15 text-signal-success font-code-xs text-code-xs font-bold uppercase tracking-wider">
                100% Free • 0 Credit • WebAssembly in Browser
              </span>
            </div>
            <h2 className="font-headline-lg text-headline-lg font-bold text-text-primary">
              Bộ 22 Công Cụ Âm Thanh Miễn Phí Trên Trình Duyệt
            </h2>
            <p className="font-body-md text-body-md text-text-muted max-w-2xl">
              Toàn bộ quá trình xử lý diễn ra trực tiếp ngay trên máy tính của bạn thông qua
              WebAssembly. Không cần cài đặt phần mềm, bảo mật 100% tệp cá nhân và không trừ credit.
            </p>
          </div>
          <div className="flex items-center gap-space-xs">
            <span className="px-3 py-1.5 rounded-lg bg-surface-container-high text-on-surface font-code-xs text-code-xs">
              Client-Side Computing: <strong className="text-signal-success">Active</strong>
            </span>
          </div>
        </div>

        {/* Matrix of 12 Featured Tools */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-space-sm">
          {audioTools.map((tool) => (
            <div
              key={tool.id}
              className="p-space-md rounded-xl bg-surface-container-low hover:bg-surface-container transition-all group flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <div
                  className={`w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center ${tool.colorClass}`}
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-[22px]">
                    {tool.icon}
                  </span>
                </div>
                <span className="px-1.5 py-0.5 rounded font-label-sm text-[10px] bg-signal-success/20 text-signal-success font-bold">
                  {tool.badge}
                </span>
              </div>

              <div className="mt-space-sm">
                <h4 className="font-label-md text-label-md font-bold text-text-primary group-hover:text-primary transition-colors">
                  {tool.name}
                </h4>
                <p className="mt-1 font-body-sm text-[11px] text-text-muted">{tool.description}</p>
              </div>

              <Link
                href="#demo-player"
                className="mt-space-sm font-label-sm text-label-sm text-text-secondary group-hover:text-primary inline-flex items-center gap-1"
              >
                <span>Sử dụng</span>
                <span aria-hidden="true" className="material-symbols-outlined text-[14px]">
                  arrow_forward
                </span>
              </Link>
            </div>
          ))}
        </div>

        {/* Browse All 22 CTA Button */}
        <div className="mt-space-xl flex justify-center">
          <Link
            href="#demo-player"
            className="inline-flex items-center gap-2 px-space-lg py-3 rounded-xl font-label-md text-label-md font-bold bg-surface-container-high hover:bg-surface-container-highest text-on-surface transition-all shadow-md"
          >
            <span
              aria-hidden="true"
              className="material-symbols-outlined text-[20px] text-signal-success"
            >
              grid_view
            </span>
            <span>Khám phá trọn bộ 22 công cụ âm thanh (Xem tất cả)</span>
          </Link>
        </div>
      </div>
    </section>
  );
};
