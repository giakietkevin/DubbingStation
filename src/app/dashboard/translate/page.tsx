'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { parseSubtitle, type SubtitleCue } from '@/lib/subtitleParser';
import { formatTimestampSRT, formatTimestampVTT } from '@/lib/whisper';

type TranslationCue = SubtitleCue & { translatedText: string };

const languageOptions = [
  ['vi', 'Tiếng Việt'], ['en', 'English'], ['ja', '日本語'], ['ko', '한국어'],
  ['zh-CN', '简体中文'], ['fr', 'Français'], ['de', 'Deutsch'], ['es', 'Español'],
];

function exportSubtitle(cues: TranslationCue[], format: 'srt' | 'vtt') {
  const body = cues.map((cue, index) => {
    const start = format === 'srt' ? formatTimestampSRT(cue.startTime) : formatTimestampVTT(cue.startTime);
    const end = format === 'srt' ? formatTimestampSRT(cue.endTime) : formatTimestampVTT(cue.endTime);
    const speaker = cue.speaker ? `[${cue.speaker}] ` : '';
    return `${index + 1}\n${start} --> ${end}\n${speaker}${cue.translatedText.trim()}\n`;
  }).join('\n');
  return format === 'vtt' ? `WEBVTT\n\n${body}` : body;
}

export default function TranslatePage() {
  const router = useRouter();
  const [sourceLanguage, setSourceLanguage] = useState('auto');
  const [targetLanguage, setTargetLanguage] = useState('vi');
  const [sourceText, setSourceText] = useState('');
  const [cues, setCues] = useState<TranslationCue[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ text: string; error?: boolean } | null>(null);

  useEffect(() => {
    const imported = sessionStorage.getItem('translate_import_srt');
    if (imported) {
      setSourceText(imported);
      sessionStorage.removeItem('translate_import_srt');
    }
  }, []);

  const loadSubtitle = (content: string) => {
    setSourceText(content);
    const parsed = parseSubtitle(content);
    setCues(parsed.cues.map((cue) => ({ ...cue, translatedText: cue.text })));
    setStatus(parsed.cues.length ? { text: `Đã nạp ${parsed.cues.length} đoạn phụ đề.` } : { text: 'Không tìm thấy cue hợp lệ.', error: true });
  };

  const translate = async () => {
    const workingCues = cues.length > 0
      ? cues
      : parseSubtitle(sourceText).cues.map((cue) => ({ ...cue, translatedText: cue.text }));
    if (workingCues.length === 0) {
      setStatus({ text: 'Không tìm thấy cue hợp lệ.', error: true });
      return;
    }
    setCues(workingCues);
    setBusy(true);
    setStatus({ text: 'Đang dịch từng đoạn và giữ nguyên timeline...' });
    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceLanguage, targetLanguage, cues: workingCues.map(({ id, text, speaker, startTime, endTime }) => ({ id, text, speaker, startTime, endTime })) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Dịch phụ đề thất bại.');
      setCues(data.cues.map((cue: TranslationCue) => ({ ...cue, translatedText: cue.text })));
      setStatus({ text: `Đã dịch ${data.cues.length} đoạn phụ đề.` });
    } catch (error) {
      setStatus({ text: error instanceof Error ? error.message : 'Dịch phụ đề thất bại.', error: true });
    } finally {
      setBusy(false);
    }
  };

  const download = (format: 'srt' | 'vtt') => {
    const blob = new Blob([exportSubtitle(cues, format)], { type: format === 'vtt' ? 'text/vtt' : 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `translated-subtitles.${format}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const sendToDubbing = () => {
    sessionStorage.setItem('dubbing_import_srt', exportSubtitle(cues, 'srt'));
    router.push('/dashboard/dubbing');
  };

  return (
    <div className="flex flex-col gap-space-lg max-w-6xl mx-auto">
      <div>
        <h2 className="font-headline-md text-headline-md font-bold text-text-primary">Subtitle Translator</h2>
        <p className="font-body-sm text-body-sm text-text-muted mt-1">Dịch từng câu thoại mà không thay đổi thứ tự và timestamp của video gốc.</p>
      </div>

      {status && <div className={`p-3 rounded-xl border ${status.error ? 'border-signal-danger/30 text-signal-danger bg-signal-danger/10' : 'border-signal-success/30 text-signal-success bg-signal-success/10'}`}>{status.text}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-md">
        <section className="lg:col-span-5 p-space-md rounded-2xl bg-surface-card border border-border-glass flex flex-col gap-3">
          <h3 className="font-label-lg text-label-lg font-bold text-text-primary">1. Phụ đề gốc</h3>
          <div className="grid grid-cols-2 gap-2">
            <select value={sourceLanguage} onChange={(e) => setSourceLanguage(e.target.value)} className="px-3 py-2 rounded-xl bg-surface-container-lowest border border-border-glass text-text-primary"><option value="auto">Tự động nhận diện</option>{languageOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
            <select value={targetLanguage} onChange={(e) => setTargetLanguage(e.target.value)} className="px-3 py-2 rounded-xl bg-surface-container-lowest border border-border-glass text-text-primary">{languageOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
          </div>
          <label className="border-2 border-dashed border-border-glass rounded-xl p-4 text-center cursor-pointer text-text-muted">Tải SRT/VTT<input type="file" accept=".srt,.vtt,.txt" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => loadSubtitle(String(reader.result || '')); reader.readAsText(file); }} /></label>
          <textarea value={sourceText} onChange={(e) => setSourceText(e.target.value)} onBlur={() => loadSubtitle(sourceText)} rows={14} placeholder="Dán nội dung SRT hoặc VTT..." className="w-full p-3 rounded-xl bg-surface-container-lowest border border-border-glass text-text-primary font-code-xs resize-none" />
          <button type="button" onClick={translate} disabled={busy || !sourceText.trim()} className="py-3 rounded-xl bg-gradient-to-r from-primary-container to-secondary-container text-canvas-base font-bold disabled:opacity-50">{busy ? 'Đang dịch...' : `Dịch sang ${languageOptions.find(([value]) => value === targetLanguage)?.[1] || targetLanguage}`}</button>
        </section>

        <section className="lg:col-span-7 p-space-md rounded-2xl bg-surface-card border border-border-glass flex flex-col gap-3">
          <div className="flex items-center justify-between"><h3 className="font-label-lg text-label-lg font-bold text-text-primary">2. Bản dịch ({cues.length} đoạn)</h3><div className="flex gap-2"><button type="button" disabled={!cues.length} onClick={() => download('srt')} className="px-3 py-1.5 rounded-lg bg-surface-container-high text-text-primary disabled:opacity-40">.SRT</button><button type="button" disabled={!cues.length} onClick={() => download('vtt')} className="px-3 py-1.5 rounded-lg bg-surface-container-high text-text-primary disabled:opacity-40">.VTT</button></div></div>
          <div className="flex flex-col gap-2 max-h-[620px] overflow-y-auto">{cues.map((cue) => <div key={cue.id} className="p-3 rounded-xl bg-surface-container-lowest border border-border-glass"><div className="flex justify-between text-[11px] text-text-muted font-code-xs"><span>#{cue.id} {cue.speaker || ''}</span><span>{cue.startTimeFormatted} → {cue.endTimeFormatted}</span></div><p className="mt-1 text-[12px] text-text-muted">{cue.text}</p><textarea value={cue.translatedText} onChange={(e) => setCues((current) => current.map((item) => item.id === cue.id ? { ...item, translatedText: e.target.value } : item))} rows={2} className="mt-2 w-full p-2 rounded-lg bg-surface-container-high/40 text-text-primary resize-none" /></div>)}</div>
          {cues.length > 0 && <button type="button" onClick={sendToDubbing} className="py-3 rounded-xl bg-secondary-container text-on-secondary-container font-bold">Dùng bản dịch để lồng tiếng</button>}
        </section>
      </div>
    </div>
  );
}