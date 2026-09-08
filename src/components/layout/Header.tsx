'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';

export const Header: React.FC = () => {
  const { data: session, status } = useSession();
  const [lang, setLang] = useState<'VI' | 'EN'>('VI');
  const [isStudioOpen, setIsStudioOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isAuthenticated = status === 'authenticated' && !!session?.user;
  const userName = session?.user?.name || 'Thành viên';
  const userEmail = session?.user?.email || '';
  const credits = (session?.user as any)?.credits ?? 50000;
  const isAdmin = (session?.user as any)?.role === 'ADMIN';

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-surface-glass backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.5)] border-b border-border-glass">
      <div className="h-16 max-w-[1440px] mx-auto px-gutter-desktop flex items-center justify-between gap-space-md">
        {/* Brand Logo */}
        <div className="flex items-center gap-space-xl">
          <Link
            href="/"
            className="flex items-center gap-space-xs transition-opacity hover:opacity-90 shrink-0"
          >
            <div className="relative h-8 w-8">
              <Image
                src="https://lh3.googleusercontent.com/aida/AEtjO1V-UY2Vq84aP1TGSemuRsNV1QLsuv0qyihz872V7JRpt1zfIbe9cIcDboSo_rWDyuvk8eaaPBuLPjwDmmAsaaZvwip7xi_08PfNZjMWz5P5yUyrTzfJFlgXqv7qhNxrukI8RmCWfvAHRvGZAsCvXTne6arYNyYhnqHk_h9YjyTPddJTATjRAp7gdgsIk7ua_L9M7OHLBE2KOTx9F295HOnIl8F6D8O5IqMVcDOtVMA8Yy6MFVFWnIprww"
                alt="DubbingStation Logo"
                fill
                sizes="32px"
                className="object-contain"
                priority
              />
            </div>
            <span className="font-headline-sm text-headline-sm tracking-tight text-primary font-bold">
              DubbingStation
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden xl:flex items-center gap-space-xs">
            {/* Dropdown: AI Voice Studio */}
            <div
              className="relative group"
              onMouseEnter={() => setIsStudioOpen(true)}
              onMouseLeave={() => setIsStudioOpen(false)}
            >
              <button
                type="button"
                className="flex items-center gap-1 px-space-sm py-space-xs rounded-lg font-label-md text-label-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
              >
                <span>AI Voice Studio</span>
                <span
                  className={`material-symbols-outlined text-[16px] text-text-muted transition-transform duration-200 ${
                    isStudioOpen ? 'rotate-180' : ''
                  }`}
                >
                  expand_more
                </span>
              </button>

              <div
                className={`absolute left-0 top-full mt-1 w-64 p-space-xs bg-surface-card/95 backdrop-blur-2xl rounded-xl shadow-[0_12px_32px_-4px_rgba(0,0,0,0.8)] border border-border-glass transition-all transform origin-top-left flex flex-col gap-1 ${
                  isStudioOpen
                    ? 'opacity-100 pointer-events-auto scale-100'
                    : 'opacity-0 pointer-events-none scale-95'
                }`}
              >
                <Link
                  href="/dashboard"
                  className="px-space-sm py-space-xs transition-colors bg-surface-container-high text-primary font-bold rounded-lg flex items-center justify-between"
                >
                  <span>Text to Speech</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary-container/20 text-primary-container font-mono">TTS</span>
                </Link>
                <Link
                  href="/dashboard/dubbing"
                  className="px-space-sm py-space-xs rounded-lg font-body-md text-body-md text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors flex items-center justify-between"
                >
                  <span>Subtitle Video Dubbing</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary-container/20 text-secondary font-mono">Auto-Sync</span>
                </Link>
                <Link
                  href="/dashboard/stt"
                  className="px-space-sm py-space-xs rounded-lg font-body-md text-body-md text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors flex items-center justify-between"
                >
                  <span>Speech to Text</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-signal-success/20 text-signal-success font-mono">Whisper</span>
                </Link>
                <Link
                  href="/dashboard/clone"
                  className="px-space-sm py-space-xs rounded-lg font-body-md text-body-md text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors flex items-center justify-between"
                >
                  <span>Voice Cloning</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-violet-bright/20 text-accent-violet-bright font-mono">10s AI</span>
                </Link>
              </div>
            </div>

            <Link
              href="/dashboard/tools"
              className="flex items-center gap-space-2xs px-space-sm py-space-xs rounded-lg font-label-md text-label-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
            >
              <span>22 Free Audio Tools</span>
              <span className="px-1.5 py-0.5 rounded font-label-sm text-[9px] uppercase tracking-wider bg-surface-container-high text-primary-container font-bold">
                100% Free
              </span>
            </Link>

            <Link
              href="/dashboard/voices"
              className="flex items-center gap-space-2xs px-space-sm py-space-xs rounded-lg font-label-md text-label-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
            >
              <span>Voices Library</span>
              <span className="px-1.5 py-0.5 rounded font-code-xs text-code-xs text-secondary bg-secondary-container/40 font-bold">
                3,000+
              </span>
            </Link>

            <Link
              href="/dashboard/billing"
              className="px-space-sm py-space-xs rounded-lg font-label-md text-label-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
            >
              Pricing & Credits
            </Link>

            <Link
              href="/docs"
              className="px-space-sm py-space-xs rounded-lg font-label-md text-label-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
            >
              API & Docs
            </Link>
          </nav>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Dashboard Link */}
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-label-md text-label-md text-on-surface bg-surface-container hover:bg-surface-container-high border border-border-glass transition-all hover:scale-105"
          >
            <span className="material-symbols-outlined text-[18px] text-primary-container">
              space_dashboard
            </span>
            <span className="font-bold hidden sm:inline">Dashboard</span>
          </Link>

          {/* If NOT Authenticated: Show LOGIN & REGISTER BUTTONS */}
          {!isAuthenticated ? (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="px-3.5 py-1.5 rounded-xl font-label-md text-label-md font-bold text-text-primary hover:text-primary-container hover:bg-surface-container transition-all flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[18px]">login</span>
                <span>Đăng Nhập</span>
              </Link>

              <Link
                href="/register"
                className="px-4 py-1.5 rounded-xl font-label-md text-label-md font-bold text-surface-card bg-gradient-to-r from-primary-container via-primary-fixed to-accent-violet-bright shadow-glow-cyan hover:shadow-[0_0_32px_rgba(0,242,254,0.5)] hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[18px]">person_add</span>
                <span>Đăng Ký</span>
                <span className="hidden md:inline-block px-1.5 py-0.2 rounded bg-surface-card/25 text-surface-card text-[10px] font-mono">
                  +50k Credits
                </span>
              </Link>
            </div>
          ) : (
            /* If Authenticated: Show Credit Balance & User Dropdown */
            <div className="flex items-center gap-2">
              {/* Credit balance badge */}
              <Link
                href="/dashboard/billing"
                className="hidden sm:flex items-center gap-space-xs px-space-sm py-1 rounded-full bg-surface-container-high text-on-surface hover:bg-surface-container-highest transition-colors border border-border-glass"
              >
                <span className="w-2 h-2 rounded-full bg-signal-success animate-pulse" />
                <span className="font-code-sm text-code-sm font-bold text-primary">
                  {credits.toLocaleString('vi-VN')}
                </span>
                <span className="font-label-sm text-[11px] uppercase tracking-wide text-text-muted">
                  Credits
                </span>
              </Link>

              {/* User Dropdown Menu */}
              <div
                className="relative"
                onMouseEnter={() => setIsUserMenuOpen(true)}
                onMouseLeave={() => setIsUserMenuOpen(false)}
              >
                <button
                  type="button"
                  onClick={() => setIsUserMenuOpen((prev) => !prev)}
                  className="flex items-center gap-2 p-1 rounded-full hover:bg-surface-container transition-all"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary-container to-secondary-container flex items-center justify-center font-bold text-surface-card text-xs ring-2 ring-primary-container/40">
                    {userName.charAt(0).toUpperCase()}
                  </div>
                  <span className="material-symbols-outlined text-[16px] text-text-muted hidden sm:inline-block">
                    expand_more
                  </span>
                </button>

                {/* Dropdown Card */}
                <div
                  className={`absolute right-0 top-full mt-1 w-56 p-2 bg-surface-card/95 backdrop-blur-2xl rounded-xl shadow-[0_12px_32px_-4px_rgba(0,0,0,0.85)] border border-border-glass transition-all transform origin-top-right flex flex-col gap-1 z-50 ${
                    isUserMenuOpen
                      ? 'opacity-100 pointer-events-auto scale-100'
                      : 'opacity-0 pointer-events-none scale-95'
                  }`}
                >
                  <div className="px-3 py-2 border-b border-border-glass">
                    <p className="font-label-md text-label-md font-bold text-on-surface truncate">
                      {userName}
                    </p>
                    <p className="text-[11px] text-text-muted truncate">{userEmail}</p>
                    <div className="mt-1 flex items-center justify-between text-[11px]">
                      <span className="text-text-muted">Credits:</span>
                      <strong className="text-primary-container font-mono">{credits.toLocaleString('vi-VN')}</strong>
                    </div>
                  </div>

                  {isAdmin && (
                    <Link
                      href="/admin"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="px-3 py-2 rounded-lg text-body-sm font-bold text-signal-danger hover:bg-signal-danger/10 transition-colors flex items-center gap-2 border border-signal-danger/25 bg-signal-danger/5"
                    >
                      <span className="material-symbols-outlined text-[18px]">admin_panel_settings</span>
                      <span>Quản Trị Admin CSDL</span>
                    </Link>
                  )}

                  <Link
                    href="/dashboard"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="px-3 py-2 rounded-lg text-body-sm text-text-secondary hover:text-on-surface hover:bg-surface-container transition-colors flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px] text-primary-container">space_dashboard</span>
                    <span>Vào Dashboard</span>
                  </Link>

                  <Link
                    href="/dashboard/billing"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="px-3 py-2 rounded-lg text-body-sm text-text-secondary hover:text-on-surface hover:bg-surface-container transition-colors flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px] text-secondary">token</span>
                    <span>Nạp Credits / Gói cước</span>
                  </Link>

                  <Link
                    href="/dashboard/settings"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="px-3 py-2 rounded-lg text-body-sm text-text-secondary hover:text-on-surface hover:bg-surface-container transition-colors flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px] text-text-muted">settings</span>
                    <span>Cài đặt tài khoản</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => signOut({ callbackUrl: '/' })}
                    className="w-full px-3 py-2 rounded-lg text-body-sm text-signal-danger hover:bg-signal-danger/10 transition-colors flex items-center gap-2 border-t border-border-glass mt-1 text-left"
                  >
                    <span className="material-symbols-outlined text-[18px]">logout</span>
                    <span>Đăng Xuất</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Language Switcher */}
          <div className="hidden lg:flex items-center p-0.5 rounded-lg bg-surface-container">
            <button
              type="button"
              onClick={() => setLang('VI')}
              className={`px-2 py-1 rounded font-code-xs text-code-xs font-bold transition-all ${
                lang === 'VI'
                  ? 'text-on-surface bg-surface-container-highest'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              VI
            </button>
            <button
              type="button"
              onClick={() => setLang('EN')}
              className={`px-2 py-1 rounded font-code-xs text-code-xs font-bold transition-all ${
                lang === 'EN'
                  ? 'text-on-surface bg-surface-container-highest'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              EN
            </button>
          </div>

          {/* Mobile Hamburger Menu Toggle */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            className="xl:hidden p-2 rounded-xl bg-surface-container text-text-secondary hover:text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined text-[22px]">
              {isMobileMenuOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation Menu */}
      {isMobileMenuOpen && (
        <div className="xl:hidden bg-surface-card/98 border-b border-border-glass px-4 py-4 space-y-3 backdrop-blur-2xl animate-fadeIn">
          {/* Mobile Auth Actions if not logged in */}
          {!isAuthenticated ? (
            <div className="grid grid-cols-2 gap-2 pb-3 border-b border-border-glass">
              <Link
                href="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="py-2.5 rounded-xl text-center font-bold text-[13px] bg-surface-container hover:bg-surface-container-high text-on-surface transition-colors"
              >
                Đăng Nhập
              </Link>
              <Link
                href="/register"
                onClick={() => setIsMobileMenuOpen(false)}
                className="py-2.5 rounded-xl text-center font-bold text-[13px] bg-gradient-to-r from-primary-container to-accent-violet-bright text-surface-card shadow-glow-cyan transition-all"
              >
                Đăng Ký (+50K)
              </Link>
            </div>
          ) : (
            <div className="flex items-center justify-between pb-3 border-b border-border-glass">
              <div>
                <p className="font-bold text-on-surface text-[13px]">{userName}</p>
                <p className="text-[11px] text-text-muted">{userEmail}</p>
              </div>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: '/' })}
                className="text-[12px] text-signal-danger font-bold px-2 py-1 rounded bg-signal-danger/10"
              >
                Đăng xuất
              </button>
            </div>
          )}

          {/* Navigation Links */}
          <div className="flex flex-col space-y-1">
            {isAdmin && (
              <Link
                href="/admin"
                onClick={() => setIsMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg text-[13px] font-bold text-signal-danger bg-signal-danger/10 border border-signal-danger/30 flex items-center justify-between"
              >
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px]">admin_panel_settings</span>
                  <span>Quản Trị Admin CSDL</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-signal-danger/20 font-mono">ADMIN</span>
              </Link>
            )}
            <Link
              href="/dashboard"
              onClick={() => setIsMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg text-[13px] font-bold text-primary-container hover:bg-surface-container transition-colors flex items-center justify-between"
            >
              <span>Phòng thu Text to Speech</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary-container/20 text-primary-container font-mono">TTS</span>
            </Link>
            <Link
              href="/dashboard/dubbing"
              onClick={() => setIsMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg text-[13px] text-text-secondary hover:text-on-surface hover:bg-surface-container transition-colors flex items-center justify-between"
            >
              <span>Subtitle Video Dubbing</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary-container/20 text-secondary font-mono">Auto-Sync</span>
            </Link>
            <Link
              href="/dashboard/stt"
              onClick={() => setIsMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg text-[13px] text-text-secondary hover:text-on-surface hover:bg-surface-container transition-colors flex items-center justify-between"
            >
              <span>Speech to Text (Whisper)</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-signal-success/20 text-signal-success font-mono">99%</span>
            </Link>
            <Link
              href="/dashboard/clone"
              onClick={() => setIsMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg text-[13px] text-text-secondary hover:text-on-surface hover:bg-surface-container transition-colors flex items-center justify-between"
            >
              <span>Voice Cloning AI</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-violet-bright/20 text-accent-violet-bright font-mono">DSP</span>
            </Link>
            <Link
              href="/dashboard/tools"
              onClick={() => setIsMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg text-[13px] text-text-secondary hover:text-on-surface hover:bg-surface-container transition-colors flex items-center justify-between"
            >
              <span>22 Free Audio Tools</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-signal-success/20 text-signal-success font-bold">100% Free</span>
            </Link>
            <Link
              href="/dashboard/voices"
              onClick={() => setIsMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg text-[13px] text-text-secondary hover:text-on-surface hover:bg-surface-container transition-colors flex items-center justify-between"
            >
              <span>Voices Library (3.000+ giọng)</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary-container/20 text-secondary font-mono">3,000+</span>
            </Link>
            <Link
              href="/dashboard/billing"
              onClick={() => setIsMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg text-[13px] text-text-secondary hover:text-on-surface hover:bg-surface-container transition-colors flex items-center justify-between"
            >
              <span>Pricing & Credits</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-signal-warning/20 text-signal-warning font-bold">Offer 50%</span>
            </Link>
            <Link
              href="/docs"
              onClick={() => setIsMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg text-[13px] text-text-secondary hover:text-on-surface hover:bg-surface-container transition-colors flex items-center justify-between"
            >
              <span>API & Docs</span>
              <span className="text-[10px] text-text-muted">REST API</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};
