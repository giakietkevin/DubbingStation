'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Code2,
  Terminal,
  Play,
  Copy,
  Check,
  Zap,
  Sparkles,
  Key,
  ShieldCheck,
  Layers,
  ArrowRight,
  ExternalLink,
  Cpu,
  FileAudio,
  Film,
  Mic,
  Server,
  AlertCircle,
  HelpCircle,
  Clock,
  Coins,
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { voicePersonaProfiles } from '@/data/voiceProfiles';

export default function ApiDocsPage() {
  const [activeTab, setActiveTab] = useState<'tts' | 'dubbing' | 'stt'>('tts');
  const [activeLang, setActiveLang] = useState<'curl' | 'nodejs' | 'python'>('curl');
  const [apiKeyInput, setApiKeyInput] = useState<string>('ds_live_your_api_key_here');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Playground state for TTS
  const [ttsText, setTtsText] = useState<string>('Xin chào! Đây là trải nghiệm âm thanh AI thế hệ mới từ DubbingStation.');
  const [ttsVoice, setTtsVoice] = useState<string>('bac-ba-review');
  const [ttsSpeed, setTtsSpeed] = useState<number>(1.0);
  const [isSynthesizing, setIsSynthesizing] = useState<boolean>(false);
  const [playgroundAudioUrl, setPlaygroundAudioUrl] = useState<string | null>(null);
  const [playgroundResponse, setPlaygroundResponse] = useState<any>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleRunPlayground = async () => {
    setIsSynthesizing(true);
    setPlaygroundResponse(null);
    setPlaygroundAudioUrl(null);

    const streamUrl = `/api/tts/stream?text=${encodeURIComponent(ttsText)}&voiceId=${ttsVoice}&speed=${ttsSpeed}`;

    try {
      const startTime = performance.now();
      const res = await fetch(streamUrl);
      const endTime = performance.now();

      if (res.ok) {
        const blob = await res.blob();
        const audioUrl = URL.createObjectURL(blob);
        setPlaygroundAudioUrl(audioUrl);
        setPlaygroundResponse({
          status: 200,
          statusText: 'OK',
          latencyMs: Math.round(endTime - startTime),
          contentType: res.headers.get('content-type') || 'audio/mpeg',
          sizeBytes: blob.size,
          estimatedCredits: ttsText.length,
        });
      } else {
        const errorJson = await res.json().catch(() => ({}));
        setPlaygroundResponse({
          status: res.status,
          statusText: res.statusText,
          error: errorJson.error || 'Request failed',
        });
      }
    } catch (err: any) {
      setPlaygroundResponse({
        status: 500,
        error: err?.message || 'Network error',
      });
    } finally {
      setIsSynthesizing(false);
    }
  };

  const codeExamples = {
    tts: {
      curl: `curl -X POST "https://dubbingstation.ai/api/v1/tts" \\
  -H "Authorization: Bearer ${apiKeyInput}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "text": "${ttsText}",
    "voiceId": "${ttsVoice}",
    "speed": ${ttsSpeed},
    "responseFormat": "audio"
  }' --output output.mp3`,
      nodejs: `import fs from 'fs';

const res = await fetch('https://dubbingstation.ai/api/v1/tts', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ${apiKeyInput}',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    text: '${ttsText}',
    voiceId: '${ttsVoice}',
    speed: ${ttsSpeed},
    responseFormat: 'audio'
  })
});

if (res.ok) {
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync('speech.mp3', buffer);
  console.log('✅ Generated speech.mp3 successfully!');
} else {
  console.error('TTS Error:', await res.json());
}`,
      python: `import requests

url = "https://dubbingstation.ai/api/v1/tts"
headers = {
    "Authorization": "Bearer ${apiKeyInput}",
    "Content-Type": "application/json"
}
payload = {
    "text": "${ttsText}",
    "voiceId": "${ttsVoice}",
    "speed": ${ttsSpeed},
    "responseFormat": "audio"
}

response = requests.post(url, json=payload, headers=headers)
if response.status_code == 200:
    with open("speech.mp3", "wb") as f:
        f.write(response.content)
    print("✅ Generated speech.mp3 successfully!")
else:
    print("TTS Error:", response.json())`,
    },
    dubbing: {
      curl: `curl -X POST "https://dubbingstation.ai/api/v1/dubbing" \\
  -H "Authorization: Bearer ${apiKeyInput}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "projectName": "YouTube Short Dubbing",
    "videoDurationSec": 30,
    "cues": [
      { "speaker": "Speaker 1", "voiceId": "bac-ba-review", "text": "Chào mừng đến với video hôm nay!" },
      { "speaker": "Speaker 2", "voiceId": "genz-linh-dan", "text": "Cùng khám phá ngay nhé mọi người ơi!" }
    ]
  }'`,
      nodejs: `const res = await fetch('https://dubbingstation.ai/api/v1/dubbing', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ${apiKeyInput}',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    projectName: 'Auto Dubbing Project',
    videoDurationSec: 45,
    cues: [
      { speaker: 'Host', voiceId: 'bac-ba-review', text: 'Chào mừng các bạn đã quay trở lại.' },
      { speaker: 'Guest', voiceId: 'genz-linh-dan', text: 'Hế lô cả nhà yêu nha!' }
    ]
  })
});

const data = await res.json();
console.log('Dubbing Task Output:', data);`,
      python: `import requests

url = "https://dubbingstation.ai/api/v1/dubbing"
headers = {
    "Authorization": "Bearer ${apiKeyInput}",
    "Content-Type": "application/json"
}
payload = {
    "projectName": "Auto Dubbing Project",
    "videoDurationSec": 45,
    "cues": [
        {"speaker": "Host", "voiceId": "bac-ba-review", "text": "Chào mừng các bạn đã quay trở lại."},
        {"speaker": "Guest", "voiceId": "genz-linh-dan", "text": "Hế lô cả nhà yêu nha!"}
    ]
}

response = requests.post(url, json=payload, headers=headers)
print("Dubbing Response:", response.json())`,
    },
    stt: {
      curl: `curl -X POST "https://dubbingstation.ai/api/v1/stt" \\
  -H "Authorization: Bearer ${apiKeyInput}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "fileName": "interview_audio.mp3",
    "durationSec": 60,
    "language": "vi"
  }'`,
      nodejs: `const res = await fetch('https://dubbingstation.ai/api/v1/stt', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ${apiKeyInput}',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    fileName: 'podcast_episode_1.mp3',
    durationSec: 120,
    language: 'vi'
  })
});

const result = await res.json();
console.log('Transcription:', result.fullText);
console.log('Segments:', result.segments);`,
      python: `import requests

url = "https://dubbingstation.ai/api/v1/stt"
headers = {
    "Authorization": "Bearer ${apiKeyInput}",
    "Content-Type": "application/json"
}
payload = {
    "fileName": "podcast_episode_1.mp3",
    "durationSec": 120,
    "language": "vi"
}

response = requests.post(url, json=payload, headers=headers)
data = response.json()
print("Full Text:", data.get("fullText"))`,
    },
  };

  const voicesList = Object.entries(voicePersonaProfiles).map(([id, cfg]) => ({
    id,
    model: cfg.neuralModel,
    pitch: cfg.pitch,
    rate: cfg.rate,
    sample: cfg.samplePhrase,
  }));

  return (
    <div className="min-h-screen bg-canvas-base text-on-surface">
      <Header />

      {/* Hero Banner */}
      <section className="relative pt-32 pb-16 px-4 md:px-8 max-w-7xl mx-auto border-b border-border-glass">
        <div className="space-y-4 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-container/15 border border-primary-container/30 text-primary-container text-xs font-bold uppercase tracking-wider">
            <Code2 className="w-4 h-4" />
            <span>DubbingStation REST API v1.0</span>
          </div>

          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-on-surface">
            Tài Liệu Tích Hợp <span className="text-primary-container">Developer API</span>
          </h1>

          <p className="text-base md:text-lg text-text-secondary leading-relaxed">
            Tích hợp sức mạnh giọng nói AI tự nhiên phòng thu, tự động lồng tiếng video đa nhân vật và nhận dạng Whisper AI vào hệ thống của bạn với độ trễ siêu thấp và chuẩn RESTful API.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href="/dashboard/settings"
              className="px-5 py-2.5 rounded-xl bg-primary-container text-surface-card font-bold text-sm hover:shadow-glow-cyan transition-all flex items-center gap-2"
            >
              <Key className="w-4 h-4" />
              <span>Lấy API Key Ngay</span>
            </Link>

            <a
              href="#playground"
              className="px-5 py-2.5 rounded-xl bg-surface-card hover:bg-surface-container border border-border-glass text-on-surface font-bold text-sm transition-all flex items-center gap-2"
            >
              <Play className="w-4 h-4 text-primary-container" />
              <span>Thử Nghiệm Trực Tiếp</span>
            </a>
          </div>
        </div>
      </section>

      {/* Main Documentation Container */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-12 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Sticky Navigation Navigation */}
        <aside className="lg:col-span-3 space-y-6">
          <div className="sticky top-24 p-4 rounded-2xl bg-surface-card border border-border-glass space-y-3 text-xs">
            <span className="font-bold text-text-muted uppercase tracking-wider block px-2">Mục Lục Tài Liệu</span>

            <nav className="space-y-1">
              {[
                { id: 'authentication', label: '1. Xác Thực & API Key', icon: ShieldCheck },
                { id: 'credits-pricing', label: '2. Tín Dụng & Cước Phí', icon: Coins },
                { id: 'playground', label: '3. API Playground (Thử Nghiệm)', icon: Play },
                { id: 'endpoint-tts', label: '4. POST /api/v1/tts (TTS)', icon: FileAudio },
                { id: 'endpoint-dubbing', label: '5. POST /api/v1/dubbing', icon: Film },
                { id: 'endpoint-stt', label: '6. POST /api/v1/stt (Whisper)', icon: Mic },
                { id: 'voice-catalog', label: '7. Danh Bạ Voice IDs (24+)', icon: Layers },
                { id: 'status-codes', label: '8. Bảng Mã Lỗi HTTP', icon: AlertCircle },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-text-secondary hover:text-primary-container hover:bg-surface-container transition-colors"
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </a>
                );
              })}
            </nav>

            <div className="pt-3 border-t border-border-glass">
              <div className="p-3 rounded-xl bg-surface-container/60 space-y-1.5">
                <span className="font-bold text-on-surface text-[11px] flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-primary-container" />
                  <span>Base URL</span>
                </span>
                <code className="text-[10px] font-mono text-primary-container break-all block">
                  https://dubbingstation.ai/api/v1
                </code>
              </div>
            </div>
          </div>
        </aside>

        {/* Right Main Content */}
        <div className="lg:col-span-9 space-y-16">
          {/* Section 1: Authentication */}
          <section id="authentication" className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-primary-container/15 text-primary-container border border-primary-container/30">
                <ShieldCheck className="w-5 h-5" />
              </span>
              <h2 className="text-xl md:text-2xl font-bold text-on-surface">1. Xác Thực & Cơ Chế API Key</h2>
            </div>

            <p className="text-sm text-text-secondary leading-relaxed">
              Mọi yêu cầu gửi đến Developer REST API v1 đều yêu cầu mã khóa xác thực dạng Bearer Token hoặc Header tùy chỉnh. Bạn có thể khởi tạo và quản lý khóa tại trang{' '}
              <Link href="/dashboard/settings" className="text-primary-container underline underline-offset-4 hover:opacity-80">
                Cài Đặt API Keys
              </Link>.
            </p>

            <div className="p-4 rounded-xl bg-surface-card border border-border-glass space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between text-text-muted">
                <span>HEADER XÁC THỰC BẮT BUỘC:</span>
                <button
                  type="button"
                  onClick={() => handleCopy('Authorization: Bearer ds_live_xxxx', 'auth-header')}
                  className="text-primary-container flex items-center gap-1 hover:underline"
                >
                  {copiedKey === 'auth-header' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>Copy</span>
                </button>
              </div>
              <pre className="text-primary-container bg-surface-container-lowest p-3 rounded-lg overflow-x-auto">
                Authorization: Bearer ds_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
              </pre>
              <p className="text-[11px] font-sans text-text-muted">
                Hoặc có thể truyền qua header: <code className="text-text-secondary font-mono">x-api-key: ds_live_xxxx</code>
              </p>
            </div>
          </section>

          {/* Section 2: Credits Pricing */}
          <section id="credits-pricing" className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-signal-warning/15 text-signal-warning border border-signal-warning/30">
                <Coins className="w-5 h-5" />
              </span>
              <h2 className="text-xl md:text-2xl font-bold text-on-surface">2. Quy Tắc Tiêu Thụ Tín Dụng (Credits)</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-surface-card border border-border-glass space-y-2">
                <span className="text-xs font-bold text-primary-container uppercase">Text to Speech</span>
                <p className="text-2xl font-extrabold text-on-surface">1 Credit</p>
                <p className="text-xs text-text-muted">Tính trên mỗi 1 ký tự văn bản tổng hợp.</p>
              </div>

              <div className="p-4 rounded-xl bg-surface-card border border-border-glass space-y-2">
                <span className="text-xs font-bold text-accent-violet-bright uppercase">Video Dubbing</span>
                <p className="text-2xl font-extrabold text-on-surface">100 Credits</p>
                <p className="text-xs text-text-muted">Tính trên mỗi 1 giây độ dài video lồng tiếng.</p>
              </div>

              <div className="p-4 rounded-xl bg-surface-card border border-border-glass space-y-2">
                <span className="text-xs font-bold text-signal-success uppercase">Whisper STT</span>
                <p className="text-2xl font-extrabold text-on-surface">50 Credits</p>
                <p className="text-xs text-text-muted">Tính trên mỗi 1 giây âm thanh nhận dạng bóc băng.</p>
              </div>
            </div>
          </section>

          {/* Section 3: Interactive Playground */}
          <section id="playground" className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-primary-container/15 text-primary-container border border-primary-container/30">
                  <Play className="w-5 h-5" />
                </span>
                <div>
                  <h2 className="text-xl md:text-2xl font-bold text-on-surface">3. API Interactive Playground</h2>
                  <p className="text-xs text-text-muted">Trực tiếp thử nghiệm gọi API và kiểm tra âm thanh phản hồi.</p>
                </div>
              </div>

              <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-signal-success/15 text-signal-success border border-signal-success/30 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-signal-success animate-pulse" />
                <span>Live Test Engine Active</span>
              </span>
            </div>

            <div className="p-6 rounded-2xl bg-surface-card border border-border-glass space-y-6">
              {/* Test Parameters Controls */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1.5">
                  <label className="font-bold text-on-surface">Voice ID</label>
                  <select
                    value={ttsVoice}
                    onChange={(e) => setTtsVoice(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface-container border border-border-glass text-on-surface focus:outline-none focus:border-primary-container"
                  >
                    {voicesList.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.id} ({v.model})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-on-surface">Tốc độ đọc (Speed: {ttsSpeed}x)</label>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={ttsSpeed}
                    onChange={(e) => setTtsSpeed(parseFloat(e.target.value))}
                    className="w-full accent-primary-container"
                  />
                </div>
              </div>

              <div className="space-y-1.5 text-xs">
                <label className="font-bold text-on-surface">Văn bản cần đọc (Text payload)</label>
                <textarea
                  rows={3}
                  value={ttsText}
                  onChange={(e) => setTtsText(e.target.value)}
                  className="w-full p-3 rounded-xl bg-surface-container border border-border-glass text-on-surface focus:outline-none focus:border-primary-container text-xs"
                />
              </div>

              {/* Action Button */}
              <div className="flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={handleRunPlayground}
                  disabled={isSynthesizing || !ttsText.trim()}
                  className="px-6 py-2.5 rounded-xl bg-primary-container text-surface-card font-bold text-xs hover:shadow-glow-cyan transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <Play className={`w-4 h-4 fill-current ${isSynthesizing ? 'animate-spin' : ''}`} />
                  <span>{isSynthesizing ? 'Đang tổng hợp...' : 'Gửi Request Thử Nghiệm'}</span>
                </button>

                <span className="text-xs text-text-muted">{ttsText.length} ký tự (~{ttsText.length} credits)</span>
              </div>

              {/* Result Preview Console */}
              {playgroundResponse && (
                <div className="p-4 rounded-xl bg-surface-container-lowest border border-border-glass space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between text-xs border-b border-border-glass/40 pb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded font-bold font-mono text-[10px] ${
                          playgroundResponse.status === 200
                            ? 'bg-signal-success/20 text-signal-success'
                            : 'bg-signal-danger/20 text-signal-danger'
                        }`}
                      >
                        HTTP {playgroundResponse.status} {playgroundResponse.statusText}
                      </span>
                      {playgroundResponse.latencyMs && (
                        <span className="text-text-muted flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{playgroundResponse.latencyMs}ms</span>
                        </span>
                      )}
                    </div>

                    <span className="text-text-muted font-mono text-[11px]">{playgroundResponse.contentType}</span>
                  </div>

                  {playgroundAudioUrl && (
                    <div className="pt-2 space-y-2">
                      <span className="text-xs font-bold text-on-surface">Kết quả phát âm thanh:</span>
                      <audio controls src={playgroundAudioUrl} className="w-full h-10" autoPlay />
                    </div>
                  )}

                  <pre className="text-[11px] font-mono text-text-secondary overflow-x-auto">
                    {JSON.stringify(playgroundResponse, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </section>

          {/* Section 4: TTS Endpoint */}
          <section id="endpoint-tts" className="space-y-6">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-primary-container text-surface-card font-bold font-mono text-xs">
                POST
              </span>
              <h2 className="text-lg md:text-xl font-bold font-mono text-on-surface">/api/v1/tts</h2>
            </div>

            <p className="text-sm text-text-secondary">
              Chuyển đổi văn bản thành giọng nói AI chất lượng cao. Hỗ trợ trả về Binary Audio Stream (MP3) hoặc JSON Base64.
            </p>

            {/* Code Selector */}
            <div className="rounded-2xl bg-surface-card border border-border-glass overflow-hidden">
              <div className="p-3 bg-surface-container border-b border-border-glass flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-primary-container" />
                  <span className="text-xs font-bold text-on-surface">Request Code Sample</span>
                </div>
                <div className="flex items-center gap-1">
                  {(['curl', 'nodejs', 'python'] as const).map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setActiveLang(l)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase transition-all ${
                        activeLang === l ? 'bg-primary-container text-surface-card' : 'text-text-muted hover:text-on-surface'
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative p-4 bg-surface-container-lowest font-mono text-xs text-text-secondary overflow-x-auto">
                <button
                  type="button"
                  onClick={() => handleCopy(codeExamples.tts[activeLang], 'tts-code')}
                  className="absolute top-3 right-3 px-2.5 py-1 rounded bg-surface-container text-on-surface hover:bg-surface-container-high text-[11px] flex items-center gap-1"
                >
                  {copiedKey === 'tts-code' ? <Check className="w-3 h-3 text-signal-success" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === 'tts-code' ? 'Đã copy' : 'Copy'}</span>
                </button>
                <pre>{codeExamples.tts[activeLang]}</pre>
              </div>
            </div>
          </section>

          {/* Section 5: Dubbing Endpoint */}
          <section id="endpoint-dubbing" className="space-y-6">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-accent-violet-bright text-surface-card font-bold font-mono text-xs">
                POST
              </span>
              <h2 className="text-lg md:text-xl font-bold font-mono text-on-surface">/api/v1/dubbing</h2>
            </div>

            <p className="text-sm text-text-secondary">
              Lồng tiếng video tự động theo danh sách các câu thoại (cues) và từng nhân vật tương ứng.
            </p>

            <div className="rounded-2xl bg-surface-card border border-border-glass overflow-hidden">
              <div className="p-3 bg-surface-container border-b border-border-glass flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-accent-violet-bright" />
                  <span className="text-xs font-bold text-on-surface">Request Sample</span>
                </div>
                <div className="flex items-center gap-1">
                  {(['curl', 'nodejs', 'python'] as const).map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setActiveLang(l)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase transition-all ${
                        activeLang === l ? 'bg-accent-violet-bright text-surface-card' : 'text-text-muted hover:text-on-surface'
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative p-4 bg-surface-container-lowest font-mono text-xs text-text-secondary overflow-x-auto">
                <button
                  type="button"
                  onClick={() => handleCopy(codeExamples.dubbing[activeLang], 'dubbing-code')}
                  className="absolute top-3 right-3 px-2.5 py-1 rounded bg-surface-container text-on-surface hover:bg-surface-container-high text-[11px] flex items-center gap-1"
                >
                  {copiedKey === 'dubbing-code' ? <Check className="w-3 h-3 text-signal-success" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === 'dubbing-code' ? 'Đã copy' : 'Copy'}</span>
                </button>
                <pre>{codeExamples.dubbing[activeLang]}</pre>
              </div>
            </div>
          </section>

          {/* Section 6: STT Endpoint */}
          <section id="endpoint-stt" className="space-y-6">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-signal-success text-surface-card font-bold font-mono text-xs">
                POST
              </span>
              <h2 className="text-lg md:text-xl font-bold font-mono text-on-surface">/api/v1/stt</h2>
            </div>

            <p className="text-sm text-text-secondary">
              Bóc băng âm thanh thành văn bản Whisper AI độ chính xác cao và chia segment timestamp chi tiết.
            </p>

            <div className="rounded-2xl bg-surface-card border border-border-glass overflow-hidden">
              <div className="p-3 bg-surface-container border-b border-border-glass flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-signal-success" />
                  <span className="text-xs font-bold text-on-surface">Request Sample</span>
                </div>
                <div className="flex items-center gap-1">
                  {(['curl', 'nodejs', 'python'] as const).map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setActiveLang(l)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase transition-all ${
                        activeLang === l ? 'bg-signal-success text-surface-card' : 'text-text-muted hover:text-on-surface'
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative p-4 bg-surface-container-lowest font-mono text-xs text-text-secondary overflow-x-auto">
                <button
                  type="button"
                  onClick={() => handleCopy(codeExamples.stt[activeLang], 'stt-code')}
                  className="absolute top-3 right-3 px-2.5 py-1 rounded bg-surface-container text-on-surface hover:bg-surface-container-high text-[11px] flex items-center gap-1"
                >
                  {copiedKey === 'stt-code' ? <Check className="w-3 h-3 text-signal-success" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === 'stt-code' ? 'Đã copy' : 'Copy'}</span>
                </button>
                <pre>{codeExamples.stt[activeLang]}</pre>
              </div>
            </div>
          </section>

          {/* Section 7: Voice IDs Catalog */}
          <section id="voice-catalog" className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-primary-container/15 text-primary-container border border-primary-container/30">
                <Layers className="w-5 h-5" />
              </span>
              <h2 className="text-xl md:text-2xl font-bold text-on-surface">7. Danh Bạ Voice IDs & Thông Số Kỹ Thuật</h2>
            </div>

            <p className="text-sm text-text-secondary">
              Danh sách đầy đủ các Voice ID truyền vào thuộc tính <code>voiceId</code> trong payload API.
            </p>

            <div className="overflow-x-auto rounded-2xl border border-border-glass bg-surface-card">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border-glass text-text-muted bg-surface-container/50">
                    <th className="p-3 font-semibold">VOICE ID</th>
                    <th className="p-3 font-semibold">NEURAL MODEL</th>
                    <th className="p-3 font-semibold">PITCH</th>
                    <th className="p-3 font-semibold">RATE</th>
                    <th className="p-3 font-semibold">CÂU THOẠI MẪU</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-glass/40 font-mono">
                  {voicesList.map((v) => (
                    <tr key={v.id} className="hover:bg-surface-container/30 transition-colors">
                      <td className="p-3 font-bold text-primary-container">{v.id}</td>
                      <td className="p-3 text-text-secondary">{v.model}</td>
                      <td className="p-3 text-text-secondary">{v.pitch}</td>
                      <td className="p-3 text-text-secondary">{v.rate}</td>
                      <td className="p-3 font-sans text-text-muted text-[11px] max-w-xs truncate" title={v.sample}>
                        {v.sample}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 8: HTTP Status Codes */}
          <section id="status-codes" className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-signal-danger/15 text-signal-danger border border-signal-danger/30">
                <AlertCircle className="w-5 h-5" />
              </span>
              <h2 className="text-xl md:text-2xl font-bold text-on-surface">8. Bảng Mã Lỗi HTTP Phản Hồi</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-surface-card border border-border-glass space-y-1">
                <span className="font-bold text-signal-success font-mono">200 OK</span>
                <p className="text-text-secondary">Yêu cầu xử lý thành công, trả về tệp âm thanh hoặc dữ liệu JSON.</p>
              </div>

              <div className="p-4 rounded-xl bg-surface-card border border-border-glass space-y-1">
                <span className="font-bold text-signal-warning font-mono">401 Unauthorized</span>
                <p className="text-text-secondary">Thiếu hoặc sai Authorization API Key trong request header.</p>
              </div>

              <div className="p-4 rounded-xl bg-surface-card border border-border-glass space-y-1">
                <span className="font-bold text-signal-danger font-mono">402 Payment Required</span>
                <p className="text-text-secondary">Số dư Credits trong tài khoản không đủ để thực hiện yêu cầu.</p>
              </div>

              <div className="p-4 rounded-xl bg-surface-card border border-border-glass space-y-1">
                <span className="font-bold text-text-muted font-mono">500 Server Error</span>
                <p className="text-text-secondary">Lỗi xử lý nội bộ tại máy chủ hoặc sự cố kết nối tới AI Engine.</p>
              </div>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
