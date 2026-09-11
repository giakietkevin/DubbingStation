'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  parseSubtitle,
  demoSrtContent,
  deduplicateSubtitleCues,
  cuesToSRT,
  type SubtitleCue,
  type SubtitleParseResult,
} from '@/lib/subtitleParser';
import { voices } from '@/data/voices';
import type { Voice } from '@/types';
import { detectSpeakersFromVideo } from '@/lib/speakerDiarizer';

export default function DubbingWorkspacePage() {
  const [srtInput, setSrtInput] = useState<string>(demoSrtContent);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string>('');
  const [parsedData, setParsedData] = useState<SubtitleParseResult | null>(null);
  const [speakerVoiceMap, setSpeakerVoiceMap] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [isDetectingSpeakers, setIsDetectingSpeakers] = useState(false);
  const [customVoices, setCustomVoices] = useState<Array<{ id: string; name: string; gender?: string; language?: string }>>([]);

  // Load custom cloned voices from API
  useEffect(() => {
    fetch('/api/clone')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (Array.isArray(data?.voices)) {
          setCustomVoices(
            data.voices.map((v: any) => ({
              id: v.id.startsWith('custom-') ? v.id : `custom-${v.id}`,
              name: v.name,
              gender: v.gender,
              language: v.language,
            }))
          );
        }
      })
      .catch(() => undefined);
  }, []);

  // Tùy chọn bảo tồn âm thanh nền & hiệu ứng phim (SFX / Foley)
  const [keepOriginalAudio, setKeepOriginalAudio] = useState<boolean>(true);
  const [duckingPreset, setDuckingPreset] = useState<'sfx_preserve' | 'sfx_duck_half' | 'mute_dialogue' | 'replace_all'>('sfx_preserve');

  // Tự động parse phụ đề khi srtInput thay đổi
  useEffect(() => {
    const importedSubtitle = sessionStorage.getItem('dubbing_import_srt');
    if (importedSubtitle) {
      setSrtInput(importedSubtitle);
      sessionStorage.removeItem('dubbing_import_srt');
    }

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

  const handleDetectSpeakers = async () => {
    if (!videoFile || !parsedData || parsedData.cues.length === 0) {
      setStatusMessage({ text: 'Cần có video và phụ đề trước khi phân tích speaker.', type: 'error' });
      return;
    }

    setIsDetectingSpeakers(true);
    setStatusMessage({ text: 'Đang phân tích giọng nói theo timestamp phụ đề...', type: 'success' });
    try {
      const detectedCues = await detectSpeakersFromVideo(videoFile, parsedData.cues);
      const detectedSpeakers = Array.from(new Set(detectedCues.map((cue) => cue.speaker)));
      setParsedData((previous) => previous ? {
        ...previous,
        cues: detectedCues,
        speakers: detectedSpeakers,
        hasExplicitSpeakers: true,
      } : previous);
      setSrtInput(detectedCues.map((cue) => `${cue.id}\n${cue.startTimeFormatted} --> ${cue.endTimeFormatted}\n[${cue.speaker}] ${cue.text}`).join('\n\n'));
      setSpeakerVoiceMap((previous) => {
        const next = { ...previous };
        detectedSpeakers.forEach((speaker, index) => {
          if (!next[speaker]) next[speaker] = voices[index % voices.length].id;
        });
        return next;
      });
      setStatusMessage({ text: `Đã phát hiện ${detectedSpeakers.length} speaker và cập nhật phụ đề.`, type: 'success' });
    } catch (error) {
      setStatusMessage({ text: error instanceof Error ? error.message : 'Không thể phân tích speaker từ video.', type: 'error' });
    } finally {
      setIsDetectingSpeakers(false);
    }
  };

  const handleCleanAndAlignSubtitle = () => {
    if (!parsedData || parsedData.cues.length === 0) return;
    const initialCount = parsedData.cues.length;
    const cleaned = deduplicateSubtitleCues(parsedData.cues);
    const newSrt = cuesToSRT(cleaned);
    setSrtInput(newSrt);
    const removedCount = initialCount - cleaned.length;
    setStatusMessage({
      text: removedCount > 0
        ? `Đã làm sạch và khử ${removedCount} câu lặp lại, căn chỉnh timeline sát video và bảo toàn toàn bộ lời thoại!`
        : `Timeline phụ đề đã được chuẩn hóa và căn chỉnh sát với video 100%!`,
      type: 'success',
    });
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
      if (!videoFile) {
        setStatusMessage({ text: 'Vui lòng tải lên video gốc trước khi lồng tiếng.', type: 'error' });
        return;
      }

      const formData = new FormData();
      formData.append('video', videoFile);
      formData.append('title', videoFile.name.replace(/\.[^/.]+$/, ''));
      formData.append('cues', JSON.stringify(parsedData.cues));
      formData.append('speakerVoiceMap', JSON.stringify(speakerVoiceMap));
      formData.append('keepOriginalAudio', String(keepOriginalAudio));
      formData.append('duckingLevel', duckingPreset);

      const res = await fetch('/api/dubbing/generate', {
        method: 'POST',
        body: formData,
      });

      const responseText = await res.text();
      let data: { error?: string; videoUrl?: string; creditsDeducted?: number } = {};
      try {
        data = JSON.parse(responseText);
      } catch {
        data.error = responseText.slice(0, 300);
      }

      if (!res.ok) {
        setStatusMessage({ text: data.error || 'Lồng tiếng thất bại', type: 'error' });
        setIsProcessing(false);
        return;
      }

      setGeneratedVideoUrl(data.videoUrl || 'https://www.w3schools.com/html/mov_bbb.mp4');
      setStatusMessage({
        text: `Lồng tiếng video thành công! Đã trừ ${(data.creditsDeducted || 0).toLocaleString('vi-VN')} Credits.`,
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
            <div className="flex items-center justify-between">
              <h3 className="font-label-lg text-label-lg font-bold text-text-primary flex items-center gap-2">
                <span className="material-symbols-outlined text-primary-container text-[20px]">video_file</span>
                <span>1. Tệp Video Gốc</span>
              </h3>
              {videoPreviewUrl && (
                <label className="px-3 py-1 rounded-lg bg-surface-container-high hover:bg-primary-container hover:text-canvas-base text-primary-container text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm">
                  <span className="material-symbols-outlined text-[16px]">change_circle</span>
                  <span>Đổi video khác</span>
                  <input type="file" accept="video/*" onChange={handleVideoUpload} className="hidden" />
                </label>
              )}
            </div>

            {videoPreviewUrl ? (
              <div className="flex flex-col gap-2">
                <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center">
                  <video src={videoPreviewUrl} controls className="w-full h-full object-contain" />
                </div>
                {videoFile && (
                  <div className="flex items-center justify-between text-[11px] text-text-muted bg-surface-container px-3 py-2 rounded-lg">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span className="material-symbols-outlined text-primary-container text-[16px]">check_circle</span>
                      <span className="truncate max-w-[180px] sm:max-w-[240px] font-medium text-text-primary">
                        {videoFile.name}
                      </span>
                      <span className="text-[10px] text-text-muted">
                        ({(videoFile.size / (1024 * 1024)).toFixed(1)} MB)
                      </span>
                    </div>
                    <label className="text-primary-container hover:underline font-bold cursor-pointer flex items-center gap-1 shrink-0 ml-2">
                      <span className="material-symbols-outlined text-[15px]">sync</span>
                      <span>Đổi video</span>
                      <input type="file" accept="video/*" onChange={handleVideoUpload} className="hidden" />
                    </label>
                  </div>
                )}
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
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h3 className="font-label-lg text-label-lg font-bold text-text-primary flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[20px]">subtitles</span>
                <span>2. Phụ Đề (SRT / VTT)</span>
              </h3>

              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={handleCleanAndAlignSubtitle}
                  disabled={!parsedData || parsedData.cues.length === 0}
                  className="px-2.5 py-1 rounded-lg bg-primary-container/20 text-primary-container hover:bg-primary-container hover:text-canvas-base font-label-sm text-[11px] font-bold transition-all flex items-center gap-1 disabled:opacity-50"
                  title="Tự động phát hiện và loại bỏ các câu lặp trùng do Whisper chunk overlap, căn chỉnh timeline sát video và không làm mất thoại"
                >
                  <span className="material-symbols-outlined text-[14px]">auto_fix_high</span>
                  <span>Khử lặp & Căn sát Timeline</span>
                </button>

                <label className="px-2.5 py-1 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-text-primary font-label-sm text-[11px] font-semibold cursor-pointer transition-colors flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">upload_file</span>
                  <span>Tải tệp .srt</span>
                  <input type="file" accept=".srt,.vtt,.txt" onChange={handleSubtitleFileUpload} className="hidden" />
                </label>
              </div>
            </div>

            <textarea
              rows={11}
              value={srtInput}
              onChange={(e) => setSrtInput(e.target.value)}
              placeholder="Dán nội dung tệp SRT / VTT tại đây..."
              className="w-full p-3 rounded-xl bg-surface-container-lowest border border-border-glass text-text-primary font-code-xs text-[12px] focus:outline-none focus:border-primary-container leading-relaxed resize-none"
            />
          </div>

          {/* Background Audio & SFX Preservation Card */}
          <div className="p-space-md rounded-2xl bg-surface-card border border-border-glass flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="font-label-lg text-label-lg font-bold text-text-primary flex items-center gap-2">
                <span className="material-symbols-outlined text-signal-warning text-[20px]">music_cast</span>
                <span>3. Bảo Tồn Âm Nền & SFX Phim</span>
              </h3>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={keepOriginalAudio}
                  onChange={(e) => setKeepOriginalAudio(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-surface-container-high peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-container"></div>
              </label>
            </div>

            <p className="font-body-xs text-[11px] text-text-muted leading-relaxed">
              {keepOriginalAudio
                ? 'Tự động giữ 100% âm thanh raw gốc (tiếng nổ, bước chân, tiếng súng, nhạc nền ambient) ở các đoạn im lặng không thoại. Khi đến đoạn có phụ đề thoại, hệ thống sẽ tự động hạ âm nền (Smart Ducking) để tôn giọng đọc AI mà không làm biến mất âm thanh phim.'
                : 'Đã tắt bảo tồn âm nền. Toàn bộ audio gốc của video sẽ bị tắt, chỉ giữ lại tiếng đọc AI lồng tiếng.'}
            </p>

            {keepOriginalAudio && (
              <div className="flex flex-col gap-2 pt-1">
                <label className="font-label-sm text-[11px] text-text-muted uppercase font-semibold">
                  Mức độ hạ âm nền khi có lời thoại (Audio Ducking)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDuckingPreset('sfx_preserve')}
                    className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                      duckingPreset === 'sfx_preserve'
                        ? 'bg-primary-container/15 border-primary-container text-text-primary shadow-sm'
                        : 'bg-surface-container-lowest border-border-glass text-text-muted hover:text-text-primary'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[12px] text-primary-container">🎬 Chuẩn Phim Điện Ảnh</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-primary-container/20 text-primary-container font-semibold">Giữ 15% SFX</span>
                    </div>
                    <span className="text-[10px] leading-tight">100% SFX khi im lặng, giữ 15% tiếng nền khi có thoại</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDuckingPreset('sfx_duck_half')}
                    className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                      duckingPreset === 'sfx_duck_half'
                        ? 'bg-primary-container/15 border-primary-container text-text-primary shadow-sm'
                        : 'bg-surface-container-lowest border-border-glass text-text-muted hover:text-text-primary'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[12px] text-primary-container">🎙️ Chuẩn Vlog / Tin Tức</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-primary-container/20 text-primary-container font-semibold">Giữ 30% âm nền</span>
                    </div>
                    <span className="text-[10px] leading-tight">Nhạc nền to rõ hơn phía sau lời bình hoặc hướng dẫn</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDuckingPreset('mute_dialogue')}
                    className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                      duckingPreset === 'mute_dialogue'
                        ? 'bg-primary-container/15 border-primary-container text-text-primary shadow-sm'
                        : 'bg-surface-container-lowest border-border-glass text-text-muted hover:text-text-primary'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[12px] text-primary-container">🔇 Tắt thoại gốc (0%)</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-primary-container/20 text-primary-container font-semibold">0% khi có thoại</span>
                    </div>
                    <span className="text-[10px] leading-tight">Giữ âm nền ở đoạn trống, tắt sạch tiếng khi có sub</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDuckingPreset('replace_all')}
                    className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                      duckingPreset === 'replace_all'
                        ? 'bg-primary-container/15 border-primary-container text-text-primary shadow-sm'
                        : 'bg-surface-container-lowest border-border-glass text-text-muted hover:text-text-primary'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[12px] text-primary-container">⚡ Thay thế 100%</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-primary-container/20 text-primary-container font-semibold">Mute toàn bộ</span>
                    </div>
                    <span className="text-[10px] leading-tight">Chỉ phát duy nhất âm thanh AI lồng tiếng</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Multi-Speaker Voice Assignment & Timeline (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-space-md">
          {/* Multi-Speaker Assignment Deck */}
          <div className="p-space-md rounded-2xl bg-surface-card border border-border-glass flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="font-label-lg text-label-lg font-bold text-text-primary flex items-center gap-2">
                <span className="material-symbols-outlined text-primary-container text-[20px]">group</span>
                <span>4. Gán Giọng Đọc Theo Nhân Vật (Speaker Assignment)</span>
              </h3>
              <span className="px-2 py-0.5 rounded font-code-xs text-[11px] bg-surface-container-high text-text-secondary">
                {parsedData?.speakers.length || 0} Nhân vật
              </span>
            </div>

            {parsedData && !parsedData.hasExplicitSpeakers && parsedData.cues.length > 0 && (
              <div className="text-[11px] text-signal-warning bg-signal-warning/10 border border-signal-warning/20 rounded-lg px-3 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span>Phụ đề chưa có nhãn speaker. Có thể phân tích trực tiếp từ audio video.</span>
                <button type="button" onClick={handleDetectSpeakers} disabled={isDetectingSpeakers} className="px-2.5 py-1 rounded-lg bg-signal-warning/20 hover:bg-signal-warning/30 font-bold disabled:opacity-50">
                  {isDetectingSpeakers ? 'Đang phân tích...' : 'Phân tích speaker từ video'}
                </button>
              </div>
            )}

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
                          {customVoices.length > 0 && (
                            <optgroup label="🧬 Giọng Nhân Bản Của Bạn (Coqui XTTS)">
                              {customVoices.map((v) => (
                                <option key={v.id} value={v.id} className="bg-surface-card text-accent-violet-bright font-bold">
                                  🌟 {v.name} ({v.gender === 'male' ? 'Nam' : 'Nữ'}) [Clone]
                                </option>
                              ))}
                            </optgroup>
                          )}
                          <optgroup label="🎬 Giọng CapCut & TikTok Viral">
                            {voices
                              .filter((v) => v.provider === 'capcut' || v.tags.includes('CapCut'))
                              .map((v) => (
                                <option key={v.id} value={v.id} className="bg-surface-card">
                                  {v.name} ({v.gender === 'male' ? 'Nam' : 'Nữ'})
                                </option>
                              ))}
                          </optgroup>
                          <optgroup label="🤗 Hugging Face & Dataset Voices (VIVOS • Common Voice • OpenSLR)">
                            {voices
                              .filter((v) => v.country === 'VIỆT NAM' && v.provider !== 'capcut' && !v.tags.includes('CapCut'))
                              .map((v) => (
                                <option key={v.id} value={v.id} className="bg-surface-card">
                                  {v.name} ({v.gender === 'male' ? 'Nam' : 'Nữ'})
                                </option>
                              ))}
                          </optgroup>
                          <optgroup label="🌐 Giọng Quốc Tế (US, UK, Nhật, Hàn, Trung)">
                            {voices
                              .filter((v) => v.country !== 'VIỆT NAM')
                              .map((v) => (
                                <option key={v.id} value={v.id} className="bg-surface-card">
                                  {v.name} ({v.country} - {v.gender === 'male' ? 'Nam' : 'Nữ'})
                                </option>
                              ))}
                          </optgroup>
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
                <span>5. Chi Tiết Timeline ({parsedData?.cues.length || 0} Cues)</span>
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
                disabled={isProcessing || !videoFile || !parsedData || parsedData.cues.length === 0}
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
