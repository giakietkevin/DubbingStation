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
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [totalDuration, setTotalDuration] = useState<number>(14);
  const [fileName, setFileName] = useState<string>('Minh_Khang_Audio_Dubbing.mp3');
  const [hasAudioRing, setHasAudioRing] = useState<boolean>(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync voice from URL query param if present (e.g. ?voice=mai-anh)
  useEffect(() => {
    const voiceParam = searchParams.get('voice');
    if (voiceParam) {
      const found = voices.find((v) => v.id === voiceParam);
      if (found) {
        setSelectedVoice(found);
      }
    }
  }, [searchParams]);

  // Playback timer effect
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= totalDuration) {
            setIsPlaying(false);
            if (timerRef.current) clearInterval(timerRef.current);
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isPlaying, totalDuration]);

  const handleTogglePlay = () => {
    setIsPlaying((prev) => !prev);
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setStatusMessage(null);

    try {
      const res = await fetch('/api/tts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voiceId: selectedVoice.id,
          voiceName: selectedVoice.name,
          speed,
          emotion: selectedEmotion,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatusMessage({ text: data.error || 'Tạo âm thanh thất bại', type: 'error' });
        setIsGenerating(false);
        return;
      }

      setFileName(data.fileName || `${selectedVoice.name}_Audio_Dubbing.mp3`);
      setTotalDuration(data.durationSec || Math.max(5, Math.round(text.length / 15)));
      setCurrentTime(0);
      setHasAudioRing(true);
      setIsPlaying(true);
      setStatusMessage({
        text: `Tạo âm thanh thành công! Đã trừ ${data.creditsDeducted.toLocaleString('vi-VN')} Credits.`,
        type: 'success',
      });

      setTimeout(() => setHasAudioRing(false), 2000);
    } catch (err) {
      console.error(err);
      setStatusMessage({ text: 'Lỗi kết nối máy chủ. Vui lòng thử lại.', type: 'error' });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <section className="relative w-full pb-space-2xl">
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
              className={`mb-space-sm p-3 rounded-xl flex items-center gap-2 font-body-sm text-body-sm ${
                statusMessage.type === 'success'
                  ? 'bg-signal-success/15 border border-signal-success/30 text-signal-success'
                  : 'bg-signal-danger/15 border border-signal-danger/30 text-signal-danger'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">
                {statusMessage.type === 'success' ? 'check_circle' : 'error'}
              </span>
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Main Studio Workspace Container */}
          <div className="rounded-xl bg-surface-container-lowest p-space-md flex flex-col gap-space-md shadow-inner">
            {/* Text Input Area with SSML helper tags & dynamic credit counter */}
            <TextInputArea text={text} onChange={setText} />

            {/* Bottom Control Deck */}
            <ControlDeck
              selectedVoice={selectedVoice}
              onOpenVoiceModal={() => setIsVoiceModalOpen(true)}
              selectedEmotion={selectedEmotion}
              onSelectEmotion={setSelectedEmotion}
              speed={speed}
              onSpeedChange={setSpeed}
              isGenerating={isGenerating}
              onGenerate={handleGenerate}
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
          />
        </div>
      </div>

      {/* Voice Selection Modal */}
      <VoiceModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        selectedVoice={selectedVoice}
        onSelectVoice={setSelectedVoice}
      />
    </section>
  );
};
