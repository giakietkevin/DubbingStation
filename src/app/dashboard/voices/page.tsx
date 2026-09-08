'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Voice } from '@/types';

export default function VoicesPage() {
  const router = useRouter();
  const [voices, setVoices] = useState<Voice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedCountry, setSelectedCountry] = useState('all');
  const [selectedGender, setSelectedGender] = useState('all');
  const [selectedTier, setSelectedTier] = useState('all');
  const [favorites, setFavorites] = useState<string[]>([]);

  // Audio playback state
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const categories = [
    { id: 'all', label: 'Tất cả giọng đọc' },
    { id: 'dataset', label: '🎧 VIVOS • Common Voice • OpenSLR (11 Giọng Mới)' },
    { id: 'huggingface', label: '🤗 Hugging Face Models' },
    { id: 'vivos', label: '🇻🇳 VIVOS (AILAB)' },
    { id: 'common_voice', label: '🗣️ Common Voice 17.0' },
    { id: 'openslr', label: '🎙️ OpenSLR 57 Studio' },
    { id: 'international', label: '🌐 Quốc Tế (US, UK, Nhật, Hàn, Trung)' },
  ];

  const fetchVoices = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (selectedCategory !== 'all') params.append('category', selectedCategory);
      if (selectedCountry !== 'all') params.append('country', selectedCountry);
      if (selectedGender !== 'all') params.append('gender', selectedGender);
      if (selectedTier !== 'all') params.append('tier', selectedTier);

      const res = await fetch(`/api/voices?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setVoices(data.voices);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVoices();
  }, [search, selectedCategory, selectedCountry, selectedGender, selectedTier]);

  // Load saved favorites from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('dubbing_fav_voices');
      if (saved) {
        setFavorites(JSON.parse(saved));
      }
    } catch (e) {
      // Ignore
    }
  }, []);

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      try {
        localStorage.setItem('dubbing_fav_voices', JSON.stringify(next));
      } catch (err) {}
      return next;
    });
  };

  const handlePlaySample = (voice: Voice, e: React.MouseEvent) => {
    e.stopPropagation();

    if (playingVoiceId === voice.id) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setPlayingVoiceId(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const sampleUrl = voice.previewUrl || `/api/voices/preview?voiceId=${voice.id}&gender=${voice.gender}`;
    const audio = new Audio(sampleUrl);
    audioRef.current = audio;

    audio.onended = () => {
      setPlayingVoiceId(null);
    };

    audio.onerror = () => {
      setPlayingVoiceId(null);
    };

    audio.play().catch(() => {
      setPlayingVoiceId(null);
    });

    setPlayingVoiceId(voice.id);
  };

  const handleUseVoice = (voiceId: string) => {
    router.push(`/dashboard?voice=${voiceId}`);
  };

  const countries = [
    { value: 'all', label: 'Tất cả quốc gia' },
    { value: 'VIỆT NAM', label: '🇻🇳 Việt Nam' },
    { value: 'USA', label: '🇺🇸 Hoa Kỳ (English)' },
    { value: 'UK', label: '🇬🇧 Vương Quốc Anh' },
    { value: 'JAPAN', label: '🇯🇵 Nhật Bản' },
    { value: 'KOREA', label: '🇰🇷 Hàn Quốc' },
    { value: 'CHINA', label: '🇨🇳 Trung Quốc' },
  ];

  return (
    <div className="flex flex-col gap-space-lg max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-headline-md text-headline-md font-bold text-text-primary">
              Thư Viện Giọng Đọc AI
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-primary-container/15 text-primary-container font-code-xs text-[11px] font-bold">
              {voices.length} Voices
            </span>
          </div>
          <p className="font-body-sm text-body-sm text-text-muted mt-1">
            Khám phá và nghe thử kho giọng đọc Neural sống động với đầy đủ ngôn ngữ, cảm xúc và ngữ điệu tự nhiên.
          </p>
        </div>

        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-container text-canvas-base font-label-md text-label-md font-bold hover:opacity-90 transition-opacity self-start sm:self-auto"
        >
          <span className="material-symbols-outlined text-[18px]">mic</span>
          <span>Vào Studio thu âm</span>
        </Link>
      </div>

      {/* Featured Dataset Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-surface-card to-blue-950/40 border border-emerald-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-[0_0_25px_rgba(16,185,129,0.1)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[24px]">graphic_eq</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-[14px] text-text-primary">
                Đã cập nhật 11 giọng đọc mới từ 3 Dataset AI lớn
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px]">
                MỚI
              </span>
            </div>
            <p className="text-[12px] text-text-muted mt-0.5">
              Bao gồm: <strong>VIVOS</strong> (AILAB ĐHQG TP.HCM), <strong>Mozilla Common Voice 17.0</strong> (Đa vùng miền & đời thực), và <strong>OpenSLR 57</strong> (Studio Master 48kHz).
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setSelectedCategory('dataset')}
          className="px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 font-bold text-[12px] transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5"
        >
          <span>Lọc 11 giọng mới</span>
          <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
        </button>
      </div>

      {/* Filter Bar & Search */}
      <div className="p-space-md rounded-2xl bg-surface-card border border-border-glass flex flex-col gap-space-md">
        {/* Search input */}
        <div className="relative w-full">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[20px] text-text-muted">
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên giọng đọc, phong cách (VIVOS, Common Voice, OpenSLR, Sài Gòn, Đà Nẵng, Nghệ An, trầm ấm)..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-container-lowest border border-border-glass text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary-container font-body-sm text-body-sm transition-colors"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          )}
        </div>

        {/* Categories Tab Horizontal Slider */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-[12px] font-bold whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? 'bg-primary-container text-canvas-base shadow-[0_0_15px_rgba(0,242,254,0.3)]'
                  : 'bg-surface-container-lowest border border-border-glass text-text-secondary hover:text-text-primary hover:bg-surface-container-high'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Filter Chips & Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-sm">
          {/* Country filter */}
          <div className="flex flex-col gap-1">
            <label className="font-label-sm text-[11px] text-text-muted uppercase font-semibold">
              Ngôn ngữ / Quốc gia
            </label>
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-surface-container-lowest border border-border-glass text-text-primary font-body-sm text-body-sm focus:outline-none focus:border-primary-container"
            >
              {countries.map((c) => (
                <option key={c.value} value={c.value} className="bg-surface-card">
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Gender filter */}
          <div className="flex flex-col gap-1">
            <label className="font-label-sm text-[11px] text-text-muted uppercase font-semibold">
              Giới tính
            </label>
            <div className="flex items-center gap-1 bg-surface-container-lowest p-1 rounded-xl border border-border-glass h-[38px]">
              <button
                type="button"
                onClick={() => setSelectedGender('all')}
                className={`flex-1 py-1 text-center font-label-sm text-[12px] rounded-lg transition-colors ${
                  selectedGender === 'all'
                    ? 'bg-primary-container text-canvas-base font-bold'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                Tất cả
              </button>
              <button
                type="button"
                onClick={() => setSelectedGender('male')}
                className={`flex-1 py-1 text-center font-label-sm text-[12px] rounded-lg transition-colors ${
                  selectedGender === 'male'
                    ? 'bg-primary-container text-canvas-base font-bold'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                Nam
              </button>
              <button
                type="button"
                onClick={() => setSelectedGender('female')}
                className={`flex-1 py-1 text-center font-label-sm text-[12px] rounded-lg transition-colors ${
                  selectedGender === 'female'
                    ? 'bg-primary-container text-canvas-base font-bold'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                Nữ
              </button>
            </div>
          </div>

          {/* Tier filter */}
          <div className="flex flex-col gap-1">
            <label className="font-label-sm text-[11px] text-text-muted uppercase font-semibold">
              Gói dịch vụ
            </label>
            <div className="flex items-center gap-1 bg-surface-container-lowest p-1 rounded-xl border border-border-glass h-[38px]">
              <button
                type="button"
                onClick={() => setSelectedTier('all')}
                className={`flex-1 py-1 text-center font-label-sm text-[12px] rounded-lg transition-colors ${
                  selectedTier === 'all'
                    ? 'bg-primary-container text-canvas-base font-bold'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                Tất cả
              </button>
              <button
                type="button"
                onClick={() => setSelectedTier('free')}
                className={`flex-1 py-1 text-center font-label-sm text-[12px] rounded-lg transition-colors ${
                  selectedTier === 'free'
                    ? 'bg-primary-container text-canvas-base font-bold'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                Free
              </button>
              <button
                type="button"
                onClick={() => setSelectedTier('premium')}
                className={`flex-1 py-1 text-center font-label-sm text-[12px] rounded-lg transition-colors ${
                  selectedTier === 'premium'
                    ? 'bg-secondary-container text-on-secondary-container font-bold'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                Pro AI
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <span className="w-8 h-8 rounded-full border-2 border-primary-container border-t-transparent animate-spin" />
          <span className="font-body-md text-body-md text-text-muted">Đang tải danh sách giọng đọc...</span>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && voices.length === 0 && (
        <div className="py-20 flex flex-col items-center justify-center text-center gap-3">
          <span className="material-symbols-outlined text-[48px] text-text-muted">mic_off</span>
          <h3 className="font-headline-sm text-headline-sm font-bold text-text-primary">
            Không tìm thấy giọng đọc phù hợp
          </h3>
          <p className="font-body-md text-body-md text-text-muted max-w-sm">
            Hãy thử tìm kiếm bằng từ khóa khác hoặc điều chỉnh lại các bộ lọc quốc gia và giới tính.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setSelectedCategory('all');
              setSelectedCountry('all');
              setSelectedGender('all');
              setSelectedTier('all');
            }}
            className="mt-2 px-4 py-2 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-text-primary font-label-sm text-label-sm font-semibold transition-colors"
          >
            Đặt lại tất cả bộ lọc
          </button>
        </div>
      )}

      {/* Voices Grid */}
      {!isLoading && voices.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-md">
          {voices.map((voice) => {
            const isPlaying = playingVoiceId === voice.id;
            const isFav = favorites.includes(voice.id);

            return (
              <div
                key={voice.id}
                className={`p-space-md rounded-2xl bg-surface-card border transition-all duration-200 flex flex-col justify-between gap-space-md group hover:shadow-[0_8px_24px_rgba(0,0,0,0.4)] ${
                  isPlaying
                    ? 'border-primary-container shadow-[0_0_20px_rgba(0,242,254,0.15)] bg-surface-container-low'
                    : 'border-border-glass hover:border-border-glass-strong'
                }`}
              >
                {/* Header: Avatar, Name, Country & Bookmark */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {/* Avatar Initials with live audio ring when playing */}
                    <div className="relative">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-primary-container to-secondary-container flex items-center justify-center font-headline-sm text-headline-sm font-bold text-canvas-base shadow-sm">
                        {voice.avatarInitials}
                      </div>
                      {isPlaying && (
                        <span className="absolute -inset-1 rounded-xl border-2 border-primary-container animate-ping opacity-60" />
                      )}
                    </div>

                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-label-lg text-label-lg font-bold text-text-primary">
                          {voice.name}
                        </span>
                        {voice.tags.includes('VIVOS') && (
                          <span className="px-1.5 py-0.5 rounded font-code-xs text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            VIVOS AILAB
                          </span>
                        )}
                        {voice.tags.includes('Common Voice') && (
                          <span className="px-1.5 py-0.5 rounded font-code-xs text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                            COMMON VOICE 17.0
                          </span>
                        )}
                        {voice.tags.includes('OpenSLR') && (
                          <span className="px-1.5 py-0.5 rounded font-code-xs text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                            OPENSLR 57 STUDIO
                          </span>
                        )}
                        {(voice.provider === 'huggingface' || voice.tags.includes('Hugging Face')) && (
                          <span className="px-1.5 py-0.5 rounded font-code-xs text-[10px] font-bold bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
                            🤗 HUGGING FACE
                          </span>
                        )}
                        {voice.isPremium ? (
                          <span className="px-1.5 py-0.5 rounded font-code-xs text-[10px] font-bold bg-secondary-container/25 text-secondary">
                            PRO
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded font-code-xs text-[10px] font-bold bg-signal-success/20 text-signal-success">
                            FREE
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 font-code-xs text-code-xs text-text-muted mt-0.5">
                        <span>{voice.country}</span>
                        <span>•</span>
                        <span>{voice.gender === 'male' ? 'Nam' : 'Nữ'}</span>
                        {voice.age && (
                          <>
                            <span>•</span>
                            <span className="capitalize">{voice.age}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Bookmark Button */}
                  <button
                    type="button"
                    onClick={(e) => toggleFavorite(voice.id, e)}
                    title={isFav ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'}
                    className={`p-1.5 rounded-lg transition-colors ${
                      isFav
                        ? 'text-signal-warning bg-signal-warning/10'
                        : 'text-text-muted hover:text-text-primary hover:bg-surface-container'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {isFav ? 'star' : 'star_border'}
                    </span>
                  </button>
                </div>

                {/* Style & Tags */}
                <div className="flex flex-col gap-2">
                  <p className="font-body-sm text-body-sm text-text-secondary line-clamp-2">
                    {voice.style}
                  </p>

                  <div className="flex flex-wrap gap-1.5">
                    {voice.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded-md bg-surface-container-high font-code-xs text-[11px] text-text-muted"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>

                  {voice.useCase && (
                    <div className="flex items-center gap-1.5 text-[11px] font-body-sm text-primary-container/90 mt-1">
                      <span className="material-symbols-outlined text-[14px]">category</span>
                      <span>{voice.useCase}</span>
                    </div>
                  )}
                </div>

                {/* Actions Deck */}
                <div className="pt-2 border-t border-border-glass flex items-center justify-between gap-2">
                  {/* Sample Play Button */}
                  <button
                    type="button"
                    onClick={(e) => handlePlaySample(voice, e)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-label-sm text-label-sm font-semibold transition-all ${
                      isPlaying
                        ? 'bg-primary-container text-canvas-base shadow-[0_0_12px_rgba(0,242,254,0.3)]'
                        : 'bg-surface-container-high hover:bg-surface-container-highest text-text-primary'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {isPlaying ? 'pause' : 'play_arrow'}
                    </span>
                    <span>{isPlaying ? 'Đang phát...' : 'Nghe thử'}</span>
                  </button>

                  {/* Use in Studio */}
                  <button
                    type="button"
                    onClick={() => handleUseVoice(voice.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container-lowest hover:bg-surface-container border border-border-glass hover:border-primary-container text-text-primary hover:text-primary-container font-label-sm text-label-sm font-semibold transition-colors"
                  >
                    <span>Chọn giọng này</span>
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
