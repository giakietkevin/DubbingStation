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
  const [provider, setProvider] = useState<'microsoft' | 'openai' | 'piper'>('microsoft');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [totalDuration, setTotalDuration] = useState<number>(14);
  const [fileName, setFileName] = useState<string>('Minh_Khang_Audio_Dubbing.mp3');
  const [hasAudioRing, setHasAudioRing] = useState<boolean>(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>('');

  const audioRef = useRef<HTMLAudioElement | null>(null);

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

  // Clean text from custom helper tags [pause 0.5s], [thì_thầm] etc
  const cleanTextForSpeech = (rawText: string) => {
    return rawText
      .replace(/\[pause\s+[0-9.]+s\]/gi, ' ... ')
      .replace(/\[thì_thầm\]/gi, '')
      .replace(/\[nhấn_mạnh\]/gi, '')
      .replace(/\[.*?\]/g, '')
      .trim();
  };

  // Play Neural MP3 Audio from Backend
  const playAudio = () => {
    const targetUrl =
      audioUrl ||
      `/api/tts/stream?text=${encodeURIComponent(cleanTextForSpeech(text))}&voiceId=${selectedVoice.id}&speed=${speed}&provider=${provider}`;

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
    const downloadLink =
      audioUrl ||
      `/api/tts/stream?text=${encodeURIComponent(cleanTextForSpeech(text))}&voiceId=${selectedVoice.id}&speed=${speed}&provider=${provider}`;

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
        setStatusMessage({ text: data.error || 'Tạo âm thanh thất bại', type: 'error' });
        setIsGenerating(false);
        return;
      }

      const streamEndpoint = `/api/tts/stream?text=${encodeURIComponent(cleanTextForSpeech(text))}&voiceId=${selectedVoice.id}&speed=${speed}&provider=${provider}`;
      setAudioUrl(streamEndpoint);
      const ext = provider === 'piper' ? 'wav' : 'mp3';
      setFileName(`${selectedVoice.name}_${provider}_${Date.now()}.${ext}`);

      if (data.mode === 'batch') {
        setStatusMessage({
          text: `Batch Render thành công! Đã chia ${data.totalChunks} đoạn và trừ ${data.creditsDeducted.toLocaleString('vi-VN')} Credits.`,
          type: 'success',
        });
      } else {
        const providerLabel = provider === 'openai' ? 'OpenAI HD' : provider === 'piper' ? 'Piper Free' : 'Neural Studio';
        setStatusMessage({
          text: `Tạo âm thanh thành công! Đang phát giọng đọc ${providerLabel} của "${selectedVoice.name}"...`,
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
              provider={provider}
              onProviderChange={setProvider}
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
        onSelectVoice={setSelectedVoice}
      />
    </section>
  );
};
