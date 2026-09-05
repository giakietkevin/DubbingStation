'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

export const Header: React.FC = () => {
  const [lang, setLang] = useState<'VI' | 'EN'>('VI');
  const [isStudioOpen, setIsStudioOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-surface-glass backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.5)]">
      <div className="h-16 max-w-[1440px] mx-auto px-gutter-desktop flex items-center justify-between gap-space-md">
        {/* Brand Logo */}
        <div className="flex items-center gap-space-xl">
          <Link
            href="/"
            className="flex items-center gap-space-xs transition-opacity hover:opacity-90"
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
                className={`absolute left-0 top-full mt-1 w-64 p-space-xs bg-surface-card/95 backdrop-blur-2xl rounded-xl shadow-[0_12px_32px_-4px_rgba(0,0,0,0.8)] transition-all transform origin-top-left flex flex-col gap-1 ${
                  isStudioOpen
                    ? 'opacity-100 pointer-events-auto scale-100'
                    : 'opacity-0 pointer-events-none scale-95'
                }`}
              >
                <Link
                  href="#demo-player"
                  className="px-space-sm py-space-xs transition-colors bg-surface-container-high text-primary font-bold rounded-lg"
                >
                  Text to Speech
                </Link>
                <Link
                  href="#demo-player"
                  className="px-space-sm py-space-xs rounded-lg font-body-md text-body-md text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
                >
                  Subtitle Video Dubbing
                </Link>
                <Link
                  href="#demo-player"
                  className="px-space-sm py-space-xs rounded-lg font-body-md text-body-md text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
                >
                  Speech to Text
                </Link>
                <Link
                  href="#demo-player"
                  className="px-space-sm py-space-xs rounded-lg font-body-md text-body-md text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
                >
                  Voice Cloning
                </Link>
              </div>
            </div>

            <Link
              href="#audio-tools"
              className="flex items-center gap-space-2xs px-space-sm py-space-xs rounded-lg font-label-md text-label-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
            >
              <span>22 Free Audio Tools</span>
              <span className="px-1.5 py-0.5 rounded font-label-sm text-[9px] uppercase tracking-wider bg-surface-container-high text-primary-container">
                100% Free
              </span>
            </Link>

            <Link
              href="#demo-player"
              className="flex items-center gap-space-2xs px-space-sm py-space-xs rounded-lg font-label-md text-label-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
            >
              <span>Voices Library</span>
              <span className="px-1.5 py-0.5 rounded font-code-xs text-code-xs text-secondary bg-secondary-container/40">
                3,000+
              </span>
            </Link>

            <Link
              href="#pricing-section"
              className="px-space-sm py-space-xs rounded-lg font-label-md text-label-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
            >
              Pricing & Credits
            </Link>

            <Link
              href="#api-docs"
              className="px-space-sm py-space-xs rounded-lg font-label-md text-label-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
            >
              API & Docs
            </Link>
          </nav>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-space-sm">
          {/* Credit balance badge */}
          <div className="hidden sm:flex items-center gap-space-xs px-space-sm py-1 rounded-full bg-surface-container-high text-on-surface">
            <span className="w-2 h-2 rounded-full bg-primary-container animate-pulse" />
            <span className="font-code-sm text-code-sm font-medium text-primary">
              50,000
            </span>
            <span className="font-label-sm text-label-sm uppercase tracking-wide text-text-muted">
              Credits Free
            </span>
          </div>

          {/* Language Switcher */}
          <div className="flex items-center p-0.5 rounded-lg bg-surface-container">
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

          {/* Pro CTA */}
          <Link
            href="#pricing-section"
            className="hidden md:inline-flex items-center justify-center px-space-md py-space-xs rounded-lg font-label-md text-label-md text-canvas-base font-bold bg-gradient-to-r from-primary-container to-accent-violet-bright shadow-[0_0_24px_rgba(0,242,254,0.35)] hover:shadow-[0_0_32px_rgba(0,242,254,0.5)] hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            Nâng cấp Pro
          </Link>

          {/* User Profile Avatar */}
          <div className="flex items-center gap-space-xs pl-space-xs">
            <div className="relative w-8 h-8 rounded-full overflow-hidden ring-2 ring-primary-container/40">
              <Image
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuB7l3IJYQWPZd4mRl9C5Xm8eXoqUOx6vZYeD9WkHsOcj7hDs62fhhLabPagjDMU9coVPUdYQTPmO4H21Bt5wzyv4UZAXOUvw9QiGZOJz7y1oEKqzNqdt3fDMAR52m6D4qwzYoNDtzEzj8TO_UViG8dygHuaKDM-vBJ3iWt0nY3YNfxOL40v0zQAWXKuEka4DTWBNmm_cDNrm9cz1rHw0dj8JZXG0bVoGOJSr99besWP9Firi1mbTTsM"
                alt="User Profile"
                fill
                sizes="32px"
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
