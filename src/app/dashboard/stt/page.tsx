'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  type WhisperSegment,
  type WhisperTranscriptionResult,
  exportToSRT,
  exportToVTT,
  exportToTXT,
} from '@/lib/whisper';
import { transcribeVideoFile } from '@/lib/browserTranscriber';

export default function STTWorkspacePage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string>('');
  const [language, setLanguage] = useState<string>('vi');
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [transcription, setTranscription] = useState<WhisperTranscriptionResult | null>(null);
  const [segments, setSegments] = useState<WhisperSegment[]>([]);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploaded = e.target.files?.[0];
    if (uploaded) {
      setFile(uploaded);
      const url = URL.createObjectURL(uploaded);
      setAudioPreviewUrl(url);
      setTranscription(null);
      setSegments([]);
    }
  };

  const handleTranscribe = async () => {
    if (!file) {
      setStatusMessage({ text: 'Vui lòng tải lên file audio hoặc video trước.', type: 'error' });
      return;
    }

    setIsTranscribing(true);
    setStatusMessage(null);

    try {
      const transcriptionResult = await transcribeVideoFile(file, language, (message) => {
        setStatusMessage({ text: message, type: 'success' });
      });

      const res = await fetch('/api/stt/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          language,
          durationSec: transcriptionResult.durationSec,
          transcription: transcriptionResult,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatusMessage({ text: data.error || 'Bóc băng thất bại', type: 'error' });
        setIsTranscribing(false);
        return;
      }

      setTranscription(data.transcription);
      setSegments(data.transcription.segments);
      setStatusMessage({
        text: `Nhận diện giọng nói thành công! Đã trừ ${data.creditsDeducted.toLocaleString('vi-VN')} Credits.`,
        type: 'success',
      });
    } catch (err) {
      console.error(err);
      setStatusMessage({
        text: err instanceof Error ? err.message : 'Không thể nhận diện file đã tải lên.',
        type: 'error',
      });
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleSegmentTextChange = (id: number, newText: string) => {
    setSegments((prev) =>
      prev.map((seg) => (seg.id === id ? { ...seg, text: newText } : seg))
    );
  };

  const handleDownloadFormat = (format: 'srt' | 'vtt' | 'txt') => {
    if (segments.length === 0) return;

    let content = '';
    let mimeType = 'text/plain';
    let ext = format;

    if (format === 'srt') {
      content = exportToSRT(segments);
    } else if (format === 'vtt') {
      content = exportToVTT(segments);
      mimeType = 'text/vtt';
    } else {
      content = exportToTXT(segments);
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Transcript_${Date.now()}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSendToDubbing = () => {
    if (segments.length === 0) return;
    const srtContent = exportToSRT(segments);
    // Lưu tạm vào sessionStorage để trang Dubbing đọc được
    sessionStorage.setItem('dubbing_import_srt', srtContent);
    router.push('/dashboard/dubbing');
  };

  return (
    <div className="flex flex-col gap-space-lg max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-headline-md text-headline-md font-bold text-text-primary">
              AI Speech-to-Text (Whisper AI)
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-signal-success/15 text-signal-success font-code-xs text-[11px] font-bold">
              Whisper Tiny (local)
            </span>
          </div>
          <p className="font-body-sm text-body-sm text-text-muted mt-1">
            Chuyển đổi âm thanh/video thành văn bản có mốc thời gian (timestamps) chính xác, xuất phụ đề SRT / VTT.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-container-high border border-border-glass">
          <span className="material-symbols-outlined text-[18px] text-signal-warning">token</span>
          <span className="font-code-xs text-code-xs text-text-secondary">
            Chi phí: <strong className="text-signal-warning font-bold">50 Credits / giây</strong>
          </span>
        </div>
      </div>

      {/* Status Message */}
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

      {/* Main Grid: Upload (5 cols) & Transcription Editor (7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-md">
        {/* Left Column: Upload & Options */}
        <div className="lg:col-span-5 flex flex-col gap-space-md">
          {/* File Upload Card */}
          <div className="p-space-md rounded-2xl bg-surface-card border border-border-glass flex flex-col gap-3">
            <h3 className="font-label-lg text-label-lg font-bold text-text-primary flex items-center gap-2">
              <span className="material-symbols-outlined text-signal-success text-[20px]">audio_file</span>
              <span>1. Tải Lên Tệp Âm Thanh / Video</span>
            </h3>

            {file ? (
              <div className="p-4 rounded-xl bg-surface-container-lowest border border-border-glass flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <span className="material-symbols-outlined text-signal-success text-[24px]">graphic_eq</span>
                    <span className="font-label-md text-label-md font-bold text-text-primary truncate">
                      {file.name}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFile(null);
                      setAudioPreviewUrl('');
                    }}
                    className="p-1 rounded text-text-muted hover:text-signal-danger"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
                {audioPreviewUrl && (
                  <audio src={audioPreviewUrl} controls className="w-full h-9 rounded-lg" />
                )}
              </div>
            ) : (
              <label className="border-2 border-dashed border-border-glass hover:border-signal-success/60 rounded-xl p-8 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors bg-surface-container-lowest/50 hover:bg-surface-container-lowest">
                <span className="material-symbols-outlined text-[40px] text-text-muted">cloud_upload</span>
                <span className="font-label-md text-label-md font-semibold text-text-primary text-center">
                  Nhấp để tải lên Audio / Video
                </span>
                <span className="font-body-xs text-[11px] text-text-muted text-center">
                  Hỗ trợ MP3, WAV, M4A, MP4, MKV (Tối đa 500MB)
                </span>
                <input
                  type="file"
                  accept="audio/*,video/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            )}

            {/* Language Selector */}
            <div className="flex flex-col gap-1.5 pt-1">
              <label className="font-label-sm text-[11px] text-text-muted uppercase font-semibold">
                Ngôn ngữ gốc của âm thanh
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-surface-container-lowest border border-border-glass text-text-primary font-body-sm text-body-sm focus:outline-none focus:border-signal-success"
              >
                <option value="vi" className="bg-surface-card">🇻🇳 Tiếng Việt (Tự động thêm dấu)</option>
                <option value="en" className="bg-surface-card">🇺🇸 Tiếng Anh (English)</option>
                <option value="ja" className="bg-surface-card">🇯🇵 Tiếng Nhật (Japanese)</option>
                <option value="ko" className="bg-surface-card">🇰🇷 Tiếng Hàn (Korean)</option>
                <option value="zh" className="bg-surface-card">🇨🇳 Tiếng Trung (Chinese)</option>
                <option value="auto" className="bg-surface-card">🌐 Tự động nhận diện (Auto Detect)</option>
              </select>
            </div>

            {/* Transcribe Button */}
            <button
              type="button"
              onClick={handleTranscribe}
              disabled={isTranscribing}
              className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-signal-success to-primary-container hover:opacity-95 text-canvas-base font-label-md text-label-md font-bold transition-all shadow-[0_0_20px_rgba(0,242,254,0.25)] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isTranscribing ? (
                <>
                  <span className="w-4 h-4 rounded-full border-2 border-canvas-base border-t-transparent animate-spin" />
                  <span>Whisper AI đang bóc băng...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[20px]">transcribe</span>
                  <span>Bắt đầu Bóc Băng Tự Động</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Transcription Output & Subtitle Editor */}
        <div className="lg:col-span-7 flex flex-col gap-space-md">
          <div className="p-space-md rounded-2xl bg-surface-card border border-border-glass flex flex-col gap-3 min-h-[460px]">
            {/* Action Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border-glass">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary-container text-[20px]">subtitles</span>
                <h3 className="font-label-lg text-label-lg font-bold text-text-primary">
                  2. Kết Quả Bóc Băng & Phụ Đề ({segments.length} đoạn)
                </h3>
              </div>

              {segments.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleDownloadFormat('srt')}
                    className="px-2.5 py-1 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-text-primary font-code-xs text-[11px] font-semibold transition-colors flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[13px]">download</span>
                    <span>.SRT</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadFormat('vtt')}
                    className="px-2.5 py-1 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-text-primary font-code-xs text-[11px] font-semibold transition-colors flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[13px]">download</span>
                    <span>.VTT</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadFormat('txt')}
                    className="px-2.5 py-1 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-text-primary font-code-xs text-[11px] font-semibold transition-colors flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[13px]">download</span>
                    <span>.TXT</span>
                  </button>
                </div>
              )}
            </div>

            {/* Segments List Editor */}
            {segments.length > 0 ? (
              <div className="flex-1 overflow-y-auto max-h-[380px] flex flex-col gap-2.5 pr-1">
                {segments.map((seg) => (
                  <div
                    key={seg.id}
                    className="p-3 rounded-xl bg-surface-container-lowest border border-border-glass flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded bg-surface-container-high font-code-xs text-[10px] text-text-muted font-bold">
                          #{seg.id}
                        </span>
                        {seg.speaker && (
                          <span className="px-2 py-0.5 rounded font-label-sm text-[11px] bg-secondary-container/20 text-secondary font-semibold">
                            {seg.speaker}
                          </span>
                        )}
                      </div>
                      <span className="font-code-xs text-[11px] text-primary-container font-medium">
                        {seg.start}s → {seg.end}s
                      </span>
                    </div>

                    <textarea
                      rows={2}
                      value={seg.text}
                      onChange={(e) => handleSegmentTextChange(seg.id, e.target.value)}
                      className="w-full p-2 rounded-lg bg-surface-container-high/40 border border-transparent focus:border-signal-success text-text-primary font-body-sm text-[13px] leading-relaxed resize-none focus:outline-none"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 py-16">
                <span className="material-symbols-outlined text-[48px] text-text-muted">transcribe</span>
                <p className="font-body-md text-body-md text-text-muted max-w-sm">
                  Tải file âm thanh bên trái và bấm bóc băng để xem kết quả văn bản và mốc thời gian tại đây.
                </p>
              </div>
            )}

            {/* Bottom Actions: Transfer to Dubbing */}
            {segments.length > 0 && (
              <div className="pt-3 border-t border-border-glass flex items-center justify-between">
                <span className="font-body-xs text-[11px] text-text-muted">
                  Bạn có thể chỉnh sửa trực tiếp nội dung từng câu thoại trước khi xuất.
                </span>

                <button
                  type="button"
                  onClick={handleSendToDubbing}
                  className="px-4 py-2 rounded-xl bg-secondary-container text-on-secondary-container hover:opacity-90 font-label-sm text-label-sm font-bold transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(168,85,247,0.25)]"
                >
                  <span>Chuyển sang Lồng tiếng Video</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
