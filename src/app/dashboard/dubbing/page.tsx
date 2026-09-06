'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { parseSubtitle, demoSrtContent, type SubtitleCue, type SubtitleParseResult } from '@/lib/subtitleParser';
import { voices } from '@/data/voices';
import type { Voice } from '@/types';

export default function DubbingWorkspacePage() {
  const [srtInput, setSrtInput] = useState<string>(demoSrtContent);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string>('');
  const [parsedData, setParsedData] = useState<SubtitleParseResult | null>(null);
  const [speakerVoiceMap, setSpeakerVoiceMap] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);

  // Tự động parse phụ đề khi srtInput thay đổi
  useEffect(() => {
    if (srtInput.trim()) {
      const res = parseSubtitle(srtInput);
      setParsedData(res);

      // Khởi tạo gán giọng mặc định cho các speakers mới
      setSpeakerVoiceMap((prev) => {
        const next = { ...prev };
        res.speakers.forEach((speaker, index) => {
          if (!next[speaker]) {
            // Gán luân phiên giọng trong danh sách voices
            next[speaker] = voices[index % voices.length].id;
          }
        });
        return next;
      });
    } else {
      setParsedData(null);
    }
  }, [srtInput]);

  // Xử lý upload file video
  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      const url = URL.createObjectURL(file);
      setVideoPreviewUrl(url);
    }
  };

  // Xử lý upload file phụ đề .srt / .vtt
  const handleSubtitleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (content) {
          setSrtInput(content);
        }
      };
      reader.readAsText(file);
    }
  };

  // Tính toán Credits cần dùng: 100 Credits / 1 giây video (hoặc tổng thời lượng phụ đề)
  const totalDurationSec = Math.ceil(parsedData?.totalDurationSec || 17);
  const creditsRequired = totalDurationSec * 100;

  const handleVoiceChange = (speaker: string, voiceId: string) => {
    setSpeakerVoiceMap((prev) => ({
      ...prev,
      [speaker]: voiceId,
    }));
  };

  const handleGenerateDubbing = async () => {
    if (!parsedData || parsedData.cues.length === 0) {
      setStatusMessage({ text: 'Vui lòng nhập hoặc tải lên tệp phụ đề hợp lệ.', type: 'error' });
      return;
    }

    setIsProcessing(true);
    setStatusMessage(null);
    setGeneratedVideoUrl(null);

    try {
      const res = await fetch('/api/dubbing/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: videoFile ? videoFile.name.replace(/\.[^/.]+$/, '') : 'AI_Video_Dubbing_Project',
          durationSec: totalDurationSec,
          cues: parsedData.cues,
          speakerVoiceMap,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatusMessage({ text: data.error || 'Lồng tiếng thất bại', type: 'error' });
        setIsProcessing(false);
        return;
      }

      setGeneratedVideoUrl(data.videoUrl || 'https://www.w3schools.com/html/mov_bbb.mp4');
      setStatusMessage({
        text: `Lồng tiếng video thành công! Đã trừ ${data.creditsDeducted.toLocaleString('vi-VN')} Credits.`,
        type: 'success',
      });
    } catch (err) {
      console.error(err);
      setStatusMessage({ text: 'Lỗi kết nối máy chủ khi lồng tiếng.', type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col gap-space-lg max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-headline-md text-headline-md font-bold text-text-primary">
              AI Subtitle Video Dubbing
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-secondary-container/20 text-secondary font-code-xs text-[11px] font-bold">
              Phase 3 Core
            </span>
          </div>
          <p className="font-body-sm text-body-sm text-text-muted mt-1">
            Tự động lồng tiếng đa nhân vật từ tệp phụ đề (SRT/VTT) với thuật toán cân chỉnh timeline chính xác.
          </p>
        </div>

        {/* Credit badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-container-high border border-border-glass">
          <span className="material-symbols-outlined text-[18px] text-signal-warning">token</span>
          <span className="font-code-xs text-code-xs text-text-secondary">
            Ước tính: <strong className="text-signal-warning font-bold">{creditsRequired.toLocaleString('vi-VN')}</strong> Credits (100 cr/giây)
          </span>
        </div>
      </div>

      {/* Status Alert Banner */}
      {statusMessage && (
        <div
          className={`p-3.5 rounded-xl flex items-center gap-2.5 font-body-sm text-body-sm ${
            statusMessage.type === 'success'
              ? 'bg-signal-success/15 border border-signal-success/30 text-signal-success'
              : 'bg-signal-danger/15 border border-signal-danger/30 text-signal-danger'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">
            {statusMessage.type === 'success' ? 'check_circle' : 'error'}
          </span>
          <span className="font-medium">{statusMessage.text}</span>
        </div>
      )}

      {/* Main Grid Workspace: Left (Upload & SRT), Right (Speakers & Timeline) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-md">
        {/* Left Column: Video & Subtitle Source (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-space-md">
          {/* Video Upload Card */}
          <div className="p-space-md rounded-2xl bg-surface-card border border-border-glass flex flex-col gap-3">
            <h3 className="font-label-lg text-label-lg font-bold text-text-primary flex items-center gap-2">
              <span className="material-symbols-outlined text-primary-container text-[20px]">video_file</span>
              <span>1. Tệp Video Gốc</span>
            </h3>

            {videoPreviewUrl ? (
              <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center">
                <video src={videoPreviewUrl} controls className="w-full h-full object-contain" />
              </div>
            ) : (
              <label className="border-2 border-dashed border-border-glass hover:border-primary-container/60 rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors bg-surface-container-lowest/50 hover:bg-surface-container-lowest">
                <span className="material-symbols-outlined text-[36px] text-text-muted">cloud_upload</span>
                <span className="font-label-sm text-label-sm font-semibold text-text-primary">
                  Nhấp để tải lên Video (MP4, MKV, MOV)
                </span>
                <span className="font-body-xs text-[11px] text-text-muted">
                  Tùy chọn: Bạn có thể lồng tiếng mà không cần video gốc
                </span>
                <input type="file" accept="video/*" onChange={handleVideoUpload} className="hidden" />
              </label>
            )}
          </div>

          {/* Subtitle Input Card */}
          <div className="p-space-md rounded-2xl bg-surface-card border border-border-glass flex flex-col gap-3 flex-1">
            <div className="flex items-center justify-between">
              <h3 className="font-label-lg text-label-lg font-bold text-text-primary flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[20px]">subtitles</span>
                <span>2. Phụ Đề (SRT / VTT)</span>
              </h3>

              <label className="px-2.5 py-1 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-text-primary font-label-sm text-[11px] font-semibold cursor-pointer transition-colors flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">upload_file</span>
                <span>Tải tệp .srt</span>
                <input type="file" accept=".srt,.vtt,.txt" onChange={handleSubtitleFileUpload} className="hidden" />
              </label>
            </div>

            <textarea
              rows={12}
              value={srtInput}
              onChange={(e) => setSrtInput(e.target.value)}
              placeholder="Dán nội dung tệp SRT / VTT tại đây..."
              className="w-full p-3 rounded-xl bg-surface-container-lowest border border-border-glass text-text-primary font-code-xs text-[12px] focus:outline-none focus:border-primary-container leading-relaxed resize-none"
            />
          </div>
        </div>

        {/* Right Column: Multi-Speaker Voice Assignment & Timeline (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-space-md">
          {/* Multi-Speaker Assignment Deck */}
          <div className="p-space-md rounded-2xl bg-surface-card border border-border-glass flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="font-label-lg text-label-lg font-bold text-text-primary flex items-center gap-2">
                <span className="material-symbols-outlined text-primary-container text-[20px]">group</span>
                <span>3. Gán Giọng Đọc Theo Nhân Vật (Speaker Assignment)</span>
              </h3>
              <span className="px-2 py-0.5 rounded font-code-xs text-[11px] bg-surface-container-high text-text-secondary">
                {parsedData?.speakers.length || 0} Nhân vật
              </span>
            </div>

            {parsedData && parsedData.speakers.length > 0 ? (
              <div className="flex flex-col gap-2.5 pt-1">
                {parsedData.speakers.map((speaker, idx) => {
                  const currentVoiceId = speakerVoiceMap[speaker] || defaultVoiceId(idx);
                  const voiceObj = voices.find((v) => v.id === currentVoiceId) || voices[0];

                  return (
                    <div
                      key={speaker}
                      className="p-3 rounded-xl bg-surface-container-lowest border border-border-glass flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-secondary-container/20 text-secondary flex items-center justify-center font-bold text-xs">
                          {speaker.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-label-md text-label-md font-bold text-text-primary">
                            {speaker}
                          </span>
                          <span className="font-code-xs text-[10px] text-text-muted">
                            Nhân vật #{idx + 1} trong phụ đề
                          </span>
                        </div>
                      </div>

                      {/* Select Voice */}
                      <div className="flex items-center gap-2">
                        <select
                          value={currentVoiceId}
                          onChange={(e) => handleVoiceChange(speaker, e.target.value)}
                          className="px-3 py-1.5 rounded-lg bg-surface-container-high border border-border-glass text-text-primary font-body-sm text-[12px] focus:outline-none focus:border-primary-container"
                        >
                          {voices.map((v) => (
                            <option key={v.id} value={v.id} className="bg-surface-card">
                              {v.name} ({v.country} - {v.gender === 'male' ? 'Nam' : 'Nữ'})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="font-body-sm text-body-sm text-text-muted py-4 text-center">
                Chưa có nhân vật nào. Hãy dán phụ đề bên trái để nhận diện.
              </p>
            )}
          </div>

          {/* Timeline Cues Preview List */}
          <div className="p-space-md rounded-2xl bg-surface-card border border-border-glass flex flex-col gap-3 flex-1">
            <div className="flex items-center justify-between">
              <h3 className="font-label-lg text-label-lg font-bold text-text-primary flex items-center gap-2">
                <span className="material-symbols-outlined text-signal-success text-[20px]">view_timeline</span>
                <span>4. Chi Tiết Timeline ({parsedData?.cues.length || 0} Cues)</span>
              </h3>
              <span className="font-code-xs text-code-xs text-text-muted">
                Tổng thời lượng: ~{totalDurationSec}s
              </span>
            </div>

            <div className="max-h-[260px] overflow-y-auto flex flex-col gap-2 pr-1">
              {parsedData?.cues.map((cue) => (
                <div
                  key={cue.id}
                  className="p-2.5 rounded-xl bg-surface-container-lowest border border-border-glass/60 flex items-start justify-between gap-3 text-left"
                >
                  <div className="flex items-start gap-2.5">
                    <span className="px-1.5 py-0.5 rounded bg-surface-container-high font-code-xs text-[10px] text-text-muted shrink-0 mt-0.5">
                      #{cue.id}
                    </span>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-label-sm text-[11px] font-bold text-secondary">
                          {cue.speaker}
                        </span>
                        <span className="font-code-xs text-[10px] text-text-muted">
                          {cue.startTimeFormatted} → {cue.endTimeFormatted} ({cue.durationSec.toFixed(1)}s)
                        </span>
                      </div>
                      <p className="font-body-sm text-[12px] text-text-primary mt-0.5">{cue.text}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Action CTA Button */}
            <div className="pt-3 border-t border-border-glass flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 font-code-xs text-code-xs text-text-muted">
                <span>Trừ:</span>
                <strong className="text-signal-warning font-bold">
                  {creditsRequired.toLocaleString('vi-VN')} Credits
                </strong>
                <span>(100 cr/s)</span>
              </div>

              <button
                type="button"
                onClick={handleGenerateDubbing}
                disabled={isProcessing || !parsedData || parsedData.cues.length === 0}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary-container to-secondary-container hover:opacity-95 text-canvas-base font-label-md text-label-md font-bold transition-all shadow-[0_0_20px_rgba(0,242,254,0.3)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <span className="w-4 h-4 rounded-full border-2 border-canvas-base border-t-transparent animate-spin" />
                    <span>Đang render lồng tiếng AI...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">movie_edit</span>
                    <span>Bắt đầu Lồng Tiếng Video</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Generated Result Preview Box */}
      {generatedVideoUrl && (
        <div className="p-space-md rounded-2xl bg-surface-card border border-primary-container/40 flex flex-col gap-3 shadow-[0_0_30px_rgba(0,242,254,0.15)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-signal-success text-[24px]">verified</span>
              <h3 className="font-headline-sm text-headline-sm font-bold text-text-primary">
                Video Đã Được Lồng Tiếng Thành Công
              </h3>
            </div>
            <a
              href={generatedVideoUrl}
              download="AI_Dubbed_Video.mp4"
              className="px-4 py-1.5 rounded-xl bg-primary-container text-canvas-base font-label-sm text-label-sm font-bold hover:opacity-90 transition-opacity flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              <span>Tải Video MP4</span>
            </a>
          </div>

          <div className="rounded-xl overflow-hidden bg-black aspect-video max-w-2xl mx-auto w-full">
            <video src={generatedVideoUrl} controls autoPlay className="w-full h-full object-contain" />
          </div>
        </div>
      )}
    </div>
  );
}

function defaultVoiceId(index: number): string {
  return voices[index % voices.length].id;
}
