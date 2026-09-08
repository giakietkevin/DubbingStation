'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const activatedParam = searchParams.get('activated') === 'true';
  const emailParam = searchParams.get('email') || '';

  const [email, setEmail] = useState<string>(emailParam);
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [pendingOtpEmail, setPendingOtpEmail] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>(
    activatedParam
      ? 'Kích hoạt tài khoản OTP thành công! Mời bạn đăng nhập để vào phòng thu.'
      : ''
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [emailParam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setPendingOtpEmail('');

    const cleanInput = email.trim();

    try {
      const res = await signIn('credentials', {
        redirect: false,
        email: cleanInput,
        password,
      });

      if (res?.error) {
        // Kiểm tra xem có phải lỗi chưa kích hoạt OTP không
        if (res.error.includes('CHUA_KICH_HOAT_OTP')) {
          const parts = res.error.split(':');
          const targetEmail = parts[1] || cleanInput;
          setPendingOtpEmail(targetEmail);
          setError('Tài khoản của bạn chưa được kích hoạt mã OTP. Hệ thống đã gửi mã OTP mới vào CSDL.');
        } else {
          setError(res.error);
        }
        setIsLoading(false);
      } else {
        // Nếu đăng nhập bằng nick admin -> Chuyển hướng thẳng tới trang /admin
        const isLoggingAsAdmin =
          cleanInput.toLowerCase() === 'admin' ||
          cleanInput.toLowerCase() === 'admin@dubbingstation.com';

        if (isLoggingAsAdmin) {
          router.push('/admin');
        } else {
          router.push('/dashboard');
        }
        router.refresh();
      }
    } catch (err: any) {
      setError('Đã xảy ra lỗi không xác định trong quá trình đăng nhập');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-canvas-base relative overflow-hidden">
      {/* Glow effects */}
      <div
        aria-hidden="true"
        className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-b from-primary-container/20 to-transparent blur-[120px] pointer-events-none"
      />

      <div className="w-full max-w-md relative z-10 bg-surface-card/90 backdrop-blur-2xl rounded-2xl border border-border-glass shadow-[0_24px_80px_-15px_rgba(0,0,0,0.9)] p-space-lg sm:p-space-xl">
        {/* Logo Branding */}
        <div className="flex flex-col items-center text-center mb-space-lg">
          <Link href="/" className="flex items-center gap-space-xs mb-2">
            <div className="relative h-9 w-9">
              <Image
                src="https://lh3.googleusercontent.com/aida/AEtjO1V-UY2Vq84aP1TGSemuRsNV1QLsuv0qyihz872V7JRpt1zfIbe9cIcDboSo_rWDyuvk8eaaPBuLPjwDmmAsaaZvwip7xi_08PfNZjMWz5P5yUyrTzfJFlgXqv7qhNxrukI8RmCWfvAHRvGZAsCvXTne6arYNyYhnqHk_h9YjyTPddJTATjRAp7gdgsIk7ua_L9M7OHLBE2KOTx9F295HOnIl8F6D8O5IqMVcDOtVMA8Yy6MFVFWnIprww"
                alt="DubbingStation Logo"
                width={36}
                height={36}
                className="object-contain"
              />
            </div>
            <span className="font-headline-sm text-headline-sm tracking-tight text-primary font-bold">
              DubbingStation
            </span>
          </Link>
          <h1 className="font-headline-sm text-headline-sm font-bold text-text-primary">
            Chào mừng bạn trở lại!
          </h1>
          <p className="font-body-sm text-body-sm text-text-muted mt-1">
            Đăng nhập để vào phòng thu Studio và quản lý Credits
          </p>
        </div>

        {/* Success Alert */}
        {successMsg && (
          <div className="mb-space-md p-3 rounded-xl bg-signal-success/15 border border-signal-success/30 text-signal-success font-body-sm text-body-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            <span>{successMsg}</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-space-md p-3 rounded-xl bg-signal-danger/15 border border-signal-danger/30 text-signal-danger font-body-sm text-body-sm flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span>{error}</span>
            </div>

            {/* If pending OTP: Show direct button to go to /verify-otp */}
            {pendingOtpEmail && (
              <Link
                href={`/verify-otp?email=${encodeURIComponent(pendingOtpEmail)}`}
                className="mt-1 py-1.5 px-3 rounded-lg bg-primary-container text-surface-card font-bold text-xs text-center flex items-center justify-center gap-1.5 shadow-sm"
              >
                <span>Nhập mã OTP để kích hoạt ngay</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </Link>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-space-md">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="login-identifier"
              className="font-label-sm text-label-sm text-text-secondary uppercase tracking-wider font-bold"
            >
              Tài khoản hoặc Địa chỉ Email
            </label>
            <input
              id="login-identifier"
              type="text"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="VD: admin hoặc tenban@email.com"
              className="w-full px-space-md py-2.5 rounded-xl bg-surface-container-lowest border border-border-glass font-body-md text-body-md text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary-container transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="password"
                className="font-label-sm text-label-sm text-text-secondary uppercase tracking-wider font-bold"
              >
                Mật khẩu
              </label>
              <Link
                href="/verify-otp"
                className="font-label-sm text-label-sm text-primary-container hover:underline text-xs"
              >
                Kích hoạt mã OTP?
              </Link>
            </div>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-space-md py-2.5 rounded-xl bg-surface-container-lowest border border-border-glass font-body-md text-body-md text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary-container transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3 rounded-xl font-label-md text-label-md font-bold text-surface-card bg-gradient-to-r from-primary-container to-accent-violet-bright hover:shadow-[0_0_24px_rgba(0,242,254,0.4)] hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-70 flex items-center justify-center gap-2 shadow-glow-cyan"
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 rounded-full border-2 border-surface-card border-t-transparent animate-spin" />
                <span>Đang kiểm tra CSDL...</span>
              </>
            ) : (
              <span>Đăng Nhập Ngay</span>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="my-space-md flex items-center gap-3">
          <div className="flex-1 h-[1px] bg-border-glass" />
          <span className="font-code-xs text-code-xs text-text-muted uppercase">hoặc</span>
          <div className="flex-1 h-[1px] bg-border-glass" />
        </div>

        {/* Google OAuth Button */}
        <button
          type="button"
          onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
          className="w-full py-2.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-label-sm text-label-sm font-semibold transition-colors flex items-center justify-center gap-2 border border-border-glass"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#EA4335"
              d="M12 5c1.5 0 2.8.5 3.9 1.5l2.9-2.9C17 1.8 14.7 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.6 2.8C6.4 7.1 8.9 5 12 5z"
            />
            <path
              fill="#4285F4"
              d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"
            />
            <path
              fill="#FBBC05"
              d="M5.5 14.9c-.2-.7-.4-1.5-.4-2.4s.2-1.6.4-2.4L1.9 7.3C.7 9.7 0 12.3 0 15.2s.7 5.5 1.9 7.9l3.6-2.8z"
            />
            <path
              fill="#34A853"
              d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.6-2.1-6.5-5.1L1.9 16.5C3.7 20.2 7.5 23.5 12 23.5z"
            />
          </svg>
          <span>Tiếp tục với Google</span>
        </button>

        {/* Footer link */}
        <p className="mt-space-lg text-center font-body-sm text-body-sm text-text-muted">
          Chưa có tài khoản?{' '}
          <Link
            href="/register"
            className="text-primary-container font-bold hover:underline"
          >
            Đăng ký nhận 50.000 Credits
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-canvas-base flex items-center justify-center text-text-muted">
          <span className="w-8 h-8 rounded-full border-2 border-primary-container border-t-transparent animate-spin mr-2" />
          <span>Đang tải...</span>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
