import { NextResponse } from 'next/server';

interface TranslationCue {
  id: number;
  text: string;
  speaker?: string;
  startTime: number;
  endTime: number;
}

async function translateWithOpenAI(text: string, sourceLanguage: string, targetLanguage: string): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

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
          content: `Translate subtitle dialogue from ${sourceLanguage} to ${targetLanguage}. Return only the translated dialogue, preserving meaning and tone.`,
        },
        { role: 'user', content: text },
      ],
    }),
  });

  if (!response.ok) return null;
  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || null;
}

async function translateWithGoogle(text: string, targetLanguage: string): Promise<string | null> {
  const response = await fetch(
    `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(targetLanguage)}&dt=t&q=${encodeURIComponent(text)}`,
  );
  if (!response.ok) return null;
  const data = await response.json();
  return Array.isArray(data?.[0])
    ? data[0].map((part: unknown[]) => String(part[0] || '')).join('').trim()
    : null;
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

    const translatedCues: TranslationCue[] = [];
    for (const cue of cues) {
      const translatedText = sourceLanguage === targetLanguage
        ? cue.text
        : await translateWithOpenAI(cue.text, sourceLanguage, targetLanguage) ||
          await translateWithGoogle(cue.text, targetLanguage);

      if (!translatedText) {
        return NextResponse.json({ error: `Không thể dịch đoạn phụ đề #${cue.id}.` }, { status: 502 });
      }

      translatedCues.push({ ...cue, text: translatedText });
    }

    return NextResponse.json({ success: true, sourceLanguage, targetLanguage, cues: translatedCues });
  } catch (error) {
    console.error('Subtitle translation error:', error);
    return NextResponse.json({ error: 'Đã xảy ra lỗi khi dịch phụ đề.' }, { status: 500 });
  }
}