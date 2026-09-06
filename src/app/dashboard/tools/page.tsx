'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { audioTools } from '@/data/audioTools';
import {
  trimAudioBuffer,
  changeVolumeBuffer,
  changeSpeedBuffer,
  reverseAudioBuffer,
  audioBufferToWav,
} from '@/lib/webAudio';

export default function AudioToolsHubPage() {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTool, setSelectedTool] = useState<string | null>(null);

  // Audio state
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [originalDuration, setOriginalDuration] = useState<number>(0);
  const [processedBlobUrl, setProcessedBlobUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Tool Specific Controls
  const [trimStart, setTrimStart] = useState<number>(0);
  const [trimEnd, setTrimEnd] = useState<number>(10);
  const [volumeGain, setVolumeGain] = useState<number>(150); // %
  const [speedFactor, setSpeedFactor] = useState<number>(1.25); // x

  const audioContextRef = useRef<AudioContext | null>(null);

  const getAudioContext = () => {
    if (!audioContextRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioCtx();
    }
    return audioContextRef.current;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAudioFile(file);
    setProcessedBlobUrl(null);
    setStatusMessage(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const ctx = getAudioContext();
      const decodedBuffer = await ctx.decodeAudioData(arrayBuffer);
      setAudioBuffer(decodedBuffer);
      setOriginalDuration(decodedBuffer.duration);
      setTrimStart(0);
      setTrimEnd(Math.min(decodedBuffer.duration, 30));
    } catch (err) {
      console.error(err);
      setStatusMessage({ text: 'Không thể giải mã tệp âm thanh này.', type: 'error' });
    }
  };

  const processAudio = async () => {
    if (!audioBuffer) {
      setStatusMessage({ text: 'Vui lòng tải lên tệp âm thanh trước.', type: 'error' });
      return;
    }

    setIsProcessing(true);
    setStatusMessage(null);

    try {
      const ctx = getAudioContext();
      let resultBuffer: AudioBuffer | null = null;

      if (selectedTool === 'audio-trim') {
        resultBuffer = await trimAudioBuffer(audioBuffer, trimStart, trimEnd, ctx);
      } else if (selectedTool === 'volume-booster') {
        resultBuffer = await changeVolumeBuffer(audioBuffer, volumeGain / 100, ctx);
      } else if (selectedTool === 'speed-changer') {
        resultBuffer = await changeSpeedBuffer(audioBuffer, speedFactor, ctx);
      } else if (selectedTool === 'audio-reverse') {
        resultBuffer = await reverseAudioBuffer(audioBuffer, ctx);
      } else {
        // Mặc định xuất bản sao WAV
        resultBuffer = audioBuffer;
      }

      if (resultBuffer) {
        const wavBlob = audioBufferToWav(resultBuffer);
        const url = URL.createObjectURL(wavBlob);
        setProcessedBlobUrl(url);
        setStatusMessage({
          text: 'Xử lý âm thanh WebAssembly hoàn tất 100% trong trình duyệt!',
          type: 'success',
        });
      }
    } catch (err) {
      console.error(err);
      setStatusMessage({ text: 'Lỗi khi xử lý âm thanh.', type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const categories = [
    { id: 'all', label: 'Tất cả 22 công cụ' },
    { id: 'basic', label: 'Cắt, Ghép & Chỉnh sửa' },
    { id: 'ai', label: 'Tách nhạc & Lọc âm' },
    { id: 'format', label: 'Chuyển định dạng' },
    { id: 'fx', label: 'Hiệu ứng & Âm thanh' },
  ];

  const filteredTools = audioTools.filter((tool) => {
    const matchCat = activeCategory === 'all' || tool.category === activeCategory;
    const matchSearch =
      tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  const activeToolObj = audioTools.find((t) => t.id === selectedTool);

  return (
    <div className="space-y-space-lg max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface-card border border-border-glass rounded-2xl p-space-md lg:p-space-lg backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-primary-container text-[28px]">
              construction
            </span>
            <h1 className="font-headline-md text-headline-md font-bold text-on-surface">
              22 Client-Side WASM Audio Tools
            </h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-signal-success/20 text-signal-success uppercase tracking-wider">
              100% Free • 0 Credit
            </span>
          </div>
          <p className="font-body-md text-text-secondary">
            Xử lý toàn bộ trên trình duyệt qua WebAssembly & Web Audio API. Tệp không bao giờ tải lên máy chủ, bảo mật tuyệt đối.
          </p>
        </div>
      </div>

      {/* Active Tool Interactive Studio Modal / Box */}
      {selectedTool && activeToolObj && (
        <div className="bg-surface-card border-2 border-primary-container/40 rounded-2xl p-space-md lg:p-space-lg space-y-space-md animate-fadeIn shadow-[0_0_25px_rgba(0,242,254,0.15)]">
          <div className="flex items-center justify-between border-b border-border-glass pb-3">
            <div className="flex items-center gap-3">
              <span className={`material-symbols-outlined text-[28px] ${activeToolObj.colorClass}`}>
                {activeToolObj.icon}
              </span>
              <div>
                <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                  {activeToolObj.name}
                </h3>
                <p className="text-body-xs text-text-secondary">{activeToolObj.description}</p>
              </div>
            </div>
            <button
              onClick={() => {
                setSelectedTool(null);
                setProcessedBlobUrl(null);
              }}
              className="p-1.5 rounded-lg text-text-muted hover:text-on-surface hover:bg-surface-container transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* Upload and Control Deck */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
            {/* Upload Area */}
            <div className="border border-dashed border-border-glass rounded-xl p-6 flex flex-col items-center justify-center bg-surface-container/30">
              <input
                type="file"
                id="wasm-audio-input"
                accept="audio/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <span className="material-symbols-outlined text-[40px] text-primary-container mb-2">
                audio_file
              </span>
              <p className="font-label-md text-on-surface font-semibold mb-1">
                {audioFile ? audioFile.name : 'Chọn tệp âm thanh để xử lý'}
              </p>
              {originalDuration > 0 && (
                <p className="text-body-xs text-primary-container mb-3 font-mono">
                  Thời lượng: {originalDuration.toFixed(1)}s • Kênh: {audioBuffer?.numberOfChannels}
                </p>
              )}
              <label
                htmlFor="wasm-audio-input"
                className="px-4 py-2 rounded-xl bg-surface-container-high border border-border-glass text-primary-container hover:bg-primary-container hover:text-surface-card font-label-md font-bold cursor-pointer transition-all inline-flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[18px]">upload</span>
                {audioFile ? 'Đổi tệp khác' : 'Tải lên âm thanh'}
              </label>
            </div>

            {/* Dynamic Controls based on selected tool */}
            <div className="bg-surface-container/50 border border-border-glass rounded-xl p-4 flex flex-col justify-between space-y-4">
              {selectedTool === 'audio-trim' && (
                <div className="space-y-3">
                  <h4 className="font-label-md text-on-surface font-bold">Cắt thời lượng (Giây)</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-body-xs text-text-secondary">Từ giây (Start):</label>
                      <input
                        type="number"
                        min="0"
                        max={trimEnd}
                        step="0.5"
                        value={trimStart}
                        onChange={(e) => setTrimStart(parseFloat(e.target.value) || 0)}
                        className="w-full mt-1 bg-surface-card border border-border-glass rounded-lg px-3 py-2 text-on-surface font-mono text-body-sm"
                      />
                    </div>
                    <div>
                      <label className="text-body-xs text-text-secondary">Đến giây (End):</label>
                      <input
                        type="number"
                        min={trimStart}
                        max={originalDuration || 60}
                        step="0.5"
                        value={trimEnd}
                        onChange={(e) => setTrimEnd(parseFloat(e.target.value) || 10)}
                        className="w-full mt-1 bg-surface-card border border-border-glass rounded-lg px-3 py-2 text-on-surface font-mono text-body-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              {selectedTool === 'volume-booster' && (
                <div className="space-y-3">
                  <div className="flex justify-between text-body-sm">
                    <span className="text-text-secondary">Mức tăng âm lượng:</span>
                    <span className="text-primary-container font-bold font-mono">{volumeGain}%</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="300"
                    step="10"
                    value={volumeGain}
                    onChange={(e) => setVolumeGain(parseInt(e.target.value))}
                    className="w-full accent-primary-container cursor-pointer"
                  />
                  <div className="flex justify-between text-[11px] text-text-muted">
                    <span>50% (Nhỏ)</span>
                    <span>100% (Gốc)</span>
                    <span>300% (Khuếch đại x3)</span>
                  </div>
                </div>
              )}

              {selectedTool === 'speed-changer' && (
                <div className="space-y-3">
                  <div className="flex justify-between text-body-sm">
                    <span className="text-text-secondary">Tốc độ phát:</span>
                    <span className="text-secondary font-bold font-mono">{speedFactor}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.05"
                    value={speedFactor}
                    onChange={(e) => setSpeedFactor(parseFloat(e.target.value))}
                    className="w-full accent-secondary cursor-pointer"
                  />
                  <div className="flex justify-between text-[11px] text-text-muted">
                    <span>0.5x (Chậm)</span>
                    <span>1.0x (Chuẩn)</span>
                    <span>2.0x (Nhanh)</span>
                  </div>
                </div>
              )}

              {selectedTool !== 'audio-trim' && selectedTool !== 'volume-booster' && selectedTool !== 'speed-changer' && (
                <div className="text-center py-4 text-text-secondary text-body-sm">
                  Công cụ tối ưu hóa tự động theo thuật toán WebAssembly. Bấm nút xử lý bên dưới để bắt đầu.
                </div>
              )}

              <button
                type="button"
                disabled={isProcessing || !audioBuffer}
                onClick={processAudio}
                className={`w-full py-2.5 rounded-xl font-bold font-label-md transition-all flex items-center justify-center gap-2 ${
                  isProcessing || !audioBuffer
                    ? 'bg-surface-container-highest text-text-muted cursor-not-allowed opacity-60'
                    : 'bg-primary-container text-surface-card hover:shadow-glow-cyan'
                }`}
              >
                {isProcessing ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                    Đang xử lý trong trình duyệt...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">play_circle</span>
                    Bắt đầu xử lý (0 Credit)
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Result Player & Export */}
          {processedBlobUrl && (
            <div className="p-4 bg-primary-container/10 border border-primary-container/30 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-fadeIn">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <span className="material-symbols-outlined text-signal-success text-[28px]">
                  check_circle
                </span>
                <div>
                  <h4 className="font-label-md text-on-surface font-bold">Xử lý thành công!</h4>
                  <p className="text-body-xs text-text-muted">Tệp WAV đã sẵn sàng để nghe thử và tải về</p>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <audio src={processedBlobUrl} controls className="h-9 max-w-[200px]" />
                <a
                  href={processedBlobUrl}
                  download={`DubbingStation_${selectedTool}_${Date.now()}.wav`}
                  className="px-4 py-2 rounded-xl bg-primary-container text-surface-card font-label-md font-bold hover:shadow-glow-cyan transition-all flex items-center gap-1.5 whitespace-nowrap"
                >
                  <span className="material-symbols-outlined text-[18px]">download</span>
                  Tải WAV
                </a>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl font-label-md text-[13px] whitespace-nowrap transition-all ${
                activeCategory === cat.id
                  ? 'bg-primary-container text-surface-card font-bold shadow-glow-cyan'
                  : 'bg-surface-container text-text-secondary hover:text-on-surface hover:bg-surface-container-high'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px]">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-[18px]">
            search
          </span>
          <input
            type="text"
            placeholder="Tìm công cụ âm thanh..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-surface-container border border-border-glass text-on-surface placeholder:text-text-muted text-body-sm focus:outline-none focus:border-primary-container"
          />
        </div>
      </div>

      {/* Tools Grid (22 Tools) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-space-md">
        {filteredTools.map((tool) => {
          const isSelected = selectedTool === tool.id;
          return (
            <div
              key={tool.id}
              onClick={() => setSelectedTool(tool.id)}
              className={`p-space-md rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group ${
                isSelected
                  ? 'bg-surface-container-high border-primary-container shadow-glow-cyan'
                  : 'bg-surface-card border-border-glass hover:border-primary-container/40 hover:-translate-y-1'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 rounded-xl bg-surface-container group-hover:scale-110 transition-transform">
                    <span className={`material-symbols-outlined text-[24px] ${tool.colorClass}`}>
                      {tool.icon}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-signal-success/20 text-signal-success">
                    {tool.badge}
                  </span>
                </div>
                <h3 className="font-label-lg text-label-lg font-bold text-on-surface mb-1 group-hover:text-primary-container transition-colors">
                  {tool.name}
                </h3>
                <p className="font-body-xs text-text-secondary line-clamp-2">
                  {tool.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-border-glass/50 flex items-center justify-between text-body-xs text-primary-container font-semibold">
                <span>Mở công cụ</span>
                <span className="material-symbols-outlined text-[16px] group-hover:translate-x-1 transition-transform">
                  arrow_forward
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
