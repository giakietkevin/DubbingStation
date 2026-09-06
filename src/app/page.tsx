import React, { Suspense } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { PromoRail } from '@/components/home/PromoRail';
import { Hero } from '@/components/home/Hero';
import { StudioConsole } from '@/components/home/StudioConsole/StudioConsole';
import { MetricsGrid } from '@/components/home/MetricsGrid';
import { CoreServices } from '@/components/home/CoreServices';
import { AudioToolsShowcase } from '@/components/home/AudioToolsShowcase';
import { PricingSection } from '@/components/home/PricingSection/PricingSection';
import { FaqSection } from '@/components/home/FaqSection';
import { CtaBanner } from '@/components/home/CtaBanner';

export default function HomePage() {
  return (
    <>
      <Header />
      <main className="w-full pt-16 bg-canvas-base">
        <div className="flex flex-col w-full">
          {/* 1. Promo Announcement Rail */}
          <PromoRail />

          {/* 2. Hero Header Block */}
          <Hero />

          {/* 3. Interactive Studio Demo Console */}
          <Suspense fallback={<div className="h-96 flex items-center justify-center text-text-muted">Đang tải Studio Console...</div>}>
            <StudioConsole />
          </Suspense>

          {/* 4. Key Value Metrics Grid */}
          <MetricsGrid />

          {/* 5. Core AI Services Showcase (4 Cards) */}
          <CoreServices />

          {/* 6. 22 Free Audio Tools Suite */}
          <AudioToolsShowcase />

          {/* 7. Pricing & Unified Credits Section */}
          <PricingSection />

          {/* 8. FAQ Section */}
          <FaqSection />

          {/* 9. High-Impact Converting CTA Banner */}
          <CtaBanner />
        </div>
      </main>
      <Footer />
    </>
  );
}
