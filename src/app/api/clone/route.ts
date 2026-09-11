import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

function getVoiceStorageDir(): string {
  return process.env.USER_VOICES_DIR || path.join(process.cwd(), 'public', 'user-voices');
}

// GET: Lấy danh sách giọng đã nhân bản của người dùng
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        customVoices: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Người dùng không tồn tại' }, { status: 404 });
    }

    return NextResponse.json({
      voices: user.customVoices.map((voice) => ({
        ...voice,
        id: `custom-${voice.id}`,
      })),
    });
  } catch (error) {
    console.error('Fetch custom voices error:', error);
    return NextResponse.json({ error: 'Lỗi máy chủ khi lấy danh sách giọng' }, { status: 500 });
  }
}

// POST: Tạo giọng nhân bản mới (Instant Clone / Pro Clone)
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Vui lòng đăng nhập để nhân bản giọng nói' }, { status: 401 });
    }

    const formData = await req.formData();
    const {
      name: rawName,
      gender = 'neutral',
      language = 'vi-VN',
      cloneType = 'instant',
      consentAgreed,
    } = Object.fromEntries(formData.entries());
    const sampleAudio = formData.get('sampleAudio');
    const name = String(rawName || '');
    const safeGender = typeof gender === 'string' ? gender : 'neutral';
    const safeLanguage = typeof language === 'string' ? language : 'vi-VN';
    const safeCloneType = typeof cloneType === 'string' ? cloneType : 'instant';
    const fileName = sampleAudio instanceof File ? sampleAudio.name : '';

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'Vui lòng nhập tên cho giọng nói' }, { status: 400 });
    }

    if (consentAgreed !== 'true') {
      return NextResponse.json(
        { error: 'Bạn phải đồng ý với cam kết bản quyền và sự chấp thuận sử dụng giọng nói.' },
        { status: 400 }
      );
    }
    if (!(sampleAudio instanceof File) || sampleAudio.size === 0) {
      return NextResponse.json({ error: 'Vui lòng tải lên audio mẫu của chính bạn.' }, { status: 400 });
    }
    if (!sampleAudio.type.startsWith('audio/')) {
      return NextResponse.json({ error: 'Chỉ chấp nhận tệp âm thanh.' }, { status: 400 });
    }
    if (sampleAudio.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: 'Audio mẫu tối đa 50MB.' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { wallet: true, customVoices: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'Không tìm thấy thông tin tài khoản' }, { status: 404 });
    }

    // Chi phí credits cho nhân bản giọng
    // Instant Clone: 5.000 Credits, Pro Clone: 20.000 Credits
    const cloneCreditsRequired = safeCloneType === 'professional' ? 20000 : 5000;

    if (!user.wallet || user.wallet.balance < cloneCreditsRequired) {
      return NextResponse.json(
        {
          error: `Số dư không đủ để nhân bản giọng (${safeCloneType === 'professional' ? 'Chuyên nghiệp' : 'Tức thì'}). Cần ${cloneCreditsRequired.toLocaleString('vi-VN')} credits, hiện có ${(user.wallet?.balance ?? 0).toLocaleString('vi-VN')} credits.`,
          requiredCredits: cloneCreditsRequired,
          currentBalance: user.wallet?.balance ?? 0,
        },
        { status: 402 }
      );
    }

    const newBalance = user.wallet.balance - cloneCreditsRequired;
    const fileExtension = path.extname(fileName).toLowerCase() || '.audio';
    const storedFileName = `${crypto.randomUUID()}${fileExtension}`;
    const voiceStorageDir = getVoiceStorageDir();
    await fs.mkdir(voiceStorageDir, { recursive: true });
    const storedFilePath = path.join(voiceStorageDir, storedFileName);
    await fs.writeFile(storedFilePath, Buffer.from(await sampleAudio.arrayBuffer()));

    // Transaction: Trừ credit + tạo CustomVoice + tạo Project log
    const [updatedWallet, newVoice] = await prisma.$transaction([
      prisma.creditWallet.update({
        where: { id: user.wallet.id },
        data: {
          balance: newBalance,
          totalConsumed: user.wallet.totalConsumed + cloneCreditsRequired,
          transactions: {
            create: {
              amount: -cloneCreditsRequired,
              balanceAfter: newBalance,
              type: 'VOICE_CLONE_USAGE',
              description: `Nhân bản giọng AI (${safeCloneType.toUpperCase()}): "${name}" (${fileName || 'sample.wav'})`,
            },
          },
        },
      }),
      prisma.customVoice.create({
        data: {
          userId: user.id,
          name: name.trim(),
          gender: safeGender,
          language: safeLanguage,
          modelKey: storedFileName,
          sampleUrl: '',
          status: 'READY',
        },
      }),
      prisma.audioProject.create({
        data: {
          userId: user.id,
          name: `Voice Clone - ${name.trim()}`,
          type: 'VOICE_CLONE',
          creditsUsed: cloneCreditsRequired,
          status: 'COMPLETED',
          outputUrl: null,
        },
      }),
    ]);

    const sampleUrl = `/api/clone/audio/${newVoice.id}`;
    await prisma.customVoice.update({ where: { id: newVoice.id }, data: { sampleUrl } });

    return NextResponse.json({
      success: true,
      message: `Đã nhân bản giọng "${name}" thành công!`,
      voice: { ...newVoice, id: `custom-${newVoice.id}`, sampleUrl },
      creditsDeducted: cloneCreditsRequired,
      remainingCredits: newBalance,
    });
  } catch (error) {
    console.error('Create custom voice error:', error);
    return NextResponse.json({ error: 'Lỗi máy chủ khi tạo giọng nói AI' }, { status: 500 });
  }
}

// DELETE: Xóa giọng đã nhân bản
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const rawId = searchParams.get('id') || '';
    const voiceId = rawId.startsWith('custom-') ? rawId.slice('custom-'.length) : rawId;

    if (!voiceId) {
      return NextResponse.json({ error: 'Thiếu ID giọng cần xóa' }, { status: 400 });
    }

    const voice = await prisma.customVoice.findFirst({
      where: { id: voiceId, user: { email: session.user.email } },
    });

    if (!voice) {
      return NextResponse.json({ error: 'Không tìm thấy giọng nói' }, { status: 404 });
    }

    if (voice.modelKey) {
      const filePath = path.join(getVoiceStorageDir(), path.basename(voice.modelKey));
      await fs.rm(filePath, { force: true }).catch(() => undefined);
    }

    await prisma.customVoice.delete({ where: { id: voice.id } });

    return NextResponse.json({ success: true, message: 'Đã xóa giọng thành công' });
  } catch (error) {
    console.error('Delete custom voice error:', error);
    return NextResponse.json({ error: 'Lỗi máy chủ khi xóa giọng' }, { status: 500 });
  }
}
