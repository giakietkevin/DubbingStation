'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  Key,
  Plus,
  Copy,
  Check,
  Trash2,
  Code2,
  Terminal,
  ShieldCheck,
  ExternalLink,
  BookOpen,
  User,
  Mail,
  Coins,
  Cpu,
} from 'lucide-react';

interface ApiKeyItem {
  id: string;
  name: string;
  maskedKey: string;
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [newKeyName, setNewKeyName] = useState<string>('');
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [createdSecretKey, setCreatedSecretKey] = useState<string | null>(null);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [activeLangTab, setActiveLangTab] = useState<'curl' | 'nodejs' | 'python'>('curl');

  const fetchKeys = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/keys');
      if (res.ok) {
        const data = await res.json();
        setApiKeys(data.keys || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;

    try {
      setIsCreating(true);
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName }),
      });

      if (res.ok) {
        const data = await res.json();
        setCreatedSecretKey(data.apiKey.secretKey);
        setNewKeyName('');
        fetchKeys();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteKey = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn thu hồi API Key này không? Các ứng dụng đang kết nối sẽ mất quyền truy cập.')) {
      return;
    }

    try {
      const res = await fetch(`/api/keys?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setApiKeys((prev) => prev.filter((k) => k.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKeyId(id);
    setTimeout(() => setCopiedKeyId(null), 2500);
  };

  const codeSnippets = {
    curl: `curl -X POST "http://localhost:3000/api/v1/tts" \\
  -H "Authorization: Bearer ${apiKeys[0]?.maskedKey || 'ds_live_your_api_key'}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "text": "Chào mừng bạn đến với DubbingStation AI Studio!",
    "voiceId": "minh-khang",
    "speed": 1.0,
    "responseFormat": "audio"
  }' --output output.mp3`,
    nodejs: `import fs from 'fs';

const response = await fetch('http://localhost:3000/api/v1/tts', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ${apiKeys[0]?.maskedKey || 'ds_live_your_api_key'}',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    text: 'Chào mừng bạn đến với DubbingStation AI Studio!',
    voiceId: 'minh-khang',
    responseFormat: 'audio'
  })
});

const buffer = Buffer.from(await response.arrayBuffer());
fs.writeFileSync('output.mp3', buffer);
console.log('Audio saved successfully!');`,
    python: `import requests

url = "http://localhost:3000/api/v1/tts"
headers = {
    "Authorization": "Bearer ${apiKeys[0]?.maskedKey || 'ds_live_your_api_key'}",
    "Content-Type": "application/json"
}
payload = {
    "text": "Chào mừng bạn đến với DubbingStation AI Studio!",
    "voiceId": "minh-khang",
    "responseFormat": "audio"
}

response = requests.post(url, json=payload, headers=headers)
with open("output.mp3", "wb") as f:
    f.write(response.content)
print("Audio saved successfully!")`,
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="p-2 rounded-xl bg-primary-container/15 text-primary-container border border-primary-container/30">
            <Key className="w-6 h-6" />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-on-surface">Cài Đặt & Developer API Keys</h1>
            <p className="text-sm text-text-muted mt-0.5">
              Quản lý tài khoản, tạo khóa xác thực API và tích hợp DubbingStation AI vào ứng dụng của bạn.
            </p>
          </div>
        </div>
      </div>

      {/* Account Info Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-surface-card border border-border-glass flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-full bg-primary-container/20 text-primary-container flex items-center justify-center shrink-0">
            <User className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-text-muted">Tên tài khoản</span>
            <p className="text-sm font-bold text-on-surface truncate">{session?.user?.name || 'Developer User'}</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-surface-card border border-border-glass flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-full bg-accent-violet-bright/20 text-accent-violet-bright flex items-center justify-center shrink-0">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-text-muted">Email đăng ký</span>
            <p className="text-sm font-bold text-on-surface truncate">{session?.user?.email || 'dev@dubbingstation.ai'}</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-surface-card border border-border-glass flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-full bg-signal-success/20 text-signal-success flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-text-muted">Quyền truy cập</span>
            <p className="text-sm font-bold text-signal-success">API Developer (v1 Active)</p>
          </div>
        </div>
      </div>

      {/* Created Key Banner Alert */}
      {createdSecretKey && (
        <div className="p-5 rounded-2xl bg-signal-warning/15 border border-signal-warning/40 space-y-2.5 animate-bounce-short">
          <div className="flex items-center gap-2 text-signal-warning font-bold text-sm">
            <ShieldCheck className="w-5 h-5" />
            <span>Lưu ý quan trọng: Hãy sao chép API Key ngay bây giờ!</span>
          </div>
          <p className="text-xs text-text-secondary">
            Vì lý do bảo mật, khóa bí mật này sẽ <strong>chỉ hiển thị một lần duy nhất</strong>. Nếu bạn làm mất, bạn sẽ cần tạo một khóa mới.
          </p>
          <div className="flex items-center gap-2 p-3 rounded-xl bg-surface-container-lowest border border-border-glass font-mono text-xs text-primary-container select-all">
            <span className="flex-1 truncate font-bold">{createdSecretKey}</span>
            <button
              type="button"
              onClick={() => handleCopy(createdSecretKey, 'new-secret')}
              className="px-3 py-1.5 rounded-lg bg-primary-container text-surface-card font-bold hover:shadow-glow-cyan flex items-center gap-1 text-xs"
            >
              {copiedKeyId === 'new-secret' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKeyId === 'new-secret' ? 'Đã chép' : 'Sao chép'}</span>
            </button>
          </div>
        </div>
      )}

      {/* API Keys Management Section */}
      <div className="p-6 rounded-2xl bg-surface-card border border-border-glass space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-glass pb-4">
          <div>
            <h2 className="text-lg font-bold text-on-surface flex items-center gap-2">
              <Key className="w-5 h-5 text-primary-container" />
              <span>Danh Sách API Keys ({apiKeys.length})</span>
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              Sử dụng các khóa này để gửi request đến các endpoint <code>/api/v1/tts</code>, <code>/api/v1/dubbing</code>, <code>/api/v1/stt</code>.
            </p>
          </div>

          {/* Create Key Form */}
          <form onSubmit={handleCreateKey} className="flex items-center gap-2">
            <input
              type="text"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="Tên khóa (vd: Production App)..."
              className="px-3.5 py-2 rounded-xl bg-surface-container border border-border-glass text-xs text-on-surface focus:outline-none focus:border-primary-container w-48 sm:w-60"
            />
            <button
              type="submit"
              disabled={isCreating || !newKeyName.trim()}
              className="px-4 py-2 rounded-xl bg-primary-container text-surface-card text-xs font-bold hover:shadow-glow-cyan transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>{isCreating ? 'Đang tạo...' : 'Tạo Key Mới'}</span>
            </button>
          </form>
        </div>

        {/* Keys Table */}
        {isLoading ? (
          <div className="py-12 text-center text-text-muted text-xs">Đang tải danh sách API Keys...</div>
        ) : apiKeys.length === 0 ? (
          <div className="py-12 text-center text-text-muted text-xs space-y-2">
            <Key className="w-8 h-8 mx-auto text-text-muted opacity-50" />
            <p>Bạn chưa có API Key nào. Hãy nhập tên và bấm <strong>"Tạo Key Mới"</strong> ở góc trên.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border-glass text-text-muted">
                  <th className="pb-3 font-semibold">TÊN KHÓA</th>
                  <th className="pb-3 font-semibold">API KEY TOKEN</th>
                  <th className="pb-3 font-semibold">NGÀY TẠO</th>
                  <th className="pb-3 font-semibold">SỬ DỤNG GẦN NHẤT</th>
                  <th className="pb-3 font-semibold text-right">THAO TÁC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-glass/40">
                {apiKeys.map((k) => (
                  <tr key={k.id} className="hover:bg-surface-container/30 transition-colors">
                    <td className="py-3.5 font-bold text-on-surface">{k.name}</td>
                    <td className="py-3.5 font-mono text-primary-container">
                      <span className="px-2 py-1 rounded bg-surface-container border border-border-glass">
                        {k.maskedKey}
                      </span>
                    </td>
                    <td className="py-3.5 text-text-secondary">
                      {new Date(k.createdAt).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="py-3.5 text-text-secondary">
                      {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString('vi-VN') : 'Chưa sử dụng'}
                    </td>
                    <td className="py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleCopy(k.maskedKey, k.id)}
                          title="Sao chép"
                          className="p-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-text-secondary hover:text-on-surface transition-colors"
                        >
                          {copiedKeyId === k.id ? <Check className="w-3.5 h-3.5 text-signal-success" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteKey(k.id)}
                          title="Thu hồi khóa"
                          className="p-1.5 rounded-lg bg-signal-danger/10 hover:bg-signal-danger/20 text-signal-danger transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Developer API Quickstart Documentation */}
      <div className="p-6 rounded-2xl bg-surface-card border border-border-glass space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-primary-container" />
            <h2 className="text-lg font-bold text-on-surface">Tích Hợp Nhanh (API Quickstart)</h2>
          </div>
          <div className="flex items-center gap-1.5 bg-surface-container-lowest p-1 rounded-xl border border-border-glass">
            {(['curl', 'nodejs', 'python'] as const).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setActiveLangTab(lang)}
                className={`px-3 py-1 rounded-lg text-xs font-bold uppercase transition-all ${
                  activeLangTab === lang
                    ? 'bg-primary-container text-surface-card shadow-glow-cyan'
                    : 'text-text-muted hover:text-on-surface'
                }`}
              >
                {lang}
              </button>
            ))}
          </div>
        </div>

        <div className="relative rounded-xl bg-surface-container-lowest p-4 font-mono text-xs text-text-secondary border border-border-glass overflow-x-auto">
          <button
            type="button"
            onClick={() => handleCopy(codeSnippets[activeLangTab], 'snippet')}
            className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface flex items-center gap-1 text-[11px] border border-border-glass"
          >
            {copiedKeyId === 'snippet' ? <Check className="w-3 h-3 text-signal-success" /> : <Copy className="w-3 h-3" />}
            <span>{copiedKeyId === 'snippet' ? 'Đã chép' : 'Copy'}</span>
          </button>
          <pre className="pr-16">{codeSnippets[activeLangTab]}</pre>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs">
          <div className="p-3 rounded-xl bg-surface-container/50 border border-border-glass space-y-1">
            <span className="font-bold text-primary-container">POST /api/v1/tts</span>
            <p className="text-text-muted">Tổng hợp giọng nói Neural Studio, tính cước 1 ký tự = 1 Credit.</p>
          </div>
          <div className="p-3 rounded-xl bg-surface-container/50 border border-border-glass space-y-1">
            <span className="font-bold text-accent-violet-bright">POST /api/v1/dubbing</span>
            <p className="text-text-muted">Lồng tiếng video đa nhân vật theo Timeline phụ đề, 100 Credits / giây.</p>
          </div>
          <div className="p-3 rounded-xl bg-surface-container/50 border border-border-glass space-y-1">
            <span className="font-bold text-signal-success">POST /api/v1/stt</span>
            <p className="text-text-muted">Bóc băng nhận dạng Whisper AI đa ngôn ngữ, 50 Credits / giây.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
