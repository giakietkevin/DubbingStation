import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

interface TranslationCue {
  id: number;
  text: string;
  speaker?: string;
  startTime: number;
  endTime: number;
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)));
}

function isNonTranslatable(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return true;
  // Ký tự nốt nhạc, biểu tượng, số, dấu câu
  if (/^[♪♫#*_\-\s….,!?:;0-9+=\/\\|~`^&%$@<>()\[\]{}]+$/.test(trimmed)) return true;
  // Thẻ phụ đề ví dụ [Music], (Laughter), [Applause]
  if (/^(\[[^\]]+\]|\([^\)]+\))$/.test(trimmed) && trimmed.length < 25) return true;
  return false;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Tier 1: OpenAI Translation (nếu có OPENAI_API_KEY)
async function translateWithOpenAI(text: string, sourceLanguage: string, targetLanguage: string, context = ''): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.2,
        messages: [
          {
            role: 'system',
            content: `You are a professional audiovisual subtitle translator. Translate from ${sourceLanguage} to ${targetLanguage}.
          Preserve the speaker's intent, emotion, register, humor, implied meaning, and natural conversational flow. Translate meaning, not individual words. Use the nearby subtitle context only to resolve pronouns, omitted subjects, references, and tone. Do not merge or split lines. Keep names, numbers, proper nouns, and technical terms accurate. Return only the translated dialogue, with no explanations.
          ${context}`,
          },
          { role: 'user', content: text },
        ],
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || null;
  } catch {
    return null;
  }
}

async function translateCueBatchWithOpenAI(
  cues: TranslationCue[],
  sourceLanguage: string,
  targetLanguage: string,
): Promise<string[] | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || cues.length === 0) return null;

  const context = cues.map((cue, index) => ({
    index,
    speaker: cue.speaker || 'unknown',
    start: cue.startTime,
    end: cue.endTime,
    text: cue.text,
  }));

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.25,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `Translate this subtitle sequence from ${sourceLanguage} to ${targetLanguage} as a professional subtitle translator. Preserve the exact cue order and return JSON only in the form {"translations":[{"index":0,"text":"..."}]}. Translate naturally by meaning, preserving emotion, speaker intent, references, humor, and register. Keep each cue concise enough for its original duration; never merge cues, add explanations, or alter timestamps. Use surrounding cues to resolve context.`,
          },
          { role: 'user', content: JSON.stringify(context) },
        ],
      }),
      signal: AbortSignal.timeout(20000),
    });

    if (!response.ok) return null;
    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content;
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { translations?: Array<{ index?: number; text?: string }> };
    const translations = parsed.translations || [];
    if (translations.length !== cues.length) return null;

    const ordered = translations
      .sort((a, b) => Number(a.index) - Number(b.index))
      .map((item) => String(item.text || '').trim());
    return ordered.every(Boolean) ? ordered : null;
  } catch {
    return null;
  }
}

// Tier 2: Google Translate GTX (JSON API)
async function translateWithGoogleGTX(text: string, sourceLanguage: string, targetLanguage: string): Promise<string | null> {
  try {
    const sl = sourceLanguage === 'auto' ? 'auto' : sourceLanguage.split('-')[0];
    const tl = targetLanguage.split('-')[0];
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(sl)}&tl=${encodeURIComponent(tl)}&dt=t&q=${encodeURIComponent(text)}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Accept: '*/*',
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (Array.isArray(data?.[0])) {
      const translated = data[0].map((part: unknown[]) => String(part[0] || '')).join('').trim();
      return translated || null;
    }
    return null;
  } catch {
    return null;
  }
}

// Tier 3: Google Translate Dict (Chrome extension endpoint)
async function translateWithGoogleDict(text: string, sourceLanguage: string, targetLanguage: string): Promise<string | null> {
  try {
    const sl = sourceLanguage === 'auto' ? 'auto' : sourceLanguage.split('-')[0];
    const tl = targetLanguage.split('-')[0];
    const url = `https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=${encodeURIComponent(sl)}&tl=${encodeURIComponent(tl)}&q=${encodeURIComponent(text)}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (Array.isArray(data)) {
      if (typeof data[0] === 'string') return data[0].trim();
      if (Array.isArray(data[0]) && typeof data[0][0] === 'string') return data[0][0].trim();
    }
    return null;
  } catch {
    return null;
  }
}

// Tier 4: Google Translate Mobile Web Scraper (miễn nhiễm với JSON blocks)
async function translateWithGoogleMobile(text: string, sourceLanguage: string, targetLanguage: string): Promise<string | null> {
  try {
    const sl = sourceLanguage === 'auto' ? 'auto' : sourceLanguage.split('-')[0];
    const tl = targetLanguage.split('-')[0];
    const url = `https://translate.google.com/m?sl=${encodeURIComponent(sl)}&tl=${encodeURIComponent(tl)}&q=${encodeURIComponent(text)}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1',
      },
      signal: AbortSignal.timeout(9000),
    });
    if (!response.ok) return null;
    const html = await response.text();
    const match = /<div[^>]*class="result-container"[^>]*>([\s\S]*?)<\/div>/i.exec(html);
    if (match && match[1]) {
      return decodeHtmlEntities(match[1].trim());
    }
    return null;
  } catch {
    return null;
  }
}

// Tier 5: Lingva Open-Source Mirror
async function translateWithLingva(text: string, sourceLanguage: string, targetLanguage: string): Promise<string | null> {
  const mirrors = ['https://lingva.ml', 'https://translate.plausibility.cloud'];
  const sl = sourceLanguage === 'auto' ? 'auto' : sourceLanguage.split('-')[0];
  const tl = targetLanguage.split('-')[0];
  for (const mirror of mirrors) {
    try {
      const url = `${mirror}/api/v1/${encodeURIComponent(sl)}/${encodeURIComponent(tl)}/${encodeURIComponent(text)}`;
      const response = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(6000),
      });
      if (response.ok) {
        const data = await response.json();
        if (typeof data?.translation === 'string' && data.translation.trim()) {
          return data.translation.trim();
        }
      }
    } catch {}
  }
  return null;
}

// Tier 6: MyMemory Translated API
async function translateWithMyMemory(text: string, sourceLanguage: string, targetLanguage: string): Promise<string | null> {
  try {
    const source = sourceLanguage === 'auto' ? 'en' : sourceLanguage.split('-')[0];
    const target = targetLanguage.split('-')[0];
    const response = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(`${source}|${target}`)}`,
      { headers: { 'User-Agent': 'DubbingStation/2.0' }, signal: AbortSignal.timeout(8000) },
    );
    if (!response.ok) return null;
    const data = await response.json();
    const translatedText = data?.responseData?.translatedText;
    if (data?.responseStatus === 200 && typeof translatedText === 'string' && translatedText.trim() && !translatedText.includes('MYMEMORY WARNING')) {
      return decodeHtmlEntities(translatedText.trim());
    }
    return null;
  } catch {
    return null;
  }
}

// Master Single Text Translator với Cascade Fallback đa tầng
async function translateSingleText(text: string, sourceLanguage: string, targetLanguage: string): Promise<string> {
  if (isNonTranslatable(text)) {
    return text;
  }

  // 1. OpenAI (nếu có key)
  const openAIRes = await translateWithOpenAI(text, sourceLanguage, targetLanguage);
  if (openAIRes) return openAIRes;

  // 2. Google GTX
  const gtxRes = await translateWithGoogleGTX(text, sourceLanguage, targetLanguage);
  if (gtxRes) return gtxRes;

  // 3. Google Dict Chrome Ex
  const dictRes = await translateWithGoogleDict(text, sourceLanguage, targetLanguage);
  if (dictRes) return dictRes;

  // 4. Google Mobile Scraper
  const mobileRes = await translateWithGoogleMobile(text, sourceLanguage, targetLanguage);
  if (mobileRes) return mobileRes;

  // 5. Lingva Mirror
  const lingvaRes = await translateWithLingva(text, sourceLanguage, targetLanguage);
  if (lingvaRes) return lingvaRes;

  // 6. MyMemory
  const myMemoryRes = await translateWithMyMemory(text, sourceLanguage, targetLanguage);
  if (myMemoryRes) return myMemoryRes;

  // Fallback an toàn: Giữ nguyên văn bản gốc, KHÔNG BAO GIỜ throw 503
  console.warn(`[Translate] Tất cả dịch vụ tạm thời bận với cue text "${text.slice(0, 30)}...", giữ nguyên gốc.`);
  return text;
}

const CUE_DELIMITER = ' ⟦CUE⟧ ';

async function translateBatchCues(
  cuesBatch: TranslationCue[],
  sourceLanguage: string,
  targetLanguage: string
): Promise<string[] | null> {
  if (cuesBatch.length === 1) {
    const adjacentContext = `Nearby subtitle context: cue ${cuesBatch[0].startTime.toFixed(2)}s-${cuesBatch[0].endTime.toFixed(2)}s, speaker ${cuesBatch[0].speaker || 'unknown'}.`;
    const single = await translateWithOpenAI(cuesBatch[0].text, sourceLanguage, targetLanguage, adjacentContext)
      || await translateSingleText(cuesBatch[0].text, sourceLanguage, targetLanguage);
    return [single];
  }

  const contextualOpenAI = await translateCueBatchWithOpenAI(cuesBatch, sourceLanguage, targetLanguage);
  if (contextualOpenAI) return contextualOpenAI;

  const combinedText = cuesBatch.map((c) => (c.text.trim() ? c.text.trim() : '...')).join(CUE_DELIMITER);

  // Thử dịch cả batch 1 lần bằng Google GTX hoặc Dict hoặc Mobile
  let translatedCombined = await translateWithGoogleGTX(combinedText, sourceLanguage, targetLanguage);
  if (!translatedCombined) {
    translatedCombined = await translateWithGoogleDict(combinedText, sourceLanguage, targetLanguage);
  }
  if (!translatedCombined) {
    translatedCombined = await translateWithGoogleMobile(combinedText, sourceLanguage, targetLanguage);
  }

  if (translatedCombined) {
    // Tách lại theo delimiter (có thể có biến thể khoảng trắng do Google dịch)
    const regex = /\s*⟦\s*CUE\s*⟧\s*/i;
    const parts = translatedCombined.split(regex);
    if (parts.length === cuesBatch.length) {
      return parts.map((p, i) => (cuesBatch[i].text.trim() ? p.trim() : cuesBatch[i].text));
    }
  }

  return null; // Nếu batch không khớp số lượng, fallback dịch từng cue
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as {
      cues?: TranslationCue[];
      sourceLanguage?: string;
      targetLanguage?: string;
    };
    const cues = body.cues || [];
    const sourceLanguage = body.sourceLanguage || 'auto';
    const targetLanguage = body.targetLanguage || 'vi';

    if (!Array.isArray(cues) || cues.length === 0) {
      return NextResponse.json({ error: 'Vui lòng cung cấp phụ đề cần dịch.' }, { status: 400 });
    }
    if (cues.length > 500) {
      return NextResponse.json({ error: 'Tệp phụ đề tối đa 500 đoạn mỗi lần dịch.' }, { status: 400 });
    }

    if (sourceLanguage === targetLanguage) {
      return NextResponse.json({ success: true, sourceLanguage, targetLanguage, cues });
    }

    const translatedCues: TranslationCue[] = [];
    const BATCH_SIZE = 10;

    for (let i = 0; i < cues.length; i += BATCH_SIZE) {
      const batch = cues.slice(i, i + BATCH_SIZE);
      const batchTranslations = await translateBatchCues(batch, sourceLanguage, targetLanguage);

      if (batchTranslations && batchTranslations.length === batch.length) {
        for (let j = 0; j < batch.length; j++) {
          translatedCues.push({
            ...batch[j],
            text: batchTranslations[j] || batch[j].text,
          });
        }
      } else {
        // Fallback: dịch từng cue với rate-limit jitter
        for (const cue of batch) {
          const translated = await translateSingleText(cue.text, sourceLanguage, targetLanguage);
          translatedCues.push({
            ...cue,
            text: translated || cue.text,
          });
          // Delay nhẹ 50ms để tránh trigger IP rate limit
          await sleep(50);
        }
      }

      // Nghỉ nhẹ 80ms giữa các batch
      if (i + BATCH_SIZE < cues.length) {
        await sleep(80);
      }
    }

    return NextResponse.json({
      success: true,
      sourceLanguage,
      targetLanguage,
      cues: translatedCues,
    });
  } catch (error) {
    console.error('Subtitle translation error:', error);
    return NextResponse.json({ error: 'Đã xảy ra lỗi khi dịch phụ đề.' }, { status: 500 });
  }
}
