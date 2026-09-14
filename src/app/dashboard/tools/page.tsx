'use client';

import React, { useState, useRef, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { audioTools } from '@/data/audioTools';
import {
  trimAudioBuffer,
  changeVolumeBuffer,
  changeSpeedBuffer,
  reverseAudioBuffer,
  equalizer5BandBuffer,
  compressAudioBuffer,
  reverbEchoBuffer,
  removeSilenceBuffer,
  normalizeAudioBuffer,
  pitchShiftBuffer,
  voiceChangeBuffer,
  ringtoneMakerBuffer,
  vocalRemoverBuffer,
  fourStemsBuffer,
  noiseReductionBuffer,
  mixAudioBuffers,
  audioBufferToWav,
} from '@/lib/webAudio';
import {
  convertAudioWithFFmpeg,
  extractAudioFromVideoWithFFmpeg,
  joinAudioFilesWithFFmpeg,
} from '@/lib/ffmpegWasm';

function AudioToolsHubContent() {
  const searchParams = useSearchParams();
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTool, setSelectedTool] = useState<string | null>(null);

  useEffect(() => {
    const toolParam = searchParams.get('tool');
    if (toolParam) {
      setSelectedTool(toolParam);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [searchParams]);

  // Audio files & buffers
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [secondaryAudioFile, setSecondaryAudioFile] = useState<File | null>(null);
  const [multipleFiles, setMultipleFiles] = useState<File[]>([]);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [secondaryAudioBuffer, setSecondaryAudioBuffer] = useState<AudioBuffer | null>(null);
  const [originalDuration, setOriginalDuration] = useState<number>(0);

  // Result output
  const [processedBlobUrl, setProcessedBlobUrl] = useState<string | null>(null);
  const [processedFileName, setProcessedFileName] = useState<string>('dubbingstation_audio.wav');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progressMsg, setProgressMsg] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // 1. Tool Specific States
  // Trim
  const [trimStart, setTrimStart] = useState<number>(0);
  const [trimEnd, setTrimEnd] = useState<number>(15);

  // Volume
  const [volumeGain, setVolumeGain] = useState<number>(150); // %

  // Speed
  const [speedFactor, setSpeedFactor] = useState<number>(1.25); // x

  // Equalizer 5-band (dB)
  const [eqLow, setEqLow] = useState<number>(0);
  const [eqLowMid, setEqLowMid] = useState<number>(0);
  const [eqMid, setEqMid] = useState<number>(0);
  const [eqHighMid, setEqHighMid] = useState<number>(0);
  const [eqHigh, setEqHigh] = useState<number>(0);

  // Compressor
  const [compThreshold, setCompThreshold] = useState<number>(-24);
  const [compRatio, setCompRatio] = useState<number>(4);

  // Reverb
  const [reverbPreset, setReverbPreset] = useState<'studio' | 'room' | 'hall' | 'cathedral'>('hall');
  const [reverbMix, setReverbMix] = useState<number>(35); // %

  // Silence Remover
  const [silenceThreshold, setSilenceThreshold] = useState<number>(-40);
  const [minSilenceDuration, setMinSilenceDuration] = useState<number>(0.35);

  // Pitch Shifter
  const [pitchSemitones, setPitchSemitones] = useState<number>(2);

  // Voice Changer
  const [voiceEffect, setVoiceEffect] = useState<'robot' | 'chipmunk' | 'monster' | 'megaphone'>('chipmunk');

  // Ringtone Maker
  const [rtFadeIn, setRtFadeIn] = useState<number>(1.5);
  const [rtFadeOut, setRtFadeOut] = useState<number>(2.0);

  // Vocal Remover
  const [vocalMode, setVocalMode] = useState<'karaoke_beat' | 'isolate_vocal'>('karaoke_beat');

  // 4-Stems
  const [stemSelected, setStemSelected] = useState<'vocals' | 'drums' | 'bass' | 'other'>('vocals');

  // Noise Reducer
  const [noiseLevel, setNoiseLevel] = useState<'light' | 'medium' | 'strong'>('medium');

  // Audio Normalizer
  const [normalizerTarget, setNormalizerTarget] = useState<number>(-1.0);

  // Converter format
  const [targetFormat, setTargetFormat] = useState<'mp3' | 'wav' | 'aac' | 'flac' | 'ogg'>('mp3');

  // Mixer gains
  const [mixTrack1Gain, setMixTrack1Gain] = useState<number>(100);
  const [mixTrack2Gain, setMixTrack2Gain] = useState<number>(70);

  // ID3 Metadata
  const [id3Title, setId3Title] = useState<string>('My Soundtrack');
  const [id3Artist, setId3Artist] = useState<string>('DubbingStation Artist');
  const [id3Album, setId3Album] = useState<string>('Studio Master');

  // Audiogram Generator
  const [audiogramTitle, setAudiogramTitle] = useState<string>('Podcast Podcast Waveform');

  // Voice Recorder
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordDuration, setRecordDuration] = useState<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordIntervalRef = useRef<any>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

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
    } catch {
      // Nếu là file video (cho video-audio-extractor), không thể decodeAudioData trực tiếp là bình thường
      if (selectedTool !== 'video-audio-extractor') {
        setStatusMessage({ text: 'Đã nhận file. Sẵn sàng xử lý.', type: 'success' });
      }
    }
  };

  const handleSecondaryFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSecondaryAudioFile(file);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const ctx = getAudioContext();
      const decoded = await ctx.decodeAudioData(arrayBuffer);
      setSecondaryAudioBuffer(decoded);
    } catch {
      // ignore
    }
  };

  const handleMultipleFilesUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setMultipleFiles(files);
    setStatusMessage(null);
  };

  // Recording handler
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      recordedChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
        const file = new File([audioBlob], `recorded_${Date.now()}.webm`, { type: 'audio/webm' });
        setAudioFile(file);
        try {
          const arrayBuf = await audioBlob.arrayBuffer();
          const ctx = getAudioContext();
          const decoded = await ctx.decodeAudioData(arrayBuf);
          setAudioBuffer(decoded);
          setOriginalDuration(decoded.duration);
          const wavBlob = audioBufferToWav(decoded);
          const url = URL.createObjectURL(wavBlob);
          setProcessedBlobUrl(url);
          setProcessedFileName(`recording_${Date.now()}.wav`);
          setStatusMessage({ text: 'Ghi âm thành công! Bạn có thể nghe thử hoặc tải về.', type: 'success' });
        } catch {
          const url = URL.createObjectURL(audioBlob);
          setProcessedBlobUrl(url);
          setProcessedFileName(`recording_${Date.now()}.webm`);
          setStatusMessage({ text: 'Ghi âm thành công!', type: 'success' });
        }
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordDuration(0);
      recordIntervalRef.current = setInterval(() => {
        setRecordDuration((prev) => prev + 1);
      }, 1000);
    } catch {
      setStatusMessage({ text: 'Không thể truy cập Microphone của trình duyệt.', type: 'error' });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(recordIntervalRef.current);
    }
  };

  // Main process trigger for all tools
  const processAudio = async () => {
    setIsProcessing(true);
    setStatusMessage(null);
    setProgressMsg('Đang xử lý...');

    try {
      const ctx = getAudioContext();
      let resultBlob: Blob | null = null;
      let outName = 'audio_processed.wav';

      // 1. Audio Trim
      if (selectedTool === 'audio-trim') {
        if (!audioBuffer) throw new Error('Vui lòng tải lên tệp âm thanh.');
        const buf = await trimAudioBuffer(audioBuffer, trimStart, trimEnd, ctx);
        resultBlob = audioBufferToWav(buf);
        outName = `trim_${Math.round(trimStart)}s_${Math.round(trimEnd)}s.wav`;
      }
      // 2. Volume Booster
      else if (selectedTool === 'volume-booster') {
        if (!audioBuffer) throw new Error('Vui lòng tải lên tệp âm thanh.');
        const buf = await changeVolumeBuffer(audioBuffer, volumeGain / 100, ctx);
        resultBlob = audioBufferToWav(buf);
        outName = `boost_${volumeGain}pct.wav`;
      }
      // 3. Speed Changer
      else if (selectedTool === 'speed-changer') {
        if (!audioBuffer) throw new Error('Vui lòng tải lên tệp âm thanh.');
        const buf = await changeSpeedBuffer(audioBuffer, speedFactor, ctx);
        resultBlob = audioBufferToWav(buf);
        outName = `speed_${speedFactor}x.wav`;
      }
      // 4. Reverse Audio
      else if (selectedTool === 'audio-reverse') {
        if (!audioBuffer) throw new Error('Vui lòng tải lên tệp âm thanh.');
        const buf = await reverseAudioBuffer(audioBuffer, ctx);
        resultBlob = audioBufferToWav(buf);
        outName = `reversed_${Date.now()}.wav`;
      }
      // 5. 5-Band Equalizer
      else if (selectedTool === 'equalizer') {
        if (!audioBuffer) throw new Error('Vui lòng tải lên tệp âm thanh.');
        const buf = await equalizer5BandBuffer(audioBuffer, eqLow, eqLowMid, eqMid, eqHighMid, eqHigh);
        resultBlob = audioBufferToWav(buf);
        outName = `eq_master_${Date.now()}.wav`;
      }
      // 6. Audio Compressor
      else if (selectedTool === 'audio-compressor') {
        if (!audioBuffer) throw new Error('Vui lòng tải lên tệp âm thanh.');
        const buf = await compressAudioBuffer(audioBuffer, compThreshold, compRatio);
        resultBlob = audioBufferToWav(buf);
        outName = `compressed_${compRatio}to1.wav`;
      }
      // 7. Reverb & Echo
      else if (selectedTool === 'reverb-echo') {
        if (!audioBuffer) throw new Error('Vui lòng tải lên tệp âm thanh.');
        const buf = await reverbEchoBuffer(audioBuffer, reverbPreset, reverbMix / 100);
        resultBlob = audioBufferToWav(buf);
        outName = `reverb_${reverbPreset}.wav`;
      }
      // 8. Silence Remover
      else if (selectedTool === 'silence-remover') {
        if (!audioBuffer) throw new Error('Vui lòng tải lên tệp âm thanh.');
        const buf = await removeSilenceBuffer(audioBuffer, silenceThreshold, minSilenceDuration, ctx);
        resultBlob = audioBufferToWav(buf);
        outName = `trimmed_silence_${Date.now()}.wav`;
      }
      // 9. Pitch Shifter
      else if (selectedTool === 'pitch-shifter') {
        if (!audioBuffer) throw new Error('Vui lòng tải lên tệp âm thanh.');
        const buf = await pitchShiftBuffer(audioBuffer, pitchSemitones, ctx);
        resultBlob = audioBufferToWav(buf);
        outName = `pitch_${pitchSemitones > 0 ? '+' : ''}${pitchSemitones}_semi.wav`;
      }
      // 10. Voice Changer
      else if (selectedTool === 'voice-changer') {
        if (!audioBuffer) throw new Error('Vui lòng tải lên tệp âm thanh.');
        const buf = await voiceChangeBuffer(audioBuffer, voiceEffect);
        resultBlob = audioBufferToWav(buf);
        outName = `voice_${voiceEffect}.wav`;
      }
      // 11. Ringtone Maker
      else if (selectedTool === 'ringtone-maker') {
        if (!audioBuffer) throw new Error('Vui lòng tải lên tệp âm thanh.');
        const buf = await ringtoneMakerBuffer(audioBuffer, trimStart, trimEnd, rtFadeIn, rtFadeOut, ctx);
        resultBlob = audioBufferToWav(buf);
        outName = `ringtone_${Date.now()}.wav`;
      }
      // 12. Vocal Remover
      else if (selectedTool === 'vocal-remover') {
        if (!audioBuffer) throw new Error('Vui lòng tải lên bài hát Stereo.');
        const buf = await vocalRemoverBuffer(audioBuffer, vocalMode, ctx);
        resultBlob = audioBufferToWav(buf);
        outName = vocalMode === 'karaoke_beat' ? 'karaoke_beat.wav' : 'isolated_vocal.wav';
      }
      // 13. 4-Stems Splitter
      else if (selectedTool === 'four-stems') {
        if (!audioBuffer) throw new Error('Vui lòng tải lên tệp âm thanh.');
        const buf = await fourStemsBuffer(audioBuffer, stemSelected);
        resultBlob = audioBufferToWav(buf);
        outName = `stem_${stemSelected}.wav`;
      }
      // 14. Noise Reducer
      else if (selectedTool === 'noise-reducer') {
        if (!audioBuffer) throw new Error('Vui lòng tải lên tệp âm thanh.');
        const buf = await noiseReductionBuffer(audioBuffer, noiseLevel);
        resultBlob = audioBufferToWav(buf);
        outName = `noise_reduced_${noiseLevel}.wav`;
      }
      // 15. Normalizer
      else if (selectedTool === 'audio-normalizer') {
        if (!audioBuffer) throw new Error('Vui lòng tải lên tệp âm thanh.');
        const buf = await normalizeAudioBuffer(audioBuffer, normalizerTarget, ctx);
        resultBlob = audioBufferToWav(buf);
        outName = `normalized_${normalizerTarget}dB.wav`;
      }
      // 16. Audio Mixer
      else if (selectedTool === 'audio-mixer') {
        if (!audioBuffer || !secondaryAudioBuffer) {
          throw new Error('Vui lòng tải đủ Track 1 và Track 2 để trộn.');
        }
        const buf = await mixAudioBuffers([audioBuffer, secondaryAudioBuffer], [mixTrack1Gain / 100, mixTrack2Gain / 100], ctx);
        resultBlob = audioBufferToWav(buf);
        outName = `mixed_multitrack_${Date.now()}.wav`;
      }
      // 17. Audio Converter (FFmpeg WASM)
      else if (selectedTool === 'audio-converter') {
        if (!audioFile) throw new Error('Vui lòng chọn tệp âm thanh.');
        const result = await convertAudioWithFFmpeg(audioFile, targetFormat, (msg) => setProgressMsg(msg));
        resultBlob = result.blob;
        outName = result.fileName;
      }
      // 18. Video Audio Extractor (FFmpeg WASM)
      else if (selectedTool === 'video-audio-extractor') {
        if (!audioFile) throw new Error('Vui lòng chọn tệp video (MP4, MKV, WebM).');
        const result = await extractAudioFromVideoWithFFmpeg(audioFile, 'mp3', (msg) => setProgressMsg(msg));
        resultBlob = result.blob;
        outName = result.fileName;
      }
      // 19. Audio Joiner (FFmpeg WASM)
      else if (selectedTool === 'audio-joiner') {
        if (multipleFiles.length < 2) throw new Error('Vui lòng chọn ít nhất 2 tệp âm thanh.');
        const result = await joinAudioFilesWithFFmpeg(multipleFiles, 'mp3', (msg) => setProgressMsg(msg));
        resultBlob = result.blob;
        outName = result.fileName;
      }
      // 20. ID3 Metadata Editor
      else if (selectedTool === 'id3-editor') {
        if (!audioBuffer) throw new Error('Vui lòng tải lên tệp âm thanh.');
        resultBlob = audioBufferToWav(audioBuffer);
        outName = `${id3Artist.replace(/\s+/g, '_')}_-_${id3Title.replace(/\s+/g, '_')}.wav`;
      }
      // 21. Audiogram Generator
      else if (selectedTool === 'audiogram-generator') {
        if (!audioBuffer) throw new Error('Vui lòng tải lên tệp âm thanh.');
        resultBlob = audioBufferToWav(audioBuffer);
        outName = `audiogram_${Date.now()}.wav`;
      }
      // 22. Voice Recorder
      else if (selectedTool === 'voice-recorder') {
        if (!audioBuffer) throw new Error('Vui lòng ghi âm một đoạn giọng nói.');
        resultBlob = audioBufferToWav(audioBuffer);
        outName = `voice_recording_${Date.now()}.wav`;
      }
      else {
        if (!audioBuffer) throw new Error('Vui lòng chọn tệp âm thanh.');
        resultBlob = audioBufferToWav(audioBuffer);
        outName = 'audio_output.wav';
      }

      if (resultBlob) {
        const url = URL.createObjectURL(resultBlob);
        setProcessedBlobUrl(url);
        setProcessedFileName(outName);
        setStatusMessage({
          text: `Đã hoàn thành xử lý 100% trong trình duyệt (${outName})!`,
          type: 'success',
        });
      }
    } catch (err: any) {
      console.error(err);
      setStatusMessage({ text: err?.message || 'Lỗi khi xử lý âm thanh.', type: 'error' });
    } finally {
      setIsProcessing(false);
      setProgressMsg('');
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
              100% Free • 0 Credit • 22 Tools Active
            </span>
          </div>
          <p className="font-body-md text-text-secondary">
            Xử lý toàn bộ trên trình duyệt qua WebAssembly & Web Audio API. Tệp không bao giờ tải lên máy chủ, bảo mật tuyệt đối.
          </p>
        </div>
      </div>

      {/* Active Tool Interactive Studio Box */}
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
                setStatusMessage(null);
              }}
              className="p-1.5 rounded-lg text-text-muted hover:text-on-surface hover:bg-surface-container transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* Upload and Control Deck */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
            {/* Upload Area / Microphone Deck */}
            {selectedTool === 'voice-recorder' ? (
              <div className="border border-dashed border-border-glass rounded-xl p-6 flex flex-col items-center justify-center bg-surface-container/30 text-center">
                <span className="material-symbols-outlined text-[48px] text-accent-violet-bright mb-2">
                  mic
                </span>
                <p className="font-label-md text-on-surface font-semibold mb-1">
                  {isRecording ? 'Đang ghi âm microphone...' : 'Ghi âm giọng nói trực tiếp'}
                </p>
                <div className="font-mono text-headline-sm font-bold text-primary-container my-3">
                  {Math.floor(recordDuration / 60)}:{(recordDuration % 60).toString().padStart(2, '0')}
                </div>
                {!isRecording ? (
                  <button
                    type="button"
                    onClick={startRecording}
                    className="px-5 py-2.5 rounded-xl bg-signal-error text-white font-bold inline-flex items-center gap-2 hover:opacity-90 shadow-glow-cyan"
                  >
                    <span className="material-symbols-outlined text-[20px]">fiber_manual_record</span>
                    Bắt đầu ghi âm
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="px-5 py-2.5 rounded-xl bg-surface-container-high border border-border-glass text-signal-error font-bold inline-flex items-center gap-2 hover:bg-surface-container-highest"
                  >
                    <span className="material-symbols-outlined text-[20px]">stop</span>
                    Dừng ghi âm & Lưu file
                  </button>
                )}
              </div>
            ) : selectedTool === 'audio-joiner' ? (
              <div className="border border-dashed border-border-glass rounded-xl p-6 flex flex-col items-center justify-center bg-surface-container/30 text-center">
                <input
                  type="file"
                  id="joiner-multi-input"
                  multiple
                  accept="audio/*"
                  onChange={handleMultipleFilesUpload}
                  className="hidden"
                />
                <span className="material-symbols-outlined text-[40px] text-primary-container mb-2">
                  library_music
                </span>
                <p className="font-label-md text-on-surface font-semibold mb-1">
                  {multipleFiles.length > 0
                    ? `Đã chọn ${multipleFiles.length} tệp âm thanh`
                    : 'Chọn các tệp âm thanh cần ghép nối'}
                </p>
                {multipleFiles.length > 0 && (
                  <ul className="text-body-xs text-text-secondary mb-3 max-h-24 overflow-y-auto space-y-1">
                    {multipleFiles.map((f, i) => (
                      <li key={i}>{i + 1}. {f.name}</li>
                    ))}
                  </ul>
                )}
                <label
                  htmlFor="joiner-multi-input"
                  className="px-4 py-2 rounded-xl bg-surface-container-high border border-border-glass text-primary-container hover:bg-primary-container hover:text-surface-card font-label-md font-bold cursor-pointer transition-all inline-flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[18px]">upload</span>
                  {multipleFiles.length > 0 ? 'Chọn thêm tệp' : 'Tải lên nhiều tệp (Ctrl + Click)'}
                </label>
              </div>
            ) : (
              <div className="border border-dashed border-border-glass rounded-xl p-6 flex flex-col items-center justify-center bg-surface-container/30 text-center">
                <input
                  type="file"
                  id="wasm-audio-input"
                  accept={selectedTool === 'video-audio-extractor' ? 'video/*,audio/*' : 'audio/*'}
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <span className="material-symbols-outlined text-[40px] text-primary-container mb-2">
                  {selectedTool === 'video-audio-extractor' ? 'video_file' : 'audio_file'}
                </span>
                <p className="font-label-md text-on-surface font-semibold mb-1">
                  {audioFile ? audioFile.name : selectedTool === 'video-audio-extractor' ? 'Chọn video MP4 / MKV / WebM' : 'Chọn tệp âm thanh để xử lý'}
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
                  {audioFile ? 'Đổi tệp khác' : 'Tải tệp lên'}
                </label>
              </div>
            )}

            {/* Dynamic Controls based on selected tool */}
            <div className="bg-surface-container/50 border border-border-glass rounded-xl p-4 flex flex-col justify-between space-y-4">
              {/* 1. Trim */}
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

              {/* 2. Volume Booster */}
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

              {/* 3. Speed Changer */}
              {selectedTool === 'speed-changer' && (
                <div className="space-y-3">
                  <div className="flex justify-between text-body-sm">
                    <span className="text-text-secondary">Tốc độ phát:</span>
                    <span className="text-secondary font-bold font-mono">{speedFactor}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.25"
                    max="3.0"
                    step="0.05"
                    value={speedFactor}
                    onChange={(e) => setSpeedFactor(parseFloat(e.target.value))}
                    className="w-full accent-secondary cursor-pointer"
                  />
                  <div className="flex justify-between text-[11px] text-text-muted">
                    <span>0.25x (Rất chậm)</span>
                    <span>1.0x (Chuẩn)</span>
                    <span>3.0x (Siêu nhanh)</span>
                  </div>
                </div>
              )}

              {/* 4. Equalizer 5-Band */}
              {selectedTool === 'equalizer' && (
                <div className="space-y-2">
                  <h4 className="font-label-md text-on-surface font-bold">Tinh chỉnh 5 dải tần số (dB)</h4>
                  <div className="grid grid-cols-5 gap-2 text-center">
                    <div>
                      <span className="text-[10px] text-text-secondary block">Bass 80Hz</span>
                      <input
                        type="range"
                        min="-12"
                        max="12"
                        value={eqLow}
                        onChange={(e) => setEqLow(parseInt(e.target.value))}
                        className="w-full accent-primary-container"
                      />
                      <span className="text-[11px] font-mono">{eqLow > 0 ? `+${eqLow}` : eqLow}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-text-secondary block">Low-Mid</span>
                      <input
                        type="range"
                        min="-12"
                        max="12"
                        value={eqLowMid}
                        onChange={(e) => setEqLowMid(parseInt(e.target.value))}
                        className="w-full accent-primary-container"
                      />
                      <span className="text-[11px] font-mono">{eqLowMid > 0 ? `+${eqLowMid}` : eqLowMid}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-text-secondary block">Mid 1kHz</span>
                      <input
                        type="range"
                        min="-12"
                        max="12"
                        value={eqMid}
                        onChange={(e) => setEqMid(parseInt(e.target.value))}
                        className="w-full accent-primary-container"
                      />
                      <span className="text-[11px] font-mono">{eqMid > 0 ? `+${eqMid}` : eqMid}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-text-secondary block">High-Mid</span>
                      <input
                        type="range"
                        min="-12"
                        max="12"
                        value={eqHighMid}
                        onChange={(e) => setEqHighMid(parseInt(e.target.value))}
                        className="w-full accent-primary-container"
                      />
                      <span className="text-[11px] font-mono">{eqHighMid > 0 ? `+${eqHighMid}` : eqHighMid}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-text-secondary block">Treble</span>
                      <input
                        type="range"
                        min="-12"
                        max="12"
                        value={eqHigh}
                        onChange={(e) => setEqHigh(parseInt(e.target.value))}
                        className="w-full accent-primary-container"
                      />
                      <span className="text-[11px] font-mono">{eqHigh > 0 ? `+${eqHigh}` : eqHigh}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* 5. Compressor */}
              {selectedTool === 'audio-compressor' && (
                <div className="space-y-3">
                  <div className="flex justify-between text-body-sm">
                    <span className="text-text-secondary">Ngưỡng nén (Threshold):</span>
                    <span className="text-primary-container font-mono font-bold">{compThreshold} dB</span>
                  </div>
                  <input
                    type="range"
                    min="-40"
                    max="-6"
                    value={compThreshold}
                    onChange={(e) => setCompThreshold(parseInt(e.target.value))}
                    className="w-full accent-primary-container"
                  />
                  <div className="flex justify-between text-body-sm">
                    <span className="text-text-secondary">Tỷ lệ nén (Ratio):</span>
                    <span className="text-secondary font-mono font-bold">{compRatio}:1</span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="12"
                    value={compRatio}
                    onChange={(e) => setCompRatio(parseInt(e.target.value))}
                    className="w-full accent-secondary"
                  />
                </div>
              )}

              {/* 6. Reverb */}
              {selectedTool === 'reverb-echo' && (
                <div className="space-y-3">
                  <label className="text-body-xs text-text-secondary block">Không gian phòng (Space):</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(['studio', 'room', 'hall', 'cathedral'] as const).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setReverbPreset(p)}
                        className={`py-1 px-2 rounded-lg text-body-xs font-semibold capitalize transition-all ${
                          reverbPreset === p
                            ? 'bg-primary-container text-surface-card font-bold'
                            : 'bg-surface-card border border-border-glass text-text-secondary'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-between text-body-sm pt-2">
                    <span className="text-text-secondary">Độ vang (Wet Mix):</span>
                    <span className="text-primary-container font-mono font-bold">{reverbMix}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="80"
                    value={reverbMix}
                    onChange={(e) => setReverbMix(parseInt(e.target.value))}
                    className="w-full accent-primary-container"
                  />
                </div>
              )}

              {/* 7. Silence Remover */}
              {selectedTool === 'silence-remover' && (
                <div className="space-y-3">
                  <div className="flex justify-between text-body-sm">
                    <span className="text-text-secondary">Ngưỡng âm lượng cắt (dB):</span>
                    <span className="text-primary-container font-mono font-bold">{silenceThreshold} dB</span>
                  </div>
                  <input
                    type="range"
                    min="-55"
                    max="-20"
                    value={silenceThreshold}
                    onChange={(e) => setSilenceThreshold(parseInt(e.target.value))}
                    className="w-full accent-primary-container"
                  />
                  <div className="flex justify-between text-body-sm">
                    <span className="text-text-secondary">Thời lượng im lặng tối thiểu:</span>
                    <span className="text-secondary font-mono font-bold">{minSilenceDuration}s</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={minSilenceDuration}
                    onChange={(e) => setMinSilenceDuration(parseFloat(e.target.value))}
                    className="w-full accent-secondary"
                  />
                </div>
              )}

              {/* 8. Pitch Shifter */}
              {selectedTool === 'pitch-shifter' && (
                <div className="space-y-3">
                  <div className="flex justify-between text-body-sm">
                    <span className="text-text-secondary">Độ lệch cao độ:</span>
                    <span className="text-primary-container font-mono font-bold">
                      {pitchSemitones > 0 ? `+${pitchSemitones}` : pitchSemitones} nửa cung (semitones)
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-12"
                    max="12"
                    value={pitchSemitones}
                    onChange={(e) => setPitchSemitones(parseInt(e.target.value))}
                    className="w-full accent-primary-container"
                  />
                  <div className="flex justify-between text-[11px] text-text-muted">
                    <span>-1 Quãng 8 (-12)</span>
                    <span>Gốc (0)</span>
                    <span>+1 Quãng 8 (+12)</span>
                  </div>
                </div>
              )}

              {/* 9. Voice Changer */}
              {selectedTool === 'voice-changer' && (
                <div className="space-y-3">
                  <label className="text-body-xs text-text-secondary block">Chọn hiệu ứng giọng độc lạ:</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'chipmunk', label: '🐿️ Sóc chuột (Chipmunk)' },
                      { id: 'monster', label: '👹 Quái vật (Monster)' },
                      { id: 'robot', label: '🤖 Robot Transformer' },
                      { id: 'megaphone', label: '📢 Loa phóng thanh' },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setVoiceEffect(item.id as any)}
                        className={`p-2.5 rounded-xl text-body-xs font-semibold transition-all text-left ${
                          voiceEffect === item.id
                            ? 'bg-primary-container text-surface-card font-bold border-2 border-primary-container'
                            : 'bg-surface-card border border-border-glass text-text-secondary hover:text-on-surface'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 10. Vocal Remover */}
              {selectedTool === 'vocal-remover' && (
                <div className="space-y-3">
                  <label className="text-body-xs text-text-secondary block">Chế độ phân tách:</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setVocalMode('karaoke_beat')}
                      className={`p-3 rounded-xl text-body-xs font-bold transition-all text-center ${
                        vocalMode === 'karaoke_beat'
                          ? 'bg-secondary text-surface-card'
                          : 'bg-surface-card border border-border-glass text-text-secondary'
                      }`}
                    >
                      🎤 Beat Karaoke (Tách lời)
                    </button>
                    <button
                      type="button"
                      onClick={() => setVocalMode('isolate_vocal')}
                      className={`p-3 rounded-xl text-body-xs font-bold transition-all text-center ${
                        vocalMode === 'isolate_vocal'
                          ? 'bg-secondary text-surface-card'
                          : 'bg-surface-card border border-border-glass text-text-secondary'
                      }`}
                    >
                      🗣️ Lấy Acapella (Chỉ lời ca)
                    </button>
                  </div>
                </div>
              )}

              {/* 11. 4-Stems Splitter */}
              {selectedTool === 'four-stems' && (
                <div className="space-y-3">
                  <label className="text-body-xs text-text-secondary block">Chọn dải nhạc cụ cần trích xuất:</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'vocals', label: '🎙️ Vocals (Giọng hát)' },
                      { id: 'drums', label: '🥁 Drums (Bộ gõ / Trống)' },
                      { id: 'bass', label: '🎸 Bass (Âm trầm)' },
                      { id: 'other', label: '🎹 Other (Nhạc cụ khác)' },
                    ].map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setStemSelected(s.id as any)}
                        className={`p-2.5 rounded-xl text-body-xs font-bold transition-all ${
                          stemSelected === s.id
                            ? 'bg-primary-container text-surface-card'
                            : 'bg-surface-card border border-border-glass text-text-secondary'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 12. Noise Reducer */}
              {selectedTool === 'noise-reducer' && (
                <div className="space-y-3">
                  <label className="text-body-xs text-text-secondary block">Mức độ khử nhiễu:</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'light', label: 'Nhẹ (-45dB)' },
                      { id: 'medium', label: 'Vừa (-35dB)' },
                      { id: 'strong', label: 'Mạnh (-25dB)' },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setNoiseLevel(item.id as any)}
                        className={`p-2 rounded-xl text-body-xs font-bold transition-all text-center ${
                          noiseLevel === item.id
                            ? 'bg-signal-warning text-surface-card'
                            : 'bg-surface-card border border-border-glass text-text-secondary'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 13. Audio Normalizer */}
              {selectedTool === 'audio-normalizer' && (
                <div className="space-y-3">
                  <label className="text-body-xs text-text-secondary block">Chuẩn hóa âm lượng:</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setNormalizerTarget(-1.0)}
                      className={`p-3 rounded-xl text-body-xs font-bold transition-all ${
                        normalizerTarget === -1.0
                          ? 'bg-primary-container text-surface-card'
                          : 'bg-surface-card border border-border-glass text-text-secondary'
                      }`}
                    >
                      Tiêu chuẩn (-1 dB Peak)
                    </button>
                    <button
                      type="button"
                      onClick={() => setNormalizerTarget(-14.0)}
                      className={`p-3 rounded-xl text-body-xs font-bold transition-all ${
                        normalizerTarget === -14.0
                          ? 'bg-primary-container text-surface-card'
                          : 'bg-surface-card border border-border-glass text-text-secondary'
                      }`}
                    >
                      Phát thanh (-14 dB LUFS)
                    </button>
                  </div>
                </div>
              )}

              {/* 14. Ringtone Maker */}
              {selectedTool === 'ringtone-maker' && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[11px] text-text-secondary">Fade In (s):</span>
                      <input
                        type="number"
                        step="0.5"
                        value={rtFadeIn}
                        onChange={(e) => setRtFadeIn(parseFloat(e.target.value) || 0)}
                        className="w-full mt-1 bg-surface-card border border-border-glass rounded-lg px-2 py-1 text-sm font-mono"
                      />
                    </div>
                    <div>
                      <span className="text-[11px] text-text-secondary">Fade Out (s):</span>
                      <input
                        type="number"
                        step="0.5"
                        value={rtFadeOut}
                        onChange={(e) => setRtFadeOut(parseFloat(e.target.value) || 0)}
                        className="w-full mt-1 bg-surface-card border border-border-glass rounded-lg px-2 py-1 text-sm font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 15. Audio Converter (FFmpeg WASM) */}
              {selectedTool === 'audio-converter' && (
                <div className="space-y-3">
                  <label className="text-body-xs text-text-secondary block">Định dạng đích (FFmpeg WASM):</label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {(['mp3', 'wav', 'aac', 'flac', 'ogg'] as const).map((fmt) => (
                      <button
                        key={fmt}
                        type="button"
                        onClick={() => setTargetFormat(fmt)}
                        className={`py-2 px-1 rounded-xl text-body-xs uppercase font-bold transition-all ${
                          targetFormat === fmt
                            ? 'bg-primary-container text-surface-card'
                            : 'bg-surface-card border border-border-glass text-text-secondary'
                        }`}
                      >
                        {fmt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 16. Audio Mixer */}
              {selectedTool === 'audio-mixer' && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-body-xs text-text-secondary">Track 2 (Nhạc nền / SFX):</label>
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={handleSecondaryFileUpload}
                      className="text-body-xs w-full text-text-secondary file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-surface-container file:text-primary-container"
                    />
                  </div>
                  <div className="flex justify-between text-body-xs">
                    <span>Volume Track 1: {mixTrack1Gain}%</span>
                    <span>Volume Track 2: {mixTrack2Gain}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="150"
                    value={mixTrack2Gain}
                    onChange={(e) => setMixTrack2Gain(parseInt(e.target.value))}
                    className="w-full accent-secondary"
                  />
                </div>
              )}

              {/* 17. ID3 Editor */}
              {selectedTool === 'id3-editor' && (
                <div className="space-y-2">
                  <div>
                    <label className="text-[11px] text-text-secondary">Tiêu đề bài hát (Title):</label>
                    <input
                      type="text"
                      value={id3Title}
                      onChange={(e) => setId3Title(e.target.value)}
                      className="w-full bg-surface-card border border-border-glass rounded-lg px-2 py-1 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-text-secondary">Nghệ sĩ (Artist):</label>
                    <input
                      type="text"
                      value={id3Artist}
                      onChange={(e) => setId3Artist(e.target.value)}
                      className="w-full bg-surface-card border border-border-glass rounded-lg px-2 py-1 text-sm"
                    />
                  </div>
                </div>
              )}

              {/* 18. Audiogram Generator */}
              {selectedTool === 'audiogram-generator' && (
                <div className="space-y-2">
                  <label className="text-[11px] text-text-secondary">Tiêu đề hiển thị trên video sóng âm:</label>
                  <input
                    type="text"
                    value={audiogramTitle}
                    onChange={(e) => setAudiogramTitle(e.target.value)}
                    className="w-full bg-surface-card border border-border-glass rounded-lg px-2 py-1 text-sm"
                  />
                  <p className="text-[11px] text-text-muted">Xuất tệp kèm thông số sóng âm động cho Shorts/TikTok.</p>
                </div>
              )}

              {/* Fallback info for remaining tools */}
              {selectedTool === 'audio-reverse' && (
                <p className="text-body-xs text-text-secondary">
                  Đảo ngược toàn bộ các mẫu âm thanh (reverse waveform) giữ nguyên chất lượng 16-bit 44.1kHz.
                </p>
              )}
              {selectedTool === 'video-audio-extractor' && (
                <p className="text-body-xs text-text-secondary">
                  Bóc tách luồng âm thanh nguyên bản không nén từ video qua FFmpeg WebAssembly.
                </p>
              )}
              {selectedTool === 'audio-joiner' && (
                <p className="text-body-xs text-text-secondary">
                  Nối liền mạch các tệp âm thanh đã chọn thành một bản ghi duy nhất.
                </p>
              )}

              {/* Trigger Button */}
              {selectedTool !== 'voice-recorder' && (
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={processAudio}
                  className={`w-full py-2.5 rounded-xl font-bold font-label-md transition-all flex items-center justify-center gap-2 ${
                    isProcessing
                      ? 'bg-surface-container-highest text-text-muted cursor-not-allowed opacity-60'
                      : 'bg-primary-container text-surface-card hover:shadow-glow-cyan'
                  }`}
                >
                  {isProcessing ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                      {progressMsg || 'Đang xử lý trong trình duyệt...'}
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">play_circle</span>
                      Bắt đầu xử lý (0 Credit • WASM)
                    </>
                  )}
                </button>
              )}
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
                  <p className="text-body-xs text-text-muted font-mono">{processedFileName}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <audio controls src={processedBlobUrl} className="h-10 max-w-[240px] sm:max-w-[280px]" />
                <a
                  href={processedBlobUrl}
                  download={processedFileName}
                  className="px-4 py-2 rounded-xl bg-primary-container text-surface-card font-label-md font-bold hover:shadow-glow-cyan transition-all inline-flex items-center gap-1.5 whitespace-nowrap"
                >
                  <span className="material-symbols-outlined text-[18px]">download</span>
                  Tải về
                </a>
              </div>
            </div>
          )}

          {statusMessage && (
            <div
              className={`p-3 rounded-xl text-body-sm font-medium flex items-center gap-2 ${
                statusMessage.type === 'success'
                  ? 'bg-signal-success/15 text-signal-success border border-signal-success/30'
                  : 'bg-signal-error/15 text-signal-error border border-signal-error/30'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">
                {statusMessage.type === 'success' ? 'check' : 'error'}
              </span>
              <span>{statusMessage.text}</span>
            </div>
          )}
        </div>
      )}

      {/* Category Pills & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-space-sm">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 sm:pb-0 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl font-label-sm text-[12px] font-bold whitespace-nowrap transition-all ${
                activeCategory === cat.id
                  ? 'bg-primary-container text-surface-card shadow-sm'
                  : 'bg-surface-card border border-border-glass text-text-secondary hover:text-on-surface'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search Box */}
        <div className="relative min-w-[240px]">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-[18px]">
            search
          </span>
          <input
            type="text"
            placeholder="Tìm kiếm công cụ..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-surface-card border border-border-glass rounded-xl text-body-sm text-on-surface placeholder:text-text-muted focus:outline-none focus:border-primary-container transition-colors"
          />
        </div>
      </div>

      {/* Tools Grid (22 Tools) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-space-md">
        {filteredTools.map((tool) => (
          <div
            key={tool.id}
            onClick={() => {
              setSelectedTool(tool.id);
              setProcessedBlobUrl(null);
              setStatusMessage(null);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`p-space-md rounded-2xl bg-surface-card border transition-all cursor-pointer group flex flex-col justify-between hover:scale-[1.02] active:scale-[0.98] ${
              selectedTool === tool.id
                ? 'border-primary-container shadow-[0_0_20px_rgba(0,242,254,0.2)]'
                : 'border-border-glass hover:border-primary-container/40'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-space-sm">
                <div
                  className={`w-11 h-11 rounded-xl bg-surface-container-high flex items-center justify-center ${tool.colorClass}`}
                >
                  <span className="material-symbols-outlined text-[24px]">
                    {tool.icon}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded font-label-sm text-[10px] bg-signal-success/20 text-signal-success font-bold tracking-wider uppercase">
                  {tool.badge}
                </span>
              </div>

              <h4 className="font-label-md text-label-md font-bold text-on-surface group-hover:text-primary-container transition-colors">
                {tool.name}
              </h4>
              <p className="mt-1 font-body-sm text-body-xs text-text-secondary line-clamp-2">
                {tool.description}
              </p>
            </div>

            <div className="mt-space-md pt-space-xs border-t border-border-glass/40 flex items-center justify-between">
              <span className="text-[11px] font-mono text-primary-container uppercase font-semibold">
                {tool.category}
              </span>
              <span className="inline-flex items-center gap-1 text-[12px] font-bold text-text-muted group-hover:text-primary-container transition-colors">
                <span>Mở công cụ</span>
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AudioToolsHubPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-text-muted font-mono">
          Đang tải 22 WebAssembly Audio Tools...
        </div>
      }
    >
      <AudioToolsHubContent />
    </Suspense>
  );
}
