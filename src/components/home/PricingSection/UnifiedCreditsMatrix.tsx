import React from 'react';

export const UnifiedCreditsMatrix: React.FC = () => {
  return (
    <div className="mt-space-xl p-space-lg rounded-xl bg-surface-container-low shadow-sm">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-space-md pb-space-md">
        <div className="flex items-center gap-space-xs">
          <span className="material-symbols-outlined text-primary-container text-[24px]">
            calculate
          </span>
          <div className="flex flex-col">
            <h3 className="font-headline-sm text-headline-sm font-bold text-text-primary">
              Công Thức Quy Đổi Unified Credits Minh Bạch
            </h3>
            <p className="font-body-sm text-body-sm text-text-muted">
              1 gói cước dùng chung cho cả TTS, Lồng tiếng Audio và Video Dubbing
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 font-code-xs text-code-xs text-primary">
          <span className="w-2 h-2 rounded-full bg-signal-success" />
          <span>Tự động tối ưu hóa tài nguyên theo thời gian thực</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md pt-space-md">
        <div className="p-space-sm rounded-lg bg-surface-container-lowest">
          <div className="flex items-center gap-2 text-primary font-label-md text-label-md font-bold">
            <span className="material-symbols-outlined text-[18px]">record_voice_over</span>
            <span>Text to Speech (TTS)</span>
          </div>
          <p className="mt-1 font-code-xs text-code-xs text-text-secondary">
            <strong>1 Ký tự = 1 Credit</strong>
          </p>
          <p className="font-body-sm text-[12px] text-text-muted mt-1">
            99.000 credits ≈ 99.000 ký tự (~16.500 từ, ~25 trang sách hoặc ~2 giờ phát liên tục).
          </p>
        </div>

        <div className="p-space-sm rounded-lg bg-surface-container-lowest">
          <div className="flex items-center gap-2 text-secondary font-label-md text-label-md font-bold">
            <span className="material-symbols-outlined text-[18px]">graphic_eq</span>
            <span>Audio Dubbing</span>
          </div>
          <p className="mt-1 font-code-xs text-code-xs text-text-secondary">
            <strong>50 Credits / 1 giây (~3.000/phút)</strong>
          </p>
          <p className="font-body-sm text-[12px] text-text-muted mt-1">
            99.000 credits ≈ 33 phút lồng tiếng đa nhân vật bằng AI bản địa cảm xúc.
          </p>
        </div>

        <div className="p-space-sm rounded-lg bg-surface-container-lowest">
          <div className="flex items-center gap-2 text-accent-violet-bright font-label-md text-label-md font-bold">
            <span className="material-symbols-outlined text-[18px]">video_camera_front</span>
            <span>Video Dubbing &amp; Sub</span>
          </div>
          <p className="mt-1 font-code-xs text-code-xs text-text-secondary">
            <strong>100 Credits / 1 giây (~6.000/phút)</strong>
          </p>
          <p className="font-body-sm text-[12px] text-text-muted mt-1">
            99.000 credits ≈ 16.5 phút khớp frame video tự động, lồng tiếng phụ đề và xuất MP4.
          </p>
        </div>
      </div>
    </div>
  );
};
