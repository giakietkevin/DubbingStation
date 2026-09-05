import React from 'react';
import { StudioConsole } from '@/components/home/StudioConsole/StudioConsole';

export default function DashboardPage({
  searchParams,
}: {
  searchParams: { welcome?: string };
}) {
  const isWelcome = searchParams.welcome === 'true';

  return (
    <div className="flex flex-col gap-space-lg max-w-6xl mx-auto">
      {/* Welcome Banner for Onboarding */}
      {isWelcome && (
        <div className="p-space-md sm:p-space-lg rounded-2xl bg-gradient-to-r from-primary-container/20 via-surface-card to-accent-violet-bright/20 border border-primary-container/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-space-md">
          <div className="flex items-center gap-space-md">
            <div className="w-12 h-12 rounded-xl bg-primary-container/20 flex items-center justify-center text-primary-container shrink-0">
              <span className="material-symbols-outlined text-[28px]">card_giftcard</span>
            </div>
            <div className="flex flex-col">
              <h3 className="font-headline-sm text-headline-sm font-bold text-text-primary">
                Chào mừng bạn đến với DubbingStation!
              </h3>
              <p className="font-body-sm text-body-sm text-text-muted">
                Tài khoản của bạn đã được kích hoạt thành công và được cộng{' '}
                <strong className="text-primary font-bold">50.000 Credits Miễn Phí</strong>. Hãy bắt đầu tạo giọng nói AI đầu tiên bên dưới!
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-signal-success/20 text-signal-success font-code-xs text-code-xs font-bold whitespace-nowrap">
            +50.000 Credits Active
          </span>
        </div>
      )}

      {/* Embedded Studio Console for Instant Creation */}
      <div className="flex flex-col gap-2">
        <h2 className="font-headline-md text-headline-md font-bold text-text-primary">
          Phòng Thu Giọng Nói Trực Tuyến
        </h2>
        <p className="font-body-md text-body-md text-text-muted">
          Chuyển văn bản thành giọng nói, lồng tiếng video và quản lý tệp âm thanh đa năng
        </p>
      </div>

      <StudioConsole />
    </div>
  );
}
