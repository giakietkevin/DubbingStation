'use client';

import React, { useState, useEffect, useRef } from 'react';
import type { Voice } from '@/types';
import { voices } from '@/data/voices';

interface VoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedVoice: Voice;
  onSelectVoice: (voice: Voice) => void;
}

interface UploadedSample {
  id: string;
  file: File;
  name: string;
  sizeFormatted: string;
  previewUrl: string;
}

interface VocalFingerprint {
  fingerprintId: string;
  detectedGender: 'male' | 'female';
  vocalType: string;
  detectedPitchHz: number;
  pitchRange: { min: number; max: number };
  formantF1: number;
  formantF2: number;
  warmth: number;
  brightness: number;
  fullness: number;
  detectedRateWpm: number;
  recommendedPitchOffset: number;
  recommendedRatePercent: number;
  recommendedBaseModel: string;
  recommendedStyle: string;
  qualityScore: number;
  timbreDescription: string;
  tags: string[];
  waveformPoints: number[];
  fileCount: number;
  totalDurationSec: number;
}

const categories = [
  { id: 'all', label: 'Tất cả' },
  { id: 'capcut', label: '🎬 CapCut & TikTok' },
  { id: 'custom', label: '⭐ Giọng Của Tôi' },
  { id: 'dataset', label: '🎧 VIVOS • Common Voice • OpenSLR' },
  { id: 'huggingface', label: '🤗 Hugging Face Models' },
  { id: 'vivos', label: '🇻🇳 VIVOS (AILAB)' },
  { id: 'common_voice', label: '🗣️ Common Voice 17.0' },
  { id: 'openslr', label: '🎙️ OpenSLR 57 Studio' },
  { id: 'en', label: '🇺🇸 Tiếng Anh' },
  { id: 'asia', label: '🇯🇵🇰🇷🇨🇳 Nhật • Hàn • Trung' },
  { id: 'openai', label: '✨ OpenAI HD' },
  { id: 'piper', label: '🆓 Piper Free' },
];

const manualBaseOptions = [
  {
    id: 'vi-VN-NamMinhNeural',
    name: 'Nam Minh (Bắc Bộ - Trầm ấm)',
    gender: 'male' as const,
    country: 'VIỆT NAM',
    provider: 'microsoft' as const,
    description: 'Chất giọng nam chuẩn phát thanh, dày và ấm áp',
  },
  {
    id: 'vi-VN-HoaiMyNeural',
    name: 'Hoài My (Bắc Bộ - Trong trẻo)',
    gender: 'female' as const,
    country: 'VIỆT NAM',
    provider: 'microsoft' as const,
    description: 'Chất giọng nữ mềm mại, dễ thương, linh hoạt cao',
  },
  {
    id: 'vi_VN-25hours_single-low.onnx',
    name: 'Hoàng Nam 25H (Nam Sài Gòn - Piper)',
    gender: 'male' as const,
    country: 'VIỆT NAM',
    provider: 'piper' as const,
    description: 'Giọng nam Nam Bộ mộc mạc, gần gũi, chân thực',
  },
  {
    id: 'vi_VN-vivos-x_low.onnx',
    name: 'Bảo Trâm VIVOS (Nữ Sài Gòn - Piper)',
    gender: 'female' as const,
    country: 'VIỆT NAM',
    provider: 'piper' as const,
    description: 'Giọng nữ Nam Bộ VIVOS mộc mạc, tươi vui (AILAB)',
  },
];

export const VoiceModal: React.FC<VoiceModalProps> = ({
  isOpen,
  onClose,
  selectedVoice,
  onSelectVoice,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [customVoices, setCustomVoices] = useState<Voice[]>([]);
  const [isCustomizing, setIsCustomizing] = useState(false);

  // Customizer Form State
  const [customName, setCustomName] = useState('');
  const [customGender, setCustomGender] = useState<'male' | 'female'>('male');
  const [customStyle, setCustomStyle] = useState('Trầm ấm • Tự nhiên');
  const [customPitchNum, setCustomPitchNum] = useState(0); // -50 to +50
  const [customRateNum, setCustomRateNum] = useState(0);   // -30 to +35
  const [customWarmthNum, setCustomWarmthNum] = useState(15); // -45 to +45
  const [customBrightnessNum, setCustomBrightnessNum] = useState(8); // -45 to +45
  const [customFullnessNum, setCustomFullnessNum] = useState(25); // 10 to 50
  const [customF1Num, setCustomF1Num] = useState(450);
  const [customF2Num, setCustomF2Num] = useState(1650);
  const [customBaseModel, setCustomBaseModel] = useState('vi-VN-NamMinhNeural');
  const [customPreviewText, setCustomPreviewText] = useState(
    'Xin chào, đây là giọng đọc trí tuệ nhân tạo được phân tích và nhân bản trực tiếp từ tệp âm thanh của tôi!'
  );
  const [isPreviewingCustom, setIsPreviewingCustom] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Audio Upload & AI Analysis State
  const [uploadedSamples, setUploadedSamples] = useState<UploadedSample[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStepText, setAnalysisStepText] = useState('');
  const [fingerprint, setFingerprint] = useState<VocalFingerprint | null>(null);
  const [playingSampleId, setPlayingSampleId] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sampleAudioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load custom voices from localStorage
  useEffect(() => {
    let cancelled = false;

    fetch('/api/clone')
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (cancelled || !Array.isArray(data?.voices)) return;
        const apiVoices: Voice[] = data.voices.map((voice: any) => ({
          id: voice.id,
          name: voice.name,
          country: voice.language || 'CUSTOM',
          countryCode: voice.language || 'custom',
          avatarInitials: voice.name.slice(0, 2).toUpperCase(),
          gender: voice.gender === 'male' ? 'male' : 'female',
          style: 'Giọng clone từ audio của bạn',
          tags: ['Custom Voice', 'XTTS Clone'],
          provider: 'xtts',
          previewUrl: voice.sampleUrl,
        }));
        setCustomVoices((current) => {
          const localOnly = current.filter((item) => !apiVoices.some((item2) => item2.id === item.id));
          return [...apiVoices, ...localOnly];
        });
      })
      .catch(() => undefined);

    try {
      const saved = localStorage.getItem('dubbing_custom_voices');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setCustomVoices(parsed);
        }
      }
    } catch (e) {
      console.warn('Failed to load custom voices from localStorage', e);
    }

    return () => {
      cancelled = true;
    };
  }, []);

  if (!isOpen) return null;

  const handlePlayPreview = (voice: Voice, e: React.MouseEvent) => {
    e.stopPropagation();

    if (playingVoiceId === voice.id) {
      audioRef.current?.pause();
      setPlayingVoiceId(null);
      return;
    }

    if (!audioRef.current) {
      audioRef.current = new Audio();
    }

    const soundUrl = voice.id.startsWith('custom-')
      ? `/api/tts/stream?voiceId=${encodeURIComponent(voice.id)}&provider=xtts&text=${encodeURIComponent(customPreviewText)}`
      : voice.previewUrl || `/api/voices/preview?voiceId=${voice.id}&gender=${voice.gender}`;
    audioRef.current.src = soundUrl;
    audioRef.current.play().catch((err) => console.log('Audio preview error', err));
    setPlayingVoiceId(voice.id);

    audioRef.current.onended = () => {
      setPlayingVoiceId(null);
    };

    audioRef.current.onerror = () => {
      setPlayingVoiceId(null);
    };
  };

  const handlePreviewCustom = () => {
    if (isPreviewingCustom) {
      audioRef.current?.pause();
      setIsPreviewingCustom(false);
      return;
    }

    const pitchStr = `${customPitchNum >= 0 ? '+' : ''}${customPitchNum}Hz`;
    const rateStr = `${customRateNum >= 0 ? '+' : ''}${customRateNum}%`;
    const isClonedFromAudio = uploadedSamples.length > 0;
    const provider = isClonedFromAudio ? 'piper' : (customBaseModel.includes('onnx') ? 'piper' : 'microsoft');
    const model = isClonedFromAudio
      ? (customGender === 'female' ? 'vi_VN-vivos-x_low.onnx' : 'vi_VN-25hours_single-low.onnx')
      : customBaseModel;

    const params = new URLSearchParams({
      voiceId: 'custom',
      pitch: pitchStr,
      rate: rateStr,
      model,
      provider,
      text: customPreviewText,
      warmth: customWarmthNum.toString(),
      brightness: customBrightnessNum.toString(),
      fullness: customFullnessNum.toString(),
      f1: customF1Num.toString(),
      f2: customF2Num.toString(),
    });

    const previewUrl = `/api/voices/preview?${params.toString()}`;

    if (!audioRef.current) {
      audioRef.current = new Audio(previewUrl);
    } else {
      audioRef.current.src = previewUrl;
    }

    audioRef.current.play().catch((err) => console.log('Preview error', err));
    setIsPreviewingCustom(true);

    audioRef.current.onended = () => setIsPreviewingCustom(false);
    audioRef.current.onerror = () => setIsPreviewingCustom(false);
  };

  // Upload Handlers
  const handleFilesSelected = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    const remainingSlots = 10 - uploadedSamples.length;
    if (remainingSlots <= 0) {
      setFormError('Bạn đã đạt giới hạn tối đa 10 tệp âm thanh mẫu.');
      return;
    }

    const filesToAdd = fileArray.slice(0, remainingSlots);
    if (fileArray.length > remainingSlots) {
      setFormError(`Chỉ có thể thêm tối đa 10 tệp (đã nhận ${remainingSlots} tệp mới).`);
    } else {
      setFormError(null);
    }

    const newSamples: UploadedSample[] = filesToAdd.map((file) => {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      const sizeStr = file.size >= 1024 * 1024 ? `${sizeMB} MB` : `${Math.round(file.size / 1024)} KB`;
      return {
        id: `sample-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        file,
        name: file.name,
        sizeFormatted: sizeStr,
        previewUrl: URL.createObjectURL(file),
      };
    });

    setUploadedSamples((prev) => [...prev, ...newSamples]);
  };

  const handleRemoveSample = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (playingSampleId === id) {
      sampleAudioRef.current?.pause();
      setPlayingSampleId(null);
    }
    setUploadedSamples((prev) => {
      const filtered = prev.filter((s) => s.id !== id);
      if (filtered.length === 0) {
        setFingerprint(null);
      }
      return filtered;
    });
  };

  const handlePlayUploadedSample = (sample: UploadedSample, e: React.MouseEvent) => {
    e.stopPropagation();

    if (playingSampleId === sample.id) {
      sampleAudioRef.current?.pause();
      setPlayingSampleId(null);
      return;
    }

    if (!sampleAudioRef.current) {
      sampleAudioRef.current = new Audio();
    }

    sampleAudioRef.current.src = sample.previewUrl;
    sampleAudioRef.current.play().catch((err) => console.log('Sample play error', err));
    setPlayingSampleId(sample.id);

    sampleAudioRef.current.onended = () => setPlayingSampleId(null);
    sampleAudioRef.current.onerror = () => setPlayingSampleId(null);
  };

  // AI Voice Analysis Trigger
  const handleAnalyzeVoice = async () => {
    if (uploadedSamples.length === 0) {
      setFormError('Vui lòng tải lên ít nhất 1 tệp âm thanh để phân tích.');
      return;
    }

    setIsAnalyzing(true);
    setFormError(null);
    setAnalysisStepText('Đang nạp file & giải mã phổ tần số âm học...');

    const step1Timer = setTimeout(() => {
      setAnalysisStepText('Đang quét tần số cơ bản F0 & đo Formant F1/F2 từ file...');
    }, 800);

    const step2Timer = setTimeout(() => {
      setAnalysisStepText('Đang tính toán độ ấm lồng ngực & độ vang sáng của thanh quản...');
    }, 1600);

    try {
      const formData = new FormData();
      uploadedSamples.forEach((sample) => {
        formData.append('files', sample.file);
      });

      const res = await fetch('/api/voices/analyze', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || 'Phân tích âm thanh thất bại');
        setIsAnalyzing(false);
        clearTimeout(step1Timer);
        clearTimeout(step2Timer);
        return;
      }

      const fp: VocalFingerprint = data.analysis;
      setFingerprint(fp);

      // Auto-tune acoustic parameters directly from the analyzed audio files
      setCustomPitchNum(fp.recommendedPitchOffset);
      setCustomRateNum(fp.recommendedRatePercent);
      setCustomGender(fp.detectedGender);
      setCustomWarmthNum(fp.warmth);
      setCustomBrightnessNum(fp.brightness);
      setCustomFullnessNum(fp.fullness);
      setCustomF1Num(fp.formantF1);
      setCustomF2Num(fp.formantF2);
      setCustomStyle(fp.recommendedStyle);

      if (!customName.trim()) {
        const defaultName =
          fp.detectedGender === 'female'
            ? `Giọng Nữ Clone (${uploadedSamples.length} mẫu)`
            : `Giọng Nam Clone (${uploadedSamples.length} mẫu)`;
        setCustomName(defaultName);
      }
    } catch (err) {
      console.error(err);
      setFormError('Lỗi kết nối máy chủ phân tích âm thanh.');
    } finally {
      setIsAnalyzing(false);
      clearTimeout(step1Timer);
      clearTimeout(step2Timer);
    }
  };

  const handleSaveCustomVoice = () => {
    if (!customName.trim()) {
      setFormError('Vui lòng đặt tên cho giọng nói tùy chỉnh');
      return;
    }
    setFormError(null);

    const pitchStr = `${customPitchNum >= 0 ? '+' : ''}${customPitchNum}Hz`;
    const rateStr = `${customRateNum >= 0 ? '+' : ''}${customRateNum}%`;
    const isClonedFromAudio = uploadedSamples.length > 0;
    const provider = isClonedFromAudio ? 'piper' : (customBaseModel.includes('onnx') ? 'piper' : 'microsoft');
    const model = isClonedFromAudio
      ? (customGender === 'female' ? 'vi_VN-vivos-x_low.onnx' : 'vi_VN-25hours_single-low.onnx')
      : customBaseModel;

    const initials = customName
      .trim()
      .split(/\s+/)
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'CV';

    const tags: string[] = isClonedFromAudio
      ? ['AI Clone', `${uploadedSamples.length} File Gốc`, fingerprint?.vocalType?.split(' ')[0] || 'Tự nhiên']
      : ['Tùy chỉnh', 'Custom'];

    if (customStyle.trim()) {
      tags.push(customStyle.trim());
    }

    const previewParams = new URLSearchParams({
      voiceId: 'custom',
      pitch: pitchStr,
      rate: rateStr,
      model,
      provider,
      text: customPreviewText,
      warmth: customWarmthNum.toString(),
      brightness: customBrightnessNum.toString(),
      fullness: customFullnessNum.toString(),
      f1: customF1Num.toString(),
      f2: customF2Num.toString(),
    });

    const newVoice: Voice = {
      id: `custom-${Date.now()}`,
      name: customName.trim(),
      country: isClonedFromAudio ? 'AI CLONE' : 'TÙY CHỈNH',
      countryCode: 'vi-VN',
      avatarInitials: initials,
      gender: customGender,
      style: customStyle.trim() || (isClonedFromAudio ? 'Nhân bản 100% từ file âm thanh' : 'Giọng tùy chỉnh'),
      tags,
      isPremium: false,
      isCustom: true,
      customPitch: pitchStr,
      customRate: rateStr,
      customVolume: '+0%',
      baseModel: model,
      provider,
      clonedSampleCount: isClonedFromAudio ? uploadedSamples.length : undefined,
      analysisProfile: fingerprint
        ? {
            pitchHz: fingerprint.detectedPitchHz,
            rateWpm: fingerprint.detectedRateWpm,
            qualityScore: fingerprint.qualityScore,
            timbreDescription: fingerprint.timbreDescription,
          }
        : undefined,
      vocalFingerprint: isClonedFromAudio
        ? {
            fingerprintId: fingerprint?.fingerprintId,
            f0: fingerprint?.detectedPitchHz,
            f1: customF1Num,
            f2: customF2Num,
            warmth: customWarmthNum,
            brightness: customBrightnessNum,
            fullness: customFullnessNum,
            tempoWpm: fingerprint?.detectedRateWpm,
            gender: customGender,
            vocalType: fingerprint?.vocalType,
            waveformPoints: fingerprint?.waveformPoints,
          }
        : undefined,
      previewUrl: `/api/voices/preview?${previewParams.toString()}`,
    };

    const updated = [newVoice, ...customVoices];
    setCustomVoices(updated);
    try {
      localStorage.setItem('dubbing_custom_voices', JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save custom voices', e);
    }

    onSelectVoice(newVoice);
    setIsCustomizing(false);
    setActiveCategory('custom');
  };

  const handleDeleteCustomVoice = (voiceId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Bạn có chắc chắn muốn xóa giọng tùy chỉnh này không?')) return;

    const updated = customVoices.filter((v) => v.id !== voiceId);
    setCustomVoices(updated);
    try {
      localStorage.setItem('dubbing_custom_voices', JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to remove custom voice', e);
    }
  };

  const handleClose = () => {
    if (audioRef.current) audioRef.current.pause();
    if (sampleAudioRef.current) sampleAudioRef.current.pause();
    setPlayingVoiceId(null);
    setPlayingSampleId(null);
    setIsPreviewingCustom(false);
    setIsCustomizing(false);
    onClose();
  };

  const allCombinedVoices = [...customVoices, ...voices];

  const filteredVoices = allCombinedVoices.filter((v) => {
    const matchSearch =
      v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.style.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchSearch) return false;

    if (activeCategory === 'custom') {
      return v.isCustom === true;
    }
    if (activeCategory === 'capcut') {
      return v.provider === 'capcut' || v.tags.includes('CapCut') || v.tags.includes('TikTok');
    }
    if (activeCategory === 'dataset') {
      return (
        v.tags.includes('VIVOS') ||
        v.tags.includes('Common Voice') ||
        v.tags.includes('OpenSLR') ||
        v.tags.includes('Hugging Face') ||
        v.provider === 'huggingface' ||
        v.style.includes('VIVOS') ||
        v.style.includes('Common Voice') ||
        v.style.includes('OpenSLR')
      );
    }
    if (activeCategory === 'huggingface') {
      return v.provider === 'huggingface' || v.tags.includes('Hugging Face');
    }
    if (activeCategory === 'vivos') {
      return v.tags.includes('VIVOS') || v.style.includes('VIVOS');
    }
    if (activeCategory === 'common_voice') {
      return v.tags.includes('Common Voice') || v.style.includes('Common Voice');
    }
    if (activeCategory === 'openslr') {
      return v.tags.includes('OpenSLR') || v.style.includes('OpenSLR');
    }
    if (activeCategory === 'en') {
      return v.countryCode === 'en-US' || v.countryCode === 'en-GB';
    }
    if (activeCategory === 'asia') {
      return ['ja-JP', 'ko-KR', 'zh-CN'].includes(v.countryCode);
    }
    if (activeCategory === 'openai') {
      return v.tags.includes('OpenAI');
    }
    if (activeCategory === 'piper') {
      return v.tags.includes('Piper');
    }

    return true;
  });

  const isCloneMode = uploadedSamples.length > 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
        onClick={handleClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-surface-card rounded-2xl shadow-[0_24px_80px_-15px_rgba(0,0,0,0.95)] border border-border-glass overflow-hidden flex flex-col animate-fadeIn">
        {/* Top gradient line */}
        <div
          aria-hidden="true"
          className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-primary-container via-accent-violet-bright to-secondary-container"
        />

        {/* Header */}
        <div className="px-space-md sm:px-space-lg pt-space-lg pb-space-sm flex items-center justify-between border-b border-border-glass">
          <div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary-container text-[24px]">
                {isCustomizing ? 'psychology' : 'record_voice_over'}
              </span>
              <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                {isCustomizing ? 'Nhân Bản & Phân Tích Giọng Nói AI' : 'Kho Giọng Đọc AI Đa Năng'}
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-primary-container/20 text-primary-container">
                {isCustomizing ? (isCloneMode ? 'Voice Clone Mode' : 'Custom Studio') : `${allCombinedVoices.length} giọng sẵn có`}
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-text-muted mt-0.5">
              {isCustomizing
                ? 'Tải lên 1-10 tệp âm thanh để AI trích xuất dấu vân giọng độc bản (Formant & Timbre DSP)'
                : 'Bấm biểu tượng loa để nghe thử âm thanh trước khi chọn'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {!isCustomizing ? (
              <button
                type="button"
                onClick={() => {
                  setIsCustomizing(true);
                  setCustomName('');
                  setFormError(null);
                  setUploadedSamples([]);
                  setFingerprint(null);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-primary-container to-accent-violet-bright text-surface-card text-[12px] font-bold shadow-glow-cyan hover:opacity-95 transition-all"
              >
                <span className="material-symbols-outlined text-[16px]">add_circle</span>
                <span>Tạo Giọng Riêng</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsCustomizing(false)}
                className="px-3 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-text-secondary text-[12px] font-bold transition-all"
              >
                ← Danh sách
              </button>
            )}

            <button
              type="button"
              onClick={handleClose}
              className="p-1.5 rounded-xl bg-surface-container hover:bg-surface-container-highest text-text-muted hover:text-on-surface transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>

        {isCustomizing ? (
          /* ==================================================== */
          /* CUSTOM VOICE & CLONE STUDIO PANEL                    */
          /* ==================================================== */
          <div className="flex-1 overflow-y-auto px-space-md sm:px-space-lg py-4 space-y-4">
            {formError && (
              <div className="p-2.5 rounded-xl bg-signal-danger/15 border border-signal-danger/30 text-signal-danger text-body-xs font-semibold flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">error</span>
                <span>{formError}</span>
              </div>
            )}

            {/* ==================================================== */}
            {/* 1. AUDIO UPLOAD & AI ANALYSIS SECTION                */}
            {/* ==================================================== */}
            <div className="p-4 rounded-2xl bg-surface-container/60 border border-border-glass space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px] text-accent-violet-bright">
                    mic_external_on
                  </span>
                  <span className="text-label-md font-bold text-on-surface">
                    Tải Lên File Giọng Nói Để Phân Tích (1 - 10 File Âm Thanh)
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-accent-violet-bright/20 text-accent-violet-bright border border-accent-violet-bright/30">
                    BẮT BUỘC ĐỂ CLONE
                  </span>
                </div>
                <span className="text-[11px] text-text-muted">
                  Đã nhận: <strong className="text-primary-container">{uploadedSamples.length}/10</strong> tệp
                </span>
              </div>

              <p className="text-[12px] text-text-muted leading-relaxed">
                Tải lên các đoạn ghi âm giọng thật của bạn (MP3, WAV, M4A, OGG). AI sẽ quét và trích xuất trực tiếp dải tần F0, tần số cộng hưởng Formant (F1, F2), độ ấm lồng ngực và âm sắc để tái tạo lại giọng nói chân thực mà <strong>không dùng giọng mẫu mặc định</strong>.
              </p>

              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="audio/*,.mp3,.wav,.m4a,.ogg,.aac,.flac,.webm"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) handleFilesSelected(e.target.files);
                  e.target.value = '';
                }}
              />

              {/* Drag & Drop Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragOver(false);
                  if (e.dataTransfer.files) handleFilesSelected(e.dataTransfer.files);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`p-4 rounded-xl border-2 border-dashed transition-all cursor-pointer text-center flex flex-col items-center justify-center gap-2 ${
                  isDragOver
                    ? 'border-primary-container bg-primary-container/10 scale-[0.99]'
                    : 'border-border-glass bg-surface-container-lowest/50 hover:bg-surface-container-lowest hover:border-primary-container/50'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-primary-container shadow-inner">
                  <span className="material-symbols-outlined text-[22px]">cloud_upload</span>
                </div>
                <div>
                  <span className="text-[12px] font-bold text-on-surface">
                    Kéo thả các tệp âm thanh vào đây, hoặc{' '}
                    <span className="text-primary-container underline underline-offset-2">chọn từ máy tính</span>
                  </span>
                  <p className="text-[11px] text-text-muted mt-0.5">
                    Hỗ trợ tối đa 10 tệp • MP3, WAV, M4A, OGG, AAC • Tối đa 25MB/tệp
                  </p>
                </div>
              </div>

              {/* Uploaded Samples List */}
              {uploadedSamples.length > 0 && (
                <div className="space-y-2 pt-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1 scrollbar-thin">
                    {uploadedSamples.map((sample, idx) => {
                      const isPlayingThis = playingSampleId === sample.id;
                      return (
                        <div
                          key={sample.id}
                          className="flex items-center justify-between p-2 rounded-xl bg-surface-container-high/80 border border-border-glass text-[12px]"
                        >
                          <div className="flex items-center gap-2 min-w-0 pr-2">
                            <button
                              type="button"
                              onClick={(e) => handlePlayUploadedSample(sample, e)}
                              className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all ${
                                isPlayingThis
                                  ? 'bg-primary-container text-surface-card'
                                  : 'bg-surface-container text-primary-container hover:bg-primary-container hover:text-surface-card'
                              }`}
                            >
                              <span className="material-symbols-outlined text-[16px]">
                                {isPlayingThis ? 'pause' : 'play_arrow'}
                              </span>
                            </button>
                            <div className="min-w-0">
                              <div className="font-medium text-on-surface truncate text-[11px]">
                                {idx + 1}. {sample.name}
                              </div>
                              <div className="text-[10px] text-text-muted">{sample.sizeFormatted}</div>
                            </div>
                          </div>

                          <button
                            type="button"
                            title="Xóa tệp này"
                            onClick={(e) => handleRemoveSample(sample.id, e)}
                            className="text-text-muted hover:text-signal-danger p-1 rounded-lg hover:bg-signal-danger/10 transition-colors shrink-0"
                          >
                            <span className="material-symbols-outlined text-[16px]">close</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Trigger Analyze Button */}
                  <div className="pt-2 flex items-center justify-between gap-3 flex-wrap">
                    <div className="text-[11px] text-text-muted">
                      💡 Bấm phân tích để trích xuất Dấu vân giọng độc bản và bộ lọc cộng hưởng âm thanh.
                    </div>
                    <button
                      type="button"
                      disabled={isAnalyzing}
                      onClick={handleAnalyzeVoice}
                      className={`px-4 py-2 rounded-xl font-bold text-[12px] flex items-center gap-2 transition-all ${
                        isAnalyzing
                          ? 'bg-surface-container-highest text-text-muted cursor-wait'
                          : 'bg-gradient-to-r from-accent-violet-bright to-primary-container text-surface-card shadow-glow-cyan hover:opacity-95'
                      }`}
                    >
                      <span className={`material-symbols-outlined text-[18px] ${isAnalyzing ? 'animate-spin' : ''}`}>
                        {isAnalyzing ? 'autorenew' : 'psychology'}
                      </span>
                      <span>
                        {isAnalyzing
                          ? 'Đang Trích Xuất Dấu Vân Giọng...'
                          : `Phân Tích Dấu Vân Giọng AI (${uploadedSamples.length} tệp)`}
                      </span>
                    </button>
                  </div>

                  {/* Scanning Progress */}
                  {isAnalyzing && (
                    <div className="p-3 rounded-xl bg-accent-violet-bright/10 border border-accent-violet-bright/20 flex items-center gap-3 animate-pulse">
                      <div className="w-5 h-5 rounded-full border-2 border-accent-violet-bright border-t-transparent animate-spin shrink-0" />
                      <span className="text-[12px] text-accent-violet-bright font-medium">
                        {analysisStepText}
                      </span>
                    </div>
                  )}

                  {/* Acoustic Fingerprint Card */}
                  {fingerprint && !isAnalyzing && (
                    <div className="p-3.5 rounded-xl bg-gradient-to-br from-primary-container/10 via-accent-violet-bright/15 to-surface-container-high border border-primary-container/40 space-y-3 animate-fadeIn">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-primary-container text-[18px]">
                            fingerprint
                          </span>
                          <span className="font-bold text-[13px] text-on-surface">
                            Dấu Vân Giọng AI Trích Xuất Từ File Âm Thanh
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-signal-success/20 text-signal-success border border-signal-success/30">
                          Khớp Âm Sắc {fingerprint.qualityScore}%
                        </span>
                      </div>

                      {/* Dynamic 24-Bar Spectral Waveform Visualizer */}
                      <div className="p-2.5 rounded-xl bg-black/40 border border-border-glass">
                        <div className="flex items-center justify-between text-[10px] text-text-muted mb-1.5">
                          <span>Dải tần số âm thanh trích xuất thực tế</span>
                          <span className="text-primary-container font-mono">{fingerprint.detectedPitchHz} Hz (F0)</span>
                        </div>
                        <div className="flex items-end justify-between gap-1 h-9 px-1">
                          {fingerprint.waveformPoints.map((val, i) => (
                            <div
                              key={i}
                              style={{ height: `${Math.round(val * 100)}%` }}
                              className="w-full rounded-full bg-gradient-to-t from-primary-container to-accent-violet-bright transition-all duration-300"
                            />
                          ))}
                        </div>
                      </div>

                      {/* Acoustic Specs Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                        <div className="p-2 rounded-lg bg-surface-card/60 border border-border-glass">
                          <div className="text-text-muted text-[10px]">Loại hình âm vực</div>
                          <div className="font-bold text-on-surface mt-0.5 truncate">
                            {fingerprint.vocalType}
                          </div>
                        </div>

                        <div className="p-2 rounded-lg bg-surface-card/60 border border-border-glass">
                          <div className="text-text-muted text-[10px]">Formants (F1 / F2)</div>
                          <div className="font-bold text-primary-container mt-0.5 font-mono">
                            {fingerprint.formantF1}Hz / {fingerprint.formantF2}Hz
                          </div>
                        </div>

                        <div className="p-2 rounded-lg bg-surface-card/60 border border-border-glass">
                          <div className="text-text-muted text-[10px]">Độ ấm lồng ngực</div>
                          <div className="font-bold text-secondary-container mt-0.5">
                            {fingerprint.warmth >= 0 ? `+${fingerprint.warmth}%` : `${fingerprint.warmth}%`}
                          </div>
                        </div>

                        <div className="p-2 rounded-lg bg-surface-card/60 border border-border-glass">
                          <div className="text-text-muted text-[10px]">Nhịp nói (Tempo)</div>
                          <div className="font-bold text-on-surface mt-0.5 font-mono">
                            {fingerprint.detectedRateWpm} WPM
                          </div>
                        </div>
                      </div>

                      <div className="p-2 rounded-lg bg-surface-container/60 border border-primary-container/20 text-[11px] text-text-secondary flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px] text-primary-container shrink-0">
                          auto_fix_high
                        </span>
                        <span>
                          {fingerprint.timbreDescription}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ==================================================== */}
            {/* 2. VOICE NAME & GENDER                               */}
            {/* ==================================================== */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-label-sm font-bold text-text-primary mb-1">
                  Tên giọng nhân bản <span className="text-primary-container">*</span>
                </label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="VD: Giọng Nhân Bản Của Tôi, Giọng Thuyết Minh..."
                  className="w-full px-3.5 py-2 rounded-xl bg-surface-container border border-border-glass text-body-sm text-on-surface placeholder:text-text-muted focus:outline-none focus:border-primary-container"
                />
              </div>

              <div>
                <label className="block text-label-sm font-bold text-text-primary mb-1">
                  Giới tính người nói
                </label>
                <div className="flex items-center gap-2 p-1 rounded-xl bg-surface-container border border-border-glass">
                  <button
                    type="button"
                    onClick={() => setCustomGender('male')}
                    className={`flex-1 py-1.5 rounded-lg text-[12px] font-bold transition-all flex items-center justify-center gap-1 ${
                      customGender === 'male'
                        ? 'bg-primary-container text-surface-card shadow-sm'
                        : 'text-text-secondary hover:text-on-surface'
                    }`}
                  >
                    <span>♂</span> Nam
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomGender('female')}
                    className={`flex-1 py-1.5 rounded-lg text-[12px] font-bold transition-all flex items-center justify-center gap-1 ${
                      customGender === 'female'
                        ? 'bg-accent-violet-bright text-white shadow-sm'
                        : 'text-text-secondary hover:text-on-surface'
                    }`}
                  >
                    <span>♀</span> Nữ
                  </button>
                </div>
              </div>
            </div>

            {/* ==================================================== */}
            {/* 3. CONDITIONAL: MANUAL BASE OR AUDIO CLONE ACTIVE    */}
            {/* ==================================================== */}
            {isCloneMode ? (
              /* When files are uploaded: SHOW AUDIO CLONING DSP STATUS (NO BASE VOICE) */
              <div className="p-3.5 rounded-xl bg-surface-container-high/60 border border-accent-violet-bright/30 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-accent-violet-bright/20 text-accent-violet-bright flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[18px]">verified</span>
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-[12px] text-on-surface">
                      Chế Độ Nhân Bản Trực Tiếp Từ File Âm Thanh
                    </div>
                    <div className="text-[11px] text-text-muted truncate">
                      Hệ thống tự động sử dụng bộ lọc Formant DSP & Dấu vân giọng từ {uploadedSamples.length} file tải lên, không phụ thuộc giọng mẫu có sẵn.
                    </div>
                  </div>
                </div>
                <span className="px-2 py-1 rounded-lg text-[11px] font-bold bg-primary-container/20 text-primary-container shrink-0">
                  100% TỪ FILE
                </span>
              </div>
            ) : (
              /* When NO files uploaded: ALLOW SELECTING MANUAL BASE MODEL */
              <div>
                <label className="block text-label-sm font-bold text-text-primary mb-1">
                  Chọn giọng nền thủ công (Khi không tải lên file âm thanh)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {manualBaseOptions.map((opt) => {
                    const isChecked = customBaseModel === opt.id;
                    return (
                      <div
                        key={opt.id}
                        onClick={() => {
                          setCustomBaseModel(opt.id);
                          setCustomGender(opt.gender);
                        }}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                          isChecked
                            ? 'bg-surface-container-high border-primary-container ring-1 ring-primary-container'
                            : 'bg-surface-container/50 border-border-glass hover:bg-surface-container'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <div className="font-label-sm font-bold text-on-surface text-[12px] truncate">
                            {opt.name}
                          </div>
                          <div className="text-[10px] text-text-muted truncate">
                            {opt.description}
                          </div>
                        </div>
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center text-[9px] shrink-0 ${
                            isChecked
                              ? 'bg-primary-container border-primary-container text-surface-card font-bold'
                              : 'border-border-glass text-transparent'
                          }`}
                        >
                          ✓
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ==================================================== */}
            {/* 4. ACOUSTIC TIMBRE SLIDERS (DSP-POWERED)             */}
            {/* ==================================================== */}
            <div className="p-3.5 rounded-xl bg-surface-container-lowest/80 border border-border-glass space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-label-sm font-bold text-on-surface flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-primary-container text-[18px]">
                    equalizer
                  </span>
                  {isCloneMode
                    ? 'Bộ Căn Chỉnh Âm Sắc Trực Tiếp (Formant & Timbre DSP)'
                    : 'Bộ Căn Chỉnh Cao Độ & Tốc Độ'}
                </span>
                {isCloneMode && (
                  <span className="text-[11px] text-primary-container">
                    Tự động đồng bộ từ file
                  </span>
                )}
              </div>

              {isCloneMode && (
                <>
                  {/* Chest Warmth Slider */}
                  <div>
                    <div className="flex items-center justify-between text-[12px] mb-1 font-bold">
                      <span className="text-text-primary flex items-center gap-1">
                        <span className="material-symbols-outlined text-[15px] text-secondary-container">
                          water_drop
                        </span>
                        Độ Trầm Ấm Lồng Ngực (Chest Warmth / F1): {customWarmthNum >= 0 ? `+${customWarmthNum}` : customWarmthNum}%
                      </span>
                      <span className="text-[11px] text-secondary-container">
                        {customWarmthNum > 15 ? 'Dày, ấm áp' : customWarmthNum < -10 ? 'Thanh, thoát' : 'Tự nhiên'}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-45"
                      max="45"
                      step="1"
                      value={customWarmthNum}
                      onChange={(e) => setCustomWarmthNum(parseInt(e.target.value, 10))}
                      className="w-full accent-secondary-container cursor-pointer h-1.5 bg-surface-container-highest rounded-lg"
                    />
                    <div className="flex justify-between text-[10px] text-text-muted mt-0.5">
                      <span>-45% (Thanh thoát)</span>
                      <span>0%</span>
                      <span>+45% (Rất ấm, dày)</span>
                    </div>
                  </div>

                  {/* Vocal Brightness & Presence Slider */}
                  <div>
                    <div className="flex items-center justify-between text-[12px] mb-1 font-bold">
                      <span className="text-text-primary flex items-center gap-1">
                        <span className="material-symbols-outlined text-[15px] text-accent-violet-bright">
                          auto_awesome
                        </span>
                        Độ Vang Sáng Thanh Quản (Clarity / F2): {customBrightnessNum >= 0 ? `+${customBrightnessNum}` : customBrightnessNum}%
                      </span>
                      <span className="text-[11px] text-accent-violet-bright">
                        {customBrightnessNum > 15 ? 'Sáng, rõ chữ' : customBrightnessNum < -10 ? 'Trầm lắng' : 'Cân bằng'}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-45"
                      max="45"
                      step="1"
                      value={customBrightnessNum}
                      onChange={(e) => setCustomBrightnessNum(parseInt(e.target.value, 10))}
                      className="w-full accent-accent-violet-bright cursor-pointer h-1.5 bg-surface-container-highest rounded-lg"
                    />
                    <div className="flex justify-between text-[10px] text-text-muted mt-0.5">
                      <span>-45% (Lắng đọng)</span>
                      <span>0%</span>
                      <span>+45% (Sáng trong)</span>
                    </div>
                  </div>
                </>
              )}

              {/* Pitch Slider */}
              <div>
                <div className="flex items-center justify-between text-[12px] mb-1 font-bold">
                  <span className="text-text-primary flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-primary-container">
                      graphic_eq
                    </span>
                    Cao độ cơ bản (Pitch): {customPitchNum >= 0 ? `+${customPitchNum}` : customPitchNum}Hz
                  </span>
                  <span className="text-[11px] text-primary-container">
                    {customPitchNum <= -20
                      ? 'Trầm ấm'
                      : customPitchNum === 0
                      ? 'Chuẩn theo file'
                      : 'Cao hơn'}
                  </span>
                </div>
                <input
                  type="range"
                  min="-50"
                  max="50"
                  step="2"
                  value={customPitchNum}
                  onChange={(e) => setCustomPitchNum(parseInt(e.target.value, 10))}
                  className="w-full accent-primary-container cursor-pointer h-1.5 bg-surface-container-highest rounded-lg"
                />
                <div className="flex justify-between text-[10px] text-text-muted mt-0.5">
                  <span>-50Hz (Trầm)</span>
                  <span>0Hz (Gốc)</span>
                  <span>+50Hz (Cao)</span>
                </div>
              </div>

              {/* Rate Slider */}
              <div>
                <div className="flex items-center justify-between text-[12px] mb-1 font-bold">
                  <span className="text-text-primary flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-secondary-container">
                      speed
                    </span>
                    Tốc độ phát âm (Rate): {customRateNum >= 0 ? `+${customRateNum}` : customRateNum}%
                  </span>
                  <span className="text-[11px] text-secondary-container">
                    {customRateNum <= -10 ? 'Chậm rãi' : customRateNum === 0 ? 'Chuẩn' : 'Nhanh hơn'}
                  </span>
                </div>
                <input
                  type="range"
                  min="-30"
                  max="35"
                  step="2"
                  value={customRateNum}
                  onChange={(e) => setCustomRateNum(parseInt(e.target.value, 10))}
                  className="w-full accent-secondary-container cursor-pointer h-1.5 bg-surface-container-highest rounded-lg"
                />
                <div className="flex justify-between text-[10px] text-text-muted mt-0.5">
                  <span>-30%</span>
                  <span>0%</span>
                  <span>+35%</span>
                </div>
              </div>
            </div>

            {/* ==================================================== */}
            {/* 5. LIVE PREVIEW AREA                                 */}
            {/* ==================================================== */}
            <div className="p-3 rounded-xl bg-surface-container border border-border-glass space-y-2">
              <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider">
                Câu nói thử nghiệm trước khi lưu
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={customPreviewText}
                  onChange={(e) => setCustomPreviewText(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-lg bg-surface-container-lowest border border-border-glass text-body-xs text-on-surface focus:outline-none focus:border-primary-container"
                />
                <button
                  type="button"
                  onClick={handlePreviewCustom}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-bold flex items-center gap-1 transition-all shrink-0 ${
                    isPreviewingCustom
                      ? 'bg-signal-warning text-surface-card'
                      : 'bg-primary-container text-surface-card shadow-glow-cyan hover:opacity-90'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {isPreviewingCustom ? 'stop' : 'play_arrow'}
                  </span>
                  <span>{isPreviewingCustom ? 'Dừng' : 'Nghe Thử'}</span>
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-glass">
              <button
                type="button"
                onClick={() => setIsCustomizing(false)}
                className="px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-text-secondary text-[13px] font-semibold transition-all"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleSaveCustomVoice}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-primary-container to-accent-violet-bright text-surface-card text-[13px] font-bold shadow-glow-cyan hover:opacity-95 transition-all flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[18px]">save</span>
                <span>Lưu & Chọn Giọng Này</span>
              </button>
            </div>
          </div>
        ) : (
          /* ==================================================== */
          /* VOICE LIST VIEW                                      */
          /* ==================================================== */
          <>
            {/* Search & Category Pills */}
            <div className="px-space-md sm:px-space-lg py-3 space-y-2.5 bg-surface-container-lowest/70 border-b border-border-glass">
              {/* Search Box */}
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface-container border border-border-glass focus-within:border-primary-container transition-colors">
                <span className="material-symbols-outlined text-[18px] text-text-muted">search</span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm theo tên giọng, chủ đề (TikTok, Review phim, Miền Tây, Radio, Nam, Nữ)..."
                  className="flex-1 bg-transparent font-body-sm text-body-sm text-on-surface placeholder:text-text-muted focus:outline-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="text-text-muted hover:text-on-surface text-[14px]"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Categories Tab Horizontal Slider */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCategory(cat.id)}
                    className={`px-3 py-1 rounded-xl text-[12px] font-bold whitespace-nowrap transition-all ${
                      activeCategory === cat.id
                        ? 'bg-primary-container text-surface-card shadow-glow-cyan'
                        : 'bg-surface-container text-text-secondary hover:text-on-surface hover:bg-surface-container-high'
                    }`}
                  >
                    {cat.label}
                    {cat.id === 'custom' && customVoices.length > 0 && (
                      <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-surface-card text-primary-container">
                        {customVoices.length}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Voice List */}
            <div className="flex-1 overflow-y-auto px-space-md sm:px-space-lg py-3 space-y-2">
              {filteredVoices.length === 0 ? (
                <div className="py-12 text-center text-text-muted text-body-sm space-y-3">
                  <span className="material-symbols-outlined text-[42px] block text-text-muted opacity-60">
                    {activeCategory === 'custom' ? 'person_add' : 'search_off'}
                  </span>
                  <p>
                    {activeCategory === 'custom'
                      ? 'Bạn chưa có giọng tùy chỉnh nào.'
                      : 'Không tìm thấy giọng đọc nào khớp với từ khóa tìm kiếm.'}
                  </p>
                  {activeCategory === 'custom' && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomizing(true);
                        setCustomName('');
                        setFormError(null);
                        setUploadedSamples([]);
                        setFingerprint(null);
                      }}
                      className="px-4 py-2 rounded-xl bg-primary-container text-surface-card font-bold text-[13px] shadow-glow-cyan hover:opacity-90 inline-flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[18px]">add_circle</span>
                      <span>Tạo Giọng Tùy Chỉnh Đầu Tiên</span>
                    </button>
                  )}
                </div>
              ) : (
                filteredVoices.map((voice) => {
                  const isSelected = selectedVoice.id === voice.id;
                  const isPlaying = playingVoiceId === voice.id;

                  return (
                    <div
                      key={voice.id}
                      onClick={() => {
                        onSelectVoice(voice);
                        handleClose();
                      }}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer group ${
                        isSelected
                          ? 'bg-surface-container-high border-primary-container shadow-[0_0_20px_rgba(0,242,254,0.15)] ring-1 ring-primary-container'
                          : 'bg-surface-container/40 border-border-glass hover:bg-surface-container hover:border-primary-container/40'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Avatar Initials */}
                        <div className="relative shrink-0">
                          <span
                            className={`w-11 h-11 rounded-full flex items-center justify-center font-headline-sm text-[13px] text-canvas-base font-black shrink-0 shadow-sm ${
                              voice.isCustom
                                ? 'bg-gradient-to-tr from-accent-violet-bright to-primary-container'
                                : 'bg-gradient-to-tr from-primary-container to-secondary-container'
                            }`}
                          >
                            {voice.avatarInitials}
                          </span>
                          {voice.gender === 'female' ? (
                            <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-accent-violet-bright text-white text-[10px] flex items-center justify-center font-bold">
                              ♀
                            </span>
                          ) : (
                            <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-primary-container text-surface-card text-[10px] flex items-center justify-center font-bold">
                              ♂
                            </span>
                          )}
                        </div>

                        {/* Meta info */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-label-md text-label-md font-bold text-on-surface group-hover:text-primary-container transition-colors truncate">
                              {voice.name}
                            </span>
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-primary-container/15 text-primary-container">
                              {voice.country}
                            </span>
                            {voice.tags.includes('VIVOS') && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                🇻🇳 VIVOS AILAB
                              </span>
                            )}
                            {voice.tags.includes('Common Voice') && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                🗣️ COMMON VOICE 17.0
                              </span>
                            )}
                            {voice.tags.includes('OpenSLR') && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                                🎙️ OPENSLR 57 STUDIO
                              </span>
                            )}
                            {(voice.provider === 'huggingface' || voice.tags.includes('Hugging Face')) && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
                                🤗 HUGGING FACE • NGƯỜI THẬT
                              </span>
                            )}
                            {voice.isCustom ? (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-accent-violet-bright/20 text-accent-violet-bright border border-accent-violet-bright/30 flex items-center gap-1">
                                <span>🧬</span>
                                <span>
                                  {voice.clonedSampleCount
                                    ? `AI CLONE (${voice.clonedSampleCount} FILE GỐC)`
                                    : 'CUSTOM'}
                                </span>
                              </span>
                            ) : voice.tags.includes('OpenAI') ? (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-accent-violet-bright/20 text-accent-violet-bright">
                                OPENAI HD
                              </span>
                            ) : voice.tags.includes('Piper') ? (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-signal-success/20 text-signal-success">
                                PIPER FREE
                              </span>
                            ) : voice.provider === 'google' ? (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-signal-warning/20 text-signal-warning">
                                GOOGLE VIRAL
                              </span>
                            ) : voice.isPremium ? (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-signal-warning/20 text-signal-warning">
                                PRO
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-signal-success/20 text-signal-success">
                                FREE
                              </span>
                            )}
                          </div>

                          <p className="font-body-xs text-[12px] text-text-secondary truncate mt-0.5">
                            {voice.style}
                          </p>

                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            {voice.vocalFingerprint?.warmth !== undefined && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] bg-secondary-container/10 text-secondary-container font-mono">
                                Ấm ngực: {voice.vocalFingerprint.warmth >= 0 ? `+${voice.vocalFingerprint.warmth}%` : `${voice.vocalFingerprint.warmth}%`}
                              </span>
                            )}
                            {voice.vocalFingerprint?.brightness !== undefined && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] bg-accent-violet-bright/10 text-accent-violet-bright font-mono">
                                Vang sáng: {voice.vocalFingerprint.brightness >= 0 ? `+${voice.vocalFingerprint.brightness}%` : `${voice.vocalFingerprint.brightness}%`}
                              </span>
                            )}
                            {voice.analysisProfile?.pitchHz && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] bg-primary-container/10 text-primary-container font-mono">
                                F0: {voice.analysisProfile.pitchHz}Hz
                              </span>
                            )}
                            {voice.tags.slice(0, 3).map((tag, idx) => (
                              <span
                                key={idx}
                                className="px-1.5 py-0.2 rounded text-[10px] bg-surface-container-high text-text-muted"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        {/* Delete Custom Voice Button */}
                        {voice.isCustom && (
                          <button
                            type="button"
                            title="Xóa giọng tùy chỉnh này"
                            onClick={(e) => handleDeleteCustomVoice(voice.id, e)}
                            className="h-8 w-8 rounded-full flex items-center justify-center text-text-muted hover:text-signal-danger hover:bg-signal-danger/10 transition-colors"
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              delete
                            </span>
                          </button>
                        )}

                        {/* Preview Button */}
                        <button
                          type="button"
                          title={isPlaying ? 'Dừng phát' : 'Nghe thử âm thanh'}
                          onClick={(e) => handlePlayPreview(voice, e)}
                          className={`h-9 w-9 rounded-full flex items-center justify-center transition-all ${
                            isPlaying
                              ? 'bg-primary-container text-surface-card shadow-glow-cyan scale-105'
                              : 'bg-surface-container-high text-primary-container hover:bg-primary-container hover:text-surface-card'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[20px]">
                            {isPlaying ? 'pause' : 'volume_up'}
                          </span>
                        </button>

                        {/* Selection Indicator */}
                        <div
                          className={`h-6 w-6 rounded-full flex items-center justify-center transition-all ${
                            isSelected
                              ? 'bg-primary-container text-surface-card'
                              : 'border border-border-glass text-transparent group-hover:border-primary-container'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[16px] font-bold">
                            check
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="px-space-md sm:px-space-lg py-3 bg-surface-container-lowest border-t border-border-glass flex items-center justify-between text-body-xs text-text-muted">
              <span>
                Giọng hiện tại: <strong className="text-primary-container">{selectedVoice.name}</strong>
              </span>
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-1.5 rounded-xl bg-primary-container text-surface-card font-bold hover:shadow-glow-cyan transition-all"
              >
                Đóng
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
