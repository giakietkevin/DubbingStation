'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface UserItem {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  emailVerified: string | null;
  createdAt: string;
  wallet: {
    id: string;
    balance: number;
    totalEarned: number;
    totalConsumed: number;
  } | null;
  subscription: {
    tier: string;
    status: string;
  } | null;
  _count: {
    audioProjects: number;
  };
}

interface Metrics {
  totalUsers: number;
  activatedUsers: number;
  pendingOtpUsers: number;
  totalCredits: number;
  totalProjects: number;
}

interface OtpItem {
  identifier: string;
  token: string;
  expires: string;
}

export default function AdminDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [users, setUsers] = useState<UserItem[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({
    totalUsers: 0,
    activatedUsers: 0,
    pendingOtpUsers: 0,
    totalCredits: 0,
    totalProjects: 0,
  });
  const [recentOtps, setRecentOtps] = useState<OtpItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modal nạp/trừ Credits
  const [adjustModalUser, setAdjustModalUser] = useState<UserItem | null>(null);
  const [adjustAmount, setAdjustAmount] = useState<number>(50000);
  const [adjustReason, setAdjustReason] = useState<string>('Thưởng Credits sự kiện');
  const [isSubmittingAdjust, setIsSubmittingAdjust] = useState<boolean>(false);

  // Thông báo feedback
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  const isAdmin = session?.user && (session.user as any).role === 'ADMIN';

  const fetchAdminData = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (roleFilter !== 'ALL') params.set('role', roleFilter);
      if (statusFilter !== 'ALL') params.set('status', statusFilter);

      const res = await fetch(`/api/admin/users?${params.toString()}`);
      const data = await res.json();

      if (res.ok) {
        setUsers(data.users || []);
        if (data.metrics) setMetrics(data.metrics);
        if (data.recentOtps) setRecentOtps(data.recentOtps);
      } else {
        showToast(data.error || 'Lỗi tải dữ liệu người dùng', 'error');
      }
    } catch (err: any) {
      console.error(err);
      showToast('Lỗi kết nối máy chủ', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated' && isAdmin) {
      fetchAdminData();
    } else if (status === 'authenticated' && !isAdmin) {
      setIsLoading(false);
    }
  }, [status, isAdmin, search, roleFilter, statusFilter]);

  // Xử lý nạp/trừ Credits
  const handleAdjustCredits = async () => {
    if (!adjustModalUser) return;
    setIsSubmittingAdjust(true);

    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: adjustModalUser.id,
          action: 'adjust_credits',
          amount: adjustAmount,
          reason: adjustReason,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast(data.message, 'success');
        setAdjustModalUser(null);
        fetchAdminData();
      } else {
        showToast(data.error || 'Thao tác thất bại', 'error');
      }
    } catch (err) {
      showToast('Lỗi gửi yêu cầu', 'error');
    } finally {
      setIsSubmittingAdjust(false);
    }
  };

  // Xử lý kích hoạt / hủy kích hoạt OTP
  const handleToggleActivation = async (user: UserItem) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          action: 'toggle_activation',
        }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast(data.message, 'success');
        fetchAdminData();
      } else {
        showToast(data.error || 'Lỗi cập nhật trạng thái', 'error');
      }
    } catch (err) {
      showToast('Lỗi kết nối', 'error');
    }
  };

  // Xử lý tạo mã OTP mới cho người dùng
  const handleGenerateNewOtp = async (user: UserItem) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          action: 'generate_otp',
        }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast(`Đã tạo mã OTP mới: [ ${data.otp} ] cho ${user.email}`, 'success');
        fetchAdminData();
      } else {
        showToast(data.error || 'Lỗi tạo OTP', 'error');
      }
    } catch (err) {
      showToast('Lỗi kết nối', 'error');
    }
  };

  // Xử lý đổi vai trò (Role)
  const handleChangeRole = async (user: UserItem, newRole: string) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          action: 'change_role',
          role: newRole,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast(data.message, 'success');
        fetchAdminData();
      } else {
        showToast(data.error || 'Lỗi đổi vai trò', 'error');
      }
    } catch (err) {
      showToast('Lỗi kết nối', 'error');
    }
  };

  // Xử lý xóa tài khoản
  const handleDeleteUser = async (user: UserItem) => {
    if (user.role === 'ADMIN') {
      showToast('Không thể xóa tài khoản Quản trị viên hệ thống!', 'error');
      return;
    }

    const confirmDelete = window.confirm(
      `CẢNH BÁO: Bạn có chắc chắn muốn xóa vĩnh viễn tài khoản "${user.name || user.email}" khỏi CSDL không? Thao tác này không thể hoàn tác!`
    );
    if (!confirmDelete) return;

    try {
      const res = await fetch(`/api/admin/users?userId=${user.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (res.ok) {
        showToast(data.message, 'success');
        fetchAdminData();
      } else {
        showToast(data.error || 'Lỗi xóa tài khoản', 'error');
      }
    } catch (err) {
      showToast('Lỗi kết nối', 'error');
    }
  };

  // Màn hình đang kiểm tra quyền
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-canvas-base flex flex-col items-center justify-center gap-3">
        <span className="w-10 h-10 rounded-full border-2 border-primary-container border-t-transparent animate-spin" />
        <span className="text-on-surface font-body-md">Đang xác thực quyền Quản trị viên...</span>
      </div>
    );
  }

  // Nếu không phải ADMIN: Màn hình từ chối truy cập
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-canvas-base flex items-center justify-center p-4">
        <div className="max-w-md w-full p-8 rounded-2xl bg-surface-card border border-signal-danger/30 text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-signal-danger/15 text-signal-danger flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-[36px]">lock</span>
          </div>
          <h2 className="text-headline-sm font-bold text-on-surface">Khu Vực Quản Trị Giới Hạn</h2>
          <p className="text-body-sm text-text-muted">
            Trang này chỉ dành riêng cho tài khoản Quản trị viên hệ thống có quyền{' '}
            <strong className="text-signal-danger">ADMIN</strong>. Hiện tại hệ thống chỉ cấp quyền cho tài khoản duy nhất.
          </p>
          <div className="p-3 bg-surface-container rounded-xl text-left text-[12px] space-y-1 font-mono text-text-secondary border border-border-glass">
            <p><strong>Tài khoản Admin:</strong> admin</p>
            <p><strong>Mật khẩu:</strong> Giakiet@123</p>
          </div>
          <div className="pt-2 flex flex-col gap-2">
            <Link
              href="/login"
              className="w-full py-2.5 rounded-xl font-bold bg-primary-container text-surface-card hover:shadow-glow-cyan transition-all"
            >
              Đăng Nhập Bằng Nick Admin
            </Link>
            <Link
              href="/"
              className="w-full py-2 rounded-xl text-text-secondary hover:text-on-surface text-body-sm transition-colors"
            >
              Trở về Trang chủ
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas-base text-on-surface">
      {/* Toast Feedback Message */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-2xl border flex items-center gap-2.5 animate-fadeIn ${
            toast.type === 'success'
              ? 'bg-signal-success/20 border-signal-success/40 text-signal-success'
              : 'bg-signal-danger/20 border-signal-danger/40 text-signal-danger'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">
            {toast.type === 'success' ? 'check_circle' : 'error'}
          </span>
          <span className="font-label-md text-sm font-semibold">{toast.text}</span>
        </div>
      )}

      {/* Admin Top Navbar */}
      <header className="sticky top-0 z-40 bg-surface-card/90 backdrop-blur-xl border-b border-border-glass px-4 lg:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="relative h-8 w-8">
              <Image
                src="https://lh3.googleusercontent.com/aida/AEtjO1V-UY2Vq84aP1TGSemuRsNV1QLsuv0qyihz872V7JRpt1zfIbe9cIcDboSo_rWDyuvk8eaaPBuLPjwDmmAsaaZvwip7xi_08PfNZjMWz5P5yUyrTzfJFlgXqv7qhNxrukI8RmCWfvAHRvGZAsCvXTne6arYNyYhnqHk_h9YjyTPddJTATjRAp7gdgsIk7ua_L9M7OHLBE2KOTx9F295HOnIl8F6D8O5IqMVcDOtVMA8Yy6MFVFWnIprww"
                alt="DubbingStation"
                width={32}
                height={32}
                className="object-contain"
              />
            </div>
            <span className="font-headline-sm font-bold text-primary">DubbingStation</span>
          </Link>
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-accent-violet-bright/20 text-accent-violet-bright border border-accent-violet-bright/30 uppercase tracking-wide">
            Hệ Thống Quản Trị CSDL
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-container border border-border-glass text-[13px]">
            <span className="w-2 h-2 rounded-full bg-signal-success animate-pulse" />
            <span className="text-text-muted">Đang đăng nhập:</span>
            <strong className="text-primary-container font-mono">admin</strong>
            <span className="px-1.5 py-0.2 rounded bg-signal-danger/20 text-signal-danger font-bold text-[10px]">
              ROLE: ADMIN
            </span>
          </div>

          <Link
            href="/dashboard"
            className="px-3.5 py-1.5 rounded-xl text-[13px] font-bold bg-surface-container hover:bg-surface-container-high border border-border-glass text-on-surface flex items-center gap-1.5 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px] text-primary-container">
              space_dashboard
            </span>
            <span>Vào Studio</span>
          </Link>

          <button
            type="button"
            onClick={() => signOut({ callbackUrl: '/' })}
            className="px-3 py-1.5 rounded-xl text-[13px] font-bold bg-signal-danger/15 hover:bg-signal-danger/25 text-signal-danger flex items-center gap-1 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            <span>Đăng xuất</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-[1440px] mx-auto px-4 lg:px-8 py-8 space-y-8">
        {/* KPI Metrics Summary Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="p-5 rounded-2xl bg-surface-card border border-border-glass shadow-lg flex flex-col justify-between">
            <div className="flex items-center justify-between text-text-muted">
              <span className="font-label-md text-xs uppercase font-bold tracking-wider">Tổng Người Dùng</span>
              <span className="material-symbols-outlined text-primary-container text-[24px]">group</span>
            </div>
            <div className="mt-3">
              <h3 className="text-3xl font-black text-on-surface font-mono">{metrics.totalUsers}</h3>
              <p className="text-[12px] text-signal-success mt-1">Lưu trữ trong CSDL SQLite</p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-surface-card border border-border-glass shadow-lg flex flex-col justify-between">
            <div className="flex items-center justify-between text-text-muted">
              <span className="font-label-md text-xs uppercase font-bold tracking-wider">Đã Kích Hoạt OTP</span>
              <span className="material-symbols-outlined text-signal-success text-[24px]">verified_user</span>
            </div>
            <div className="mt-3">
              <h3 className="text-3xl font-black text-signal-success font-mono">{metrics.activatedUsers}</h3>
              <p className="text-[12px] text-text-muted mt-1">
                Tỉ lệ: {metrics.totalUsers > 0 ? Math.round((metrics.activatedUsers / metrics.totalUsers) * 100) : 100}%
              </p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-surface-card border border-border-glass shadow-lg flex flex-col justify-between">
            <div className="flex items-center justify-between text-text-muted">
              <span className="font-label-md text-xs uppercase font-bold tracking-wider">Chờ Kích Hoạt OTP</span>
              <span className="material-symbols-outlined text-signal-warning text-[24px]">hourglass_empty</span>
            </div>
            <div className="mt-3">
              <h3 className="text-3xl font-black text-signal-warning font-mono">{metrics.pendingOtpUsers}</h3>
              <button
                type="button"
                onClick={() => setStatusFilter('PENDING_OTP')}
                className="text-[11px] text-primary-container hover:underline mt-1 font-semibold block text-left"
              >
                Lọc danh sách chờ OTP →
              </button>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-surface-card border border-border-glass shadow-lg flex flex-col justify-between">
            <div className="flex items-center justify-between text-text-muted">
              <span className="font-label-md text-xs uppercase font-bold tracking-wider">Credits Lưu Hành</span>
              <span className="material-symbols-outlined text-secondary text-[24px]">token</span>
            </div>
            <div className="mt-3">
              <h3 className="text-2xl font-black text-secondary font-mono">
                {metrics.totalCredits.toLocaleString('vi-VN')}
              </h3>
              <p className="text-[12px] text-text-muted mt-1">Tổng số dư các ví người dùng</p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-surface-card border border-border-glass shadow-lg flex flex-col justify-between">
            <div className="flex items-center justify-between text-text-muted">
              <span className="font-label-md text-xs uppercase font-bold tracking-wider">Dự Án Thu Âm</span>
              <span className="material-symbols-outlined text-accent-violet-bright text-[24px]">graphic_eq</span>
            </div>
            <div className="mt-3">
              <h3 className="text-3xl font-black text-accent-violet-bright font-mono">{metrics.totalProjects}</h3>
              <p className="text-[12px] text-text-muted mt-1">TTS & Dubbing hoàn tất</p>
            </div>
          </div>
        </section>

        {/* Live OTP Tokens Inspector Bar */}
        <section className="p-4 rounded-2xl bg-surface-card/60 border border-primary-container/30 backdrop-blur-md">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary-container text-[20px]">vpn_key</span>
              <h4 className="font-bold text-[14px] text-on-surface">
                Giám Sát Mã OTP 6 Số Đang Có Hiệu Lực Trong CSDL (Verification Tokens)
              </h4>
            </div>
            <span className="text-[11px] text-text-muted font-mono">Cập nhật tự động realtime</span>
          </div>

          {recentOtps.length === 0 ? (
            <p className="text-[12px] text-text-muted py-2">Hiện tại không có mã OTP nào đang chờ xác nhận.</p>
          ) : (
            <div className="flex flex-wrap gap-2 pt-1">
              {recentOtps.map((otp, index) => {
                const isExpired = new Date(otp.expires) < new Date();
                return (
                  <div
                    key={index}
                    className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 text-[12px] font-mono ${
                      isExpired
                        ? 'bg-surface-container/50 border-border-glass text-text-muted'
                        : 'bg-primary-container/10 border-primary-container/40 text-on-surface shadow-sm'
                    }`}
                  >
                    <span className="text-text-secondary">{otp.identifier}:</span>
                    <strong className="text-primary-container text-sm tracking-wider font-bold">
                      {otp.token}
                    </strong>
                    <span className={`text-[10px] px-1 py-0.2 rounded font-bold ${isExpired ? 'bg-signal-danger/20 text-signal-danger' : 'bg-signal-success/20 text-signal-success'}`}>
                      {isExpired ? 'Hết hạn' : 'Còn hạn'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Filter and User Management Controls */}
        <section className="space-y-4">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted text-[20px]">
                search
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm người dùng theo Họ tên hoặc Email..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-card border border-border-glass text-on-surface placeholder:text-text-muted focus:outline-none focus:border-primary-container text-sm"
              />
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Role filter */}
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-surface-card border border-border-glass text-on-surface text-sm focus:outline-none focus:border-primary-container"
              >
                <option value="ALL">Tất cả Role</option>
                <option value="ADMIN">ADMIN</option>
                <option value="FREE_USER">FREE_USER</option>
                <option value="PAID_USER">PAID_USER</option>
                <option value="API_DEVELOPER">API_DEVELOPER</option>
              </select>

              {/* Status filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-surface-card border border-border-glass text-on-surface text-sm focus:outline-none focus:border-primary-container"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="ACTIVATED">Đã kích hoạt OTP</option>
                <option value="PENDING_OTP">Chưa kích hoạt OTP</option>
              </select>

              <button
                type="button"
                onClick={fetchAdminData}
                className="px-3.5 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high border border-border-glass text-on-surface flex items-center gap-1.5 text-sm font-semibold transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">refresh</span>
                <span>Làm mới</span>
              </button>
            </div>
          </div>

          {/* User Data Table */}
          <div className="rounded-2xl bg-surface-card border border-border-glass overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-container border-b border-border-glass text-text-muted uppercase text-[11px] tracking-wider font-bold">
                  <tr>
                    <th className="px-5 py-3.5">Người dùng / Email</th>
                    <th className="px-4 py-3.5">Vai trò (Role)</th>
                    <th className="px-4 py-3.5">Trạng thái OTP</th>
                    <th className="px-4 py-3.5">Số dư Credits</th>
                    <th className="px-4 py-3.5">Dự án</th>
                    <th className="px-4 py-3.5">Ngày tạo</th>
                    <th className="px-5 py-3.5 text-right">Thao tác quản trị</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-glass/60 font-body-sm">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-text-muted">
                        <span className="w-6 h-6 rounded-full border-2 border-primary-container border-t-transparent animate-spin inline-block mr-2 align-middle" />
                        Đang truy vấn CSDL...
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-text-muted">
                        Không tìm thấy người dùng nào phù hợp với bộ lọc.
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => {
                      const isUserAdmin = user.role === 'ADMIN';
                      const isActivated = !!user.emailVerified;
                      const balance = user.wallet?.balance ?? 50000;

                      return (
                        <tr key={user.id} className="hover:bg-surface-container/40 transition-colors">
                          {/* User Column */}
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-surface-card text-xs shrink-0 ${
                                isUserAdmin
                                  ? 'bg-gradient-to-tr from-signal-danger to-accent-violet-bright ring-2 ring-signal-danger/50'
                                  : 'bg-gradient-to-tr from-primary-container to-secondary'
                              }`}>
                                {(user.name || user.email || 'U').charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-bold text-on-surface flex items-center gap-1.5">
                                  <span>{user.name || 'Người dùng'}</span>
                                  {isUserAdmin && (
                                    <span className="px-1.5 py-0.2 rounded bg-signal-danger/20 text-signal-danger text-[10px] font-bold">
                                      SUPER ADMIN
                                    </span>
                                  )}
                                </div>
                                <div className="text-text-muted text-[12px] font-mono">{user.email}</div>
                              </div>
                            </div>
                          </td>

                          {/* Role Column */}
                          <td className="px-4 py-4">
                            {isUserAdmin ? (
                              <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-signal-danger/20 text-signal-danger border border-signal-danger/30">
                                ADMIN
                              </span>
                            ) : (
                              <select
                                value={user.role}
                                onChange={(e) => handleChangeRole(user, e.target.value)}
                                className="bg-surface-container border border-border-glass text-on-surface rounded-lg px-2 py-1 text-xs font-semibold focus:outline-none focus:border-primary-container"
                              >
                                <option value="FREE_USER">FREE_USER</option>
                                <option value="PAID_USER">PAID_USER</option>
                                <option value="API_DEVELOPER">API_DEV</option>
                              </select>
                            )}
                          </td>

                          {/* OTP Status Column */}
                          <td className="px-4 py-4">
                            <button
                              type="button"
                              onClick={() => !isUserAdmin && handleToggleActivation(user)}
                              disabled={isUserAdmin}
                              title={isUserAdmin ? 'Tài khoản Admin luôn được kích hoạt sẵn' : 'Nhấp để đổi trạng thái kích hoạt'}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                                isActivated
                                  ? 'bg-signal-success/15 text-signal-success border border-signal-success/30 hover:bg-signal-success/25'
                                  : 'bg-signal-warning/15 text-signal-warning border border-signal-warning/30 hover:bg-signal-warning/25 animate-pulse'
                              }`}
                            >
                              <span className="material-symbols-outlined text-[16px]">
                                {isActivated ? 'verified' : 'pending'}
                              </span>
                              <span>{isActivated ? 'Đã kích hoạt' : 'Chưa nhập OTP'}</span>
                            </button>
                          </td>

                          {/* Credits Column */}
                          <td className="px-4 py-4">
                            <div className="font-mono font-bold text-primary-container">
                              {balance.toLocaleString('vi-VN')}
                            </div>
                            <div className="text-[11px] text-text-muted font-mono">
                              Đã dùng: {user.wallet?.totalConsumed?.toLocaleString('vi-VN') || 0}
                            </div>
                          </td>

                          {/* Projects Count */}
                          <td className="px-4 py-4 text-text-secondary font-mono">
                            {user._count.audioProjects} files
                          </td>

                          {/* Created Date */}
                          <td className="px-4 py-4 text-text-muted text-xs">
                            {new Date(user.createdAt).toLocaleDateString('vi-VN')}
                          </td>

                          {/* Actions Column */}
                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Nạp / Trừ Credits */}
                              <button
                                type="button"
                                onClick={() => {
                                  setAdjustModalUser(user);
                                  setAdjustAmount(50000);
                                  setAdjustReason('Thưởng Credits sự kiện');
                                }}
                                title="Nạp / Khấu trừ Credits"
                                className="p-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-primary-container transition-colors"
                              >
                                <span className="material-symbols-outlined text-[18px]">add_card</span>
                              </button>

                              {/* Tạo mã OTP mới */}
                              {!isUserAdmin && (
                                <button
                                  type="button"
                                  onClick={() => handleGenerateNewOtp(user)}
                                  title="Tạo mã OTP mới cho người dùng này"
                                  className="p-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-secondary transition-colors"
                                >
                                  <span className="material-symbols-outlined text-[18px]">pin</span>
                                </button>
                              )}

                              {/* Xóa User */}
                              {!isUserAdmin && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteUser(user)}
                                  title="Xóa tài khoản khỏi CSDL"
                                  className="p-1.5 rounded-lg bg-signal-danger/10 hover:bg-signal-danger/25 text-signal-danger transition-colors"
                                >
                                  <span className="material-symbols-outlined text-[18px]">delete</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>

      {/* Modal: Điều chỉnh Credits */}
      {adjustModalUser && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="max-w-md w-full rounded-2xl bg-surface-card border border-border-glass p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border-glass pb-3">
              <h3 className="font-bold text-base text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary-container">account_balance_wallet</span>
                <span>Điều Chỉnh Credits Cho Người Dùng</span>
              </h3>
              <button
                type="button"
                onClick={() => setAdjustModalUser(null)}
                className="text-text-muted hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="p-3 rounded-xl bg-surface-container text-sm space-y-1">
              <p><strong>Người dùng:</strong> {adjustModalUser.name || 'Người dùng'}</p>
              <p className="font-mono text-xs text-text-muted"><strong>Email:</strong> {adjustModalUser.email}</p>
              <p>
                <strong>Số dư hiện tại:</strong>{' '}
                <span className="text-primary-container font-mono font-bold">
                  {(adjustModalUser.wallet?.balance ?? 50000).toLocaleString('vi-VN')} Credits
                </span>
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-text-secondary font-bold uppercase">
                Số lượng Credits (Dương: Nạp thêm, Âm: Khấu trừ):
              </label>
              <input
                type="number"
                step="10000"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(parseInt(e.target.value, 10) || 0)}
                className="w-full px-3 py-2 rounded-xl bg-surface-container border border-border-glass font-mono text-lg font-bold text-primary-container focus:outline-none focus:border-primary-container"
              />
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                {[10000, 50000, 100000, 500000, -50000].map((quick) => (
                  <button
                    key={quick}
                    type="button"
                    onClick={() => setAdjustAmount(quick)}
                    className="px-2.5 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-xs font-mono text-text-secondary"
                  >
                    {quick > 0 ? `+${quick.toLocaleString('vi-VN')}` : quick.toLocaleString('vi-VN')}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-text-secondary font-bold uppercase">
                Lý do điều chỉnh (Lưu vào lịch sử giao dịch):
              </label>
              <input
                type="text"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="VD: Nạp thêm quà tặng, hoàn credits lỗi render..."
                className="w-full px-3 py-2 rounded-xl bg-surface-container border border-border-glass text-sm text-on-surface focus:outline-none focus:border-primary-container"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-border-glass">
              <button
                type="button"
                onClick={() => setAdjustModalUser(null)}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-text-secondary hover:bg-surface-container transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={isSubmittingAdjust || adjustAmount === 0}
                onClick={handleAdjustCredits}
                className="px-5 py-2 rounded-xl text-sm font-bold bg-primary-container text-surface-card hover:shadow-glow-cyan transition-all flex items-center gap-1.5"
              >
                {isSubmittingAdjust ? 'Đang cập nhật...' : 'Xác Nhận Lưu'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
