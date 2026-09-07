import { NextResponse } from 'next/server';
import { authenticateApiKey } from '@/lib/apiAuth';
import { prisma } from '@/lib/prisma';
import { Communicate } from 'edge-tts-universal';
import { voicePersonaProfiles } from '@/data/voiceProfiles';
import { synthesizeWithOpenAI } from '@/lib/tts/openai';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/tts
 * Public REST API: Chuyển đổi văn bản thành giọng nói AI cho Developer
 * Header: Authorization: Bearer ds_live_xxxx
 * Body: { text: string, voiceId?: string, speed?: number, provider?: 'microsoft' | 'openai', responseFormat?: 'json' | 'audio' }
 */
export async function POST(req: Request) {
  // 1. Xác thực Developer API Key
  const auth = await authenticateApiKey(req);
  if (!auth.user) {
    return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
  }

  try {
    const body = await req.json();
    const { text, voiceId = 'minh-khang', speed = 1.0, provider = 'microsoft', responseFormat = 'audio' } = body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json({ error: 'Nội dung "text" không được để trống.' }, { status: 400 });
    }

    const cleanText = text.trim();
    const charCount = cleanText.length;
    const creditRate = provider === 'openai' ? 3 : 1;
    const creditsRequired = charCount * creditRate;

    // 2. Kiểm tra số dư Credits của Developer
    if (auth.user.walletBalance < creditsRequired) {
      return NextResponse.json(
        {
          error: 'Số dư Credits không đủ để thực hiện yêu cầu API.',
          required: creditsRequired,
          currentBalance: auth.user.walletBalance,
        },
        { status: 402 }
      );
    }

    // 3. Trích xuất cấu hình giọng nói AI
    const profile = voicePersonaProfiles[voiceId] || {
      neuralModel: 'vi-VN-NamMinhNeural',
      pitch: '+0Hz',
      rate: '+0%',
      volume: '+0%',
      samplePhrase: '',
      provider: 'microsoft' as const,
    };

    const selectedProvider = provider || profile.provider || 'microsoft';

    // 4. Tổng hợp âm thanh qua Neural Engine
    let audioBuffer: Buffer | null = null;
    if (selectedProvider === 'openai') {
      const openAIVoice = profile.openAIVoice || 'nova';
      const result = await synthesizeWithOpenAI({
        text: cleanText,
        model: 'tts-1-hd',
        voice: openAIVoice,
        speed,
      });
      audioBuffer = result?.buffer || null;
    } else {
      try {
        const comm = new Communicate(cleanText, {
          voice: profile.neuralModel,
        });
        const chunks: Buffer[] = [];
        for await (const chunk of comm.stream()) {
          if (chunk.type === 'audio' && chunk.data) {
            chunks.push(chunk.data as Buffer);
          }
        }
        if (chunks.length > 0) {
          audioBuffer = Buffer.concat(chunks);
        }
      } catch {
        // Fallback
        const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(
          cleanText.slice(0, 200)
        )}&tl=vi&client=tw-ob`;
        const res = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
        });
        if (res.ok) {
          audioBuffer = Buffer.from(await res.arrayBuffer());
        }
      }
    }

    if (!audioBuffer) {
      return NextResponse.json({ error: 'Không thể tạo âm thanh từ văn bản cung cấp.' }, { status: 500 });
    }

    // 5. Trừ Credits trong database một cách an toàn (Atomic Transaction)
    const wallet = await prisma.creditWallet.findUnique({
      where: { userId: auth.user.userId },
    });

    if (wallet) {
      const newBalance = wallet.balance - creditsRequired;
      await prisma.$transaction([
        prisma.creditWallet.update({
          where: { id: wallet.id },
          data: {
            balance: newBalance,
            totalConsumed: wallet.totalConsumed + creditsRequired,
          },
        }),
        prisma.creditTransaction.create({
          data: {
            walletId: wallet.id,
            amount: -creditsRequired,
            balanceAfter: newBalance,
            type: 'API_USAGE',
            description: `Developer API TTS v1: "${voiceId}" (${charCount} ký tự, ${selectedProvider})`,
          },
        }),
        prisma.audioProject.create({
          data: {
            userId: auth.user.userId,
            name: `API_TTS_${selectedProvider}_${Date.now()}`,
            type: 'API_V1',
            charCount: charCount,
            creditsUsed: creditsRequired,
            status: 'COMPLETED',
          },
        }),
      ]);
    }

    // 6. Trả về kết quả theo định dạng yêu cầu
    if (responseFormat === 'json') {
      const base64Audio = audioBuffer.toString('base64');
      return NextResponse.json({
        success: true,
        voiceId,
        charCount,
        creditsDeducted: creditsRequired,
        remainingBalance: auth.user.walletBalance - creditsRequired,
        provider: selectedProvider,
        audioFormat: 'audio/mpeg',
        audioBase64: base64Audio,
      });
    }

    // Trả về trực tiếp Audio MP3 Binary stream
    const uint8 = new Uint8Array(audioBuffer);
    return new NextResponse(uint8, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': uint8.byteLength.toString(),
        'X-Credits-Deducted': creditsRequired.toString(),
        'X-Remaining-Balance': (auth.user.walletBalance - creditsRequired).toString(),
        'X-Voice-Id': voiceId,
        'X-Provider': selectedProvider,
      },
    });
  } catch (err) {
    console.error('API v1 TTS Error:', err);
    return NextResponse.json({ error: 'Lỗi xử lý nội bộ server.' }, { status: 500 });
  }
}
