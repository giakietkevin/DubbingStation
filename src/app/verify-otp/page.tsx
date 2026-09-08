'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';

function VerifyOtpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialEmail = searchParams.get('email') || '';
  const initialPreview = searchParams.get('previewOtp') || '';
  const isJustRegistered = searchParams.get('registered') === 'true';

  const [email, setEmail] = useState<string>(initialEmail);
  const [otpCode, setOtpCode] = useState<string>(initialPreview);
  const [previewOtp, setPreviewOtp] = useState<string>(initialPreview);
  const [error, setError] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>(
    isJustRegistered
      ? 'Đăng ký thành công! Vui lòng nhập mã OTP 6 số để kích hoạt tài khoản của bạn.'
      : ''
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isResending, setIsResending] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(60);

  // Đếm ngược gửi lại mã OTP
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Xử lý gửi lại mã OTP
  const handleResendOtp = async () => {
    if (!email) {
      setError('Vui lòng nhập địa chỉ email của bạn');
      return;
    }

    setIsResending(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Gửi lại mã OTP thất bại');
      } else {
        setSuccessMsg(data.message || 'Đã gửi mã OTP mới vào CSDL');
        if (data.previewOtp) {
          setPreviewOtp(data.previewOtp);
          setOtpCode(data.previewOtp); // Tự động điền mã để tiện test
        }
        setCountdown(60);
      }
    } catch (err) {
      setError('Lỗi kết nối máy chủ');
    } finally {
      setIsResending(false);
    }
  };

  // Xử lý xác nhận mã OTP
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !otpCode) {
      setError('Vui lòng nhập đầy đủ Email và Mã OTP 6 số');
      return;
    }

    if (otpCode.trim().length !== 6) {
      setError('Mã OTP phải gồm chính xác 6 chữ số');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: otpCode }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Xác thực OTP thất bại');
        setIsLoading(false);
        return;
      }

      setSuccessMsg('Kích hoạt tài khoản thành công! Đang chuyển hướng đến trang Đăng nhập...');

      setTimeout(() => {
        router.push(`/login?activated=true&email=${encodeURIComponent(email)}`);
      }, 1500);
    } catch (err) {
      setError('Lỗi kết nối máy chủ khi xác thực OTP');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-canvas-base relative overflow-hidden">
      {/* Background ambient glow */}
      <div
        aria-hidden="true"
        className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-b from-primary-container/20 to-transparent blur-[120px] pointer-events-none"
      />

      <div className="w-full max-w-md relative z-10 bg-surface-card/90 backdrop-blur-2xl rounded-2xl border border-border-glass shadow-[0_24px_80px_-15px_rgba(0,0,0,0.9)] p-space-lg sm:p-space-xl">
        {/* Header Branding */}
        <div className="flex flex-col items-center text-center mb-6">
          <Link href="/" className="flex items-center gap-2 mb-2">
            <div className="relative h-9 w-9">
              <Image
                src="https://lh3.googleusercontent.com/aida/AEtjO1V-UY2Vq84aP1TGSemuRsNV1QLsuv0qyihz872V7JRpt1zfIbe9cIcDboSo_rWDyuvk8eaaPBuLPjwDmmAsaaZvwip7xi_08PfNZjMWz5P5yUyrTzfJFlgXqv7qhNxrukI8RmCWfvAHRvGZAsCvXTne6arYNyYhnqHk_h9YjyTPddJTATjRAp7gdgsIk7ua_L9M7OHLBE2KOTx9F295HOnIl8F6D8O5IqMVcDOtVMA8Yy6MFVFWnIprww"
                alt="DubbingStation Logo"
                width={36}
                height={36}
                className="object-contain"
              />
            </div>
            <span className="font-headline-sm tracking-tight text-primary font-bold">
              DubbingStation
            </span>
          </Link>

          <div className="w-12 h-12 rounded-full bg-primary-container/15 text-primary-container flex items-center justify-center mt-2 mb-1">
            <span className="material-symbols-outlined text-[28px]">mark_email_read</span>
          </div>

          <h1 className="font-headline-sm text-headline-sm font-bold text-on-surface">
            Xác Thực Kích Hoạt Tài Khoản
          </h1>
          <p className="font-body-sm text-text-muted mt-1">
            Nhập mã OTP 6 số đã được gửi tới email của bạn để kích hoạt số dư{' '}
            <strong className="text-primary-container font-mono">+50.000 Credits</strong>.
          </p>
        </div>

        {/* Demo/Dev Helper Banner if previewOtp is available */}
        {previewOtp && (
          <div className="mb-4 p-3 rounded-xl bg-accent-violet-bright/15 border border-accent-violet-bright/30 text-accent-violet-bright text-xs flex items-center justify-between gap-2">
            <div>
              <span className="font-bold">Mã OTP thử nghiệm (CSDL):</span>{' '}
              <strong className="font-mono text-sm tracking-widest text-on-surface bg-surface-container px-2 py-0.5 rounded">
                {previewOtp}
              </strong>
            </div>
            <button
              type="button"
              onClick={() => setOtpCode(previewOtp)}
              className="text-[11px] underline font-semibold text-primary-container hover:text-on-surface"
            >
              Tự điền mã
            </button>
          </div>
        )}

        {/* Success Alert */}
        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-signal-success/15 border border-signal-success/30 text-signal-success text-body-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            <span>{successMsg}</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-signal-danger/15 border border-signal-danger/30 text-signal-danger text-body-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span>{error}</span>
          </div>
        )}

        {/* Verification Form */}
        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="block font-label-sm text-[12px] text-text-secondary uppercase font-bold mb-1.5">
              Địa chỉ Email tài khoản:
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="VD: name@domain.com"
              required
              className="w-full px-4 py-2.5 rounded-xl bg-surface-container border border-border-glass text-on-surface text-body-sm focus:outline-none focus:border-primary-container transition-colors"
            />
          </div>

          <div>
            <label className="block font-label-sm text-[12px] text-text-secondary uppercase font-bold mb-1.5">
              Mã OTP 6 chữ số:
            </label>
            <input
              type="text"
              maxLength={6}
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
              placeholder="• • • • • •"
              required
              className="w-full px-4 py-3 rounded-xl bg-surface-container border border-border-glass text-center font-mono text-2xl font-bold tracking-[0.5em] text-primary-container focus:outline-none focus:border-primary-container transition-colors shadow-inner"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || otpCode.length !== 6}
            className={`w-full py-3 rounded-xl font-label-md font-bold text-surface-card transition-all flex items-center justify-center gap-2 ${
              isLoading || otpCode.length !== 6
                ? 'bg-surface-container-highest text-text-muted cursor-not-allowed opacity-60'
                : 'bg-gradient-to-r from-primary-container via-primary-fixed to-accent-violet-bright shadow-glow-cyan hover:scale-[1.02] active:scale-[0.98]'
            }`}
          >
            {isLoading ? (
              <>
                <span className="material-symbols-outlined animate-spin text-[20px]">
                  progress_activity
                </span>
                <span>Đang kiểm tra CSDL...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[20px]">verified</span>
                <span>Kích Hoạt Tài Khoản Ngay</span>
              </>
            )}
          </button>
        </form>

        {/* Resend and Navigation Footer */}
        <div className="mt-6 pt-4 border-t border-border-glass flex flex-col items-center gap-3 text-center text-body-sm">
          <div className="flex items-center gap-1.5 text-text-muted">
            <span>Chưa nhận được mã?</span>
            {countdown > 0 ? (
              <span className="font-mono text-primary-container font-semibold">
                Gửi lại sau {countdown}s
              </span>
            ) : (
              <button
                type="button"
                disabled={isResending}
                onClick={handleResendOtp}
                className="font-bold text-primary-container hover:underline disabled:opacity-50"
              >
                {isResending ? 'Đang gửi...' : 'Gửi lại mã OTP'}
              </button>
            )}
          </div>

          <div className="flex items-center gap-4 text-xs text-text-secondary pt-1">
            <Link href="/login" className="hover:text-primary-container transition-colors">
              ← Quay lại Đăng nhập
            </Link>
            <span>•</span>
            <Link href="/" className="hover:text-primary-container transition-colors">
              Trang chủ
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-canvas-base flex items-center justify-center text-text-muted">
          <span className="w-8 h-8 rounded-full border-2 border-primary-container border-t-transparent animate-spin mr-2" />
          <span>Đang tải...</span>
        </div>
      }
    >
      <VerifyOtpContent />
    </Suspense>
  );
}
