'use client';

import React from 'react';

interface AudioPlayerDeckProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  currentTime: number;
  totalDuration?: number;
  fileName?: string;
  hasAudioRing?: boolean;
  onDownload?: () => void;
}

export const AudioPlayerDeck: React.FC<AudioPlayerDeckProps> = ({
  isPlaying,
  onTogglePlay,
  currentTime,
  totalDuration = 14,
  fileName = 'Minh_Khang_Audio_Dubbing.mp3',
  hasAudioRing = false,
  onDownload,
}) => {
  const formatTime = (secs: number) => {
    const s = Math.floor(secs);
    const m = Math.floor(s / 60);
    const remS = s % 60;
    return `${m < 10 ? '0' + m : m}:${remS < 10 ? '0' + remS : remS}`;
  };

  // 28 waveform bars heights pattern
  const barHeights = [
    3, 5, 7, 4, 8, 6, 9, 5, 4, 7, 3, 6, 8, 5, 7, 4, 6, 9, 5, 3, 6, 8, 4, 7, 3, 5, 8, 4,
  ];

  return (
    <div
      id="demo-player"
      className="mt-space-sm rounded-xl bg-surface-container-low p-space-sm flex flex-col md:flex-row items-center justify-between gap-space-md shadow-md"
    >
      <div className="flex items-center gap-space-sm w-full md:w-auto">
        {/* Play/Pause Button */}
        <button
          type="button"
          aria-label={isPlaying ? 'Tạm dừng demo' : 'Phát âm thanh demo'}
          onClick={onTogglePlay}
          className={`w-11 h-11 rounded-full bg-primary-container text-canvas-base flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-[0_0_16px_rgba(0,242,254,0.4)] ${
            hasAudioRing ? 'ring-4 ring-primary-container animate-pulse' : ''
          }`}
        >
          <span
            className="material-symbols-outlined text-[24px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            {isPlaying ? 'pause' : 'play_arrow'}
          </span>
        </button>

        {/* Info & Timers */}
        <div className="flex flex-col">
          <span className="font-label-md text-label-md font-bold text-text-primary">
            {fileName}
          </span>
          <div className="flex items-center gap-2 font-code-xs text-code-xs text-text-muted">
            <span className="text-primary font-medium">{formatTime(currentTime)}</span>
            <span>/</span>
            <span>{formatTime(totalDuration)}</span>
            <span className="px-1.5 py-0.2 rounded bg-surface-container-highest text-text-secondary uppercase">
              24kHz Neural
            </span>
          </div>
        </div>
      </div>

      {/* Waveform Visualization */}
      <div className="flex-1 w-full max-w-xl mx-2 flex items-center gap-1 h-9 px-3 rounded-lg bg-surface-container-lowest overflow-hidden">
        {barHeights.map((h, i) => {
          const progressFraction = totalDuration > 0 ? currentTime / totalDuration : 0;
          const barFraction = i / barHeights.length;
          const isPassed = barFraction <= progressFraction;

          return (
            <div
              key={i}
              style={{
                height: isPlaying ? `${Math.max(4, (h * 3.5) * (0.6 + Math.random() * 0.8))}px` : `${h * 3.5}px`,
              }}
              className={`w-1 rounded-full transition-all duration-150 ${
                isPassed
                  ? 'bg-primary-container'
                  : 'bg-surface-container-highest'
              }`}
            />
          );
        })}
      </div>

      {/* Export Actions */}
      <div className="flex items-center gap-space-xs w-full md:w-auto justify-end">
        <button
          type="button"
          onClick={onDownload}
          title="Tải xuống tệp MP3/WAV"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-label-sm text-label-sm font-semibold transition-colors"
        >
          <span
            aria-hidden="true"
            className="material-symbols-outlined text-[16px] text-primary-container"
          >
            download
          </span>
          <span>Tải MP3</span>
        </button>
        <button
          type="button"
          title="Lưu trữ đám mây"
          className="p-2 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-text-secondary hover:text-on-surface transition-colors"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
            cloud_sync
          </span>
        </button>
        <button
          type="button"
          title="Chia sẻ liên kết audio"
          className="p-2 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-text-secondary hover:text-on-surface transition-colors"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
            share
          </span>
        </button>
      </div>
    </div>
  );
};
