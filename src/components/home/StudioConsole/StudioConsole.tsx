'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import type { StudioMode, Voice } from '@/types';
import { defaultVoice, voices } from '@/data/voices';
import { ModeTabs } from './ModeTabs';
import { TextInputArea } from './TextInputArea';
import { ControlDeck } from './ControlDeck';
import { AudioPlayerDeck } from './AudioPlayerDeck';
import { VoiceModal } from './VoiceModal';

export const StudioConsole: React.FC = () => {
  const searchParams = useSearchParams();
  // State
  const [activeTab, setActiveTab] = useState<StudioMode>('tts');
  const [text, setText] = useState<string>(
    'Chào mừng bạn đến với DubbingStation! Nền tảng phòng thu giọng nói AI đa năng với khả năng lồng tiếng chân thực, chuyển đổi cảm xúc linh hoạt và trích xuất phụ đề video tự động chỉ trong tích tắc.'
  );
  const [selectedVoice, setSelectedVoice] = useState<Voice>(defaultVoice);
  const [selectedEmotion, setSelectedEmotion] = useState<string>('Tự nhiên');
  const [speed, setSpeed] = useState<number>(1.0);
  const [provider, setProvider] = useState<'microsoft' | 'openai' | 'piper' | 'google'>('microsoft');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [totalDuration, setTotalDuration] = useState<number>(14);
  const [fileName, setFileName] = useState<string>('Minh_Khang_Audio_Dubbing.mp3');
  const [hasAudioRing, setHasAudioRing] = useState<boolean>(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{
    text: string;
    type: 'success' | 'error';
    requireLogin?: boolean;
    requireBilling?: boolean;
  } | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>('');

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleSelectVoice = (voice: Voice) => {
    setSelectedVoice(voice);
    if (voice.provider) {
      setProvider(voice.provider);
    } else if (voice.tags.includes('Piper')) {
      setProvider('piper');
    } else if (voice.tags.includes('OpenAI')) {
      setProvider('openai');
    } else if (voice.id === 'chi-google' || voice.tags.includes('Chị Google')) {
      setProvider('google');
    } else {
      setProvider('microsoft');
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
    setAudioUrl('');
    setCurrentTime(0);
    const ext = voice.provider === 'piper' ? 'wav' : 'mp3';
    setFileName(`${voice.name}_Dubbing.${ext}`);
  };

  const handleTextChange = (newText: string) => {
    setText(newText);
    setAudioUrl('');
  };

  const handleSpeedChange = (newSpeed: number) => {
    setSpeed(newSpeed);
    setAudioUrl('');
  };

  const handleProviderChange = (newProvider: 'microsoft' | 'openai' | 'piper' | 'google') => {
    setProvider(newProvider);
    setAudioUrl('');
  };

  // Sync voice from URL query param if present (e.g. ?voice=mai-anh or custom-123)
  useEffect(() => {
    const voiceParam = searchParams.get('voice');
    if (voiceParam) {
      const found = voices.find((v) => v.id === voiceParam);
      if (found) {
        handleSelectVoice(found);
      } else {
        try {
          const saved = localStorage.getItem('dubbing_custom_voices');
          if (saved) {
            const parsed = JSON.parse(saved);
            const customFound = parsed.find((v: any) => v.id === voiceParam);
            if (customFound) {
              handleSelectVoice(customFound);
            }
          }
        } catch {}
      }
    }
  }, [searchParams]);

  // Clean text from custom helper tags [pause 0.5s], [thì_thầm] etc
  const cleanTextForSpeech = (rawText: string) => {
    return rawText
      .replace(/\[pause\s+[0-9.]+s\]/gi, ' ... ')
      .replace(/\[thì_thầm\]/gi, '')
      .replace(/\[nhấn_mạnh\]/gi, '')
      .replace(/\[.*?\]/g, '')
      .trim();
  };

  // Build Stream URL helper
  const buildStreamUrl = () => {
    const params = new URLSearchParams({
      text: cleanTextForSpeech(text),
      voiceId: selectedVoice.id,
      speed: speed.toString(),
      provider: provider,
    });
    if (selectedVoice.customPitch) params.set('pitch', selectedVoice.customPitch);
    if (selectedVoice.customRate) params.set('rate', selectedVoice.customRate);
    if (selectedVoice.customVolume) params.set('volume', selectedVoice.customVolume);
    if (selectedVoice.baseModel) params.set('model', selectedVoice.baseModel);
    if (selectedVoice.vocalFingerprint) {
      const fp = selectedVoice.vocalFingerprint;
      if (fp.warmth !== undefined) params.set('warmth', fp.warmth.toString());
      if (fp.brightness !== undefined) params.set('brightness', fp.brightness.toString());
      if (fp.fullness !== undefined) params.set('fullness', fp.fullness.toString());
      if (fp.f1 !== undefined) params.set('f1', fp.f1.toString());
      if (fp.f2 !== undefined) params.set('f2', fp.f2.toString());
    }
    return `/api/tts/stream?${params.toString()}`;
  };

  // Play Neural MP3 Audio from Backend
  const playAudio = () => {
    const targetUrl = audioUrl || buildStreamUrl();

    if (!audioRef.current) {
      audioRef.current = new Audio(targetUrl);
    } else {
      audioRef.current.src = targetUrl;
    }

    audioRef.current.playbackRate = speed;

    audioRef.current.ontimeupdate = () => {
      if (audioRef.current) {
        setCurrentTime(Math.floor(audioRef.current.currentTime));
      }
    };

    audioRef.current.onloadedmetadata = () => {
      if (audioRef.current && !isNaN(audioRef.current.duration)) {
        setTotalDuration(Math.ceil(audioRef.current.duration));
      }
    };

    audioRef.current.onended = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audioRef.current.onerror = () => {
      setIsPlaying(false);
    };

    audioRef.current
      .play()
      .then(() => {
        setIsPlaying(true);
      })
      .catch((err) => {
        console.log('Playback error', err);
        setIsPlaying(false);
      });
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
  };

  const handleTogglePlay = () => {
    if (isPlaying) {
      stopAudio();
    } else {
      playAudio();
    }
  };

  const handleDownload = () => {
    const downloadLink = audioUrl || buildStreamUrl();

    const a = document.createElement('a');
    a.href = downloadLink;
    a.download = fileName;
    a.target = '_blank';
    a.click();
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setStatusMessage(null);
    stopAudio();

    const isBatch = text.trim().length > 5000;
    const endpoint = isBatch ? '/api/tts/batch' : '/api/tts/generate';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voiceId: selectedVoice.id,
          voiceName: selectedVoice.name,
          speed,
          emotion: selectedEmotion,
          provider,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401 || data.requireLogin) {
          setStatusMessage({
            text: data.error || 'Vui lòng đăng nhập tài khoản để sử dụng 50.000 Credits tạo âm thanh!',
            type: 'error',
            requireLogin: true,
          });
        } else if (res.status === 402) {
          setStatusMessage({
            text: data.error || 'Số dư Credits không đủ. Vui lòng nạp thêm Credits để tiếp tục.',
            type: 'error',
            requireBilling: true,
          });
        } else {
          setStatusMessage({ text: data.error || 'Tạo âm thanh thất bại', type: 'error' });
        }
        setIsGenerating(false);
        return;
      }

      const streamEndpoint = buildStreamUrl();
      setAudioUrl(streamEndpoint);
      const ext = provider === 'piper' ? 'wav' : 'mp3';
      setFileName(`${selectedVoice.name}_${provider}_${Date.now()}.${ext}`);

      // Phát sự kiện cập nhật Credits realtime cho Header và Sidebar
      if (typeof data.remainingCredits === 'number') {
        window.dispatchEvent(
          new CustomEvent('creditsUpdated', {
            detail: { remainingCredits: data.remainingCredits },
          })
        );
      }

      if (data.mode === 'batch') {
        setStatusMessage({
          text: `Batch Render thành công! Đã chia ${data.totalChunks} đoạn và trừ -${data.creditsDeducted.toLocaleString('vi-VN')} Credits trong CSDL (Còn lại: ${data.remainingCredits.toLocaleString('vi-VN')} Credits).`,
          type: 'success',
        });
      } else {
        const providerLabel =
          provider === 'google'
            ? 'Chị Google (TikTok Viral)'
            : provider === 'openai'
            ? 'OpenAI HD'
            : provider === 'piper'
            ? 'Piper Free'
            : 'Neural Studio';

        const deductInfo = typeof data.creditsDeducted === 'number'
          ? `Đã trừ -${data.creditsDeducted.toLocaleString('vi-VN')} Credits (Còn: ${data.remainingCredits.toLocaleString('vi-VN')} Credits). `
          : '';

        setStatusMessage({
          text: `Tạo âm thanh thành công! ${deductInfo}Đang phát giọng đọc ${providerLabel} của "${selectedVoice.name}"...`,
          type: 'success',
        });
      }

      setCurrentTime(0);
      setHasAudioRing(true);
      setTimeout(() => setHasAudioRing(false), 2000);

      // Tự động phát âm thanh MP3 chất lượng cao ngay lập tức
      setTimeout(() => {
        playAudio();
      }, 100);
    } catch (err) {
      console.error(err);
      setStatusMessage({ text: 'Lỗi kết nối máy chủ. Vui lòng thử lại.', type: 'error' });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <section id="demo-player" className="relative w-full pb-space-2xl">
      <div className="max-w-max-width-content mx-auto px-gutter-desktop">
        <div className="relative w-full rounded-xl bg-surface-card/90 backdrop-blur-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.85)] p-space-sm sm:p-space-md">
          {/* Edge Gradient Line */}
          <div
            aria-hidden="true"
            className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary-container to-secondary-container rounded-t-xl"
          />

          {/* Mode Switcher Tabs */}
          <ModeTabs activeTab={activeTab} onTabChange={setActiveTab} />

          {/* Status Message Notification */}
          {statusMessage && (
            <div
              className={`mb-space-sm p-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-body-sm text-body-sm ${
                statusMessage.type === 'success'
                  ? 'bg-signal-success/15 border border-signal-success/30 text-signal-success'
                  : 'bg-signal-danger/15 border border-signal-danger/30 text-signal-danger'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] shrink-0">
                  {statusMessage.type === 'success' ? 'check_circle' : 'error'}
                </span>
                <span>{statusMessage.text}</span>
              </div>

              {statusMessage.requireLogin && (
                <a
                  href="/login"
                  className="px-3 py-1.5 rounded-lg bg-primary-container text-surface-card font-bold text-xs flex items-center gap-1 self-start sm:self-auto hover:shadow-glow-cyan transition-all shrink-0"
                >
                  <span className="material-symbols-outlined text-[16px]">login</span>
                  <span>Đăng Nhập (+50k Credits)</span>
                </a>
              )}

              {statusMessage.requireBilling && (
                <a
                  href="/dashboard/billing"
                  className="px-3 py-1.5 rounded-lg bg-secondary text-surface-card font-bold text-xs flex items-center gap-1 self-start sm:self-auto hover:shadow-sm transition-all shrink-0"
                >
                  <span className="material-symbols-outlined text-[16px]">token</span>
                  <span>Nạp Thêm Credits</span>
                </a>
              )}
            </div>
          )}

          {/* Main Studio Workspace Container */}
          <div className="rounded-xl bg-surface-container-lowest p-space-md flex flex-col gap-space-md shadow-inner">
            {/* Text Input Area with SSML helper tags & dynamic credit counter */}
            <TextInputArea text={text} onChange={handleTextChange} />

            {/* Bottom Control Deck */}
            <ControlDeck
              selectedVoice={selectedVoice}
              onOpenVoiceModal={() => setIsVoiceModalOpen(true)}
              selectedEmotion={selectedEmotion}
              onSelectEmotion={setSelectedEmotion}
              speed={speed}
              onSpeedChange={handleSpeedChange}
              isGenerating={isGenerating}
              onGenerate={handleGenerate}
              provider={provider}
              onProviderChange={handleProviderChange}
            />
          </div>

          {/* Audio Player Deck */}
          <AudioPlayerDeck
            isPlaying={isPlaying}
            onTogglePlay={handleTogglePlay}
            currentTime={currentTime}
            totalDuration={totalDuration}
            fileName={fileName}
            hasAudioRing={hasAudioRing}
            onDownload={handleDownload}
          />
        </div>
      </div>

      {/* Voice Selection Modal */}
      <VoiceModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        selectedVoice={selectedVoice}
        onSelectVoice={handleSelectVoice}
      />
    </section>
  );
};
