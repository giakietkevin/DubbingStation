'use client';

import React, { useEffect, useState, useRef } from 'react';
import {
  FolderKanban,
  Search,
  Filter,
  Play,
  Pause,
  Download,
  Trash2,
  FileAudio,
  Film,
  Mic,
  Wrench,
  Code2,
  Sparkles,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';

interface Project {
  id: string;
  name: string;
  type: string;
  inputData: string | null;
  outputUrl: string | null;
  durationSec: number | null;
  charCount: number | null;
  creditsUsed: number;
  status: string;
  createdAt: string;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [playingId, setPlayingId] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const fetchProjects = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      if (res.ok) {
        setProjects(data.projects || []);
      } else {
        setError(data.error || 'Tải danh sách thất bại');
      }
    } catch {
      setError('Lỗi kết nối máy chủ');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleTogglePlay = (project: Project) => {
    if (playingId === project.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }

    // Xác định sound url
    let soundUrl = project.outputUrl;
    if (!soundUrl) {
      soundUrl = `/api/tts/stream?text=${encodeURIComponent(project.name)}&voiceId=minh-khang`;
    }

    if (!audioRef.current) {
      audioRef.current = new Audio(soundUrl);
    } else {
      audioRef.current.src = soundUrl;
    }

    audioRef.current
      .play()
      .then(() => setPlayingId(project.id))
      .catch((err) => {
        console.error('Play error:', err);
        setPlayingId(null);
      });

    audioRef.current.onended = () => setPlayingId(null);
    audioRef.current.onerror = () => setPlayingId(null);
  };

  const handleDownload = (project: Project) => {
    let downloadUrl = project.outputUrl;
    if (!downloadUrl) {
      downloadUrl = `/api/tts/stream?text=${encodeURIComponent(project.name)}&voiceId=minh-khang`;
    }
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = project.name.endsWith('.mp3') || project.name.endsWith('.mp4') ? project.name : `${project.name}.mp3`;
    a.target = '_blank';
    a.click();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa vĩnh viễn tệp dự án này không?')) return;

    if (playingId === id) {
      audioRef.current?.pause();
      setPlayingId(null);
    }

    try {
      const res = await fetch(`/api/projects?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setProjects((prev) => prev.filter((p) => p.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (sec: number | null) => {
    if (!sec) return '--:--';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m < 10 ? '0' + m : m}:${s < 10 ? '0' + s : s}`;
  };

  const typeConfig: Record<string, { label: string; icon: any; color: string; bg: string }> = {
    TTS: { label: 'Text to Speech', icon: FileAudio, color: 'text-primary-container', bg: 'bg-primary-container/15' },
    DUBBING: { label: 'Video Dubbing', icon: Film, color: 'text-accent-violet-bright', bg: 'bg-accent-violet-bright/15' },
    STT: { label: 'Speech to Text', icon: Mic, color: 'text-signal-success', bg: 'bg-signal-success/15' },
    WASM_TOOL: { label: 'Audio Tool', icon: Wrench, color: 'text-signal-warning', bg: 'bg-signal-warning/15' },
    API_V1: { label: 'Developer API', icon: Code2, color: 'text-cyan-400', bg: 'bg-cyan-500/15' },
  };

  const filteredProjects = projects.filter((p) => {
    const matchFilter = filterType === 'ALL' || p.type === filterType;
    const matchSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.type && p.type.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchFilter && matchSearch;
  });

  const totalCreditsUsed = projects.reduce((sum, p) => sum + p.creditsUsed, 0);

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-primary-container/15 text-primary-container border border-primary-container/30">
              <FolderKanban className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-on-surface">Quản Lý Dự Án & File Âm Thanh</h1>
              <p className="text-sm text-text-muted mt-0.5">
                Quản lý lịch sử tạo tệp của toàn bộ dịch vụ: Studio TTS, Dubbing, Whisper STT và Developer API.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchProjects}
          className="px-3.5 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high border border-border-glass text-xs font-bold text-on-surface flex items-center gap-1.5 transition-all self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Làm mới</span>
        </button>
      </div>

      {/* Metrics Rail */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-surface-card border border-border-glass">
          <span className="text-xs text-text-muted">Tổng số dự án</span>
          <p className="text-xl font-bold text-on-surface mt-1">{projects.length}</p>
        </div>
        <div className="p-4 rounded-xl bg-surface-card border border-border-glass">
          <span className="text-xs text-text-muted">Credits đã sử dụng</span>
          <p className="text-xl font-bold text-signal-warning mt-1">-{totalCreditsUsed.toLocaleString('vi-VN')}</p>
        </div>
        <div className="p-4 rounded-xl bg-surface-card border border-border-glass">
          <span className="text-xs text-text-muted">Studio TTS Projects</span>
          <p className="text-xl font-bold text-primary-container mt-1">
            {projects.filter((p) => p.type === 'TTS' || p.type === 'API_V1').length}
          </p>
        </div>
        <div className="p-4 rounded-xl bg-surface-card border border-border-glass">
          <span className="text-xs text-text-muted">Dubbing & STT</span>
          <p className="text-xl font-bold text-accent-violet-bright mt-1">
            {projects.filter((p) => p.type === 'DUBBING' || p.type === 'STT').length}
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-surface-card border border-border-glass flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Type Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
          {[
            { id: 'ALL', label: 'Tất cả' },
            { id: 'TTS', label: '🎙️ TTS Studio' },
            { id: 'DUBBING', label: '🎬 Dubbing' },
            { id: 'STT', label: '📝 Whisper STT' },
            { id: 'API_V1', label: '⚡ Developer API' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterType(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                filterType === tab.id
                  ? 'bg-primary-container text-surface-card shadow-glow-cyan'
                  : 'bg-surface-container text-text-secondary hover:text-on-surface hover:bg-surface-container-high'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-surface-container border border-border-glass w-full md:w-72 focus-within:border-primary-container transition-colors">
          <Search className="w-4 h-4 text-text-muted shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên dự án..."
            className="w-full bg-transparent text-xs text-on-surface placeholder:text-text-muted focus:outline-none"
          />
          {searchQuery && (
            <button type="button" onClick={() => setSearchQuery('')} className="text-text-muted hover:text-on-surface text-xs">
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Main Projects List Table / Cards */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-text-muted text-xs">
          <span className="w-8 h-8 rounded-full border-2 border-primary-container border-t-transparent animate-spin" />
          <span>Đang tải danh sách tệp dự án...</span>
        </div>
      ) : error ? (
        <div className="py-16 text-center text-signal-danger text-xs space-y-2">
          <p>{error}</p>
          <button
            type="button"
            onClick={fetchProjects}
            className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface"
          >
            Thử lại
          </button>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="py-20 text-center text-text-muted text-xs space-y-3 bg-surface-card rounded-2xl border border-border-glass p-8">
          <FolderKanban className="w-10 h-10 mx-auto opacity-40 text-primary-container" />
          <h3 className="text-sm font-bold text-on-surface">Không tìm thấy tệp dự án nào</h3>
          <p className="max-w-md mx-auto">
            {searchQuery || filterType !== 'ALL'
              ? 'Không có kết quả nào khớp với tiêu chí tìm kiếm hoặc bộ lọc hiện tại.'
              : 'Hãy truy cập AI Studio, Video Dubbing hoặc Whisper STT để tạo dự án đầu tiên của bạn!'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredProjects.map((project) => {
            const config = typeConfig[project.type] || typeConfig.TTS;
            const Icon = config.icon;
            const isPlaying = playingId === project.id;

            return (
              <div
                key={project.id}
                className="p-4 rounded-2xl bg-surface-card hover:bg-surface-container/40 border border-border-glass transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 group"
              >
                {/* Left: Info */}
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  {/* Play Button Icon */}
                  <button
                    type="button"
                    title={isPlaying ? 'Tạm dừng' : 'Nghe thử âm thanh'}
                    onClick={() => handleTogglePlay(project)}
                    className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                      isPlaying
                        ? 'bg-primary-container text-surface-card shadow-glow-cyan scale-105'
                        : 'bg-surface-container hover:bg-primary-container hover:text-surface-card text-primary-container border border-border-glass'
                    }`}
                  >
                    {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                  </button>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-on-surface truncate group-hover:text-primary-container transition-colors">
                        {project.name}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${config.color} ${config.bg} flex items-center gap-1`}>
                        <Icon className="w-3 h-3" />
                        <span>{config.label}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5 text-xs text-text-muted flex-wrap">
                      <span>{formatDate(project.createdAt)}</span>
                      <span>•</span>
                      <span>{formatDuration(project.durationSec)}</span>
                      {project.charCount && (
                        <>
                          <span>•</span>
                          <span>{project.charCount.toLocaleString('vi-VN')} ký tự</span>
                        </>
                      )}
                      <span>•</span>
                      <span className="text-signal-warning font-semibold">
                        -{project.creditsUsed.toLocaleString('vi-VN')} credits
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  <button
                    type="button"
                    title="Tải tệp MP3/MP4 về máy"
                    onClick={() => handleDownload(project)}
                    className="px-3 py-1.5 rounded-xl bg-surface-container hover:bg-primary-container hover:text-surface-card text-text-secondary font-bold text-xs transition-all flex items-center gap-1.5 border border-border-glass"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Tải về</span>
                  </button>

                  <button
                    type="button"
                    title="Xóa tệp dự án"
                    onClick={() => handleDelete(project.id)}
                    className="p-2 rounded-xl bg-surface-container hover:bg-signal-danger/20 text-text-muted hover:text-signal-danger transition-colors border border-border-glass"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
