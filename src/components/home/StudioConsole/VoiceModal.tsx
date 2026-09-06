'use client';

import React, { useState, useRef } from 'react';
import type { Voice } from '@/types';
import { voices } from '@/data/voices';

interface VoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedVoice: Voice;
  onSelectVoice: (voice: Voice) => void;
}

const categories = [
  { id: 'all', label: 'Tất cả' },
  { id: 'tiktok', label: '🔥 TikTok / CapCut' },
  { id: 'review', label: '🎬 Review Phim' },
  { id: 'news', label: '📺 Thời Sự & E-Learning' },
  { id: 'en', label: '🇺🇸 Tiếng Anh' },
  { id: 'asia', label: '🇯🇵🇰🇷🇨🇳 Nhật • Hàn • Trung' },
];

export const VoiceModal: React.FC<VoiceModalProps> = ({
  isOpen,
  onClose,
  selectedVoice,
  onSelectVoice,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  if (!isOpen) return null;

  const handlePlayPreview = (voice: Voice, e: React.MouseEvent) => {
    e.stopPropagation();

    if (playingVoiceId === voice.id) {
      audioRef.current?.pause();
      setPlayingVoiceId(null);
      return;
    }

    if (!audioRef.current) {
      audioRef.current = new Audio();
    }

    const soundUrl = voice.previewUrl || `/api/voices/preview?voiceId=${voice.id}&gender=${voice.gender}`;
    audioRef.current.src = soundUrl;
    audioRef.current.play().catch((err) => console.log('Audio preview error', err));
    setPlayingVoiceId(voice.id);

    audioRef.current.onended = () => {
      setPlayingVoiceId(null);
    };

    audioRef.current.onerror = () => {
      setPlayingVoiceId(null);
    };
  };

  const handleClose = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setPlayingVoiceId(null);
    onClose();
  };

  const filteredVoices = voices.filter((v) => {
    // Search query match
    const matchSearch =
      v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.style.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchSearch) return false;

    // Category filter match
    if (activeCategory === 'tiktok') {
      return v.tags.includes('TikTok') || v.useCase?.includes('TikTok');
    }
    if (activeCategory === 'review') {
      return (
        v.tags.includes('Review Phim') ||
        v.tags.includes('Kịch tính') ||
        v.useCase?.includes('Review') ||
        v.useCase?.includes('Truyện')
      );
    }
    if (activeCategory === 'news') {
      return (
        v.tags.includes('Thời sự') ||
        v.tags.includes('Bản tin') ||
        v.tags.includes('E-Learning') ||
        v.tags.includes('Giáo dục')
      );
    }
    if (activeCategory === 'en') {
      return v.countryCode === 'en-US' || v.countryCode === 'en-GB';
    }
    if (activeCategory === 'asia') {
      return ['ja-JP', 'ko-KR', 'zh-CN'].includes(v.countryCode);
    }

    return true;
  });

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={handleClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-2xl max-h-[85vh] bg-surface-card rounded-2xl shadow-[0_24px_80px_-15px_rgba(0,0,0,0.95)] border border-border-glass overflow-hidden flex flex-col animate-fadeIn">
        {/* Top gradient line */}
        <div
          aria-hidden="true"
          className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-primary-container via-accent-violet-bright to-secondary-container"
        />

        {/* Header */}
        <div className="px-space-md sm:px-space-lg pt-space-lg pb-space-sm flex items-center justify-between border-b border-border-glass">
          <div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary-container text-[24px]">
                record_voice_over
              </span>
              <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                Kho Giọng Đọc AI Đa Năng
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-primary-container/20 text-primary-container">
                {voices.length} giọng sẵn có
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-text-muted mt-0.5">
              Bấm icon <span className="material-symbols-outlined text-[14px] align-middle text-primary-container">volume_up</span> để nghe thử âm thanh trước khi chọn
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-xl bg-surface-container hover:bg-surface-container-highest text-text-muted hover:text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Search & Category Pills */}
        <div className="px-space-md sm:px-space-lg py-3 space-y-2.5 bg-surface-container-lowest/70 border-b border-border-glass">
          {/* Search Box */}
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface-container border border-border-glass focus-within:border-primary-container transition-colors">
            <span className="material-symbols-outlined text-[18px] text-text-muted">search</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên giọng, chủ đề (TikTok, Review phim, VTV, Nam, Nữ)..."
              className="flex-1 bg-transparent font-body-sm text-body-sm text-on-surface placeholder:text-text-muted focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-text-muted hover:text-on-surface text-[14px]"
              >
                ✕
              </button>
            )}
          </div>

          {/* Categories Tab Horizontal Slider */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1 rounded-xl text-[12px] font-bold whitespace-nowrap transition-all ${
                  activeCategory === cat.id
                    ? 'bg-primary-container text-surface-card shadow-glow-cyan'
                    : 'bg-surface-container text-text-secondary hover:text-on-surface hover:bg-surface-container-high'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Voice List */}
        <div className="flex-1 overflow-y-auto px-space-md sm:px-space-lg py-3 space-y-2">
          {filteredVoices.length === 0 ? (
            <div className="py-12 text-center text-text-muted text-body-sm">
              <span className="material-symbols-outlined text-[40px] mb-2 block text-text-muted">
                search_off
              </span>
              Không tìm thấy giọng đọc nào khớp với từ khóa tìm kiếm.
            </div>
          ) : (
            filteredVoices.map((voice) => {
              const isSelected = selectedVoice.id === voice.id;
              const isPlaying = playingVoiceId === voice.id;

              return (
                <div
                  key={voice.id}
                  onClick={() => {
                    onSelectVoice(voice);
                    handleClose();
                  }}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer group ${
                    isSelected
                      ? 'bg-surface-container-high border-primary-container shadow-[0_0_20px_rgba(0,242,254,0.15)] ring-1 ring-primary-container'
                      : 'bg-surface-container/40 border-border-glass hover:bg-surface-container hover:border-primary-container/40'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Avatar Initials */}
                    <div className="relative">
                      <span className="w-11 h-11 rounded-full bg-gradient-to-tr from-primary-container to-secondary-container flex items-center justify-center font-headline-sm text-[13px] text-canvas-base font-black shrink-0 shadow-sm">
                        {voice.avatarInitials}
                      </span>
                      {voice.gender === 'female' ? (
                        <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-accent-violet-bright text-white text-[10px] flex items-center justify-center font-bold">
                          ♀
                        </span>
                      ) : (
                        <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-primary-container text-surface-card text-[10px] flex items-center justify-center font-bold">
                          ♂
                        </span>
                      )}
                    </div>

                    {/* Meta info */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-label-md text-label-md font-bold text-on-surface group-hover:text-primary-container transition-colors truncate">
                          {voice.name}
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-primary-container/15 text-primary-container">
                          {voice.country}
                        </span>
                        {voice.isPremium ? (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-signal-warning/20 text-signal-warning">
                            PRO
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-signal-success/20 text-signal-success">
                            FREE
                          </span>
                        )}
                      </div>

                      <p className="font-body-xs text-[12px] text-text-secondary truncate mt-0.5">
                        {voice.style}
                      </p>

                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        {voice.tags.slice(0, 3).map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-1.5 py-0.2 rounded text-[10px] bg-surface-container-high text-text-muted"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Actions (Preview Audio & Select Check) */}
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {/* Preview Button */}
                    <button
                      type="button"
                      title={isPlaying ? 'Dừng phát' : 'Nghe thử âm thanh'}
                      onClick={(e) => handlePlayPreview(voice, e)}
                      className={`h-9 w-9 rounded-full flex items-center justify-center transition-all ${
                        isPlaying
                          ? 'bg-primary-container text-surface-card shadow-glow-cyan scale-105'
                          : 'bg-surface-container-high text-primary-container hover:bg-primary-container hover:text-surface-card'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[20px]">
                        {isPlaying ? 'pause' : 'volume_up'}
                      </span>
                    </button>

                    {/* Selection Indicator */}
                    <div
                      className={`h-6 w-6 rounded-full flex items-center justify-center transition-all ${
                        isSelected
                          ? 'bg-primary-container text-surface-card'
                          : 'border border-border-glass text-transparent group-hover:border-primary-container'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px] font-bold">
                        check
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-space-md sm:px-space-lg py-3 bg-surface-container-lowest border-t border-border-glass flex items-center justify-between text-body-xs text-text-muted">
          <span>Giọng hiện tại: <strong className="text-primary-container">{selectedVoice.name}</strong></span>
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-1.5 rounded-xl bg-primary-container text-surface-card font-bold hover:shadow-glow-cyan transition-all"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
