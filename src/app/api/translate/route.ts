import { NextResponse } from 'next/server';
import { polishVietnameseSubtitle, polishVietnameseSubtitleBatch, type SubtitleTone } from '@/lib/vietnameseSubtitlePolisher';

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

function buildSystemPrompt(sourceLanguage: string, targetLanguage: string, tone: SubtitleTone = 'natural'): string {
  if (targetLanguage.startsWith('vi')) {
    let toneGuide = '';
    switch (tone) {
      case 'dramatic':
        toneGuide = 'Ngữ điệu KỊCH TÍNH, ĐỐI ĐẦU, MẠNH MẼ. Dùng xưng hô "mày - tao", "hắn", "bọn tao", "đồ khốn", "đừng hòng" khi nhân vật giận dữ, cãi nhau hoặc chiến đấu.';
        break;
      case 'conversational':
        toneGuide = 'Ngữ điệu ĐỜI THƯỜNG, BẠN BÈ THÂN MẬT. Dùng xưng hô "cậu - tớ", "mình - cậu", hoặc "mày - tao" nếu là bạn bè chí cốt. Tự nhiên như hội thoại quán cà phê.';
        break;
      case 'period':
        toneGuide = 'Ngữ điệu CỔ TRANG, KIẾM HIỆP, DÃ SỬ. Dùng xưng hô "ngươi - ta", "huynh - đệ", "sư phụ - đồ nhi", "tại hạ", "các hạ", "bản tọa".';
        break;
      case 'romantic':
        toneGuide = 'Ngữ điệu TÌNH CẢM, LÃNG MẠN. Dùng xưng hô "anh - em", "em - anh", ngọt ngào và tự nhiên.';
        break;
      case 'polite':
        toneGuide = 'Ngữ điệu LỊCH SỰ, CÔNG SỞ, XÃ GIAO. Dùng xưng hô "tôi - anh/chị/cậu".';
        break;
      default:
        toneGuide = 'TỰ ĐỘNG THEO BỐI CẢNH: Phân tích cảm xúc và quan hệ của nhân vật để chọn đại từ xưng hô thật nhất (mày-tao khi cãi nhau/thân thiết; cậu-tớ khi trò chuyện; anh-em khi tình cảm; chú/bác-cháu khi lớn nhỏ; ngươi-ta khi phim kiếm hiệp/đối kháng).';
    }

    return `Bạn là biên dịch viên phụ đề phim điện ảnh (Cinematic Subtitle Translator) hàng đầu cho Netflix và rạp chiếu phim Việt Nam. Dịch phụ đề từ ${sourceLanguage} sang Tiếng Việt.

YÊU CẦU CỐT LÕI:
1. THOÁT Ý & TỰ NHIÊN (Thoát ly hoàn toàn cách dịch máy word-by-word):
   - Dịch theo nghĩa trọn vẹn và cảm xúc chân thật, câu thoại nghe như người Việt nói chuyện đời thường.
2. ĐẠI TỪ XƯNG HÔ THEO BỐI CẢNH (Contextual Pronouns):
   - ${toneGuide}
   - HẠN CHẾ TỐI ĐA từ "bạn - tôi" khô cứng và xa cách (chỉ dùng khi thực sự là phỏng vấn trang trọng hoặc người lạ nói chuyện lịch thiệp).
3. NGẮN GỌN & SÚC TÍCH (Subtitle Brevity):
   - Phụ đề chỉ xuất hiện 1-3 giây trên màn hình. Lược bỏ từ ngữ rườm rà thừa thãi để khán giả kịp đọc theo nhịp phim.
4. TỪ ĐỆM CẢM THÁN ĐIỆN ẢNH:
   - Dùng các trợ từ tự nhiên của Tiếng Việt: "à", "nhé", "đấy", "chứ", "hả", "sao", "đi", "thôi", "nào", "coi chừng", "chết tiệt"...
5. GIỮ NGUYÊN SỐ LƯỢNG VÀ THỨ TỰ CUE.`;
  }

  return `You are a professional audiovisual subtitle translator. Translate from ${sourceLanguage} to ${targetLanguage}.
Preserve the speaker's intent, emotion, register, humor, implied meaning, and natural conversational flow. Translate meaning, not individual words. Use the nearby subtitle context to resolve pronouns, tone, and relationships. Keep lines concise for reading speed. Return only the translated dialogue.`;
}

// Tier 1: OpenAI Translation (nếu có OPENAI_API_KEY)
async function translateWithOpenAI(
  text: string,
  sourceLanguage: string,
  targetLanguage: string,
  context = '',
  tone: SubtitleTone = 'natural'
): Promise<string | null> {
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
            content: `${buildSystemPrompt(sourceLanguage, targetLanguage, tone)}\n${context}`,
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
  tone: SubtitleTone = 'natural'
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
            content: `${buildSystemPrompt(sourceLanguage, targetLanguage, tone)}
Preserve the exact cue order and return JSON only in the form {"translations":[{"index":0,"text":"..."}]}.`,
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

// Tier 2: Google Translate GTX (JSON API - Hỗ trợ cả POST và GET)
async function translateWithGoogleGTX(text: string, sourceLanguage: string, targetLanguage: string): Promise<string | null> {
  try {
    const sl = sourceLanguage === 'auto' ? 'auto' : sourceLanguage.split('-')[0];
    const tl = targetLanguage.split('-')[0];

    // Thử gửi bằng POST trước để hỗ trợ văn bản dài không bị giới hạn URL 414
    try {
      const postUrl = 'https://translate.googleapis.com/translate_a/single';
      const bodyParams = new URLSearchParams({
        client: 'gtx',
        sl,
        tl,
        dt: 't',
        q: text,
      });

      const postResponse = await fetch(postUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          Accept: '*/*',
        },
        body: bodyParams.toString(),
        signal: AbortSignal.timeout(9000),
      });

      if (postResponse.ok) {
        const data = await postResponse.json();
        if (Array.isArray(data?.[0])) {
          const translated = data[0].map((part: unknown[]) => String(part[0] || '')).join('').trim();
          if (translated) return translated;
        }
      }
    } catch {}

    // Fallback sang GET nếu POST bị hạn chế
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

function parseNumberedTranslations(translatedBlock: string, expectedCount: number): string[] | null {
  if (!translatedBlock || !translatedBlock.trim()) return null;
  const result: string[] = new Array(expectedCount).fill('');
  let parsedWithNumbers = 0;

  // 1. Phân tích qua regex toàn cục: Hỗ trợ mọi biến thể [1], 1., 1), 【1】, (1) có hoặc không có dấu chấm
  // Kể cả khi Google Translate gộp nhiều câu trên một dòng hoặc giữ dòng mới
  const numberedItemRegex = /(?:^|\r?\n|[\s\t]+)(?:\[|\(|【)?\s*(\d+)\s*(?:\]|\)|】)?[\.\:\-\)]?\s*([^\n\r]*)/g;
  let match: RegExpExecArray | null;

  while ((match = numberedItemRegex.exec(translatedBlock)) !== null) {
    const rawNum = match[1];
    const text = match[2]?.trim() || '';
    const index = parseInt(rawNum, 10) - 1;

    if (index >= 0 && index < expectedCount && !result[index] && text) {
      // Làm sạch bất kỳ tag đánh số còn sót lại ở đầu câu
      result[index] = text.replace(/^(?:\[|\(|【)?\s*\d+\s*(?:\]|\)|】)?[\.\:\-\)]?\s*/, '').trim();
      parsedWithNumbers++;
    }
  }

  if (parsedWithNumbers === expectedCount) {
    return result;
  }

  // 2. Fallback duyệt qua từng dòng nếu regex chưa bắt đủ
  const lines = translatedBlock.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === expectedCount) {
    return lines.map((l) =>
      l.replace(/^(?:\[|\(|【)?\s*\d+\s*(?:\]|\)|】)?[\.\:\-\)]?\s*/, '').trim()
    );
  }

  // 3. Fallback nếu đã bắt được >= 80% số câu
  if (parsedWithNumbers >= Math.floor(expectedCount * 0.8)) {
    return result;
  }

  return null;
}

async function translateBatchCues(
  cuesBatch: TranslationCue[],
  sourceLanguage: string,
  targetLanguage: string,
  tone: SubtitleTone = 'natural'
): Promise<string[] | null> {
  if (cuesBatch.length === 1) {
    const adjacentContext = `Nearby subtitle context: cue ${cuesBatch[0].startTime.toFixed(2)}s-${cuesBatch[0].endTime.toFixed(2)}s, speaker ${cuesBatch[0].speaker || 'unknown'}.`;
    const single = await translateWithOpenAI(cuesBatch[0].text, sourceLanguage, targetLanguage, adjacentContext, tone)
      || await translateSingleText(cuesBatch[0].text, sourceLanguage, targetLanguage);
    return [single];
  }

  const contextualOpenAI = await translateCueBatchWithOpenAI(cuesBatch, sourceLanguage, targetLanguage, tone);
  if (contextualOpenAI) return contextualOpenAI;

  // Định dạng danh sách đánh số [1], [2] để Google Translate hiểu đây là đoạn hội thoại có ngữ cảnh
  const numberedText = cuesBatch
    .map((c, idx) => `[${idx + 1}] ${c.text.trim() || '...'}`)
    .join('\n');

  // Thử dịch cả batch 1 lần bằng Google GTX hoặc Dict hoặc Mobile
  let translatedCombined = await translateWithGoogleGTX(numberedText, sourceLanguage, targetLanguage);
  if (!translatedCombined) {
    translatedCombined = await translateWithGoogleDict(numberedText, sourceLanguage, targetLanguage);
  }
  if (!translatedCombined) {
    translatedCombined = await translateWithGoogleMobile(numberedText, sourceLanguage, targetLanguage);
  }

  if (translatedCombined) {
    const parsed = parseNumberedTranslations(translatedCombined, cuesBatch.length);
    if (parsed && parsed.length === cuesBatch.length) {
      return parsed.map((p, i) => (cuesBatch[i].text.trim() ? p.trim() : cuesBatch[i].text));
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
      tone?: SubtitleTone;
    };
    const cues = body.cues || [];
    const sourceLanguage = body.sourceLanguage || 'auto';
    const targetLanguage = body.targetLanguage || 'vi';
    const tone: SubtitleTone = body.tone || 'natural';

    if (!Array.isArray(cues) || cues.length === 0) {
      return NextResponse.json({ error: 'Vui lòng cung cấp phụ đề cần dịch.' }, { status: 400 });
    }
    if (cues.length > 500) {
      return NextResponse.json({ error: 'Tệp phụ đề tối đa 500 đoạn mỗi lần dịch.' }, { status: 400 });
    }

    if (sourceLanguage === targetLanguage) {
      if (targetLanguage.startsWith('vi')) {
        const polishedTexts = polishVietnameseSubtitleBatch(cues, tone);
        const polishedCues = cues.map((c, idx) => ({
          ...c,
          text: polishedTexts[idx] || c.text,
        }));
        return NextResponse.json({ success: true, sourceLanguage, targetLanguage, tone, cues: polishedCues });
      }
      return NextResponse.json({ success: true, sourceLanguage, targetLanguage, cues });
    }

    const translatedCues: TranslationCue[] = [];
    const BATCH_SIZE = 10;

    for (let i = 0; i < cues.length; i += BATCH_SIZE) {
      const batch = cues.slice(i, i + BATCH_SIZE);
      const batchTranslations = await translateBatchCues(batch, sourceLanguage, targetLanguage, tone);

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

    // NẾU DỊCH SANG TIẾNG VIỆT: Áp dụng bộ lọc tinh chỉnh ngữ cảnh (Vietnamese Subtitle Polisher)
    // Giúp câu văn thoát ý, tự nhiên như phim điện ảnh, thoát khỏi các khuôn mẫu dịch máy cứng nhắc
    if (targetLanguage.startsWith('vi')) {
      const polishedTexts = polishVietnameseSubtitleBatch(translatedCues, tone);
      translatedCues.forEach((cue, idx) => {
        if (polishedTexts[idx]) {
          cue.text = polishedTexts[idx];
        }
      });
    }

    return NextResponse.json({
      success: true,
      sourceLanguage,
      targetLanguage,
      tone,
      cues: translatedCues,
    });
  } catch (error) {
    console.error('Subtitle translation error:', error);
    return NextResponse.json({ error: 'Đã xảy ra lỗi khi dịch phụ đề.' }, { status: 500 });
  }
}
