'use client';

import React, { useEffect, useState } from 'react';
import type { PricingPlan } from '@/types';

interface VietQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: PricingPlan | null;
  billingCycle: 'monthly' | 'annual';
  appliedPromo: boolean;
  userEmail?: string | null;
}

export const VietQRModal: React.FC<VietQRModalProps> = ({
  isOpen,
  onClose,
  plan,
  billingCycle,
  appliedPromo,
  userEmail,
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'vietqr' | 'card'>('vietqr');
  const [order, setOrder] = useState<{ id: string; amountVnd: number; credits: number; transferContent: string; status: string } | null>(null);
  const [bank, setBank] = useState({ bankId: 'MB', accountNo: '0905884303', accountName: 'VO PHAM GIA KIET' });
  const [orderError, setOrderError] = useState<string | null>(null);
  const [isStripeLoading, setIsStripeLoading] = useState<boolean>(false);
  const [stripeError, setStripeError] = useState<string | null>(null);

  if (!isOpen || !plan) return null;

  // Pricing calculations
  const discountMultiplier = appliedPromo ? 0.5 : 1.0;
  const baseMonthly = plan.monthlyPrice * discountMultiplier;
  const baseAnnual = plan.annualPrice * discountMultiplier;
  const usdPrice = billingCycle === 'annual' ? baseAnnual * 12 : baseMonthly;

  // Convert USD to VND (Tỷ giá tham chiếu 25.500 VND/USD, làm tròn hàng nghìn)
  const exchangeRate = 25500;
  const vndAmount = Math.round((usdPrice * exchangeRate) / 1000) * 1000;

  useEffect(() => {
    let cancelled = false;
    setOrder(null);
    setOrderError(null);
    if (!isOpen || !plan) return () => undefined;

    fetch('/api/billing/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId: plan.id, billingCycle, promoCode: appliedPromo ? 'LAUNCH50' : '' }),
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Không thể tạo đơn thanh toán.');
        if (!cancelled) {
          setOrder(data.order);
          setBank(data.bank);
        }
      })
      .catch((error: Error) => {
        if (!cancelled) setOrderError(error.message);
      });

    return () => { cancelled = true; };
  }, [isOpen, plan, billingCycle, appliedPromo]);

  const paymentAmount = order?.amountVnd || vndAmount;
  const transferContent = order?.transferContent || 'Đang tạo mã thanh toán...';
  const qrUrl = bank.accountNo
    ? `https://img.vietqr.io/image/${bank.bankId}-${bank.accountNo}-compact2.png?amount=${paymentAmount}&addInfo=${encodeURIComponent(transferContent)}&accountName=${encodeURIComponent(bank.accountName)}`
    : '';

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const handleStripeCheckout = async () => {
    setIsStripeLoading(true);
    setStripeError(null);
    try {
      const res = await fetch('/api/payments/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: plan.id,
          billingCycle,
          promoCode: appliedPromo ? 'LAUNCH50' : '',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Không thể khởi tạo phiên thanh toán Stripe.');
      }
      if (data.url) {
        window.location.href = data.url;
      } else if (data.simulated) {
        setStripeError(data.message);
      }
    } catch (err: any) {
      setStripeError(err?.message || 'Lỗi kết nối cổng thanh toán Stripe.');
    } finally {
      setIsStripeLoading(false);
    }
  };

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      for (let attempt = 0; attempt < 6; attempt += 1) {
        const response = await fetch(`/api/billing/orders?orderId=${encodeURIComponent(order?.id || '')}`);
        const data = await response.json();
        if (response.ok && data.order?.status === 'PAID') {
          onClose();
          window.dispatchEvent(new CustomEvent('creditsUpdated'));
          return;
        }
        if (attempt < 5) await new Promise((resolve) => setTimeout(resolve, 5000));
      }
      setOrderError('Chưa thấy giao dịch. Kiểm tra số tiền và nội dung chuyển khoản rồi thử lại sau ít phút.');
    } catch (error) {
      setOrderError(error instanceof Error ? error.message : 'Không thể kiểm tra giao dịch.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-surface-card border border-border-glass rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Background Glow */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-primary-container/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-secondary-container/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border-glass relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-container/20 text-primary-container flex items-center justify-center">
              <span className="material-symbols-outlined text-[24px]">qr_code_scanner</span>
            </div>
            <div>
              <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                Thanh Toán Nâng Cấp Gói
              </h3>
              <p className="text-body-xs text-text-muted">
                Kích hoạt tức thì gói <span className="text-primary-container font-bold">{plan.name}</span> ({billingCycle === 'annual' ? 'Gói 1 Năm' : 'Gói 1 Tháng'})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-text-muted hover:text-on-surface hover:bg-surface-container-high transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Payment Method Selector Tabs */}
        <div className="flex gap-2 my-4 bg-surface-container p-1 rounded-xl border border-border-glass relative z-10">
          <button
            type="button"
            onClick={() => setActiveTab('vietqr')}
            className={`flex-1 py-2 px-3 rounded-lg text-label-md font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'vietqr'
                ? 'bg-primary-container text-surface-card shadow-sm'
                : 'text-text-secondary hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">qr_code_2</span>
            <span>Chuyển Khoản VietQR (Khuyên dùng)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('card')}
            className={`flex-1 py-2 px-3 rounded-lg text-label-md font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'card'
                ? 'bg-primary-container text-surface-card shadow-sm'
                : 'text-text-secondary hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">credit_card</span>
            <span>Thẻ Quốc Tế (Stripe)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto pr-1 space-y-4 relative z-10">
          {activeTab === 'vietqr' ? (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              {/* Left Column: VietQR Image */}
              <div className="md:col-span-5 flex flex-col items-center justify-center p-4 bg-white rounded-2xl shadow-md border border-neutral-200">
                <img src="/qrCode.jpg" alt="VietQR Payment Code" className="w-full max-w-[230px] aspect-square object-contain" />
                <span className="text-[11px] font-medium text-neutral-600 mt-2 text-center">
                  Quét bằng ứng dụng Ngân hàng hoặc MoMo/VNPay
                </span>
              </div>

              {/* Right Column: Transfer Info */}
              <div className="md:col-span-7 space-y-3">
                {/* Plan Summary Pill */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-surface-container border border-border-glass">
                  <div>
                    <span className="text-body-xs text-text-muted block">Số Credits cộng thêm:</span>
                    <span className="text-label-md font-bold text-primary-container">
                      +{plan.creditsFormatted}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-body-xs text-text-muted block">Tổng thanh toán:</span>
                    <span className="text-headline-sm font-extrabold text-secondary">
                      {paymentAmount.toLocaleString('vi-VN')} đ
                    </span>
                    <span className="text-[11px] text-text-muted block">(${usdPrice.toFixed(2)} USD)</span>
                  </div>
                </div>

                {/* Bank Fields */}
                <div className="space-y-2 text-body-xs">
                  {/* Ngân hàng */}
                  <div className="p-2.5 rounded-xl bg-surface-container-low border border-border-glass flex items-center justify-between">
                    <div>
                      <span className="text-text-muted block text-[11px]">Ngân hàng thụ hưởng:</span>
                      <span className="font-semibold text-on-surface">MB Bank (Ngân hàng Quân đội)</span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-surface-container-high text-[11px] font-bold text-text-secondary">
                      NAPAS 247
                    </span>
                  </div>

                  {/* Số tài khoản */}
                  <div className="p-2.5 rounded-xl bg-surface-container-low border border-border-glass flex items-center justify-between">
                    <div>
                      <span className="text-text-muted block text-[11px]">Số tài khoản:</span>
                      <span className="font-mono font-bold text-primary-container text-body-md">
                        {bank.accountNo || 'Đang tải...'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(bank.accountNo, 'acc')}
                      className="px-2.5 py-1 rounded-lg bg-surface-container-high hover:bg-primary-container hover:text-surface-card text-[11px] font-bold transition-colors flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        {copiedField === 'acc' ? 'check' : 'content_copy'}
                      </span>
                      {copiedField === 'acc' ? 'Đã chép' : 'Sao chép'}
                    </button>
                  </div>

                  {/* Chủ tài khoản */}
                  <div className="p-2.5 rounded-xl bg-surface-container-low border border-border-glass flex items-center justify-between">
                    <div>
                      <span className="text-text-muted block text-[11px]">Chủ tài khoản:</span>
                      <span className="font-semibold text-on-surface">{bank.accountName || 'Đang tải...'}</span>
                    </div>
                  </div>

                  {/* Số tiền */}
                  <div className="p-2.5 rounded-xl bg-surface-container-low border border-border-glass flex items-center justify-between">
                    <div>
                      <span className="text-text-muted block text-[11px]">Số tiền chính xác:</span>
                      <span className="font-mono font-bold text-signal-success text-body-md">
                        {paymentAmount.toLocaleString('vi-VN')} VNĐ
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(paymentAmount.toString(), 'amount')}
                      className="px-2.5 py-1 rounded-lg bg-surface-container-high hover:bg-primary-container hover:text-surface-card text-[11px] font-bold transition-colors flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        {copiedField === 'amount' ? 'check' : 'content_copy'}
                      </span>
                      {copiedField === 'amount' ? 'Đã chép' : 'Sao chép'}
                    </button>
                  </div>

                  {/* Nội dung chuyển khoản */}
                  <div className="p-2.5 rounded-xl bg-primary-container/10 border border-primary-container/30 flex items-center justify-between">
                    <div>
                      <span className="text-primary-container block text-[11px] font-bold">
                        Nội dung chuyển khoản (Bắt buộc):
                      </span>
                      <span className="font-mono font-extrabold text-on-surface text-body-sm tracking-wide">
                        {transferContent}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(transferContent, 'memo')}
                      className="px-2.5 py-1 rounded-lg bg-primary-container text-surface-card font-bold text-[11px] hover:shadow-glow-cyan transition-all flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        {copiedField === 'memo' ? 'check' : 'content_copy'}
                      </span>
                      {copiedField === 'memo' ? 'Đã chép' : 'Sao chép'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Stripe Card Active Checkout View */
            <div className="p-6 bg-surface-container/60 border border-border-glass rounded-2xl space-y-5">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b border-border-glass">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-secondary/20 text-secondary flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[28px]">credit_card</span>
                  </div>
                  <div>
                    <h4 className="font-headline-sm font-bold text-on-surface">Thanh Toán Thẻ Quốc Tế Stripe</h4>
                    <p className="text-body-xs text-text-muted">
                      Chấp nhận thẻ Visa, Mastercard, AMEX, Apple Pay & Google Pay
                    </p>
                  </div>
                </div>
                <div className="text-right w-full sm:w-auto p-3 rounded-xl bg-surface-container-high border border-border-glass">
                  <span className="text-[11px] text-text-muted block">Tổng thanh toán:</span>
                  <span className="text-headline-sm font-extrabold text-primary-container">
                    ${usdPrice.toFixed(2)} USD
                  </span>
                  <span className="text-[11px] text-text-secondary block">
                    (~{paymentAmount.toLocaleString('vi-VN')} đ)
                  </span>
                </div>
              </div>

              {/* Supported Card Brands Visual */}
              <div className="space-y-2">
                <span className="text-[12px] font-semibold text-text-secondary block">
                  Phương thức thanh toán bảo mật bởi Stripe:
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1.5 rounded-lg bg-surface-card border border-border-glass text-body-xs font-bold font-mono text-on-surface">
                    💳 VISA
                  </span>
                  <span className="px-3 py-1.5 rounded-lg bg-surface-card border border-border-glass text-body-xs font-bold font-mono text-on-surface">
                    💳 MASTERCARD
                  </span>
                  <span className="px-3 py-1.5 rounded-lg bg-surface-card border border-border-glass text-body-xs font-bold font-mono text-on-surface">
                    💳 AMEX
                  </span>
                  <span className="px-3 py-1.5 rounded-lg bg-surface-card border border-border-glass text-body-xs font-bold font-mono text-on-surface">
                    🍎 Apple Pay
                  </span>
                  <span className="px-3 py-1.5 rounded-lg bg-surface-card border border-border-glass text-body-xs font-bold font-mono text-on-surface">
                    🌐 Google Pay
                  </span>
                </div>
              </div>

              {/* Order Benefits */}
              <div className="p-3.5 rounded-xl bg-primary-container/10 border border-primary-container/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary-container text-[20px]">verified</span>
                  <span className="text-body-xs text-on-surface font-medium">
                    Kích hoạt gói <strong>{plan.name}</strong> • Nhận ngay <strong>+{plan.creditsFormatted}</strong> Credits
                  </span>
                </div>
                <span className="text-[11px] font-bold text-signal-success uppercase">Tức thì</span>
              </div>

              {/* Error Message */}
              {stripeError && (
                <div className="p-3 rounded-xl bg-signal-warning/15 border border-signal-warning/30 text-signal-warning text-body-xs">
                  {stripeError}
                </div>
              )}

              {/* Checkout Action Button */}
              <button
                type="button"
                disabled={isStripeLoading}
                onClick={handleStripeCheckout}
                className={`w-full py-3 rounded-xl font-bold font-label-md transition-all flex items-center justify-center gap-2 ${
                  isStripeLoading
                    ? 'bg-surface-container-highest text-text-muted cursor-not-allowed opacity-60'
                    : 'bg-secondary text-white hover:bg-secondary/90 shadow-md'
                }`}
              >
                {isStripeLoading ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                    Đang chuyển hướng đến Stripe...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">lock</span>
                    Thanh toán an toàn qua Stripe (${usdPrice.toFixed(2)} USD)
                  </>
                )}
              </button>
            </div>
          )}

          {/* Steps Helper */}
          <div className="p-3 bg-surface-container/60 rounded-xl border border-border-glass text-[12px] text-text-secondary flex items-start gap-2">
            <span className="material-symbols-outlined text-signal-success text-[18px] shrink-0 mt-0.5">
              info
            </span>
            <span>
              <strong>Lưu ý quan trọng:</strong> Hệ thống chỉ cộng Credits sau khi webhook xác minh đúng số tiền và nội dung chuyển khoản. Không bấm xác nhận thay cho việc chuyển khoản.
            </span>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="pt-4 mt-2 border-t border-border-glass flex items-center justify-between gap-3 relative z-10">
          {orderError && <div className="text-sm text-signal-danger">{orderError}</div>}
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-surface-container border border-border-glass text-text-secondary hover:text-on-surface font-label-md font-bold transition-colors"
          >
            Hủy bỏ
          </button>

          <button
            type="button"
            disabled={isProcessing || !order}
            onClick={handleConfirm}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary-container to-secondary-container text-surface-card font-label-md font-extrabold shadow-md hover:shadow-glow-cyan transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                <span>Đang kích hoạt gói...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">verified</span>
                <span>Kiểm tra giao dịch ({paymentAmount.toLocaleString('vi-VN')} đ)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
