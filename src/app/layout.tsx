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
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                if (typeof window === 'undefined') return;

                // 1. Chặn window.onerror cho chrome-extension
                var origOnError = window.onerror;
                window.onerror = function(msg, url) {
                  var str = String(msg || '') + ' ' + String(url || '');
                  if (str.indexOf('chrome-extension:') !== -1 || str.indexOf('200.js') !== -1 || str.indexOf('M_ID') !== -1) {
                    return true;
                  }
                  if (origOnError) return origOnError.apply(this, arguments);
                  return false;
                };

                // 2. Chặn capture event error & unhandledrejection
                window.addEventListener('error', function(e) {
                  var target = String((e && (e.filename || (e.error && e.error.stack))) || '');
                  if (target.indexOf('chrome-extension:') !== -1 || target.indexOf('200.js') !== -1 || target.indexOf('M_ID') !== -1) {
                    e.stopImmediatePropagation();
                    e.preventDefault();
                  }
                }, true);

                window.addEventListener('unhandledrejection', function(e) {
                  var r = e ? e.reason : null;
                  var str = String((r && (r.stack || r.message)) || r || '');
                  if (str.indexOf('chrome-extension:') !== -1 || str.indexOf('200.js') !== -1 || str.indexOf('M_ID') !== -1) {
                    e.stopImmediatePropagation();
                    e.preventDefault();
                  }
                }, true);

                // 3. Lọc console.error để Next.js dev overlay không bắt được lỗi extension
                var origConsoleError = console.error;
                console.error = function() {
                  for (var i = 0; i < arguments.length; i++) {
                    var arg = arguments[i];
                    var s = String((arg && (arg.stack || arg.message)) || arg || '');
                    if (s.indexOf('chrome-extension:') !== -1 || s.indexOf('200.js') !== -1 || s.indexOf('M_ID') !== -1) {
                      return;
                    }
                  }
                  return origConsoleError.apply(console, arguments);
                };

                // 4. Tự động xóa popup <nextjs-portal> nếu extension gây ra màn hình đỏ
                if (typeof MutationObserver !== 'undefined') {
                  var observer = new MutationObserver(function(mutations) {
                    for (var i = 0; i < mutations.length; i++) {
                      var added = mutations[i].addedNodes;
                      for (var j = 0; j < added.length; j++) {
                        var node = added[j];
                        if (node && node.nodeName === 'NEXTJS-PORTAL') {
                          setTimeout(function() {
                            try {
                              var text = (node.shadowRoot ? node.shadowRoot.innerHTML : '') + (node.innerHTML || '');
                              if (text.indexOf('chrome-extension:') !== -1 || text.indexOf('200.js') !== -1 || text.indexOf('M_ID') !== -1) {
                                node.remove();
                              }
                            } catch (err) {}
                          }, 10);
                        }
                      }
                    }
                  });
                  observer.observe(document.documentElement, { childList: true, subtree: true });
                }
              })();
            `,
          }}
        />
      </head>
      <body className="bg-canvas-base font-body-md text-body-md text-on-surface antialiased min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
