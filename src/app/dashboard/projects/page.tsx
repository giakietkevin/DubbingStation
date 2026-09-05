'use client';

import React, { useEffect, useState } from 'react';

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

  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      if (res.ok) {
        setProjects(data.projects);
      } else {
        setError(data.error || 'Tải danh sách thất bại');
      }
    } catch (err) {
      setError('Lỗi kết nối máy chủ');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa tệp này không?')) return;

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

  const typeLabels: Record<string, { label: string; color: string }> = {
    TTS: { label: 'Text to Speech', color: 'text-primary-container bg-primary-container/15' },
    DUBBING: { label: 'Video Dubbing', color: 'text-secondary bg-secondary-container/20' },
    STT: { label: 'Speech to Text', color: 'text-signal-success bg-signal-success/15' },
    WASM_TOOL: { label: 'Audio Tool', color: 'text-signal-warning bg-signal-warning/15' },
  };

  return (
    <div className="flex flex-col gap-space-lg max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
        <div>
          <h2 className="font-headline-md text-headline-md font-bold text-text-primary">
            Lịch Sử Tệp Âm Thanh
          </h2>
          <p className="font-body-sm text-body-sm text-text-muted mt-0.5">
            Quản lý tất cả các tệp audio đã tạo • Nghe lại, tải xuống hoặc xóa
          </p>
        </div>
        <span className="font-code-xs text-code-xs text-text-muted bg-surface-container-high px-3 py-1.5 rounded-lg">
          Tổng cộng: {projects.length} tệp
        </span>
      </div>

      {isLoading && (
        <div className="py-16 flex flex-col items-center gap-3">
          <span className="w-8 h-8 rounded-full border-2 border-primary-container border-t-transparent animate-spin" />
          <span className="font-body-md text-body-md text-text-muted">Đang tải danh sách...</span>
        </div>
      )}

      {!isLoading && error && (
        <div className="py-12 text-center">
          <span className="material-symbols-outlined text-[48px] text-signal-danger">cloud_off</span>
          <p className="mt-2 font-body-md text-body-md text-signal-danger">{error}</p>
        </div>
      )}

      {!isLoading && !error && projects.length === 0 && (
        <div className="py-16 flex flex-col items-center gap-3 text-center">
          <span className="material-symbols-outlined text-[48px] text-text-muted">library_music</span>
          <h3 className="font-headline-sm text-headline-sm font-bold text-text-primary">
            Chưa có tệp nào
          </h3>
          <p className="font-body-md text-body-md text-text-muted max-w-sm">
            Hãy vào AI Voice Studio để tạo giọng đọc đầu tiên, tệp sẽ tự động được lưu tại đây.
          </p>
        </div>
      )}

      {!isLoading && projects.length > 0 && (
        <div className="flex flex-col gap-space-xs">
          {projects.map((project) => {
            const typeInfo = typeLabels[project.type] || typeLabels.TTS;
            return (
              <div
                key={project.id}
                className="p-space-md rounded-xl bg-surface-card hover:bg-surface-container-low transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm"
              >
                {/* Left: Info */}
                <div className="flex items-center gap-3 flex-1 overflow-hidden">
                  <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center text-primary-container shrink-0">
                    <span className="material-symbols-outlined text-[22px]">audio_file</span>
                  </div>
                  <div className="flex flex-col overflow-hidden">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-label-md text-label-md font-bold text-text-primary truncate">
                        {project.name}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded font-code-xs text-[10px] font-bold ${typeInfo.color}`}>
                        {typeInfo.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 font-code-xs text-code-xs text-text-muted flex-wrap">
                      <span>{formatDate(project.createdAt)}</span>
                      <span className="w-1 h-1 rounded-full bg-text-muted" />
                      <span>{formatDuration(project.durationSec)}</span>
                      {project.charCount && (
                        <>
                          <span className="w-1 h-1 rounded-full bg-text-muted" />
                          <span>{project.charCount.toLocaleString('vi-VN')} ký tự</span>
                        </>
                      )}
                      <span className="w-1 h-1 rounded-full bg-text-muted" />
                      <span className="text-signal-warning font-medium">
                        -{project.creditsUsed.toLocaleString('vi-VN')} credits
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    title="Tải xuống"
                    className="p-2 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-text-secondary hover:text-primary-container transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">download</span>
                  </button>
                  <button
                    type="button"
                    title="Xóa tệp"
                    onClick={() => handleDelete(project.id)}
                    className="p-2 rounded-lg bg-surface-container-high hover:bg-signal-danger/20 text-text-secondary hover:text-signal-danger transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
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
