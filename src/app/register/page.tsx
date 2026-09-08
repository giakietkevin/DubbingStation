'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Đăng ký thất bại');
        setIsLoading(false);
        return;
      }

      // Khi đăng ký thành công, chuyển hướng ngay sang trang nhập mã OTP để kích hoạt
      const previewParam = data.previewOtp ? `&previewOtp=${encodeURIComponent(data.previewOtp)}` : '';
      router.push(`/verify-otp?email=${encodeURIComponent(email)}&registered=true${previewParam}`);
    } catch (err: any) {
      setError('Đã xảy ra lỗi không xác định');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-canvas-base relative overflow-hidden">
      {/* Glow effect */}
      <div
        aria-hidden="true"
        className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-b from-primary-container/20 to-transparent blur-[120px] pointer-events-none"
      />

      <div className="w-full max-w-md relative z-10 bg-surface-card/90 backdrop-blur-2xl rounded-2xl border border-border-glass shadow-[0_24px_80px_-15px_rgba(0,0,0,0.9)] p-space-lg sm:p-space-xl">
        {/* Logo */}
        <div className="flex flex-col items-center text-center mb-space-lg">
          <Link href="/" className="flex items-center gap-space-xs mb-2">
            <div className="relative h-9 w-9">
              <Image
                src="https://lh3.googleusercontent.com/aida/AEtjO1V-UY2Vq84aP1TGSemuRsNV1QLsuv0qyihz872V7JRpt1zfIbe9cIcDboSo_rWDyuvk8eaaPBuLPjwDmmAsaaZvwip7xi_08PfNZjMWz5P5yUyrTzfJFlgXqv7qhNxrukI8RmCWfvAHRvGZAsCvXTne6arYNyYhnqHk_h9YjyTPddJTATjRAp7gdgsIk7ua_L9M7OHLBE2KOTx9F295HOnIl8F6D8O5IqMVcDOtVMA8Yy6MFVFWnIprww"
                alt="DubbingStation Logo"
                fill
                sizes="36px"
                className="object-contain"
              />
            </div>
            <span className="font-headline-sm text-headline-sm tracking-tight text-primary font-bold">
              DubbingStation
            </span>
          </Link>
          <h1 className="font-headline-sm text-headline-sm font-bold text-text-primary">
            Tạo tài khoản mới
          </h1>
          <p className="font-body-sm text-body-sm text-text-muted mt-1">
            Nhận ngay <strong className="text-primary-container font-mono font-bold">+50.000 Credits</strong> trải nghiệm miễn phí sau khi kích hoạt OTP!
          </p>
        </div>

        {error && (
          <div className="mb-space-md p-3 rounded-lg bg-signal-danger/15 border border-signal-danger/30 text-signal-danger font-body-sm text-body-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-space-md">
          <div>
            <label className="block font-label-md text-label-md text-text-secondary mb-1">
              Họ và tên
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Nguyễn Văn A"
              className="w-full px-space-md py-2.5 rounded-xl bg-surface-container-lowest border border-border-glass text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary-container font-body-sm text-body-sm transition-colors"
            />
          </div>

          <div>
            <label className="block font-label-md text-label-md text-text-secondary mb-1">
              Địa chỉ Email <span className="text-signal-danger">*</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="VD: creator@gmail.com"
              className="w-full px-space-md py-2.5 rounded-xl bg-surface-container-lowest border border-border-glass text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary-container font-body-sm text-body-sm transition-colors"
            />
          </div>

          <div>
            <label className="block font-label-md text-label-md text-text-secondary mb-1">
              Mật khẩu <span className="text-signal-danger">*</span>
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Tối thiểu 6 ký tự"
              className="w-full px-space-md py-2.5 rounded-xl bg-surface-container-lowest border border-border-glass text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary-container font-body-sm text-body-sm transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-primary-container via-primary-fixed to-accent-violet-bright font-label-md text-label-md font-bold text-surface-card hover:opacity-90 active:scale-[0.99] transition-all shadow-glow-cyan flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 rounded-full border-2 border-surface-card border-t-transparent animate-spin" />
                <span>Đang đăng ký & sinh mã OTP...</span>
              </>
            ) : (
              <>
                <span>Đăng ký & Nhận mã OTP</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-space-lg pt-space-md border-t border-border-glass text-center font-body-sm text-body-sm text-text-muted">
          Đã có tài khoản?{' '}
          <Link href="/login" className="text-primary hover:underline font-semibold">
            Đăng nhập ngay
          </Link>
        </div>
      </div>
    </div>
  );
}
