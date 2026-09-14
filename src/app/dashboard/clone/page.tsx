'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

interface ClonedVoice {
  id: string;
  name: string;
  gender: string;
  language: string;
  modelKey: string;
  sampleUrl: string;
  status: string;
  createdAt: string;
  sampleCount?: number;
  totalDurationSec?: number;
  qualityScore?: number;
  hasLatents?: boolean;
  f0MedianHz?: number;
}

interface AudioTake {
  id: string;
  file: File;
  previewUrl: string;
  name: string;
  size: number;
  source: 'upload' | 'record';
  durationSec?: number;
}

const READING_PROMPTS = [
  {
    id: 1,
    title: 'Mẫu 1: Thuyết minh điện ảnh (Trang trọng, ấm áp)',
    text: 'DubbingStation là nền tảng lồng tiếng AI điện ảnh thế hệ mới. Với mô hình Coqui XTTS v2, từng sắc thái giọng nói và nhịp thở của bạn đều được tái hiện chân thực.',
  },
  {
    id: 2,
    title: 'Mẫu 2: Năng lượng & Cảm xúc (Tự nhiên, hào hứng)',
    text: 'Chào mừng các bạn đã đến với kênh của mình! Hôm nay chúng ta sẽ cùng khám phá công nghệ nhân bản giọng nói AI đa ngôn ngữ đỉnh cao nhất hiện nay.',
  },
  {
    id: 3,
    title: 'Mẫu 3: Đàm thoại đời thường (Thong thả, rõ chữ)',
    text: 'Mỗi ngày mới bắt đầu đều mang đến những cơ hội tuyệt vời. Hãy giữ cho tâm trí luôn cởi mở và sẵn sàng trải nghiệm những điều mới lạ.',
  },
];

export default function VoiceClonePage() {
  const [cloneType, setCloneType] = useState<'instant' | 'professional'>('instant');
  const [voiceName, setVoiceName] = useState('');
  const [gender, setGender] = useState('female');
  const [language, setLanguage] = useState('vi-VN');
  const [consentAgreed, setConsentAgreed] = useState(false);

  // Danh sách các mẫu audio (hỗ trợ 1 hoặc nhiều mẫu)
  const [audioTakes, setAudioTakes] = useState<AudioTake[]>([]);
  const [inputTab, setInputTab] = useState<'upload' | 'record'>('upload');

  // Trạng thái thu âm trực tiếp
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [activePromptIndex, setActivePromptIndex] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Trạng thái huấn luyện và xử lý
  const [isLoading, setIsLoading] = useState(false);
  const [trainingStep, setTrainingStep] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Danh sách giọng clone đã tạo
  const [myVoices, setMyVoices] = useState<ClonedVoice[]>([]);
  const [activePlayingId, setActivePlayingId] = useState<string | null>(null);
  const [testingVoiceId, setTestingVoiceId] = useState<string | null>(null);
  const [testText, setTestText] = useState('Xin chào, đây là giọng nói AI độc bản của tôi bằng mô hình Coqui XTTS v2.');
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [testAudioUrl, setTestAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load custom voices on mount
  useEffect(() => {
    fetchMyVoices();
  }, []);

  // Cleanup blob urls on unmount
  useEffect(() => {
    return () => {
      audioTakes.forEach((take) => URL.revokeObjectURL(take.previewUrl));
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, [audioTakes]);

  const fetchMyVoices = async () => {
    try {
      let apiVoices: ClonedVoice[] = [];
      try {
        const res = await fetch('/api/clone');
        if (res.ok) {
          const data = await res.json();
          apiVoices = data.voices || [];
        }
      } catch (err) {
        console.warn('API clone fetch failed, using local store', err);
      }

      // Merge custom voices saved in localStorage (from VoiceModal)
      try {
        const local = localStorage.getItem('dubbing_custom_voices');
        if (local) {
          const parsed = JSON.parse(local);
          if (Array.isArray(parsed)) {
            const localCloned: ClonedVoice[] = parsed.map((v: any) => ({
              id: v.id.startsWith('custom-') ? v.id : `custom-${v.id}`,
              name: v.name,
              gender: v.gender || 'female',
              language: v.countryCode || 'vi-VN',
              modelKey: v.baseModel || 'custom-uploaded-sample',
              sampleUrl: v.previewUrl || '',
              status: 'ready',
              createdAt: 'Gần đây',
              sampleCount: 1,
              qualityScore: 85,
            }));
            const existingIds = new Set(apiVoices.map((item) => item.id));
            const combined = [...apiVoices, ...localCloned.filter((item) => !existingIds.has(item.id))];
            setMyVoices(combined);
            return;
          }
        }
      } catch (localErr) {
        console.warn('Failed to parse local custom voices', localErr);
      }

      setMyVoices(apiVoices);
    } catch (e) {
      console.error('Failed to fetch custom voices', e);
    }
  };

  // Tính toán điểm số chất lượng dựa trên số lượng mẫu và ước lượng thời lượng
  const calculateQualityMetrics = () => {
    const count = audioTakes.length;
    if (count === 0) return { score: 0, label: 'Chưa có mẫu', color: 'text-text-muted', badge: 'bg-surface-container' };

    // Ước lượng điểm chất lượng
    let score = 70;
    if (count === 1) score = 78;
    else if (count === 2) score = 89;
    else if (count === 3) score = 95;
    else score = Math.min(99, 95 + count);

    if (cloneType === 'professional') score = Math.min(99, score + 4);

    if (score >= 94) {
      return {
        score,
        label: 'Coqui XTTS Ultra-HD (Xuất sắc)',
        color: 'text-signal-success',
        badge: 'bg-signal-success/15 border-signal-success/40 text-signal-success',
        tip: 'Dữ liệu đa mẫu hoàn hảo để trích xuất Conditioning Latents chuyên sâu.',
      };
    }
    if (score >= 85) {
      return {
        score,
        label: 'Studio Grade (Rất tốt)',
        color: 'text-primary-container',
        badge: 'bg-primary-container/15 border-primary-container/40 text-primary-container',
        tip: 'Đạt chuẩn sao chép âm sắc và ngữ điệu tự nhiên.',
      };
    }
    return {
      score,
      label: 'Cơ bản (Khuyến khích thêm 1-2 mẫu)',
      color: 'text-signal-warning',
      badge: 'bg-signal-warning/15 border-signal-warning/40 text-signal-warning',
      tip: 'Nên thêm từ 1 đến 2 mẫu đọc ngữ cảnh khác nhau để giọng AI đa dạng biểu cảm.',
    };
  };

  const qualityInfo = calculateQualityMetrics();

  // Xử lý tải lên 1 hoặc nhiều file audio
  const handleMultipleFilesUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    const newTakes: AudioTake[] = [];
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      if (!file.type.startsWith('audio/') && !file.name.match(/\.(wav|mp3|m4a|flac|ogg|webm)$/i)) {
        continue;
      }
      if (file.size > 50 * 1024 * 1024) continue;

      const previewUrl = URL.createObjectURL(file);
      newTakes.push({
        id: `upload-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
        file,
        previewUrl,
        name: file.name,
        size: file.size,
        source: 'upload',
      });
    }

    setAudioTakes((prev) => [...prev, ...newTakes].slice(0, 10));
    e.target.value = '';
  };

  // Xóa 1 mẫu audio khỏi danh sách
  const handleRemoveTake = (id: string) => {
    setAudioTakes((prev) => {
      const target = prev.find((t) => t.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((t) => t.id !== id);
    });
  };

  // Bắt đầu ghi âm trực tiếp qua mic
  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : MediaRecorder.isTypeSupported('audio/mp4')
            ? 'audio/mp4'
            : '',
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const mime = mediaRecorder.mimeType || 'audio/webm';
        const ext = mime.includes('mp4') ? 'm4a' : 'webm';
        const blob = new Blob(audioChunksRef.current, { type: mime });
        const recordedFile = new File(
          [blob],
          `take_${audioTakes.length + 1}_recorded.${ext}`,
          { type: mime }
        );
        const previewUrl = URL.createObjectURL(blob);

        setAudioTakes((prev) => [
          ...prev,
          {
            id: `record-${Date.now()}`,
            file: recordedFile,
            previewUrl,
            name: `Ghi âm mẫu #${prev.length + 1} (${recordingSeconds}s)`,
            size: blob.size,
            source: 'record',
            durationSec: recordingSeconds,
          },
        ]);

        // Dừng tracks của mic
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingSeconds(0);

      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((sec) => sec + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone access denied:', err);
      setStatusMessage({
        text: 'Không thể truy cập microphone. Vui lòng cấp quyền micro trên trình duyệt của bạn.',
        type: 'error',
      });
    }
  };

  // Dừng và lưu take ghi âm
  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    }
  };

  // Gửi form huấn luyện mô hình giọng nói Coqui XTTS
  const handleCreateClone = async () => {
    if (!voiceName.trim()) {
      setStatusMessage({ text: 'Vui lòng đặt tên cho giọng nhân bản.', type: 'error' });
      return;
    }
    if (!consentAgreed) {
      setStatusMessage({
        text: 'Bạn phải đồng ý với cam kết bản quyền và sự cho phép sử dụng giọng nói.',
        type: 'error',
      });
      return;
    }
    if (audioTakes.length === 0) {
      setStatusMessage({
        text: 'Vui lòng tải lên hoặc ghi âm ít nhất một tệp âm thanh mẫu.',
        type: 'error',
      });
      return;
    }

    setIsLoading(true);
    setStatusMessage(null);
    setTrainingStep('1. Tiền xử lý & Khử ồn studio (LUFS -16dB, High-pass 75Hz)...');

    const stepTimer1 = setTimeout(() => {
      setTrainingStep('2. Phân tích phổ âm học F0 pitch median & Formants...');
    }, 2500);

    const stepTimer2 = setTimeout(() => {
      setTrainingStep('3. Trích xuất Coqui XTTS Conditioning Latents (.pth) & Tối ưu hóa mô hình...');
    }, 5500);

    try {
      const formData = new FormData();
      formData.append('name', voiceName.trim());
      formData.append('gender', gender);
      formData.append('language', language);
      formData.append('cloneType', cloneType);
      formData.append('consentAgreed', String(consentAgreed));

      // Đính kèm tất cả các mẫu audio
      audioTakes.forEach((take) => {
        formData.append('files', take.file);
        formData.append('sampleAudio', take.file);
      });

      const res = await fetch('/api/clone', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);

      if (!res.ok) {
        setStatusMessage({ text: data.error || 'Nhân bản thất bại', type: 'error' });
        setIsLoading(false);
        setTrainingStep('');
        return;
      }

      setStatusMessage({
        text: `Đã huấn luyện giọng Coqui XTTS "${voiceName}" thành công từ ${audioTakes.length} mẫu âm thanh (Độ nét: ${data.voice?.qualityScore || qualityInfo.score}%). Đã trừ ${data.creditsDeducted.toLocaleString('vi-VN')} Credits.`,
        type: 'success',
      });

      setVoiceName('');
      setAudioTakes([]);
      setConsentAgreed(false);
      setTrainingStep('');
      fetchMyVoices();
    } catch (err) {
      console.error(err);
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      setStatusMessage({ text: 'Lỗi kết nối máy chủ khi nhân bản giọng.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const togglePlaySample = (voiceId: string, sampleUrl: string) => {
    if (activePlayingId === voiceId) {
      audioRef.current?.pause();
      setActivePlayingId(null);
    } else {
      if (!audioRef.current) {
        audioRef.current = new Audio();
      }
      audioRef.current.src = sampleUrl;
      audioRef.current.preload = 'auto';
      audioRef.current
        .play()
        .then(() => setActivePlayingId(voiceId))
        .catch(() => setActivePlayingId(null));

      audioRef.current.onended = () => {
        setActivePlayingId(null);
      };
    }
  };

  const handleSynthesizeTest = async (voiceId: string) => {
    if (!testText.trim()) return;
    setIsSynthesizing(true);
    setTestAudioUrl(null);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/clone/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voiceId, text: testText.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatusMessage({ text: data.error || 'Tạo giọng thất bại. Hãy kiểm tra Coqui XTTS local.', type: 'error' });
        return;
      }
      setTestAudioUrl(data.audioUrl);
      if (audioRef.current) {
        audioRef.current.src = data.audioUrl;
        audioRef.current.play().catch(() => undefined);
      }
      setStatusMessage({
        text: `Coqui XTTS đã tổng hợp câu đọc thành công (${data.durationSec || 3}s)!`,
        type: 'success',
      });
    } catch (err) {
      console.error(err);
      setStatusMessage({ text: 'Lỗi kết nối khi gọi XTTS synthesis.', type: 'error' });
    } finally {
      setIsSynthesizing(false);
    }
  };

  const handleDeleteVoice = async (voiceId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa giọng nói nhân bản này cùng toàn bộ tệp conditioning latents không?')) {
      return;
    }
    try {
      const res = await fetch(`/api/clone?id=${encodeURIComponent(voiceId)}`, { method: 'DELETE' });
      if (res.ok) {
        setMyVoices((prev) => prev.filter((v) => v.id !== voiceId));
        setStatusMessage({ text: 'Đã xóa giọng nhân bản và tệp mô hình liên quan thành công.', type: 'success' });
        if (testingVoiceId === voiceId) setTestingVoiceId(null);
      } else {
        const data = await res.json();
        setStatusMessage({ text: data.error || 'Xóa thất bại', type: 'error' });
      }
    } catch (err) {
      console.error(err);
      setStatusMessage({ text: 'Lỗi kết nối khi xóa giọng.', type: 'error' });
    }
  };

  return (
    <div className="space-y-space-lg max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface-card border border-border-glass rounded-2xl p-space-md lg:p-space-lg backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-primary-container text-[28px]">
              fingerprint
            </span>
            <h1 className="font-headline-md text-headline-md font-bold text-on-surface">
              Coqui XTTS-v2 Voice Cloning
            </h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-primary-container/20 text-primary-container uppercase tracking-wider">
              Multi-Sample Neural
            </span>
          </div>
          <p className="font-body-md text-text-secondary">
            Huấn luyện và trích xuất Conditioning Latents từ 1 hoặc nhiều mẫu âm thanh để sao chép chuẩn 99% âm sắc, cao độ F0 và hơi thở.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="px-4 py-2 rounded-xl text-text-secondary hover:text-on-surface hover:bg-surface-container-high border border-border-glass font-label-md transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">mic</span>
            Dùng trong Studio TTS
          </Link>
        </div>
      </div>

      {/* Notification status message */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between animate-fadeIn ${
            statusMessage.type === 'success'
              ? 'bg-signal-success/10 border-signal-success/30 text-signal-success'
              : 'bg-signal-danger/10 border-signal-danger/30 text-signal-danger'
          }`}
        >
          <div className="flex items-center gap-2 font-label-md">
            <span className="material-symbols-outlined text-[20px]">
              {statusMessage.type === 'success' ? 'check_circle' : 'error'}
            </span>
            <span>{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="hover:opacity-75 transition-opacity"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
        {/* Left Column: Voice Clone Setup Form */}
        <div className="lg:col-span-7 space-y-space-md">
          <div className="bg-surface-card border border-border-glass rounded-2xl p-space-md lg:p-space-lg space-y-space-md">
            <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary-container">tune</span>
              Huấn Luyện Giọng Nói AI (Coqui XTTS-v2)
            </h2>

            {/* Mode Selector */}
            <div className="grid grid-cols-2 gap-3 p-1 bg-surface-container rounded-xl border border-border-glass">
              <button
                type="button"
                onClick={() => setCloneType('instant')}
                className={`py-2.5 px-3 rounded-lg text-label-md font-semibold transition-all flex flex-col items-center gap-1 ${
                  cloneType === 'instant'
                    ? 'bg-primary-container text-surface-card shadow-glow-cyan'
                    : 'text-text-secondary hover:text-on-surface'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px]">bolt</span>
                  <span>Instant Clone (1-3 mẫu)</span>
                </div>
                <span className="text-[11px] opacity-85">5.000 Credits • Trích xuất nhanh</span>
              </button>

              <button
                type="button"
                onClick={() => setCloneType('professional')}
                className={`py-2.5 px-3 rounded-lg text-label-md font-semibold transition-all flex flex-col items-center gap-1 ${
                  cloneType === 'professional'
                    ? 'bg-accent-violet-bright text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]'
                    : 'text-text-secondary hover:text-on-surface'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px]">verified</span>
                  <span>Pro Deep Clone (Đa mẫu)</span>
                </div>
                <span className="text-[11px] opacity-85">20.000 Credits • Studio HD Latents</span>
              </button>
            </div>

            {/* Voice Meta Input */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-3">
                <label className="block font-label-md text-text-secondary mb-1.5">
                  Tên giọng nói <span className="text-signal-danger">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Giọng Thuyết Minh của Tôi, MC Hương Trà..."
                  value={voiceName}
                  onChange={(e) => setVoiceName(e.target.value)}
                  className="w-full bg-surface-container border border-border-glass rounded-xl px-4 py-2.5 text-on-surface placeholder:text-text-muted focus:outline-none focus:border-primary-container"
                />
              </div>

              <div>
                <label className="block font-label-md text-text-secondary mb-1.5">Giới tính</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full bg-surface-container border border-border-glass rounded-xl px-3 py-2.5 text-on-surface focus:outline-none focus:border-primary-container text-body-sm"
                >
                  <option value="female">Nữ (Female)</option>
                  <option value="male">Nam (Male)</option>
                  <option value="neutral">Trung tính (Neutral)</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block font-label-md text-text-secondary mb-1.5">Ngôn ngữ chính</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full bg-surface-container border border-border-glass rounded-xl px-3 py-2.5 text-on-surface focus:outline-none focus:border-primary-container text-body-sm"
                >
                  <option value="vi-VN">Tiếng Việt (Vietnam)</option>
                  <option value="en-US">Tiếng Anh (US English)</option>
                  <option value="ja-JP">Tiếng Nhật (Japanese)</option>
                  <option value="ko-KR">Tiếng Hàn (Korean)</option>
                  <option value="zh-CN">Tiếng Trung (Chinese)</option>
                  <option value="fr-FR">Tiếng Pháp (French)</option>
                  <option value="de-DE">Tiếng Đức (German)</option>
                  <option value="es-ES">Tiếng Tây Ban Nha (Spanish)</option>
                </select>
              </div>
            </div>

            {/* Quality Score Meter */}
            <div className="p-3.5 bg-surface-container rounded-xl border border-border-glass space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary-container text-[20px]">
                    analytics
                  </span>
                  <span className="text-body-sm font-bold text-on-surface">
                    Chất lượng mô hình ước tính:
                  </span>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${qualityInfo.badge}`}>
                  {qualityInfo.score > 0 ? `${qualityInfo.score}% • ${qualityInfo.label}` : '0%'}
                </span>
              </div>
              <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary-container to-accent-violet-bright transition-all duration-500 rounded-full"
                  style={{ width: `${qualityInfo.score}%` }}
                />
              </div>
              {qualityInfo.tip && (
                <p className="text-[11px] text-text-secondary flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[14px] text-primary-container">info</span>
                  {qualityInfo.tip}
                </p>
              )}
            </div>

            {/* Audio Input Tabs: Upload vs Live Recording */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-border-glass pb-2">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setInputTab('upload')}
                    className={`px-3 py-1.5 rounded-lg text-label-sm font-bold flex items-center gap-1.5 transition-all ${
                      inputTab === 'upload'
                        ? 'bg-primary-container/20 text-primary-container border border-primary-container/40'
                        : 'text-text-secondary hover:text-on-surface'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">upload_file</span>
                    Tải lên tệp âm thanh (1 hoặc nhiều file)
                  </button>

                  <button
                    type="button"
                    onClick={() => setInputTab('record')}
                    className={`px-3 py-1.5 rounded-lg text-label-sm font-bold flex items-center gap-1.5 transition-all ${
                      inputTab === 'record'
                        ? 'bg-accent-violet-bright/20 text-accent-violet-bright border border-accent-violet-bright/40'
                        : 'text-text-secondary hover:text-on-surface'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">mic</span>
                    Thu âm trực tiếp (Live Takes)
                  </button>
                </div>
                <span className="text-[11px] text-text-muted">
                  Đã có: <strong className="text-primary-container">{audioTakes.length}</strong> / 10 mẫu
                </span>
              </div>

              {/* TAB 1: File Upload Box */}
              {inputTab === 'upload' && (
                <div className="border-2 border-dashed border-border-glass rounded-xl p-6 flex flex-col items-center justify-center text-center bg-surface-container/40 hover:bg-surface-container/60 transition-colors">
                  <input
                    type="file"
                    id="voice-samples-upload"
                    multiple
                    accept="audio/mp3,audio/wav,audio/m4a,audio/flac,audio/ogg,audio/webm"
                    onChange={handleMultipleFilesUpload}
                    className="hidden"
                  />

                  <span className="material-symbols-outlined text-[42px] text-primary-container mb-2">
                    cloud_upload
                  </span>

                  <p className="font-label-md text-on-surface font-semibold mb-1">
                    Kéo thả hoặc bấm để chọn 1 hoặc nhiều tệp âm thanh mẫu
                  </p>
                  <p className="text-body-xs text-text-muted mb-4 max-w-md">
                    Hỗ trợ WAV, MP3, M4A, FLAC. Bạn có thể chọn cùng lúc 2-5 file hoặc thêm dần từng tệp (khuyến nghị mỗi tệp từ 10 - 30 giây).
                  </p>

                  <label
                    htmlFor="voice-samples-upload"
                    className="px-4 py-2 rounded-xl bg-surface-container-high border border-border-glass text-primary-container hover:bg-primary-container hover:text-surface-card font-label-md font-bold cursor-pointer transition-all inline-flex items-center gap-1.5 shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[18px]">add_circle</span>
                    Chọn thêm tệp âm thanh
                  </label>
                </div>
              )}

              {/* TAB 2: Live Recording Studio */}
              {inputTab === 'record' && (
                <div className="bg-surface-container/70 border border-border-glass rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-label-sm font-bold text-on-surface flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[18px] text-accent-violet-bright">
                        graphic_eq
                      </span>
                      Studio Thu Âm Mẫu Huấn Luyện
                    </span>
                    <div className="flex items-center gap-1">
                      {READING_PROMPTS.map((p, idx) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setActivePromptIndex(idx)}
                          className={`h-6 px-2 text-[11px] font-bold rounded ${
                            activePromptIndex === idx
                              ? 'bg-accent-violet-bright text-white'
                              : 'bg-surface-card text-text-secondary hover:text-on-surface'
                          }`}
                        >
                          Mẫu {idx + 1}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Reading Prompt Card */}
                  <div className="p-3 bg-surface-card rounded-lg border border-border-glass/60">
                    <div className="text-[11px] font-semibold text-accent-violet-bright mb-1">
                      {READING_PROMPTS[activePromptIndex].title}
                    </div>
                    <p className="text-body-sm text-on-surface italic leading-relaxed">
                      &ldquo;{READING_PROMPTS[activePromptIndex].text}&rdquo;
                    </p>
                  </div>

                  {/* Record controls */}
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-2">
                      {isRecording && (
                        <div className="flex items-center gap-2 text-signal-danger font-bold text-body-sm animate-pulse">
                          <span className="h-3 w-3 rounded-full bg-signal-danger inline-block" />
                          <span>Đang thu: {recordingSeconds}s</span>
                        </div>
                      )}
                      {!isRecording && (
                        <span className="text-body-xs text-text-muted">
                          Bấm nút đỏ để bắt đầu đọc mẫu. Khuyến khích đọc từ 10s đến 25s.
                        </span>
                      )}
                    </div>

                    <div>
                      {!isRecording ? (
                        <button
                          type="button"
                          onClick={handleStartRecording}
                          className="px-4 py-2 rounded-xl bg-signal-danger text-white font-label-md font-bold flex items-center gap-1.5 shadow-md hover:opacity-90 transition-opacity"
                        >
                          <span className="material-symbols-outlined text-[18px]">radio_button_checked</span>
                          Bắt đầu thu Take #{audioTakes.length + 1}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleStopRecording}
                          className="px-4 py-2 rounded-xl bg-signal-success text-white font-label-md font-bold flex items-center gap-1.5 shadow-md hover:opacity-90 transition-opacity"
                        >
                          <span className="material-symbols-outlined text-[18px]">stop_circle</span>
                          Dừng & Lưu mẫu ({recordingSeconds}s)
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Takes List */}
              {audioTakes.length > 0 && (
                <div className="space-y-2 pt-2">
                  <div className="text-label-sm font-bold text-on-surface flex items-center justify-between">
                    <span>Danh sách các mẫu âm thanh đã nạp ({audioTakes.length}):</span>
                    <button
                      type="button"
                      onClick={() => setAudioTakes([])}
                      className="text-[11px] text-text-muted hover:text-signal-danger transition-colors"
                    >
                      Xóa tất cả
                    </button>
                  </div>

                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {audioTakes.map((take, idx) => (
                      <div
                        key={take.id}
                        className="p-2.5 bg-surface-container rounded-xl border border-border-glass flex items-center justify-between gap-3 text-body-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <span className="h-6 w-6 rounded-full bg-primary-container/20 text-primary-container flex items-center justify-center font-bold text-[11px] flex-shrink-0">
                            {idx + 1}
                          </span>
                          <span className="font-medium text-on-surface truncate">
                            {take.name}
                          </span>
                          <span className="text-text-muted text-[10px] flex-shrink-0">
                            ({(take.size / 1024).toFixed(0)} KB)
                          </span>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <audio src={take.previewUrl} controls className="h-7 w-36 sm:w-44" />
                          <button
                            type="button"
                            onClick={() => handleRemoveTake(take.id)}
                            className="p-1 text-text-muted hover:text-signal-danger hover:bg-surface-container-high rounded transition-colors"
                            title="Xóa mẫu này"
                          >
                            <span className="material-symbols-outlined text-[17px]">delete</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Voice Ownership Consent Checkbox */}
            <div className="p-4 bg-primary-container/5 border border-primary-container/20 rounded-xl space-y-2">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentAgreed}
                  onChange={(e) => setConsentAgreed(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-border-glass bg-surface-container text-primary-container focus:ring-primary-container"
                />
                <span className="text-body-xs text-text-secondary leading-relaxed">
                  Tôi cam đoan rằng tôi sở hữu toàn bộ bản quyền hoặc đã được sự đồng ý hợp pháp của chủ sở hữu giọng nói này. Tôi chịu hoàn toàn trách nhiệm pháp lý đối với nội dung âm thanh được tạo ra và không sử dụng nhằm mục đích giả mạo hoặc lừa đảo.
                </span>
              </label>
            </div>

            {/* Action Button & Live Training Status */}
            <div className="space-y-2">
              <button
                type="button"
                disabled={isLoading || !consentAgreed || !voiceName.trim() || audioTakes.length === 0}
                onClick={handleCreateClone}
                className={`w-full py-3.5 rounded-xl font-headline-sm font-bold text-surface-card flex items-center justify-center gap-2 transition-all ${
                  isLoading || !consentAgreed || !voiceName.trim() || audioTakes.length === 0
                    ? 'bg-surface-container-highest text-text-muted cursor-not-allowed opacity-60'
                    : 'bg-primary-container hover:shadow-glow-cyan text-surface-card shadow-md'
                }`}
              >
                {isLoading ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[20px]">
                      progress_activity
                    </span>
                    Đang huấn luyện mô hình Coqui XTTS...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[20px]">magic_button</span>
                    Nhân Bản Giọng Ngay ({cloneType === 'instant' ? '5.000' : '20.000'} Credits)
                  </>
                )}
              </button>

              {trainingStep && (
                <div className="p-2.5 bg-primary-container/10 border border-primary-container/30 rounded-xl text-body-xs text-primary-container font-semibold flex items-center gap-2 animate-fadeIn">
                  <span className="material-symbols-outlined text-[16px] animate-spin">
                    sync
                  </span>
                  <span>{trainingStep}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Cloned Voices Library List */}
        <div className="lg:col-span-5 space-y-space-md">
          <div className="bg-surface-card border border-border-glass rounded-2xl p-space-md lg:p-space-lg space-y-space-md">
            <div className="flex items-center justify-between">
              <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">record_voice_over</span>
                Giọng Độc Quyền Của Bạn ({myVoices.length})
              </h2>
              <button
                onClick={fetchMyVoices}
                className="p-1 text-text-muted hover:text-on-surface transition-colors"
                title="Làm mới danh sách"
              >
                <span className="material-symbols-outlined text-[18px]">refresh</span>
              </button>
            </div>

            {myVoices.length === 0 ? (
              <div className="py-12 px-4 text-center border border-dashed border-border-glass rounded-xl">
                <span className="material-symbols-outlined text-[48px] text-text-muted mb-2">
                  spatial_audio_off
                </span>
                <p className="font-label-md text-on-surface font-semibold">Chưa có giọng nhân bản nào</p>
                <p className="text-body-xs text-text-muted mt-1">
                  Hãy tải lên hoặc thu âm các tệp mẫu bên cạnh để tạo giọng nói AI Coqui XTTS độc bản của bạn!
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[620px] overflow-y-auto pr-1">
                {myVoices.map((voice) => {
                  const isPlaying = activePlayingId === voice.id;
                  const isTesting = testingVoiceId === voice.id;
                  return (
                    <div
                      key={voice.id}
                      className="p-3.5 bg-surface-container rounded-xl border border-border-glass hover:border-primary-container/40 transition-all flex flex-col gap-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary-container/20 text-primary-container flex items-center justify-center font-bold text-label-md flex-shrink-0">
                            {voice.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <h4 className="font-label-md text-on-surface font-bold truncate max-w-[150px] sm:max-w-[190px]">
                              {voice.name}
                            </h4>
                            <div className="flex flex-wrap items-center gap-1.5 text-body-xs text-text-muted mt-0.5">
                              <span>{voice.gender === 'female' ? 'Nữ' : voice.gender === 'male' ? 'Nam' : 'Trung tính'}</span>
                              <span>•</span>
                              <span>{voice.language}</span>
                              {voice.sampleCount && voice.sampleCount > 1 && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] bg-accent-violet-bright/20 text-accent-violet-bright font-semibold">
                                  {voice.sampleCount} mẫu
                                </span>
                              )}
                              <span className="px-1.5 py-0.2 rounded text-[10px] bg-signal-success/20 text-signal-success font-semibold">
                                {voice.qualityScore ? `${voice.qualityScore}% HD` : 'Sẵn sàng'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {voice.sampleUrl && (
                            <button
                              type="button"
                              onClick={() => togglePlaySample(voice.id, voice.sampleUrl)}
                              className={`h-8 w-8 rounded-full flex items-center justify-center transition-all ${
                                isPlaying
                                  ? 'bg-primary-container text-surface-card shadow-glow-cyan'
                                  : 'bg-surface-container-high text-primary-container hover:bg-primary-container hover:text-surface-card'
                              }`}
                              title="Nghe mẫu tham chiếu gốc"
                            >
                              <span className="material-symbols-outlined text-[18px]">
                                {isPlaying ? 'pause' : 'play_arrow'}
                              </span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              setTestingVoiceId(isTesting ? null : voice.id);
                              setTestAudioUrl(null);
                            }}
                            className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-all flex items-center gap-1 ${
                              isTesting
                                ? 'bg-primary-container text-surface-card border-primary-container shadow-glow-cyan'
                                : 'bg-surface-container-high border-border-glass text-text-secondary hover:text-primary-container hover:border-primary-container'
                            }`}
                            title="Thử sinh giọng đọc bằng XTTS"
                          >
                            <span className="material-symbols-outlined text-[15px]">science</span>
                            <span>Thử XTTS</span>
                          </button>

                          <Link
                            href={`/dashboard?voice=${voice.id}`}
                            className="px-2.5 py-1 rounded-lg bg-surface-container-high border border-border-glass text-[11px] font-bold text-on-surface hover:text-primary-container hover:border-primary-container transition-all"
                            title="Mở giọng này trong Studio TTS"
                          >
                            Dùng TTS
                          </Link>

                          <Link
                            href="/dashboard/dubbing"
                            className="px-2.5 py-1 rounded-lg bg-surface-container-high border border-border-glass text-[11px] font-bold text-on-surface hover:text-secondary hover:border-secondary transition-all"
                            title="Lồng tiếng video với giọng này"
                          >
                            Lồng tiếng
                          </Link>

                          <button
                            type="button"
                            onClick={() => handleDeleteVoice(voice.id)}
                            className="p-1.5 rounded-lg bg-surface-container-high text-text-muted hover:text-signal-danger hover:bg-signal-danger/10 transition-colors"
                            title="Xóa giọng này"
                          >
                            <span className="material-symbols-outlined text-[17px]">delete</span>
                          </button>
                        </div>
                      </div>

                      {/* Dropdown Test XTTS Inline */}
                      {isTesting && (
                        <div className="pt-3 border-t border-border-glass/60 space-y-2 animate-fadeIn">
                          <div className="text-[12px] font-semibold text-text-secondary flex items-center justify-between">
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-[15px] text-primary-container">psychology</span>
                              Thử nghiệm tổng hợp giọng với Coqui XTTS v2:
                            </span>
                            <span className="text-[11px] text-text-muted">
                              {voice.hasLatents ? '⚡ Cached Latents (.pth)' : 'Reference Wav'}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={testText}
                              onChange={(e) => setTestText(e.target.value)}
                              placeholder="Nhập câu bạn muốn giọng đọc thử..."
                              className="flex-1 px-3 py-1.5 bg-surface-card border border-border-glass rounded-lg text-body-xs text-on-surface focus:outline-none focus:border-primary-container"
                            />
                            <button
                              type="button"
                              disabled={isSynthesizing || !testText.trim()}
                              onClick={() => handleSynthesizeTest(voice.id)}
                              className="px-3 py-1.5 bg-primary-container text-surface-card rounded-lg font-bold text-label-sm hover:opacity-90 transition-opacity flex items-center gap-1.5 disabled:opacity-50 flex-shrink-0"
                            >
                              {isSynthesizing ? (
                                <>
                                  <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                                  <span>Đang chạy XTTS...</span>
                                </>
                              ) : (
                                <>
                                  <span className="material-symbols-outlined text-[16px]">record_voice_over</span>
                                  <span>Đọc thử</span>
                                </>
                              )}
                            </button>
                          </div>
                          {testAudioUrl && (
                            <div className="p-2 bg-surface-card/70 rounded-lg border border-primary-container/30 flex items-center justify-between gap-2">
                              <span className="text-[11px] text-signal-success font-medium flex items-center gap-1">
                                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                                Âm thanh tổng hợp thành công:
                              </span>
                              <audio src={testAudioUrl} controls className="h-7 max-w-[220px]" autoPlay />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
