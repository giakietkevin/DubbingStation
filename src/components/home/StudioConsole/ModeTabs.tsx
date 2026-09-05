'use client';

import React from 'react';
import type { StudioMode } from '@/types';

interface ModeTabsProps {
  activeTab: StudioMode;
  onTabChange: (tab: StudioMode) => void;
}

export const ModeTabs: React.FC<ModeTabsProps> = ({ activeTab, onTabChange }) => {
  const tabs: { id: StudioMode; label: string; icon: string }[] = [
    { id: 'tts', label: 'Text to Voice', icon: 'record_voice_over' },
    { id: 'dubbing', label: 'Subtitle to Video', icon: 'movie_edit' },
    { id: 'stt', label: 'Audio to Text', icon: 'transcribe' },
    { id: 'clone', label: 'Clone Voice', icon: 'graphic_eq' },
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
        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-high text-primary font-code-xs text-code-xs font-semibold">
          <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-signal-success" />
          <span>Whisper & Neural V3 Ready</span>
        </span>
        <span className="hidden sm:inline-flex px-3 py-1 rounded-full bg-secondary-container/30 text-secondary font-label-sm text-label-sm">
          3,000+ VOICES
        </span>
      </div>
    </div>
  );
};
