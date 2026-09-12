'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import {
  parseSubtitle,
  deduplicateSubtitleCues,
  applyTimingOffset,
  cuesToSRT,
  secondsToFormattedTime,
  type SubtitleCue,
  type SubtitleParseResult,
} from '@/lib/subtitleParser';
import { transcribeVideoFile, type WhisperModelLevel } from '@/lib/browserTranscriber';
import { cleanAndDeduplicateWhisperSegments } from '@/lib/whisper';
import type { SubtitleTone } from '@/lib/vietnameseSubtitlePolisher';

const languageOptions: [string, string][] = [
  ['auto', '🌐 Tự động nhận diện'],
  ['vi', '🇻🇳 Tiếng Việt (Vietnamese)'],
  ['en', '🇺🇸 Tiếng Anh (English)'],
  ['zh', '🇨🇳 Tiếng Trung (Chinese)'],
  ['ja', '🇯🇵 Tiếng Nhật (Japanese)'],
  ['ko', '🇰🇷 Tiếng Hàn (Korean)'],
  ['fr', '🇫🇷 Tiếng Pháp (French)'],
  ['es', '🇪🇸 Tiếng Tây Ban Nha (Spanish)'],
  ['ru', '🇷🇺 Tiếng Nga (Russian)'],
  ['th', '🇹🇭 Tiếng Thái (Thai)'],
];

const toneOptions: [SubtitleTone, string, string][] = [
  ['natural', '🌐 Tự động theo bối cảnh (mày-tao, cậu-tớ, anh-em...)', 'Tự động bắt mạch cảm xúc, xưng hô linh hoạt theo ngữ cảnh'],
  ['conversational', '💬 Đời thường / Thân mật (cậu - tớ, mày - tao)', 'Xưng hô thân mật tự nhiên như hội thoại quán cà phê'],
  ['dramatic', '🔥 Kịch tính / Hành động (mày - tao, đối đầu)', 'Ngữ điệu mạnh mẽ, gay gắt khi cãi nhau hoặc chiến đấu'],
  ['romantic', '❤️ Tình cảm / Lãng mạn (anh - em)', 'Xưng hô anh - em ngọt ngào và tự nhiên'],
  ['period', '⚔️ Cổ trang / Kiếm hiệp (ngươi - ta, huynh - đệ)', 'Xưng hô kiếm hiệp, dã sử chuẩn mực'],
  ['polite', '👔 Lịch sự / Công sở (tôi - anh / chị)', 'Xưng hô trang trọng, giữ khoảng cách lịch thiệp'],
];

export default function VietSubWorkspacePage() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string>('');
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [videoDuration, setVideoDuration] = useState<number>(0);

  // Nguồn phụ đề
  const [sourceType, setSourceType] = useState<'upload_srt' | 'ai_transcribe'>('upload_srt');
  const [rawSubtitleText, setRawSubtitleText] = useState<string>('');
  const [sourceLanguage, setSourceLanguage] = useState<string>('en');
  const [whisperModel, setWhisperModel] = useState<WhisperModelLevel>('base');
  const [subtitleTone, setSubtitleTone] = useState<SubtitleTone>('natural');

  // Danh sách cues & Điều chỉnh bù trừ độ trễ
  const [cues, setCues] = useState<SubtitleCue[]>([]);
  const [originalCues, setOriginalCues] = useState<SubtitleCue[]>([]);
  const [timingOffsetSec, setTimingOffsetSec] = useState<number>(0);

  // Trạng thái AI
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Tùy chọn hiển thị & che sub cũ
  const [coverOldSub, setCoverOldSub] = useState<boolean>(true);
  const [coverType, setCoverType] = useState<'box' | 'banner' | 'none'>('box');
  const [fontSize, setFontSize] = useState<number>(30);
  const [textColor, setTextColor] = useState<string>('#FFD700'); // Vàng điện ảnh mặc định
  const [subPosition, setSubPosition] = useState<'bottom' | 'top' | 'middle'>('bottom');
  const [boxOpacity, setBoxOpacity] = useState<number>(0.9);

  // Kết quả video xuất ra
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Vòng lặp đồng bộ thời gian 60 FPS bằng requestAnimationFrame
  // Khắc phục triệt để độ trễ 200-250ms của sự kiện timeupdate HTML5 thông thường
  useEffect(() => {
    let animId: number;
    const video = videoRef.current;
    if (!video) return;

    const syncTime = () => {
      if (videoRef.current) {
        setCurrentTime(videoRef.current.currentTime);
      }
      if (!video.paused && !video.ended) {
        animId = requestAnimationFrame(syncTime);
      }
    };

    const handlePlay = () => {
      animId = requestAnimationFrame(syncTime);
    };

    const handlePause = () => {
      cancelAnimationFrame(animId);
      if (videoRef.current) {
        setCurrentTime(videoRef.current.currentTime);
      }
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('seeking', syncTime);
    video.addEventListener('seeked', syncTime);
    video.addEventListener('timeupdate', syncTime);

    return () => {
      cancelAnimationFrame(animId);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('seeking', syncTime);
      video.removeEventListener('seeked', syncTime);
      video.removeEventListener('timeupdate', syncTime);
    };
  }, [videoPreviewUrl]);

  // Tìm cue hiện tại đang hiển thị theo currentTime của video (với độ nhạy 60 FPS)
  const activeCue = useMemo(() => {
    return cues.find((c) => currentTime >= c.startTime && currentTime <= c.endTime);
  }, [cues, currentTime]);

  // Xử lý upload file video
  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setVideoFile(file);
    const url = URL.createObjectURL(file);
    setVideoPreviewUrl(url);
    setGeneratedVideoUrl(null);
    setStatusMessage({ text: `Đã tải lên video: ${file.name}`, type: 'info' });
  };

  // Xử lý upload file SRT/VTT có sẵn
  const handleSubtitleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const content = String(reader.result || '');
      setRawSubtitleText(content);
      const parsed = parseSubtitle(content);
      setCues(parsed.cues);
      setOriginalCues(parsed.cues);
      setTimingOffsetSec(0);
      setStatusMessage({
        text: `Đã nhập ${parsed.cues.length} đoạn phụ đề từ tệp "${file.name}".`,
        type: 'success',
      });
    };
    reader.readAsText(file);
  };

  // Tự động bóc tách âm thanh video thành phụ đề (AI STT Whisper)
  const handleAutoTranscribeFromVideo = async () => {
    if (!videoFile) {
      setStatusMessage({ text: 'Vui lòng tải lên file video trước khi nhận diện giọng nói.', type: 'error' });
      return;
    }

    setIsTranscribing(true);
    setStatusMessage({ text: 'Đang trích xuất audio và chạy Whisper AI nhận diện lời thoại...', type: 'info' });

    try {
      const result = await transcribeVideoFile(
        videoFile,
        sourceLanguage,
        (progress) => {
          setStatusMessage({ text: progress, type: 'info' });
        },
        whisperModel
      );

      if (!result || !result.segments || result.segments.length === 0) {
        setStatusMessage({ text: 'Không phát hiện thấy lời thoại trong video này.', type: 'error' });
        setIsTranscribing(false);
        return;
      }

      // Khử trùng lặp segment do chunk overlap
      const cleanSegments = cleanAndDeduplicateWhisperSegments(result.segments);

      // Tối ưu lead-in offset (-0.15s): Đón đầu khẩu hình miệng của diễn viên để triệt tiêu độ trễ
      const LEAD_IN_OFFSET = -0.15;
      const newCues: SubtitleCue[] = cleanSegments.map((seg, idx) => {
        const start = Math.max(0, Math.round((seg.start + LEAD_IN_OFFSET) * 1000) / 1000);
        const end = Math.max(start + 0.3, Math.round(seg.end * 1000) / 1000);
        return {
          id: idx + 1,
          startTime: start,
          endTime: end,
          durationSec: Math.max(0.4, Math.round((end - start) * 1000) / 1000),
          startTimeFormatted: secondsToFormattedTime(start),
          endTimeFormatted: secondsToFormattedTime(end),
          speaker: 'Speaker',
          text: seg.text.trim(),
        };
      });

      setCues(newCues);
      setOriginalCues(newCues);
      setTimingOffsetSec(0);
      setRawSubtitleText(cuesToSRT(newCues));
      setStatusMessage({
        text: `AI đã nhận diện thành công ${newCues.length} câu thoại từ video (đã áp dụng tối ưu đón đầu khẩu hình miệng)! Bạn có thể chọn phong cách và bấm "Dịch sang Tiếng Việt".`,
        type: 'success',
      });
    } catch (err: any) {
      console.error(err);
      setStatusMessage({
        text: err?.message || 'Lỗi khi nhận diện giọng nói từ video.',
        type: 'error',
      });
    } finally {
      setIsTranscribing(false);
    }
  };

  // Dịch phụ đề sang Tiếng Việt (VietSub AI)
  const handleTranslateToVietnamese = async () => {
    if (cues.length === 0) {
      setStatusMessage({ text: 'Chưa có phụ đề để dịch. Hãy tải file SRT hoặc nhận diện từ video.', type: 'error' });
      return;
    }

    setIsTranslating(true);
    setStatusMessage({ text: 'Đang kết nối AI để dịch toàn bộ phụ đề sang Tiếng Việt tự nhiên...', type: 'info' });

    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceLanguage: sourceLanguage === 'auto' ? 'auto' : sourceLanguage,
          targetLanguage: 'vi',
          tone: subtitleTone,
          cues: cues.map(({ id, text, speaker, startTime, endTime }) => ({
            id,
            text,
            speaker,
            startTime,
            endTime,
          })),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Dịch phụ đề thất bại.');
      }

      const translatedCues: SubtitleCue[] = data.cues.map((c: any, index: number) => ({
        ...cues[index],
        text: c.text || cues[index].text,
      }));

      setCues(translatedCues);
      setRawSubtitleText(cuesToSRT(translatedCues));
      setStatusMessage({
        text: `Đã dịch hoàn tất ${translatedCues.length} câu sang Tiếng Việt chuẩn điện ảnh (${toneOptions.find(([val]) => val === subtitleTone)?.[1]})!`,
        type: 'success',
      });
    } catch (err: any) {
      console.error(err);
      setStatusMessage({
        text: err?.message || 'Lỗi khi dịch phụ đề.',
        type: 'error',
      });
    } finally {
      setIsTranslating(false);
    }
  };

  // Điều chỉnh bù trừ độ trễ phụ đề (Timing Offset / Sync Fix)
  const handleAdjustTimingOffset = (offsetStep: number) => {
    if (cues.length === 0) return;
    const newCues = applyTimingOffset(cues, offsetStep);
    setCues(newCues);
    setRawSubtitleText(cuesToSRT(newCues));
    const newTotal = Math.round((timingOffsetSec + offsetStep) * 1000) / 1000;
    setTimingOffsetSec(newTotal);
    setStatusMessage({
      text: `Đã dịch chuyển thời gian phụ đề ${offsetStep < 0 ? `${offsetStep}s (sớm hơn)` : `+${offsetStep}s (trễ hơn)`}. Tổng bù trừ: ${newTotal >= 0 ? `+${newTotal}s` : `${newTotal}s`}.`,
      type: 'info',
    });
  };

  // Đặt lại bù trừ độ trễ về 0s
  const handleResetTimingOffset = () => {
    if (timingOffsetSec === 0 || cues.length === 0) return;
    const reverted = applyTimingOffset(cues, -timingOffsetSec);
    setCues(reverted);
    setRawSubtitleText(cuesToSRT(reverted));
    setTimingOffsetSec(0);
    setStatusMessage({
      text: 'Đã hoàn tác bù trừ thời gian về mặc định (0.0s).',
      type: 'info',
    });
  };

  // Căn chỉnh và khử lặp phụ đề
  const handleCleanAndAlign = () => {
    if (cues.length === 0) return;
    const cleaned = deduplicateSubtitleCues(cues);
    setCues(cleaned);
    setRawSubtitleText(cuesToSRT(cleaned));
    setStatusMessage({
      text: `Đã căn chỉnh timeline sát video và loại bỏ các câu lặp trùng.`,
      type: 'success',
    });
  };

  // Sửa văn bản cue
  const handleCueTextChange = (id: number, newText: string) => {
    setCues((prev) =>
      prev.map((c) => (c.id === id ? { ...c, text: newText } : c))
    );
  };

  // Xóa cue
  const handleDeleteCue = (id: number) => {
    setCues((prev) => prev.filter((c) => c.id !== id).map((c, i) => ({ ...c, id: i + 1 })));
  };

  // Xuất Video VietSub
  const handleGenerateVietSubVideo = async () => {
    if (!videoFile) {
      setStatusMessage({ text: 'Vui lòng tải lên file video.', type: 'error' });
      return;
    }
    if (cues.length === 0) {
      setStatusMessage({ text: 'Chưa có nội dung phụ đề để gắn vào video.', type: 'error' });
      return;
    }

    setIsGeneratingVideo(true);
    setGeneratedVideoUrl(null);
    setStatusMessage({
      text: 'Đang xử lý render video bằng FFmpeg, giữ nguyên 100% âm thanh gốc và lồng phụ đề VietSub...',
      type: 'info',
    });

    try {
      const formData = new FormData();
      formData.append('video', videoFile);
      formData.append('cues', JSON.stringify(cues));
      formData.append(
        'style',
        JSON.stringify({
          fontSize,
          textColor,
          coverOldSub,
          coverType: coverOldSub ? coverType : 'none',
          boxColor: '#000000',
          boxOpacity,
          position: subPosition,
          fontName: 'Arial',
          marginV: subPosition === 'top' ? 25 : 35,
        })
      );
      formData.append('title', videoFile.name.replace(/\.[^/.]+$/, ''));

      const res = await fetch('/api/vietsub/generate', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Lỗi khi tạo video VietSub.');
      }

      setGeneratedVideoUrl(data.videoUrl);
      setStatusMessage({
        text: `Tạo video VietSub thành công! Đã trừ ${data.creditsDeducted.toLocaleString('vi-VN')} Credits. (Còn lại: ${data.remainingCredits.toLocaleString('vi-VN')} Credits).`,
        type: 'success',
      });

      // Cập nhật số dư realtime cho Header
      if (typeof data.remainingCredits === 'number') {
        window.dispatchEvent(
          new CustomEvent('creditsUpdated', {
            detail: { remainingCredits: data.remainingCredits },
          })
        );
      }
    } catch (err: any) {
      console.error(err);
      setStatusMessage({
        text: err?.message || 'Có lỗi xảy ra trong quá trình render video.',
        type: 'error',
      });
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  // Tải file phụ đề SRT
  const handleDownloadSRT = () => {
    const srt = cuesToSRT(cues);
    const blob = new Blob([srt], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${videoFile ? videoFile.name.replace(/\.[^/.]+$/, '') : 'subtitles'}_vietsub.srt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-space-lg max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface-card border border-border-glass rounded-2xl p-space-md lg:p-space-lg backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-primary-container text-[28px]">
              closed_caption
            </span>
            <h1 className="font-headline-md text-headline-md font-bold text-on-surface">
              VietSub Video Studio
            </h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-primary-container/20 text-primary-container uppercase tracking-wider">
              100% Original Sound
            </span>
          </div>
          <p className="font-body-md text-text-secondary">
            Tự động bóc tách thoại hoặc nạp phụ đề nước ngoài, dịch sang Tiếng Việt chuẩn xác và lồng phụ đề chất lượng cao, giữ nguyên 100% âm thanh gốc của video.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/dubbing"
            className="px-4 py-2 rounded-xl text-text-secondary hover:text-on-surface hover:bg-surface-container-high border border-border-glass font-label-md transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">movie_edit</span>
            Lồng Tiếng AI (Dubbing)
          </Link>
        </div>
      </div>

      {/* Thông báo trạng thái */}
      {statusMessage && (
        <div
          className={`p-3.5 rounded-xl flex items-center justify-between gap-2.5 font-body-sm text-body-sm animate-fadeIn ${
            statusMessage.type === 'success'
              ? 'bg-signal-success/15 border border-signal-success/30 text-signal-success'
              : statusMessage.type === 'error'
              ? 'bg-signal-danger/15 border border-signal-danger/30 text-signal-danger'
              : 'bg-primary-container/15 border border-primary-container/30 text-primary-container'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">
              {statusMessage.type === 'success'
                ? 'check_circle'
                : statusMessage.type === 'error'
                ? 'error'
                : 'info'}
            </span>
            <span className="font-medium">{statusMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="hover:opacity-75"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      )}

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-md">
        {/* CỘT TRÁI (5 Cols): Video Input, Nguồn phụ đề, Dịch thuật & Cấu hình Che Sub */}
        <div className="lg:col-span-5 flex flex-col gap-space-md">
          {/* Card 1: Tệp Video & Trình xem trước Live Sub */}
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
                <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center group">
                  <video
                    ref={videoRef}
                    src={videoPreviewUrl}
                    controls
                    onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                    onLoadedMetadata={(e) => setVideoDuration(e.currentTarget.duration)}
                    className="w-full h-full object-contain"
                  />

                  {/* Live Subtitle Overlay Preview trên Video */}
                  {activeCue && (
                    <div
                      className={`absolute left-0 right-0 px-4 text-center pointer-events-none transition-all ${
                        subPosition === 'top'
                          ? 'top-4'
                          : subPosition === 'middle'
                          ? 'top-1/2 -translate-y-1/2'
                          : 'bottom-8'
                      }`}
                    >
                      {coverOldSub && coverType === 'banner' ? (
                        <div className="w-full bg-black/90 py-1.5 px-3">
                          <span
                            style={{ color: textColor, fontSize: `${Math.round(fontSize * 0.7)}px` }}
                            className="font-bold tracking-wide drop-shadow-md inline-block leading-tight"
                          >
                            {activeCue.text}
                          </span>
                        </div>
                      ) : coverOldSub && coverType === 'box' ? (
                        <span
                          style={{
                            color: textColor,
                            fontSize: `${Math.round(fontSize * 0.7)}px`,
                            backgroundColor: `rgba(0, 0, 0, ${boxOpacity})`,
                          }}
                          className="px-3 py-1 rounded-md font-bold tracking-wide inline-block leading-snug shadow-lg"
                        >
                          {activeCue.text}
                        </span>
                      ) : (
                        <span
                          style={{
                            color: textColor,
                            fontSize: `${Math.round(fontSize * 0.7)}px`,
                            textShadow: '2px 2px 3px #000, -2px -2px 3px #000, 2px -2px 3px #000, -2px 2px 3px #000',
                          }}
                          className="font-bold tracking-wide inline-block leading-snug"
                        >
                          {activeCue.text}
                        </span>
                      )}
                    </div>
                  )}
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
                  Nhấp để tải lên Video (MP4, MKV, MOV, WebM)
                </span>
                <span className="font-body-xs text-[11px] text-text-muted">
                  Âm thanh gốc của video sẽ được giữ nguyên 100%
                </span>
                <input type="file" accept="video/*" onChange={handleVideoUpload} className="hidden" />
              </label>
            )}
          </div>

          {/* Card 2: Nguồn Phụ Đề & Dịch Thuật AI */}
          <div className="p-space-md rounded-2xl bg-surface-card border border-border-glass flex flex-col gap-3">
            <h3 className="font-label-lg text-label-lg font-bold text-text-primary flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-[20px]">translate</span>
              <span>2. Nguồn Phụ Đề & Dịch VietSub</span>
            </h3>

            {/* Chọn nguồn: Tải SRT/VTT có sẵn HOẶC Bóc tách bằng Whisper */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-surface-container rounded-xl border border-border-glass">
              <button
                type="button"
                onClick={() => setSourceType('upload_srt')}
                className={`py-2 px-3 rounded-lg font-label-sm text-[12px] font-semibold transition-all flex items-center justify-center gap-1.5 ${
                  sourceType === 'upload_srt'
                    ? 'bg-primary-container text-canvas-base shadow-sm'
                    : 'text-text-secondary hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">upload_file</span>
                <span>Có sẵn file Sub</span>
              </button>

              <button
                type="button"
                onClick={() => setSourceType('ai_transcribe')}
                className={`py-2 px-3 rounded-lg font-label-sm text-[12px] font-semibold transition-all flex items-center justify-center gap-1.5 ${
                  sourceType === 'ai_transcribe'
                    ? 'bg-secondary text-canvas-base shadow-sm'
                    : 'text-text-secondary hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">graphic_eq</span>
                <span>Tự bóc thoại từ Video</span>
              </button>
            </div>

            {/* Ngôn ngữ gốc của video/sub */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-semibold text-text-muted">
                  Ngôn ngữ thoại gốc trong video:
                </label>
                <span className="text-[10px] text-primary-container font-normal">
                  *Chọn đúng ngôn ngữ để AI nghe chuẩn 100%
                </span>
              </div>

              {/* Quick Language Pills */}
              <div className="flex items-center gap-1.5 flex-wrap mb-2">
                {[
                  ['vi', '🇻🇳 Tiếng Việt'],
                  ['en', '🇺🇸 Tiếng Anh'],
                  ['zh', '🇨🇳 Tiếng Trung'],
                  ['ja', '🇯🇵 Tiếng Nhật'],
                  ['ko', '🇰🇷 Tiếng Hàn'],
                  ['auto', '🌐 Tự động'],
                ].map(([code, label]) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setSourceLanguage(code)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all border ${
                      sourceLanguage === code
                        ? 'bg-primary-container/20 text-primary-container border-primary-container font-bold shadow-sm'
                        : 'bg-surface-container/60 text-text-muted border-border-glass hover:text-text-primary hover:bg-surface-container'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <select
                value={sourceLanguage}
                onChange={(e) => setSourceLanguage(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-surface-container border border-border-glass text-text-primary text-body-sm focus:outline-none focus:border-primary-container"
              >
                {languageOptions.map(([val, label]) => (
                  <option key={val} value={val} className="bg-surface-card">
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Phong cách dịch thuật & xưng hô theo bối cảnh */}
            <div>
              <label className="block text-[11px] font-semibold text-text-muted mb-1 flex items-center gap-1">
                <span className="material-symbols-outlined text-primary-container text-[15px]">psychology</span>
                <span>Phong cách dịch & Xưng hô:</span>
              </label>
              <select
                value={subtitleTone}
                onChange={(e) => setSubtitleTone(e.target.value as SubtitleTone)}
                className="w-full px-3 py-2 rounded-xl bg-surface-container border border-border-glass text-text-primary text-body-sm focus:outline-none focus:border-primary-container"
              >
                {toneOptions.map(([val, label]) => (
                  <option key={val} value={val} className="bg-surface-card">
                    {label}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-text-muted mt-1 leading-normal italic">
                {toneOptions.find(([val]) => val === subtitleTone)?.[2]}
              </p>
            </div>

            {sourceType === 'upload_srt' ? (
              <div className="space-y-2">
                <label className="border border-dashed border-border-glass hover:border-primary-container rounded-xl p-3.5 flex items-center justify-center gap-2 cursor-pointer transition-colors bg-surface-container/50 hover:bg-surface-container text-center">
                  <span className="material-symbols-outlined text-primary-container text-[20px]">upload_file</span>
                  <span className="text-body-xs font-semibold text-text-primary">
                    Chọn tệp phụ đề (.srt, .vtt, .txt)
                  </span>
                  <input
                    type="file"
                    accept=".srt,.vtt,.txt"
                    onChange={handleSubtitleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            ) : (
              <div className="p-3 bg-secondary/10 border border-secondary/20 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-text-primary flex items-center gap-1">
                    <span className="material-symbols-outlined text-[15px] text-secondary">model_training</span>
                    <span>Mô hình Whisper AI:</span>
                  </span>
                  <select
                    value={whisperModel}
                    onChange={(e) => setWhisperModel(e.target.value as WhisperModelLevel)}
                    className="px-2 py-1 rounded-lg bg-surface-container border border-border-glass text-text-primary text-[11px] font-semibold"
                  >
                    <option value="base">⚡ Whisper Base (Chuẩn xác, khuyên dùng)</option>
                    <option value="small">🎯 Whisper Small (Độ chi tiết tối đa)</option>
                    <option value="tiny">🚀 Whisper Tiny (Siêu nhẹ, tải nhanh)</option>
                  </select>
                </div>
                <p className="text-[10.5px] text-text-secondary leading-relaxed">
                  Mô hình Whisper Base sẽ chạy trực tiếp trên GPU/CPU trình duyệt bằng âm thanh 16kHz khử nhiễu, tạo timestamp chuẩn xác từng mili-giây.
                </p>
                <button
                  type="button"
                  onClick={handleAutoTranscribeFromVideo}
                  disabled={isTranscribing || !videoFile}
                  className="w-full py-2.5 rounded-xl bg-secondary text-canvas-base font-bold text-label-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isTranscribing ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                      <span>Đang nhận diện giọng nói...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">auto_fix_high</span>
                      <span>Trích Xuất Thoại Bằng Whisper AI</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Nút bấm dịch sang Tiếng Việt */}
            <div className="pt-2 border-t border-border-glass/50 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleTranslateToVietnamese}
                disabled={isTranslating || cues.length === 0}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-primary-container to-secondary-container text-canvas-base font-bold text-label-md hover:opacity-95 transition-opacity flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
              >
                {isTranslating ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
                    <span>Đang dịch sang Tiếng Việt...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[20px]">g_translate</span>
                    <span>Dịch sang Tiếng Việt (VietSub AI)</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleCleanAndAlign}
                disabled={cues.length === 0}
                className="w-full py-1.5 rounded-lg bg-surface-container border border-border-glass text-text-secondary hover:text-text-primary text-[11px] font-semibold transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[14px]">align_horizontal_center</span>
                <span>Căn chỉnh mốc thời gian & Khử lặp</span>
              </button>
            </div>
          </div>

          {/* Card 3: Cấu hình Hiển Thị & Che Sub Cũ (Cover Old Hardsub) */}
          <div className="p-space-md rounded-2xl bg-surface-card border border-border-glass flex flex-col gap-3">
            <h3 className="font-label-lg text-label-lg font-bold text-text-primary flex items-center gap-2">
              <span className="material-symbols-outlined text-primary-container text-[20px]">palette</span>
              <span>3. Định Dạng VietSub & Che Phụ Đề Cũ</span>
            </h3>

            {/* Toggle Che Phụ Đề Cũ */}
            <div className="p-3 bg-surface-container rounded-xl border border-border-glass space-y-2.5">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-body-sm font-bold text-text-primary flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px] text-primary-container">shield</span>
                  Che phụ đề gốc có sẵn trên video (Hardsub)
                </span>
                <input
                  type="checkbox"
                  checked={coverOldSub}
                  onChange={(e) => setCoverOldSub(e.target.checked)}
                  className="h-4 w-4 rounded border-border-glass bg-surface-container-high text-primary-container focus:ring-primary-container"
                />
              </label>

              {coverOldSub && (
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border-glass/60">
                  <button
                    type="button"
                    onClick={() => setCoverType('box')}
                    className={`p-2 rounded-lg border text-left flex flex-col gap-0.5 transition-all ${
                      coverType === 'box'
                        ? 'bg-primary-container/20 border-primary-container text-text-primary'
                        : 'bg-surface-card border-border-glass text-text-muted hover:text-text-primary'
                    }`}
                  >
                    <span className="font-bold text-[11px] text-primary-container">Hộp chữ nhật đen mờ</span>
                    <span className="text-[10px] text-text-muted">Bao quanh dòng chữ, thẩm mỹ cao</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCoverType('banner')}
                    className={`p-2 rounded-lg border text-left flex flex-col gap-0.5 transition-all ${
                      coverType === 'banner'
                        ? 'bg-primary-container/20 border-primary-container text-text-primary'
                        : 'bg-surface-card border-border-glass text-text-muted hover:text-text-primary'
                    }`}
                  >
                    <span className="font-bold text-[11px] text-primary-container">Băng dải đen che đáy</span>
                    <span className="text-[10px] text-text-muted">Che sạch 100% hardsub bản rộng</span>
                  </button>
                </div>
              )}
            </div>

            {/* Tùy chỉnh màu sắc & kích thước chữ */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-text-muted mb-1">Màu chữ VietSub</label>
                <div className="flex items-center gap-1.5">
                  {[
                    { color: '#FFD700', label: 'Vàng Cinema' },
                    { color: '#FFFFFF', label: 'Trắng tinh' },
                    { color: '#00F2FE', label: 'Xanh ngọc' },
                    { color: '#22C55E', label: 'Xanh lá' },
                  ].map((c) => (
                    <button
                      key={c.color}
                      type="button"
                      onClick={() => setTextColor(c.color)}
                      style={{ backgroundColor: c.color }}
                      className={`w-7 h-7 rounded-full border-2 transition-transform ${
                        textColor === c.color ? 'border-primary-container scale-110 shadow-sm' : 'border-transparent opacity-80'
                      }`}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-text-muted mb-1">Cỡ chữ ({fontSize}px)</label>
                <select
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-surface-container border border-border-glass text-text-primary text-[12px]"
                >
                  <option value={24}>Nhỏ (24px)</option>
                  <option value={30}>Vừa - Chuẩn (30px)</option>
                  <option value={36}>Lớn (36px)</option>
                  <option value={42}>Rất lớn (42px)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-text-muted mb-1">Vị trí hiển thị</label>
                <select
                  value={subPosition}
                  onChange={(e) => setSubPosition(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-surface-container border border-border-glass text-text-primary text-[12px]"
                >
                  <option value="bottom">Dưới cùng (Bottom)</option>
                  <option value="top">Trên cùng (Top)</option>
                  <option value="middle">Giữa video (Middle)</option>
                </select>
              </div>

              {coverOldSub && coverType === 'box' && (
                <div>
                  <label className="block text-[11px] font-semibold text-text-muted mb-1">Độ mờ hộp đen ({Math.round(boxOpacity * 100)}%)</label>
                  <input
                    type="range"
                    min="0.4"
                    max="1.0"
                    step="0.05"
                    value={boxOpacity}
                    onChange={(e) => setBoxOpacity(parseFloat(e.target.value))}
                    className="w-full accent-primary-container"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CỘT PHẢI (7 Cols): Editor Timeline Phụ Đề & Nút Xuất Video */}
        <div className="lg:col-span-7 flex flex-col gap-space-md">
          <div className="p-space-md rounded-2xl bg-surface-card border border-border-glass flex flex-col gap-3 flex-1">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <h3 className="font-label-lg text-label-lg font-bold text-text-primary flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary-container text-[20px]">subtitles</span>
                  <span>4. Dòng Thoại VietSub ({cues.length} câu)</span>
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={cues.length === 0}
                  onClick={handleDownloadSRT}
                  className="px-3 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-text-primary text-[11px] font-bold transition-all flex items-center gap-1 disabled:opacity-40"
                  title="Tải về tệp phụ đề .SRT"
                >
                  <span className="material-symbols-outlined text-[14px]">download</span>
                  <span>Tải .SRT</span>
                </button>
              </div>
            </div>

            {/* Thanh công cụ bù trừ độ trễ & đồng bộ thời gian (Timing Offset / Sync Fix) */}
            {cues.length > 0 && (
              <div className="p-2.5 rounded-xl bg-surface-container/60 border border-border-glass flex items-center justify-between flex-wrap gap-2 animate-fadeIn">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-text-primary">
                  <span className="material-symbols-outlined text-primary-container text-[16px]">timer</span>
                  <span>Bù trừ độ trễ:</span>
                  <span
                    className={`px-2 py-0.5 rounded font-code-xs font-bold text-[10px] ${
                      timingOffsetSec === 0
                        ? 'bg-surface-container text-text-muted'
                        : timingOffsetSec < 0
                        ? 'bg-signal-success/20 text-signal-success border border-signal-success/30'
                        : 'bg-primary-container/20 text-primary-container border border-primary-container/30'
                    }`}
                  >
                    {timingOffsetSec === 0
                      ? 'Chuẩn (0.0s)'
                      : timingOffsetSec < 0
                      ? `${timingOffsetSec}s (sớm hơn)`
                      : `+${timingOffsetSec}s (trễ hơn)`}
                  </span>
                </div>

                <div className="flex items-center gap-1 flex-wrap">
                  <span className="text-[10px] text-text-muted mr-1">Chỉnh nhanh:</span>
                  <button
                    type="button"
                    onClick={() => handleAdjustTimingOffset(-0.2)}
                    className="px-2 py-0.5 rounded-md bg-surface-container hover:bg-surface-container-highest text-[10px] font-bold text-text-primary transition-all border border-border-glass"
                    title="Đẩy toàn bộ phụ đề sớm hơn 0.2 giây"
                  >
                    -0.2s
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdjustTimingOffset(-0.15)}
                    className="px-2 py-0.5 rounded-md bg-primary-container/20 hover:bg-primary-container hover:text-canvas-base text-[10px] font-bold text-primary-container transition-all border border-primary-container/40 flex items-center gap-0.5"
                    title="Đón đầu khẩu hình miệng 150ms để loại bỏ độ trễ khi nhân vật mở miệng"
                  >
                    <span className="material-symbols-outlined text-[12px]">bolt</span>
                    <span>-0.15s (Đón đầu)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdjustTimingOffset(-0.1)}
                    className="px-2 py-0.5 rounded-md bg-surface-container hover:bg-surface-container-highest text-[10px] font-bold text-text-primary transition-all border border-border-glass"
                    title="Đẩy toàn bộ phụ đề sớm hơn 0.1 giây"
                  >
                    -0.1s
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdjustTimingOffset(0.1)}
                    className="px-2 py-0.5 rounded-md bg-surface-container hover:bg-surface-container-highest text-[10px] font-bold text-text-primary transition-all border border-border-glass"
                    title="Đẩy toàn bộ phụ đề trễ hơn 0.1 giây"
                  >
                    +0.1s
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdjustTimingOffset(0.2)}
                    className="px-2 py-0.5 rounded-md bg-surface-container hover:bg-surface-container-highest text-[10px] font-bold text-text-primary transition-all border border-border-glass"
                    title="Đẩy toàn bộ phụ đề trễ hơn 0.2 giây"
                  >
                    +0.2s
                  </button>

                  {timingOffsetSec !== 0 && (
                    <button
                      type="button"
                      onClick={handleResetTimingOffset}
                      className="px-2 py-0.5 rounded-md bg-signal-danger/20 hover:bg-signal-danger hover:text-white text-[10px] font-bold text-signal-danger transition-all border border-signal-danger/40 ml-1"
                      title="Đặt lại độ lệch về 0.0s ban đầu"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Danh sách các Cue thoại cho phép chỉnh sửa trực tiếp */}
            {cues.length === 0 ? (
              <div className="py-20 px-4 text-center border-2 border-dashed border-border-glass rounded-xl flex flex-col items-center justify-center">
                <span className="material-symbols-outlined text-[48px] text-text-muted mb-2">
                  subtitles_off
                </span>
                <p className="font-label-md text-on-surface font-semibold">Chưa có dữ liệu phụ đề</p>
                <p className="text-body-xs text-text-muted mt-1 max-w-sm">
                  Hãy tải lên video và bấm "Trích xuất thoại bằng Whisper AI" hoặc tải tệp phụ đề SRT có sẵn ở cột bên trái.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
                {cues.map((cue) => {
                  const isCurrent = currentTime >= cue.startTime && currentTime <= cue.endTime;
                  return (
                    <div
                      key={cue.id}
                      onClick={() => {
                        if (videoRef.current) {
                          videoRef.current.currentTime = cue.startTime;
                          videoRef.current.play().catch(() => undefined);
                        }
                      }}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col gap-2 ${
                        isCurrent
                          ? 'bg-primary-container/15 border-primary-container shadow-sm'
                          : 'bg-surface-container-lowest border-border-glass hover:border-primary-container/40'
                      }`}
                    >
                      <div className="flex items-center justify-between text-body-xs text-text-muted">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-surface-container-high text-on-surface font-bold text-[10px] flex items-center justify-center">
                            {cue.id}
                          </span>
                          <span className="font-code-xs text-[11px] text-primary-container font-semibold">
                            {cue.startTimeFormatted} ➔ {cue.endTimeFormatted}
                          </span>
                          <span className="text-[10px] opacity-75">
                            ({(cue.endTime - cue.startTime).toFixed(1)}s)
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCue(cue.id);
                          }}
                          className="p-1 text-text-muted hover:text-signal-danger transition-colors"
                          title="Xóa câu này"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      </div>

                      <textarea
                        value={cue.text}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => handleCueTextChange(cue.id, e.target.value)}
                        rows={2}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-surface-card border border-border-glass text-text-primary text-body-sm focus:outline-none focus:border-primary-container resize-none"
                      />
                    </div>
                  );
                })}
              </div>
            )}

            {/* Nút hành động chính: Render Video VietSub */}
            <div className="pt-3 border-t border-border-glass/60 space-y-3">
              <button
                type="button"
                onClick={handleGenerateVietSubVideo}
                disabled={isGeneratingVideo || !videoFile || cues.length === 0}
                className={`w-full py-4 rounded-xl font-headline-sm font-bold text-canvas-base flex items-center justify-center gap-2 transition-all shadow-md ${
                  isGeneratingVideo || !videoFile || cues.length === 0
                    ? 'bg-surface-container-highest text-text-muted cursor-not-allowed opacity-60'
                    : 'bg-primary-container hover:shadow-glow-cyan'
                }`}
              >
                {isGeneratingVideo ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[22px]">
                      progress_activity
                    </span>
                    <span>Đang render Video VietSub bằng FFmpeg...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[22px]">movie</span>
                    <span>Xuất Video VietSub (Giữ nguyên âm thanh gốc)</span>
                  </>
                )}
              </button>

              {/* Video kết quả hoàn thành */}
              {generatedVideoUrl && (
                <div className="p-4 bg-signal-success/10 border border-signal-success/30 rounded-2xl space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-signal-success flex items-center gap-1.5 text-label-md">
                      <span className="material-symbols-outlined text-[20px]">task_alt</span>
                      Video VietSub đã sẵn sàng!
                    </span>
                    <a
                      href={generatedVideoUrl}
                      download
                      className="px-4 py-1.5 rounded-xl bg-signal-success text-canvas-base font-bold text-label-sm hover:opacity-90 transition-opacity flex items-center gap-1.5 shadow-sm"
                    >
                      <span className="material-symbols-outlined text-[18px]">download</span>
                      <span>Tải Video (.mp4)</span>
                    </a>
                  </div>

                  <div className="rounded-xl overflow-hidden bg-black aspect-video">
                    <video src={generatedVideoUrl} controls className="w-full h-full object-contain" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
