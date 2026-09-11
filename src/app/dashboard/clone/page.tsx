'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface ClonedVoice {
  id: string;
  name: string;
  gender: string;
  language: string;
  modelKey: string;
  sampleUrl: string;
  status: string;
  createdAt: string;
}

export default function VoiceClonePage() {
  const router = useRouter();
  const [cloneType, setCloneType] = useState<'instant' | 'professional'>('instant');
  const [voiceName, setVoiceName] = useState('');
  const [gender, setGender] = useState('female');
  const [language, setLanguage] = useState('vi-VN');
  const [consentAgreed, setConsentAgreed] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string>('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
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

      // Also merge custom voices saved in localStorage (from VoiceModal)
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploaded = e.target.files?.[0];
    if (uploaded) {
      setFile(uploaded);
      const url = URL.createObjectURL(uploaded);
      setAudioPreviewUrl(url);
    }
  };

  const handleCreateClone = async () => {
    if (!voiceName.trim()) {
      setStatusMessage({ text: 'Vui lòng đặt tên cho giọng nhân bản.', type: 'error' });
      return;
    }
    if (!consentAgreed) {
      setStatusMessage({ text: 'Bạn phải đồng ý với cam kết bản quyền và sự cho phép sử dụng giọng nói.', type: 'error' });
      return;
    }
    if (!file) {
      setStatusMessage({ text: 'Vui lòng tải lên audio mẫu của chính bạn trước khi tạo voice.', type: 'error' });
      return;
    }

    setIsLoading(true);
    setStatusMessage(null);

    try {
      const formData = new FormData();
      formData.append('name', voiceName);
      formData.append('gender', gender);
      formData.append('language', language);
      formData.append('cloneType', cloneType);
      formData.append('consentAgreed', String(consentAgreed));
      formData.append('sampleAudio', file);

      const res = await fetch('/api/clone', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setStatusMessage({ text: data.error || 'Nhân bản thất bại', type: 'error' });
        setIsLoading(false);
        return;
      }

      setStatusMessage({
        text: `Đã tạo hồ sơ giọng "${voiceName}" và lưu đúng audio của bạn. Đã trừ ${data.creditsDeducted.toLocaleString('vi-VN')} Credits.`,
        type: 'success',
      });

      setVoiceName('');
      setFile(null);
      setAudioPreviewUrl('');
      setConsentAgreed(false);
      fetchMyVoices();
    } catch (err) {
      console.error(err);
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
      audioRef.current.play().then(() => setActivePlayingId(voiceId)).catch(() => setActivePlayingId(null));

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
      setStatusMessage({ text: 'XTTS đã tạo audio thành công!', type: 'success' });
    } catch (err) {
      console.error(err);
      setStatusMessage({ text: 'Lỗi kết nối khi gọi XTTS synthesis.', type: 'error' });
    } finally {
      setIsSynthesizing(false);
    }
  };

  const handleDeleteVoice = async (voiceId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa giọng nói nhân bản này không?')) return;
    try {
      const res = await fetch(`/api/clone?id=${encodeURIComponent(voiceId)}`, { method: 'DELETE' });
      if (res.ok) {
        setMyVoices((prev) => prev.filter((v) => v.id !== voiceId));
        setStatusMessage({ text: 'Đã xóa giọng nhân bản thành công.', type: 'success' });
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
              Custom Voice Clone
            </h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-primary-container/20 text-primary-container uppercase tracking-wider">
              Zero-Shot AI
            </span>
          </div>
          <p className="font-body-md text-text-secondary">
            Nhân bản giọng nói độc bản của chính bạn hoặc nghệ sĩ chỉ từ 10 giây ghi âm mẫu với độ chân thực 99%.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="px-4 py-2 rounded-xl text-text-secondary hover:text-on-surface hover:bg-surface-container-high border border-border-glass font-label-md transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">mic</span>
            Dùng trong Studio
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
              Thiết Lập Mẫu Huấn Luyện Giọng
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
                  <span>Instant Clone (10s)</span>
                </div>
                <span className="text-[11px] opacity-85">5.000 Credits • Lấy ngay</span>
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
                  <span>Pro Deep Clone (30m)</span>
                </div>
                <span className="text-[11px] opacity-85">20.000 Credits • Studio HD</span>
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
                  placeholder="Ví dụ: Giọng Thuyết Minh của Tôi, Giọng MC Khánh..."
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
                </select>
              </div>
            </div>

            {/* Audio Upload / Record Box */}
            <div>
              <label className="block font-label-md text-text-secondary mb-1.5">
                Tải lên tệp âm thanh mẫu hoặc ghi âm trực tiếp
              </label>

              <div className="border-2 border-dashed border-border-glass rounded-xl p-6 flex flex-col items-center justify-center text-center bg-surface-container/40 hover:bg-surface-container/60 transition-colors">
                <input
                  type="file"
                  id="voice-sample-upload"
                  accept="audio/mp3,audio/wav,audio/m4a,audio/flac"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                <span className="material-symbols-outlined text-[42px] text-primary-container mb-2">
                  cloud_upload
                </span>

                <p className="font-label-md text-on-surface font-semibold mb-1">
                  {file ? file.name : 'Kéo thả hoặc bấm để chọn tệp âm thanh mẫu'}
                </p>
                <p className="text-body-xs text-text-muted mb-4">
                  {cloneType === 'instant'
                    ? 'Hỗ trợ WAV, MP3, FLAC (khuyến nghị 10 - 30 giây rõ tiếng, không tạp âm)'
                    : 'Hỗ trợ bộ dữ liệu WAV/MP3 từ 5 đến 30 phút để AI học biểu cảm chuyên sâu'}
                </p>

                <div className="flex items-center gap-3">
                  <label
                    htmlFor="voice-sample-upload"
                    className="px-4 py-2 rounded-xl bg-surface-container-high border border-border-glass text-primary-container hover:bg-primary-container hover:text-surface-card font-label-md font-bold cursor-pointer transition-all inline-flex items-center gap-1.5 shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[18px]">upload_file</span>
                    Chọn tệp âm thanh
                  </label>
                </div>
              </div>

              {audioPreviewUrl && (
                <div className="mt-3 p-3 bg-surface-container rounded-xl border border-border-glass flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-primary-container">audiotrack</span>
                    <span className="text-body-sm font-medium text-on-surface truncate max-w-[200px] sm:max-w-xs">
                      {file?.name || 'Mẫu âm thanh đã chọn'}
                    </span>
                  </div>
                  <audio src={audioPreviewUrl} controls className="h-8 max-w-[180px] sm:max-w-xs" />
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

            {/* Action Button */}
            <button
              type="button"
              disabled={isLoading || !consentAgreed || !voiceName.trim() || !file}
              onClick={handleCreateClone}
              className={`w-full py-3.5 rounded-xl font-headline-sm font-bold text-surface-card flex items-center justify-center gap-2 transition-all ${
                isLoading || !consentAgreed || !voiceName.trim()
                  ? 'bg-surface-container-highest text-text-muted cursor-not-allowed opacity-60'
                  : 'bg-primary-container hover:shadow-glow-cyan text-surface-card shadow-md'
              }`}
            >
              {isLoading ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[20px]">
                    progress_activity
                  </span>
                  Đang huấn luyện Neural Voice Model...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[20px]">magic_button</span>
                  Nhân Bản Giọng Ngay ({cloneType === 'instant' ? '5.000' : '20.000'} Credits)
                </>
              )}
            </button>
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
                  Hãy tải lên tệp âm thanh 10s bên cạnh để tạo giọng nói AI độc bản của bạn ngay hôm nay!
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1">
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
                          <div className="h-10 w-10 rounded-full bg-primary-container/20 text-primary-container flex items-center justify-center font-bold text-label-md">
                            {voice.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <h4 className="font-label-md text-on-surface font-bold truncate max-w-[160px]">
                              {voice.name}
                            </h4>
                            <div className="flex items-center gap-2 text-body-xs text-text-muted mt-0.5">
                              <span>{voice.gender === 'female' ? 'Nữ' : voice.gender === 'male' ? 'Nam' : 'Trung tính'}</span>
                              <span>•</span>
                              <span>{voice.language}</span>
                              <span className="px-1.5 py-0.2 rounded text-[10px] bg-signal-success/20 text-signal-success font-semibold">
                                Sẵn sàng
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {voice.sampleUrl && (
                            <button
                              type="button"
                              onClick={() => togglePlaySample(voice.id, voice.sampleUrl)}
                              className={`h-8 w-8 rounded-full flex items-center justify-center transition-all ${
                                isPlaying
                                  ? 'bg-primary-container text-surface-card shadow-glow-cyan'
                                  : 'bg-surface-container-high text-primary-container hover:bg-primary-container hover:text-surface-card'
                              }`}
                              title="Nghe thử giọng mẫu gốc"
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

                          {voice.sampleUrl && (
                            <a
                              href={voice.sampleUrl}
                              download
                              className="p-1.5 rounded-lg bg-surface-container-high text-text-secondary hover:text-on-surface transition-colors"
                              title="Tải audio mẫu của bạn"
                            >
                              <span className="material-symbols-outlined text-[17px]">download</span>
                            </a>
                          )}

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
                              Thử nghiệm tổng hợp giọng với Coqui XTTS:
                            </span>
                            <span className="text-[11px] text-text-muted">Local XTTS Engine</span>
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
                              className="px-3 py-1.5 bg-primary-container text-surface-card rounded-lg font-bold text-label-sm hover:opacity-90 transition-opacity flex items-center gap-1.5 disabled:opacity-50"
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
                                Đã tạo audio từ XTTS thành công:
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
