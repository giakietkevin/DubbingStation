'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';

const sidebarLinks = [
  { href: '/dashboard', label: 'AI Voice Studio', icon: 'record_voice_over' },
  { href: '/dashboard/dubbing', label: 'Video Dubbing', icon: 'movie_edit' },
  { href: '/dashboard/stt', label: 'Audio to Text (STT)', icon: 'transcribe' },
  { href: '/dashboard/clone', label: 'Custom Voice Clone', icon: 'fingerprint' },
  { href: '/dashboard/tools', label: '22 Audio Tools', icon: 'construction', badge: 'Free' },
  { href: '/dashboard/voices', label: 'Thư viện giọng', icon: 'volume_up', badge: '3.000+' },
  { href: '/dashboard/projects', label: 'Lịch sử tệp', icon: 'folder' },
  { href: '/dashboard/billing', label: 'Nạp Credits & Gói cước', icon: 'token' },
  { href: '/dashboard/settings', label: 'Cài đặt tài khoản', icon: 'settings' },
];

export function DashboardLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const initialCredits = (session?.user as any)?.credits ?? 50000;
  const [creditsBalance, setCreditsBalance] = useState<number>(initialCredits);
  const userName = session?.user?.name || 'Creator';
  const userEmail = session?.user?.email || '';

  // Đồng bộ credits từ session & CSDL realtime
  React.useEffect(() => {
    if ((session?.user as any)?.credits !== undefined) {
      setCreditsBalance((session?.user as any)?.credits);
    }
  }, [session]);

  React.useEffect(() => {
    const handleCreditsUpdate = (e: any) => {
      if (e.detail?.remainingCredits !== undefined) {
        setCreditsBalance(e.detail.remainingCredits);
      }
    };

    window.addEventListener('creditsUpdated', handleCreditsUpdate);

    // Fetch số dư thực tế từ CSDL SQLite
    fetch('/api/user/credits')
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated && typeof data.credits === 'number') {
          setCreditsBalance(data.credits);
        }
      })
      .catch(() => {});

    return () => window.removeEventListener('creditsUpdated', handleCreditsUpdate);
  }, []);

  return (
    <div className="min-h-screen bg-canvas-base flex text-on-surface">
      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/70 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-surface-card border-r border-border-glass flex flex-col justify-between transition-transform duration-300 lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand */}
        <div className="p-space-md border-b border-border-glass flex items-center justify-between">
          <Link href="/" className="flex items-center gap-space-xs">
            <div className="relative h-8 w-8">
              <Image
                src="https://lh3.googleusercontent.com/aida/AEtjO1V-UY2Vq84aP1TGSemuRsNV1QLsuv0qyihz872V7JRpt1zfIbe9cIcDboSo_rWDyuvk8eaaPBuLPjwDmmAsaaZvwip7xi_08PfNZjMWz5P5yUyrTzfJFlgXqv7qhNxrukI8RmCWfvAHRvGZAsCvXTne6arYNyYhnqHk_h9YjyTPddJTATjRAp7gdgsIk7ua_L9M7OHLBE2KOTx9F295HOnIl8F6D8O5IqMVcDOtVMA8Yy6MFVFWnIprww"
                alt="DubbingStation Logo"
                fill
                sizes="32px"
                className="object-contain"
              />
            </div>
            <span className="font-headline-sm text-headline-sm tracking-tight text-primary font-bold">
              DubbingStation
            </span>
          </Link>
          <button
            type="button"
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden p-1 text-text-muted hover:text-on-surface"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 p-space-xs overflow-y-auto flex flex-col gap-1">
          {sidebarLinks.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileOpen(false)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl font-label-md text-label-md transition-colors ${
                  isActive
                    ? 'bg-surface-container-high text-primary font-bold shadow-[0_2px_8px_rgba(0,242,254,0.15)]'
                    : 'text-text-secondary hover:bg-surface-container hover:text-on-surface'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`material-symbols-outlined text-[20px] ${
                      isActive ? 'text-primary-container' : 'text-text-muted'
                    }`}
                  >
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="px-1.5 py-0.5 rounded font-code-xs text-[10px] bg-primary-container/20 text-primary-container font-semibold">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom User Card & Logout */}
        <div className="p-space-sm border-t border-border-glass flex flex-col gap-2">
          {/* Credit balance box */}
          <div className="p-2.5 rounded-xl bg-surface-container-lowest flex items-center justify-between">
            <div className="flex flex-col">
              <span className="font-label-sm text-[10px] text-text-muted uppercase">Số dư Credits</span>
              <span className="font-code-sm text-code-sm text-primary font-bold">
                {creditsBalance.toLocaleString('vi-VN')}
              </span>
            </div>
            <Link
              href="/dashboard/billing"
              className="px-2 py-1 rounded bg-primary-container text-canvas-base font-label-sm text-[11px] font-bold hover:opacity-90 transition-opacity"
            >
              Nạp thêm
            </Link>
          </div>

          {/* User profile brief */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary-container to-secondary-container flex items-center justify-center font-bold text-canvas-base text-xs shrink-0">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="font-label-md text-label-md text-text-primary truncate">{userName}</span>
                <span className="font-body-sm text-[11px] text-text-muted truncate">{userEmail}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: '/' })}
              title="Đăng xuất"
              className="p-1.5 rounded-lg text-text-muted hover:text-signal-danger hover:bg-surface-container transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="h-16 border-b border-border-glass bg-surface-glass backdrop-blur-xl px-space-md sm:px-space-xl flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsMobileOpen(true)}
              className="lg:hidden p-2 rounded-lg bg-surface-container text-text-secondary hover:text-on-surface"
            >
              <span className="material-symbols-outlined text-[22px]">menu</span>
            </button>
            <h2 className="font-headline-sm text-headline-sm font-bold text-text-primary">
              Studio Workspace
            </h2>
          </div>

          <div className="flex items-center gap-space-sm">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-high">
              <span className="w-2 h-2 rounded-full bg-signal-success animate-pulse" />
              <span className="font-code-xs text-code-xs text-primary font-bold">
                {creditsBalance.toLocaleString('vi-VN')} Credits
              </span>
            </div>
            <Link
              href="/"
              className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-highest text-on-surface font-label-sm text-label-sm font-semibold transition-colors hidden sm:inline-flex"
            >
              Trang chủ
            </Link>
          </div>
        </header>

        {/* Content Page */}
        <main className="flex-1 p-space-md sm:p-space-xl">
          {children}
        </main>
      </div>
    </div>
  );
}
