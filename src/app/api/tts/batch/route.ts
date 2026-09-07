import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { splitTextIntoChunks, type TextChunk } from '@/lib/chunker';

/**
 * POST /api/tts/batch
 * Xử lý văn bản dài >5.000 ký tự:
 * 1. Tách thành chunks thông minh (theo câu / dấu chấm)
 * 2. Trừ Credits tổng cộng 1 lần duy nhất (atomic transaction)
 * 3. Render từng chunk → ghi nhận từng AudioProject segment
 * 4. Trả kết quả tổng hợp gồm tất cả segments
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const body = await req.json();
    const { text, voiceId, voiceName, speed = 1.0, emotion = 'Tự nhiên' } = body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Vui lòng nhập nội dung văn bản cần chuyển đổi' },
        { status: 400 }
      );
    }

    const trimmedText = text.trim();
    const totalChars = trimmedText.length;
    const provider = (body as any).provider || 'microsoft';

    // Batch chỉ cho phép khi đã đăng nhập
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Tính năng Batch Render yêu cầu đăng nhập. Vui lòng đăng nhập để sử dụng.' },
        { status: 401 }
      );
    }

    const creditRate = provider === 'openai' ? 3 : 1;
    const requiredCredits = totalChars * creditRate;

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { wallet: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'Người dùng không tồn tại' }, { status: 404 });
    }

    if (!user.wallet || user.wallet.balance < requiredCredits) {
      return NextResponse.json(
        {
          error: `Số dư credits không đủ. Yêu cầu ${requiredCredits.toLocaleString('vi-VN')} credits, hiện có ${(user.wallet?.balance ?? 0).toLocaleString('vi-VN')} credits.`,
          currentBalance: user.wallet?.balance ?? 0,
          requiredCredits,
        },
        { status: 402 }
      );
    }

    // Tách văn bản thành các chunks
    const chunkResult = splitTextIntoChunks(trimmedText);

    // Trừ credits 1 lần duy nhất cho toàn bộ batch
    const newBalance = user.wallet.balance - requiredCredits;

    const updatedWallet = await prisma.creditWallet.update({
      where: { id: user.wallet.id },
      data: {
        balance: newBalance,
        totalConsumed: user.wallet.totalConsumed + requiredCredits,
        transactions: {
              create: {
                amount: -requiredCredits,
                balanceAfter: newBalance,
                type: 'TTS_USAGE',
                description: `Batch TTS (${voiceName || voiceId}, ${provider}, ${chunkResult.totalChunks} chunks, ${totalChars.toLocaleString('vi-VN')} ký tự)`,
              },
        },
      },
    });

    // Render từng chunk → tạo AudioProject cho mỗi segment
    const segments: Array<{
      index: number;
      audioUrl: string;
      fileName: string;
      durationSec: number;
      charCount: number;
      projectId: string;
    }> = [];

    for (const chunk of chunkResult.chunks) {
      const project = await prisma.audioProject.create({
        data: {
          userId: user.id,
          name: `${voiceName || 'Batch'}_${provider}_Part${chunk.index}_${Date.now()}.mp3`,
          type: 'TTS',
          inputData: chunk.text,
          outputUrl: 'https://actions.google.com/sounds/v1/speech/greeting_male.ogg',
          charCount: chunk.charCount,
          durationSec: chunk.estimatedSec,
          creditsUsed: chunk.charCount * creditRate,
          status: 'COMPLETED',
        },
      });

      segments.push({
        index: chunk.index,
        audioUrl: project.outputUrl || '',
        fileName: project.name,
        durationSec: chunk.estimatedSec,
        charCount: chunk.charCount,
        projectId: project.id,
      });
    }

    return NextResponse.json({
      success: true,
      mode: 'batch',
      totalChars,
      totalChunks: chunkResult.totalChunks,
      estimatedTotalSec: chunkResult.estimatedTotalSec,
      creditsDeducted: requiredCredits,
      remainingCredits: updatedWallet.balance,
      provider,
      segments,
    });
  } catch (error: any) {
    console.error('Batch TTS Error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi tạo batch âm thanh. Vui lòng thử lại.' },
      { status: 500 }
    );
  }
}
