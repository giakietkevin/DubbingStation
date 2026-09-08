'use client';

import React, { useState, useRef, useEffect } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
// Import động transformers để tránh lỗi SSR trên Next.js
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import * as transformers from '@huggingface/transformers';
import { cleanAndDeduplicateWhisperSegments, exportToVTT, type WhisperSegment } from '@/lib/whisper';

export default function LocalVideoSubtitler() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [subtitleUrl, setSubtitleUrl] = useState<string>('');
  const [status, setStatus] = useState<string>('idle');
  const [progress, setProgress] = useState<number>(0);
  const [logs, setLogs] = useState<string[]>([]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const ffmpegRef = useRef<FFmpeg | null>(null);

  const addLog = (msg: string) => setLogs((prev) => [...prev, msg]);

  // Khởi tạo FFmpeg
  useEffect(() => {
    const loadFFmpeg = async () => {
      ffmpegRef.current = new FFmpeg();
      ffmpegRef.current.on('log', ({ message }) => {
        // console.log('[FFmpeg]', message);
      });
      ffmpegRef.current.on('progress', ({ progress: p }) => {
        setProgress(Math.round(p * 100));
      });
      await ffmpegRef.current.load();
      addLog('Đã tải thành công FFmpeg engine.');
    };
    loadFFmpeg().catch((err) => addLog('Lỗi tải FFmpeg: ' + err.message));
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      setVideoUrl(URL.createObjectURL(file));
      setSubtitleUrl('');
      setStatus('idle');
      setProgress(0);
      setLogs([]);
      addLog('Đã chọn video: ' + file.name);
    }
  };

  // Convert time giây sang định dạng HH:MM:SS.MMM cho VTT
  const formatVTTTime = (seconds: number) => {
    const date = new Date(seconds * 1000);
    const hh = String(Math.floor(seconds / 3600)).padStart(2, '0');
    const mm = String(date.getUTCMinutes()).padStart(2, '0');
    const ss = String(date.getUTCSeconds()).padStart(2, '0');
    const ms = String(date.getUTCMilliseconds()).padStart(3, '0');
    return `${hh}:${mm}:${ss}.${ms}`;
  };

  const processVideo = async () => {
    if (!videoFile || !ffmpegRef.current) return;

    setStatus('extracting');
    addLog('Đang trích xuất Audio (WAV) từ Video...');
    setProgress(0);

    const ffmpeg = ffmpegRef.current;
    try {
      // 1. Tách audio với FFmpeg
      await ffmpeg.writeFile(videoFile.name, await fetchFile(videoFile));
      // Tách ra wav, 16kHz, mono (định dạng tốt nhất cho Whisper)
      await ffmpeg.exec([
        '-i', videoFile.name,
        '-ac', '1',
        '-ar', '16000',
        'output.wav',
      ]);
      const data = await ffmpeg.readFile('output.wav');
      const audioBytes = new Uint8Array(data as Uint8Array);
      const audioBuffer = new ArrayBuffer(audioBytes.byteLength);
      new Uint8Array(audioBuffer).set(audioBytes);
      const audioBlob = new Blob([audioBuffer], { type: 'audio/wav' });
      addLog('Đã trích xuất Audio xong! Đang tải mô hình AI để phân tích (lần đầu sẽ mất vài phút tải mô hình)...');

      // 2. Chạy Whisper với Transformers.js
      setStatus('transcribing');
      setProgress(0);

      // Cấu hình môi trường Web
      transformers.env.allowLocalModels = false;
      transformers.env.useBrowserCache = true;

      // Sử dụng model Whisper rất nhẹ chuyên trị tiếng Việt/Đa ngôn ngữ
      const transcriber = await transformers.pipeline(
        'automatic-speech-recognition',
        'Xenova/whisper-tiny', // Hoặc 'Xenova/whisper-small' nếu máy đủ khoẻ
        {
          progress_callback: (info: any) => {
            if (info.status === 'progress' && info.progress) {
              setProgress(Math.round(info.progress));
            }
          },
        }
      );

      addLog('Đang nhận diện giọng nói (STT)... (Có thể tốn chút thời gian tuỳ độ dài video)');
      // Đọc file Blob dưới dạng mảng Float32 hoặc truyền Blob URL
      const audioUrl = URL.createObjectURL(audioBlob);

      const result = await transcriber(audioUrl, {
        chunk_length_s: 30,
        stride_length_s: 5,
        return_timestamps: true,
      });

      addLog('Nhận diện xong!');

      // 3. Xây dựng nội dung file .vtt (khử lặp và căn sát timeline video)
      // @ts-ignore
      const chunks = result.chunks || [];
      const rawSegments: WhisperSegment[] = chunks.map((chunk: any, index: number) => ({
        id: index + 1,
        start: Number(chunk.timestamp[0] ?? 0),
        end: Number(chunk.timestamp[1] ?? (chunk.timestamp[0] ?? 0) + 3),
        text: (chunk.text || '').trim(),
      })).filter((s: WhisperSegment) => s.text && s.end > s.start);

      const cleanSegments = cleanAndDeduplicateWhisperSegments(rawSegments);
      const vttContent = exportToVTT(cleanSegments);

      // Tạo Blob VTT và render lên Video
      const vttBlob = new Blob([vttContent], { type: 'text/vtt' });
      const vttUrl = URL.createObjectURL(vttBlob);
      setSubtitleUrl(vttUrl);
      setStatus('done');
      addLog('Hoàn tất tạo phụ đề! Hãy xem trực tiếp trên video bên dưới.');

    } catch (error: any) {
      console.error(error);
      addLog('Có lỗi xảy ra: ' + error.message);
      setStatus('error');
    }
  };

  return (
    <div className="p-6 bg-slate-900 border border-slate-700 rounded-xl max-w-4xl mx-auto text-slate-200">
      <h2 className="text-2xl font-bold mb-2 text-white">Trình Phụ Đề Video Tự Động (Hoàn toàn Miễn Phí)</h2>
      <p className="text-sm text-slate-400 mb-6">
        Xử lý 100% bằng sức mạnh máy tính của bạn (Local Browser-side). Không tốn API credit, không giới hạn.
      </p>

      {/* Input */}
      <div className="mb-6 flex gap-4">
        <label className="flex-1 border-2 border-dashed border-slate-600 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-slate-800 transition-colors">
          <span className="font-medium">Nhấn để chọn file Video</span>
          <span className="text-xs text-slate-500 mt-1">Hỗ trợ mp4, webm, mov</span>
          <input type="file" accept="video/*" className="hidden" onChange={handleFileChange} />
        </label>
        {videoFile && (
          <button
            onClick={processVideo}
            disabled={status === 'extracting' || status === 'transcribing'}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 font-semibold rounded-lg flex items-center justify-center transition-all"
          >
            {status === 'idle' || status === 'done' || status === 'error' ? 'Tạo Phụ Đề' : 'Đang xử lý...'}
          </button>
        )}
      </div>

      {/* Tiến độ và Trạng thái */}
      {status !== 'idle' && (
        <div className="bg-slate-800 p-4 rounded-lg mb-6 border border-slate-700">
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium text-blue-400">
              {status === 'extracting' ? 'FFmpeg: Tách Audio' : status === 'transcribing' ? 'AI: Bóc Băng (STT)' : status === 'done' ? 'Thành Công!' : 'Lỗi'}
            </span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2.5">
            <div
              className={`h-2.5 rounded-full ${status === 'done' ? 'bg-green-500' : status === 'error' ? 'bg-red-500' : 'bg-blue-500'}`}
              style={{ width: `${progress}%` }}
            ></div>
          </div>

          <div className="mt-4 text-xs text-slate-400 max-h-32 overflow-y-auto space-y-1">
            {logs.map((log, idx) => (
              <div key={idx}>&gt; {log}</div>
            ))}
          </div>
        </div>
      )}

      {/* Trình chiếu Video */}
      {videoUrl && (
        <div className="mt-8 border border-slate-700 rounded-xl overflow-hidden bg-black shadow-lg relative">
          <video
            ref={videoRef}
            src={videoUrl}
            controls
            className="w-full max-h-[500px] object-contain"
            crossOrigin="anonymous"
          >
            {subtitleUrl && (
              <track
                label="Tiếng Việt (Tự động)"
                kind="subtitles"
                srcLang="vi"
                src={subtitleUrl}
                default
              />
            )}
          </video>
        </div>
      )}

      {/* Export Button */}
      {subtitleUrl && (
        <div className="mt-4 flex justify-end">
          <a
            href={subtitleUrl}
            download={`PhuDe_${videoFile?.name || 'video'}.vtt`}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm font-medium transition-colors"
          >
            ↓ Tải file .VTT
          </a>
        </div>
      )}
    </div>
  );
}
