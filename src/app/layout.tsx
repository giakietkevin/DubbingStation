import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/Providers';

const siteUrl = process.env.NEXTAUTH_URL || 'https://dubbingstation.com';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'DubbingStation — All-in-One AI Voice Studio & Subtitle Dubbing',
    template: '%s | DubbingStation AI',
  },
  description:
    'Nền tảng phòng thu AI cao cấp: Chuyển đổi văn bản thành giọng nói (TTS) chuẩn tự nhiên, lồng tiếng video theo phụ đề tự động, nhận dạng giọng nói Whisper AI và 22 công cụ xử lý âm thanh WebAssembly trực tiếp trên trình duyệt.',
  keywords: [
    'AI Voice Studio',
    'Text to Speech',
    'Chuyển văn bản thành giọng nói',
    'Lồng tiếng video AI',
    'Subtitle Dubbing',
    'Whisper AI',
    'Nhân bản giọng nói',
    'Voice Cloning',
    'DubbingStation',
    'Audio Tools WASM',
  ],
  authors: [{ name: 'DubbingStation Team', url: siteUrl }],
  creator: 'DubbingStation AI Studio',
  publisher: 'DubbingStation AI Inc.',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'DubbingStation — All-in-One AI Voice Studio & Subtitle Dubbing',
    description:
      'Chuyển văn bản thành giọng nói AI tự nhiên, lồng tiếng video theo phụ đề tự động, nhân bản giọng nói độc bản và trọn bộ 22 công cụ âm thanh WebAssembly miễn phí 100%.',
    url: siteUrl,
    siteName: 'DubbingStation AI Studio',
    locale: 'vi_VN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DubbingStation — All-in-One AI Voice Studio',
    description:
      'Tổng hợp giọng nói AI chuẩn phòng thu & lồng tiếng video tự động theo timeline phụ đề.',
  },
  icons: {
    icon: '/logo.png',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${siteUrl}/#organization`,
      name: 'DubbingStation AI Studio',
      url: siteUrl,
      description: 'Nền tảng phòng thu AI cao cấp tổng hợp giọng nói và lồng tiếng video tự động.',
    },
    {
      '@type': 'SoftwareApplication',
      '@id': `${siteUrl}/#software`,
      name: 'DubbingStation',
      applicationCategory: 'MultimediaApplication',
      operatingSystem: 'All modern web browsers (Chrome, Safari, Firefox, Edge)',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
      description:
        'All-in-One AI Voice Studio: Text to Speech chuẩn tự nhiên, lồng tiếng video theo phụ đề tự động, Whisper AI bóc băng và 22 công cụ âm thanh WebAssembly miễn phí.',
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="bg-canvas-base font-body-md text-body-md text-on-surface antialiased min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
