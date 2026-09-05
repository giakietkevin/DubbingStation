'use client';

import React from 'react';
import type { Voice } from '@/types';
import { voices } from '@/data/voices';

interface VoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedVoice: Voice;
  onSelectVoice: (voice: Voice) => void;
}

export const VoiceModal: React.FC<VoiceModalProps> = ({
  isOpen,
  onClose,
  selectedVoice,
  onSelectVoice,
}) => {
  const [searchQuery, setSearchQuery] = React.useState('');

  const filteredVoices = voices.filter(
    (v) =>
      v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.style.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg max-h-[80vh] bg-surface-card rounded-2xl shadow-[0_24px_80px_-15px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col">
        {/* Top gradient line */}
        <div
          aria-hidden="true"
          className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary-container to-secondary-container rounded-t-2xl"
        />

        {/* Header */}
        <div className="px-space-lg pt-space-lg pb-space-sm flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <h2 className="font-headline-sm text-headline-sm font-bold text-text-primary">
              Chọn Giọng Đọc AI
            </h2>
            <p className="font-body-sm text-body-sm text-text-muted">
              {voices.length} giọng đọc có sẵn • Nhấn để chọn và xem trước
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-surface-container hover:bg-surface-container-highest text-text-muted hover:text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Search */}
        <div className="px-space-lg pb-space-sm">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-container-lowest">
            <span className="material-symbols-outlined text-[18px] text-text-muted">search</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm theo tên, quốc gia hoặc phong cách..."
              className="flex-1 bg-transparent font-body-md text-body-md text-text-primary placeholder:text-text-muted focus:outline-none"
            />
          </div>
        </div>

        {/* Voice List */}
        <div className="flex-1 overflow-y-auto px-space-lg pb-space-lg">
          <div className="flex flex-col gap-space-xs">
            {filteredVoices.map((voice) => {
              const isSelected = selectedVoice.id === voice.id;
              return (
                <button
                  key={voice.id}
                  type="button"
                  onClick={() => {
                    onSelectVoice(voice);
                    onClose();
                  }}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-all text-left ${
                    isSelected
                      ? 'bg-surface-container-high ring-2 ring-primary-container/60'
                      : 'bg-surface-container-low hover:bg-surface-container'
                  }`}
                >
                  <span className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary-container to-secondary-container flex items-center justify-center font-headline-sm text-[14px] text-canvas-base font-black shrink-0">
                    {voice.avatarInitials}
                  </span>
                  <div className="flex-1 flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-label-md text-label-md font-bold text-text-primary">
                        {voice.name}
                      </span>
                      <span className="px-1.5 py-0.5 rounded font-code-xs text-[10px] bg-primary-container/20 text-primary-container font-semibold">
                        {voice.country}
                      </span>
                      {voice.isPremium && (
                        <span className="px-1.5 py-0.5 rounded font-code-xs text-[10px] bg-signal-warning/20 text-signal-warning font-semibold">
                          PREMIUM
                        </span>
                      )}
                    </div>
                    <span className="font-body-sm text-[11px] text-text-muted">
                      {voice.style}
                    </span>
                  </div>
                  {isSelected && (
                    <span className="material-symbols-outlined text-[20px] text-primary-container shrink-0">
                      check_circle
                    </span>
                  )}
                </button>
              );
            })}

            {filteredVoices.length === 0 && (
              <div className="text-center py-8 text-text-muted font-body-md text-body-md">
                Không tìm thấy giọng đọc phù hợp
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
