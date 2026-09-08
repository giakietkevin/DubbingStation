'use client';

import React from 'react';
import type { Voice } from '@/types';
import { emotions } from '@/data/voices';

interface ControlDeckProps {
  selectedVoice: Voice;
  onOpenVoiceModal: () => void;
  selectedEmotion: string;
  onSelectEmotion: (emotion: string) => void;
  speed: number;
  onSpeedChange: (speed: number) => void;
  isGenerating: boolean;
  onGenerate: () => void;
  provider: 'microsoft' | 'openai' | 'piper' | 'google';
  onProviderChange: (provider: 'microsoft' | 'openai' | 'piper' | 'google') => void;
}

export const ControlDeck: React.FC<ControlDeckProps> = ({
  selectedVoice,
  onOpenVoiceModal,
  selectedEmotion,
  onSelectEmotion,
  speed,
  onSpeedChange,
  isGenerating,
  onGenerate,
  provider,
  onProviderChange,
}) => {
  return (
    <div className="pt-space-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-space-md">
      <div className="flex flex-wrap items-center gap-space-xs">
        {/* Active Voice Pill Button */}
        <button
          type="button"
          onClick={onOpenVoiceModal}
          className="flex items-center gap-2 p-1.5 pr-3.5 rounded-full bg-surface-container hover:bg-surface-container-high transition-all text-left shadow-sm"
        >
          <span
            className={`w-9 h-9 rounded-full flex items-center justify-center font-headline-sm text-headline-sm text-canvas-base font-black ${
              selectedVoice.isCustom
                ? 'bg-gradient-to-tr from-accent-violet-bright to-primary-container'
                : 'bg-gradient-to-tr from-primary-container to-secondary-container'
            }`}
          >
            {selectedVoice.avatarInitials}
          </span>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-label-md text-label-md font-bold text-text-primary">
                {selectedVoice.name}
              </span>
              <span
                className={`px-1.5 py-0.2 rounded font-code-xs text-[10px] font-semibold ${
                  selectedVoice.isCustom
                    ? 'bg-accent-violet-bright/20 text-accent-violet-bright border border-accent-violet-bright/30'
                    : 'bg-primary-container/20 text-primary-container'
                }`}
              >
                {selectedVoice.isCustom
                  ? selectedVoice.clonedSampleCount
                    ? `🧬 CLONE (${selectedVoice.clonedSampleCount} FILE)`
                    : 'CUSTOM'
                  : selectedVoice.country}
              </span>
            </div>
            <span className="font-body-sm text-[11px] text-text-muted truncate max-w-[180px]">
              {selectedVoice.style}
            </span>
          </div>
          <span
            aria-hidden="true"
            className="material-symbols-outlined text-text-muted text-[20px] ml-1"
          >
            keyboard_arrow_down
          </span>
        </button>

        {/* Provider Selector */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-surface-container">
          {(['microsoft', 'openai', 'piper', 'google'] as const).map((p) => {
            const isActive = provider === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => onProviderChange(p)}
                className={`px-2.5 py-1 rounded-md font-label-sm text-label-sm transition-colors ${
                  isActive
                    ? 'bg-surface-container-highest text-primary font-semibold'
                    : 'text-text-secondary hover:text-on-surface'
                }`}
              >
                {p === 'openai' ? 'OpenAI HD' : p === 'piper' ? 'Piper Free' : p === 'google' ? 'Chị Google' : 'Microsoft'}
              </button>
            );
          })}
        </div>

        {/* Emotion Chips */}
        <div className="hidden sm:flex items-center gap-1 p-1 rounded-lg bg-surface-container">
          {emotions.map((emo) => {
            const isActive = selectedEmotion === emo;
            return (
              <button
                key={emo}
                type="button"
                onClick={() => onSelectEmotion(emo)}
                className={`px-2.5 py-1 rounded-md font-label-sm text-label-sm transition-colors ${
                  isActive
                    ? 'bg-surface-container-highest text-primary font-semibold'
                    : 'text-text-secondary hover:text-on-surface'
                }`}
              >
                {emo}
              </button>
            );
          })}
        </div>

        {/* Speed Slider */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-container text-body-sm font-body-sm">
          <span
            aria-hidden="true"
            className="material-symbols-outlined text-[16px] text-text-muted"
          >
            speed
          </span>
          <label htmlFor="speed-slider" className="text-text-muted font-label-sm text-label-sm">
            Tốc độ:
          </label>
          <input
            id="speed-slider"
            type="range"
            min="0.5"
            max="2.0"
            step="0.1"
            value={speed}
            onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
            className="w-16 accent-primary-container h-1 bg-surface-container-highest rounded-lg cursor-pointer"
          />
          <span className="font-code-xs text-code-xs text-primary font-bold">
            {speed.toFixed(1)}x
          </span>
        </div>
      </div>

      {/* Generate Voice Button */}
      <div className="flex items-center gap-space-xs">
        <button
          type="button"
          disabled={isGenerating}
          onClick={onGenerate}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-space-lg py-3 rounded-xl font-label-md text-label-md font-bold text-canvas-base bg-gradient-to-r from-primary-container via-primary-fixed to-accent-violet-bright shadow-[0_0_28px_rgba(0,242,254,0.4)] hover:shadow-[0_0_36px_rgba(0,242,254,0.6)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-80 disabled:cursor-not-allowed"
        >
          {isGenerating ? (
            <>
              <span className="w-4 h-4 rounded-full border-2 border-canvas-base border-t-transparent animate-spin" />
              <span>Đang tổng hợp giọng nói...</span>
            </>
          ) : (
            <>
              <span
                aria-hidden="true"
                className="material-symbols-outlined text-[20px]"
              >
                play_arrow
              </span>
              <span>Tạo âm thanh ngay (Generate Voice)</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
