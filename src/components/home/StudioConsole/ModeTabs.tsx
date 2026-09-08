'use client';

import React from 'react';
import Link from 'next/link';
import type { StudioMode } from '@/types';

interface ModeTabsProps {
  activeTab: StudioMode;
  onTabChange: (tab: StudioMode) => void;
}

export const ModeTabs: React.FC<ModeTabsProps> = ({ activeTab, onTabChange }) => {
  const tabs: { id: StudioMode; label: string; icon: string; href?: string; badge?: string }[] = [
    { id: 'tts', label: 'Text to Voice', icon: 'record_voice_over' },
    { id: 'dubbing', label: 'Subtitle to Video', icon: 'movie_edit', href: '/dashboard/dubbing', badge: 'Auto-Sync' },
    { id: 'stt', label: 'Audio to Text', icon: 'transcribe', href: '/dashboard/stt', badge: 'Whisper' },
    { id: 'clone', label: 'Clone Voice', icon: 'graphic_eq', href: '/dashboard/clone', badge: '10s AI' },
  ];

  return (
    <div className="flex flex-wrap items-center justify-between gap-space-xs pb-space-sm">
      <div
        aria-label="Studio Mode Tabs"
        className="inline-flex p-1 rounded-lg bg-surface-container-low"
        role="tablist"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;

          if (tab.href) {
            return (
              <Link
                key={tab.id}
                href={tab.href}
                className="flex items-center gap-1.5 px-space-md py-2 rounded-lg font-label-md text-label-md text-text-secondary hover:text-on-surface hover:bg-surface-container transition-all"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                  {tab.icon}
                </span>
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="hidden sm:inline-block px-1.5 py-0.2 rounded text-[10px] bg-surface-container-highest text-primary font-mono">
                    {tab.badge}
                  </span>
                )}
                <span className="material-symbols-outlined text-[14px] text-text-muted opacity-60">
                  arrow_outward
                </span>
              </Link>
            );
          }

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-2 px-space-md py-2 rounded-lg font-label-md text-label-md transition-all ${
                isActive
                  ? 'font-bold bg-surface-container-highest text-primary shadow-[0_2px_8px_rgba(0,242,254,0.15)]'
                  : 'text-text-secondary hover:text-on-surface'
              }`}
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                {tab.icon}
              </span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high border border-border-glass text-primary-container text-[12px] font-bold transition-all hover:scale-105"
        >
          <span className="material-symbols-outlined text-[16px]">space_dashboard</span>
          <span>Mở Toàn Bộ Studio (/dashboard)</span>
        </Link>
        <span className="hidden md:inline-flex px-2.5 py-1 rounded-full bg-secondary-container/20 text-secondary font-label-sm text-[11px] font-semibold">
          3,000+ VOICES
        </span>
      </div>
    </div>
  );
};
