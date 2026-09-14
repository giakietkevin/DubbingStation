import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  processAndEnhanceAudioSamples,
  extractAndSaveXTTSLatents,
  getVoiceStorageDir,
  ClonedVoiceMetadata,
} from '@/lib/voiceCloneEngine';

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

    const formattedVoices = user.customVoices.map((voice) => {
      let meta: Partial<ClonedVoiceMetadata> | null = null;
      if (voice.modelKey && voice.modelKey.trim().startsWith('{')) {
        try {
          meta = JSON.parse(voice.modelKey);
        } catch {
          meta = null;
        }
      }

      return {
        ...voice,
        id: `custom-${voice.id}`,
        sampleCount: meta?.sampleCount || 1,
        totalDurationSec: meta?.totalDurationSec || 15,
        qualityScore: meta?.qualityScore || 85,
        hasLatents: Boolean(meta?.latentsFile),
        f0MedianHz: meta?.f0MedianHz,
      };
    });

    return NextResponse.json({
      voices: formattedVoices,
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
    const name = String(rawName || '').trim();
    const safeGender = typeof gender === 'string' ? gender : 'neutral';
    const safeLanguage = typeof language === 'string' ? language : 'vi-VN';
    const safeCloneType = typeof cloneType === 'string' ? cloneType : 'instant';

    if (!name || name.length === 0) {
      return NextResponse.json({ error: 'Vui lòng nhập tên cho giọng nói' }, { status: 400 });
    }

    if (consentAgreed !== 'true') {
      return NextResponse.json(
        { error: 'Bạn phải đồng ý với cam kết bản quyền và sự chấp thuận sử dụng giọng nói.' },
        { status: 400 }
      );
    }

    // Thu thập danh sách tệp âm thanh tải lên (hỗ trợ 1 hoặc nhiều tệp)
    const uploadedFiles: File[] = [];
    const candidateKeys = ['sampleAudio', 'sampleAudios', 'audioFiles', 'files'];
    for (const key of candidateKeys) {
      const items = formData.getAll(key);
      for (const item of items) {
        if (item instanceof File && item.size > 0) {
          uploadedFiles.push(item);
        }
      }
    }

    if (uploadedFiles.length === 0) {
      return NextResponse.json(
        { error: 'Vui lòng tải lên ít nhất một tệp âm thanh mẫu (WAV, MP3, M4A, FLAC).' },
        { status: 400 }
      );
    }

    if (uploadedFiles.length > 10) {
      return NextResponse.json(
        { error: 'Chỉ hỗ trợ tải lên tối đa 10 tệp âm thanh mẫu cho mỗi giọng.' },
        { status: 400 }
      );
    }

    // Kiểm tra định dạng và kích thước từng tệp
    let totalBytes = 0;
    const allowedExtensions = ['.wav', '.mp3', '.m4a', '.flac', '.ogg', '.webm', '.aac'];
    for (const file of uploadedFiles) {
      const ext = path.extname(file.name || '').toLowerCase();
      const isAudioType = file.type.startsWith('audio/') || allowedExtensions.includes(ext);
      if (!isAudioType) {
        return NextResponse.json(
          { error: `Tệp "${file.name}" không phải là định dạng âm thanh hợp lệ.` },
          { status: 400 }
        );
      }
      if (file.size > 50 * 1024 * 1024) {
        return NextResponse.json(
          { error: `Tệp "${file.name}" vượt quá dung lượng tối đa 50MB.` },
          { status: 400 }
        );
      }
      totalBytes += file.size;
    }

    if (totalBytes > 120 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Tổng dung lượng các mẫu tải lên không được vượt quá 120MB.' },
        { status: 400 }
      );
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

    // Đọc buffers của tất cả các file mẫu đã tải lên
    const sampleBuffers = await Promise.all(
      uploadedFiles.map(async (file, idx) => ({
        buffer: Buffer.from(await file.arrayBuffer()),
        fileName: file.name || `sample_${idx + 1}.wav`,
      }))
    );

    // Tiền xử lý âm thanh chuẩn Coqui XTTS-v2:
    // Lọc tạp âm, chuẩn hóa LUFS -16dB, chuyển đổi sang 24kHz 16-bit Mono, tính điểm chất lượng
    const voiceId = crypto.randomUUID();
    const metadata = await processAndEnhanceAudioSamples(sampleBuffers, voiceId);
    metadata.gender = safeGender;
    metadata.language = safeLanguage;

    // Trích xuất Coqui XTTS-v2 speaker conditioning latents (.pth) phục vụ inference siêu tốc
    const latentsFileName = await extractAndSaveXTTSLatents(metadata);
    if (latentsFileName) {
      metadata.latentsFile = latentsFileName;
    }

    const newBalance = user.wallet.balance - cloneCreditsRequired;
    const modelKeySerialized = JSON.stringify(metadata);

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
              description: `Nhân bản giọng AI (${safeCloneType.toUpperCase()}): "${name}" (${uploadedFiles.length} mẫu, ${metadata.totalDurationSec}s)`,
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
          modelKey: modelKeySerialized,
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
      message: `Đã nhân bản giọng "${name}" thành công với ${metadata.sampleCount} mẫu âm thanh (Độ chân thực: ${metadata.qualityScore}%)!`,
      voice: {
        ...newVoice,
        id: `custom-${newVoice.id}`,
        sampleUrl,
        sampleCount: metadata.sampleCount,
        totalDurationSec: metadata.totalDurationSec,
        qualityScore: metadata.qualityScore,
        hasLatents: Boolean(metadata.latentsFile),
      },
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
      const storageDir = getVoiceStorageDir();
      if (voice.modelKey.trim().startsWith('{')) {
        try {
          const meta = JSON.parse(voice.modelKey) as ClonedVoiceMetadata;
          if (Array.isArray(meta.sampleFiles)) {
            for (const f of meta.sampleFiles) {
              await fs.rm(path.join(storageDir, path.basename(f)), { force: true }).catch(() => undefined);
            }
          }
          if (meta.masterWav) {
            await fs.rm(path.join(storageDir, path.basename(meta.masterWav)), { force: true }).catch(() => undefined);
          }
          if (meta.latentsFile) {
            await fs.rm(path.join(storageDir, path.basename(meta.latentsFile)), { force: true }).catch(() => undefined);
          }
        } catch {
          // Fallback nếu parse JSON lỗi
          await fs.rm(path.join(storageDir, path.basename(voice.modelKey)), { force: true }).catch(() => undefined);
        }
      } else {
        const filePath = path.join(storageDir, path.basename(voice.modelKey));
        await fs.rm(filePath, { force: true }).catch(() => undefined);
      }
    }

    await prisma.customVoice.delete({ where: { id: voice.id } });

    return NextResponse.json({ success: true, message: 'Đã xóa giọng thành công' });
  } catch (error) {
    console.error('Delete custom voice error:', error);
    return NextResponse.json({ error: 'Lỗi máy chủ khi xóa giọng' }, { status: 500 });
  }
}
