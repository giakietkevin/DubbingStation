'use client';

import React, { useState } from 'react';
import { faqs } from '@/data/faqs';

export const FaqSection: React.FC = () => {
  const [openId, setOpenId] = useState<string | null>(null);

  const toggleFaq = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <section className="w-full py-space-2xl bg-surface-container-lowest">
      <div className="max-w-3xl mx-auto px-gutter-desktop">
        <div className="text-center mb-space-xl">
          <span className="px-3 py-1 rounded-full bg-surface-container-high text-primary font-code-xs text-code-xs font-bold uppercase tracking-wider">
            Giải đáp thắc mắc
          </span>
          <h2 className="mt-space-xs font-headline-lg text-headline-lg font-bold text-text-primary">
            Câu Hỏi Thường Gặp
          </h2>
          <p className="font-body-md text-body-md text-text-muted mt-1">
            Mọi thông tin về bản quyền thương mại, cơ chế tính credit và bảo mật âm thanh.
          </p>
        </div>

        {/* Accordion Items */}
        <div className="flex flex-col gap-space-xs">
          {faqs.map((faq) => {
            const isOpen = openId === faq.id;
            return (
              <div
                key={faq.id}
                className="rounded-xl bg-surface-container-low overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(faq.id)}
                  className="w-full p-space-md flex items-center justify-between text-left font-headline-sm text-headline-sm font-semibold text-text-primary"
                >
                  <span>{faq.question}</span>
                  <span
                    className={`material-symbols-outlined text-text-muted text-[22px] transition-transform duration-200 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  >
                    expand_more
                  </span>
                </button>

                <div
                  className={`px-space-md pb-space-md font-body-md text-body-md text-text-secondary leading-relaxed transition-all duration-200 ${
                    isOpen ? 'block' : 'hidden'
                  }`}
                >
                  {faq.answer}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
