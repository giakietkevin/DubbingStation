'use client';

import React, { useRef } from 'react';

interface TextInputAreaProps {
  text: string;
  onChange: (val: string) => void;
  maxChars?: number;
}

export const TextInputArea: React.FC<TextInputAreaProps> = ({
  text,
  onChange,
  maxChars = 5000,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertTag = (tag: string) => {
    if (!textareaRef.current) return;
    const el = textareaRef.current;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const before = text.substring(0, start);
    const after = text.substring(end);
    const updated = `${before} ${tag} ${after}`;
    onChange(updated);

    setTimeout(() => {
      el.focus();
      const pos = start + tag.length + 2;
      el.setSelectionRange(pos, pos);
    }, 0);
  };

  const currentLength = text.length;

  return (
    <div className="flex flex-col gap-space-xs">
      <label className="sr-only" htmlFor="tts-source-text">
        Nội dung văn bản chuyển đổi
      </label>
      <textarea
        ref={textareaRef}
        id="tts-source-text"
        rows={5}
        value={text}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Nhập hoặc dán văn bản của bạn tại đây để chuyển thành giọng nói nhân bản AI..."
        className="w-full bg-transparent resize-none font-body-lg text-body-lg text-text-primary placeholder:text-text-muted focus:outline-none leading-relaxed"
      />

      {/* Contextual SSML Tags & Live Counter */}
      <div className="flex flex-wrap items-center justify-between gap-space-xs pt-space-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-text-muted mr-1">
            Chèn hiệu ứng:
          </span>
          <button
            type="button"
            onClick={() => insertTag('[pause 0.5s]')}
            className="px-2.5 py-1 rounded-md bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-code-xs text-code-xs transition-colors"
          >
            + Nghỉ 0.5s
          </button>
          <button
            type="button"
            onClick={() => insertTag('[pause 1.0s]')}
            className="px-2.5 py-1 rounded-md bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-code-xs text-code-xs transition-colors"
          >
            + Nghỉ 1.0s
          </button>
          <button
            type="button"
            onClick={() => insertTag('[nhấn_mạnh]')}
            className="px-2.5 py-1 rounded-md bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-code-xs text-code-xs transition-colors"
          >
            + Nhấn giọng
          </button>
          <button
            type="button"
            onClick={() => insertTag('[thì_thầm]')}
            className="px-2.5 py-1 rounded-md bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-code-xs text-code-xs transition-colors"
          >
            + Thì thầm
          </button>
        </div>

        <div className="flex items-center gap-space-xs font-code-xs text-code-xs text-text-muted flex-wrap">
          {currentLength > 5000 && (
            <span className="px-2 py-0.5 rounded bg-primary-container/20 text-primary-container font-semibold">
              ⚡ Batch Mode ({Math.ceil(currentLength / 3000)} chunks)
            </span>
          )}
          <span className="text-text-secondary font-medium">
            {currentLength.toLocaleString('vi-VN')} ký tự
          </span>
          <span aria-hidden="true" className="w-1 h-1 rounded-full bg-text-muted" />
          <span>
            Tiêu tốn:{' '}
            <strong className="text-primary font-bold">
              {currentLength.toLocaleString('vi-VN')}
            </strong>{' '}
            Credits
          </span>
        </div>
      </div>
    </div>
  );
};
