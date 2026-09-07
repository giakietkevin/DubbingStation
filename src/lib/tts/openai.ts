export interface OpenAITTSOptions {
  text: string;
  model?: 'tts-1' | 'tts-1-hd';
  voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  speed?: number;
}

export interface OpenAITTSResult {
  buffer: Buffer;
  model: string;
  voice: string;
}

export async function synthesizeWithOpenAI({
  text,
  model = 'tts-1-hd',
  voice = 'nova',
  speed = 1.0,
}: OpenAITTSOptions): Promise<OpenAITTSResult | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('[OpenAI TTS] Missing OPENAI_API_KEY');
    return null;
  }

  try {
    const res = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        input: text.slice(0, 4096),
        voice,
        speed: Math.max(0.25, Math.min(4.0, speed)),
        response_format: 'mp3',
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[OpenAI TTS] API error', res.status, errText);
      return null;
    }

    const arrayBuffer = await res.arrayBuffer();
    return {
      buffer: Buffer.from(arrayBuffer),
      model,
      voice,
    };
  } catch (e) {
    console.error('[OpenAI TTS] Request failed', e);
    return null;
  }
}
