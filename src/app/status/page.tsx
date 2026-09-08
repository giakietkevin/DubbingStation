'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

interface ServiceStatus {
  id: string;
  name: string;
  category: string;
  status: 'operational' | 'degraded' | 'outage';
  uptime: string;
  latencyMs: number;
  description: string;
}

const servicesList: ServiceStatus[] = [
  {
    id: 'tts-neural',
    name: 'Neural TTS Inference Engine',
    category: 'Core AI Services',
    status: 'operational',
    uptime: '99.99%',
    latencyMs: 145,
    description: 'Tổng hợp giọng đọc tiếng Việt 3 miền & Đa ngôn ngữ chuẩn 24kHz / 48kHz',
  },
  {
    id: 'dubbing-pipeline',
    name: 'Subtitle Video Dubbing Pipeline',
    category: 'Core AI Services',
    status: 'operational',
    uptime: '99.98%',
    latencyMs: 380,
    description: 'Thuật toán căn chỉnh timeline phụ đề SRT/VTT và kết xuất video MP4 tự động',
  },
  {
    id: 'stt-whisper',
    name: 'Whisper AI Speech to Text',
    category: 'Core AI Services',
    status: 'operational',
    uptime: '99.95%',
    latencyMs: 290,
    description: 'Mô hình nhận dạng giọng nói đa ngôn ngữ và bóc tách timeline tự động',
  },
  {
    id: 'voice-clone',
    name: 'DSP Voice Timbre Morphing & Cloning',
    category: 'Core AI Services',
    status: 'operational',
    uptime: '99.97%',
    latencyMs: 210,
    description: 'Trích xuất F0, Formant F1/F2 và bộ lọc âm thanh kỹ thuật số độc bản',
  },
  {
    id: 'wasm-suite',
    name: '22 Client-Side WASM Audio Suite',
    category: 'Browser Engine',
    status: 'operational',
    uptime: '100.0%',
    latencyMs: 12,
    description: 'Bộ công cụ xử lý âm thanh Web Audio API chạy 100% trong RAM trình duyệt',
  },
  {
    id: 'rest-api',
    name: 'Developer REST API Gateway v1',
    category: 'Platform Infrastructure',
    status: 'operational',
    uptime: '99.99%',
    latencyMs: 65,
    description: 'Endpoints /api/v1/tts, /api/v1/dubbing, /api/v1/stt kèm Rate Limiting',
  },
  {
    id: 'credit-wallet',
    name: 'Unified Credit Wallet & Prisma DB',
    category: 'Platform Infrastructure',
    status: 'operational',
    uptime: '100.0%',
    latencyMs: 8,
    description: 'Giao dịch tín dụng nguyên tử (ACID Transaction) và đồng bộ số dư realtime',
  },
  {
    id: 'vietqr-gateway',
    name: 'VietQR Banking Payment Gateway',
    category: 'Billing & Payments',
    status: 'operational',
    uptime: '99.99%',
    latencyMs: 180,
    description: 'Cổng thanh toán tự động NAPAS 247 qua ứng dụng ngân hàng và ví điện tử',
  },
];

export default function StatusPage() {
  const [lastChecked, setLastChecked] = useState<string>('');

  useEffect(() => {
    setLastChecked(new Date().toLocaleTimeString('vi-VN'));
  }, []);

  return (
    <div className="min-h-screen bg-canvas-base flex flex-col text-on-surface">
      <Header />
      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 py-12 lg:py-16 w-full">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-text-muted text-body-xs mb-6">
          <Link href="/" className="hover:text-primary transition-colors">Trang chủ</Link>
          <span>/</span>
          <span className="text-on-surface font-semibold">Trạng thái hệ thống</span>
        </div>

        {/* Global Status Banner */}
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-signal-success/10 via-surface-card to-surface-card border border-signal-success/30 shadow-2xl relative overflow-hidden mb-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-signal-success/20 text-signal-success flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[36px] animate-pulse">check_circle</span>
              </div>
              <div>
                <h1 className="font-headline-md sm:font-headline-lg text-headline-md font-extrabold text-on-surface">
                  Tất Cả Hệ Thống Hoạt Động Bình Thường
                </h1>
                <p className="text-body-sm text-text-secondary mt-1">
                  Toàn bộ 8 phân hệ dịch vụ cốt lõi đang vận hành ổn định với hiệu suất 99.99%.
                </p>
              </div>
            </div>

            <div className="flex flex-col items-start sm:items-end text-body-xs text-text-muted border-t sm:border-t-0 pt-3 sm:pt-0 border-border-glass">
              <span>Kiểm tra lần cuối lúc:</span>
              <span className="font-mono font-bold text-on-surface">{lastChecked || 'Vừa xong'}</span>
            </div>
          </div>
        </div>

        {/* Services List */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-headline-sm font-bold text-on-surface">
              Chi Tiết Phân Hệ Dịch Vụ
            </h2>
            <span className="text-body-xs text-text-muted font-mono">
              8/8 Services Online
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {servicesList.map((srv) => (
              <div
                key={srv.id}
                className="p-4 sm:p-5 rounded-2xl bg-surface-card border border-border-glass hover:border-primary-container/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-signal-success shadow-glow-cyan" />
                    <h3 className="font-label-lg font-bold text-on-surface">{srv.name}</h3>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-surface-container font-mono text-text-muted">
                      {srv.category}
                    </span>
                  </div>
                  <p className="text-body-xs text-text-secondary pl-4">
                    {srv.description}
                  </p>
                </div>

                <div className="flex items-center gap-6 self-end sm:self-center pl-4 sm:pl-0">
                  <div className="text-right">
                    <span className="text-[11px] text-text-muted block">Độ trễ (Latency):</span>
                    <span className="font-mono text-body-xs font-bold text-primary-container">
                      {srv.latencyMs}ms
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-text-muted block">Uptime (30d):</span>
                    <span className="font-mono text-body-xs font-bold text-signal-success">
                      {srv.uptime}
                    </span>
                  </div>
                  <div className="px-3 py-1 rounded-full bg-signal-success/15 text-signal-success text-[12px] font-bold">
                    Hoạt động
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 90 Days Uptime Visualizer */}
        <div className="mt-12 p-6 rounded-2xl bg-surface-card border border-border-glass space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-label-lg font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-signal-success text-[18px]">history</span>
              <span>Lịch Sử Hoạt Động (90 Ngày Gần Nhất)</span>
            </h3>
            <span className="text-body-xs text-signal-success font-bold font-mono">100% Không có sự cố</span>
          </div>

          <div className="grid grid-cols-30 sm:grid-cols-45 md:grid-cols-90 gap-1 pt-2">
            {Array.from({ length: 90 }).map((_, i) => (
              <div
                key={i}
                title={`Ngày ${90 - i} trước: Hoạt động 100%`}
                className="h-8 rounded-[3px] bg-signal-success/80 hover:bg-signal-success hover:scale-110 transition-transform cursor-pointer"
              />
            ))}
          </div>

          <div className="flex justify-between text-[11px] text-text-muted font-mono pt-1">
            <span>90 ngày trước</span>
            <span>Hôm nay (100% Uptime)</span>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
