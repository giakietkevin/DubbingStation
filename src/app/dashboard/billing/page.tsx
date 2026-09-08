'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { pricingPlans } from '@/data/pricing';
import type { PricingPlan } from '@/types';
import { VietQRModal } from '@/components/dashboard/VietQRModal';

interface Transaction {
  id: string;
  amount: number;
  balanceAfter: number;
  type: string;
  description: string;
  createdAt: string;
}

interface WalletData {
  balance: number;
  totalEarned: number;
  totalConsumed: number;
}

interface SubscriptionData {
  tier: string;
  status: string;
  currentPeriodEnd: string;
}

export default function BillingPage() {
  const { data: session } = useSession();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [promoCode, setPromoCode] = useState<string>('LAUNCH50');
  const [appliedPromo, setAppliedPromo] = useState<boolean>(true);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('growth');

  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // VietQR Checkout Modal State
  const [checkoutPlan, setCheckoutPlan] = useState<PricingPlan | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);

  useEffect(() => {
    fetchBillingData();
  }, []);

  const fetchBillingData = async () => {
    try {
      const res = await fetch('/api/billing');
      if (res.ok) {
        const data = await res.json();
        setWallet(data.wallet);
        setSubscription(data.subscription);
        setTransactions(data.transactions || []);
      }
    } catch (e) {
      console.error('Failed to fetch billing data', e);
    }
  };

  const handleApplyPromo = () => {
    if (promoCode.trim().toUpperCase() === 'LAUNCH50') {
      setAppliedPromo(true);
      setStatusMessage({ text: 'Áp dụng mã LAUNCH50 thành công: Giảm 50% tất cả gói!', type: 'success' });
    } else {
      setAppliedPromo(false);
      setStatusMessage({ text: 'Mã khuyến mãi không hợp lệ.', type: 'error' });
    }
  };

  const handlePlanClick = (plan: PricingPlan) => {
    if (plan.monthlyPrice === 0) {
      handleUpgradePlan(plan.id);
    } else {
      setCheckoutPlan(plan);
      setIsCheckoutOpen(true);
    }
  };

  const handleUpgradePlan = async (planId: string) => {
    setSelectedPlanId(planId);
    setIsLoading(true);
    setStatusMessage(null);

    try {
      const res = await fetch('/api/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId,
          billingCycle,
          promoCode: appliedPromo ? promoCode : '',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatusMessage({ text: data.error || 'Nâng cấp thất bại.', type: 'error' });
        setIsLoading(false);
        return;
      }

      setStatusMessage({
        text: `${data.message} Số dư mới: ${data.newBalance.toLocaleString('vi-VN')} Credits.`,
        type: 'success',
      });

      fetchBillingData();
    } catch (err) {
      console.error(err);
      setStatusMessage({ text: 'Lỗi kết nối khi thanh toán.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-space-lg max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface-card border border-border-glass rounded-2xl p-space-md lg:p-space-lg backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-primary-container text-[28px]">
              token
            </span>
            <h1 className="font-headline-md text-headline-md font-bold text-on-surface">
              Nạp Credits & Quản Lý Gói Cước
            </h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-primary-container/20 text-primary-container uppercase tracking-wider">
              Unified Credits
            </span>
          </div>
          <p className="font-body-md text-text-secondary">
            1 đơn vị tiền tệ tín dụng duy nhất dùng chung cho TTS, Subtitle Dubbing, Speech to Text và Voice Cloning.
          </p>
        </div>

        {/* Current Balance Card */}
        <div className="flex items-center gap-4 bg-surface-container/60 border border-border-glass rounded-xl p-3 px-4">
          <div className="h-10 w-10 rounded-full bg-primary-container/20 text-primary-container flex items-center justify-center">
            <span className="material-symbols-outlined text-[24px]">account_balance_wallet</span>
          </div>
          <div>
            <div className="text-body-xs text-text-secondary">Số dư khả dụng:</div>
            <div className="font-headline-sm font-bold text-primary-container">
              {(wallet?.balance ?? 50000).toLocaleString('vi-VN')}{' '}
              <span className="text-[12px] text-text-muted font-normal">Credits</span>
            </div>
          </div>
        </div>
      </div>

      {/* Notification banner */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between animate-fadeIn ${
            statusMessage.type === 'success'
              ? 'bg-signal-success/10 border-signal-success/30 text-signal-success'
              : 'bg-signal-danger/10 border-signal-danger/30 text-signal-danger'
          }`}
        >
          <div className="flex items-center gap-2 font-label-md">
            <span className="material-symbols-outlined text-[20px]">
              {statusMessage.type === 'success' ? 'check_circle' : 'error'}
            </span>
            <span>{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="hover:opacity-75 transition-opacity"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      )}

      {/* Cycle Toggle & Promo Code */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-surface-card border border-border-glass rounded-2xl p-4">
        {/* Toggle Monthly / Annual */}
        <div className="flex items-center gap-3 bg-surface-container p-1 rounded-xl border border-border-glass">
          <button
            type="button"
            onClick={() => setBillingCycle('monthly')}
            className={`px-4 py-2 rounded-lg text-label-md font-bold transition-all ${
              billingCycle === 'monthly'
                ? 'bg-primary-container text-surface-card shadow-sm'
                : 'text-text-secondary hover:text-on-surface'
            }`}
          >
            Thanh toán theo tháng
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle('annual')}
            className={`px-4 py-2 rounded-lg text-label-md font-bold transition-all flex items-center gap-1.5 ${
              billingCycle === 'annual'
                ? 'bg-primary-container text-surface-card shadow-sm'
                : 'text-text-secondary hover:text-on-surface'
            }`}
          >
            <span>Thanh toán theo năm</span>
            <span className="px-1.5 py-0.2 rounded text-[10px] bg-secondary-container text-secondary font-extrabold">
              -30%
            </span>
          </button>
        </div>

        {/* Promo Code Box */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-primary-container text-[18px]">
              local_offer
            </span>
            <input
              type="text"
              placeholder="Mã ưu đãi (LAUNCH50)"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-surface-container border border-border-glass text-on-surface text-body-sm font-mono uppercase focus:outline-none focus:border-primary-container"
            />
          </div>
          <button
            type="button"
            onClick={handleApplyPromo}
            className="px-4 py-2 rounded-xl bg-surface-container-high border border-border-glass text-primary-container hover:bg-primary-container hover:text-surface-card font-label-md font-bold transition-all"
          >
            Áp dụng
          </button>
        </div>
      </div>

      {/* Pricing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {pricingPlans.map((plan) => {
          const discountMultiplier = appliedPromo ? 0.5 : 1.0;
          const baseMonthly = plan.monthlyPrice * discountMultiplier;
          const baseAnnual = plan.annualPrice * discountMultiplier;
          const currentPrice = billingCycle === 'annual' ? baseAnnual : baseMonthly;
          const isSelected = selectedPlanId === plan.id;

          return (
            <div
              key={plan.id}
              className={`rounded-2xl border p-space-md flex flex-col justify-between transition-all relative ${
                plan.isPopular
                  ? 'bg-surface-container-high border-secondary shadow-[0_0_25px_rgba(112,0,255,0.25)]'
                  : 'bg-surface-card border-border-glass hover:border-primary-container/40'
              }`}
            >
              {plan.isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-secondary text-white text-[11px] font-bold tracking-wider uppercase shadow-md">
                  Phổ Biến Nhất
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                    {plan.name}
                  </h3>
                  <span className={`px-2 py-0.5 rounded text-[10px] ${plan.badgeStyle}`}>
                    {plan.badge}
                  </span>
                </div>

                {/* Price Display */}
                <div className="my-3">
                  <div className="flex items-baseline gap-1">
                    <span className="font-headline-md text-[28px] font-extrabold text-on-surface">
                      ${currentPrice.toFixed(2)}
                    </span>
                    <span className="text-body-xs text-text-muted">/tháng</span>
                  </div>
                  {appliedPromo && plan.monthlyPrice > 0 && (
                    <div className="text-[11px] text-signal-success font-semibold flex items-center gap-1 mt-0.5">
                      <span className="line-through text-text-muted">
                        ${(billingCycle === 'annual' ? plan.annualPrice : plan.monthlyPrice).toFixed(2)}
                      </span>
                      <span>(-50% LAUNCH50)</span>
                    </div>
                  )}
                </div>

                {/* Credits amount */}
                <div className="p-2 bg-surface-container rounded-lg border border-border-glass mb-4 text-center">
                  <span className="text-body-xs font-bold text-primary-container">
                    {plan.creditsFormatted}
                  </span>
                </div>

                {/* Features List */}
                <ul className="space-y-2 text-body-xs text-text-secondary mb-6">
                  {plan.features.map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-[16px] text-primary-container shrink-0 mt-0.5">
                        check
                      </span>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action Button */}
              <button
                type="button"
                disabled={isLoading}
                onClick={() => handlePlanClick(plan)}
                className={`w-full py-2.5 rounded-xl font-label-md font-bold transition-all flex items-center justify-center gap-1.5 ${
                  plan.isPopular
                    ? 'bg-secondary hover:bg-secondary/90 text-white shadow-md'
                    : 'bg-primary-container hover:shadow-glow-cyan text-surface-card'
                }`}
              >
                {isLoading && selectedPlanId === plan.id ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">
                      {plan.monthlyPrice === 0 ? 'check_circle' : 'qr_code_2'}
                    </span>
                    {plan.monthlyPrice === 0 ? 'Đang kích hoạt' : `Nạp ngay (${plan.name})`}
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* VietQR Payment Checkout Modal */}
      <VietQRModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        plan={checkoutPlan}
        billingCycle={billingCycle}
        appliedPromo={appliedPromo}
        userEmail={session?.user?.email}
      />

      {/* Transactions History Table */}
      <div className="bg-surface-card border border-border-glass rounded-2xl p-space-md lg:p-space-lg space-y-space-md">
        <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-primary-container">receipt_long</span>
          Lịch Sử Giao Dịch & Tiêu Thụ Credits
        </h2>

        {transactions.length === 0 ? (
          <div className="py-8 text-center text-text-muted text-body-sm">
            Chưa có giao dịch phát sinh nào được ghi nhận.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-body-sm">
              <thead>
                <tr className="border-b border-border-glass text-text-muted text-body-xs">
                  <th className="pb-3 font-semibold">Thời gian</th>
                  <th className="pb-3 font-semibold">Loại giao dịch</th>
                  <th className="pb-3 font-semibold">Nội dung chi tiết</th>
                  <th className="pb-3 font-semibold text-right">Biến động</th>
                  <th className="pb-3 font-semibold text-right">Số dư sau GD</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-glass/40">
                {transactions.map((tx) => {
                  const isPositive = tx.amount > 0;
                  return (
                    <tr key={tx.id} className="hover:bg-surface-container/30 transition-colors">
                      <td className="py-3 text-text-muted text-body-xs font-mono">
                        {new Date(tx.createdAt).toLocaleString('vi-VN')}
                      </td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-surface-container border border-border-glass text-on-surface">
                          {tx.type}
                        </span>
                      </td>
                      <td className="py-3 text-on-surface font-medium max-w-xs truncate">
                        {tx.description}
                      </td>
                      <td
                        className={`py-3 text-right font-mono font-bold ${
                          isPositive ? 'text-signal-success' : 'text-signal-danger'
                        }`}
                      >
                        {isPositive ? `+${tx.amount.toLocaleString('vi-VN')}` : tx.amount.toLocaleString('vi-VN')}
                      </td>
                      <td className="py-3 text-right font-mono text-text-secondary">
                        {tx.balanceAfter.toLocaleString('vi-VN')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
