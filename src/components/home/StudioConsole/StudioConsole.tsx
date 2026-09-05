'use client';

import React, { useState, useEffect, useRef } from 'react';
import type { StudioMode, Voice } from '@/types';
import { defaultVoice } from '@/data/voices';
import { ModeTabs } from './ModeTabs';
import { TextInputArea } from './TextInputArea';
import { ControlDeck } from './ControlDeck';
import { AudioPlayerDeck } from './AudioPlayerDeck';
import { VoiceModal } from './VoiceModal';

export const StudioConsole: React.FC = () => {
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
  const [hasAudioRing, setHasAudioRing] = useState<boolean>(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState<boolean>(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Playback timer effect
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= 14) {
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
  }, [isPlaying]);

  const handleTogglePlay = () => {
    setIsPlaying((prev) => !prev);
  };

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      setHasAudioRing(true);
      setCurrentTime(0);
      setIsPlaying(true);
      setTimeout(() => setHasAudioRing(false), 1500);
    }, 900);
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
            totalDuration={14}
            fileName={`${selectedVoice.name.replace(/\s+/g, '_')}_Audio_Dubbing.mp3`}
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
