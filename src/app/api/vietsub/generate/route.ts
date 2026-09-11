import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import { execFile } from 'child_process';
import { promisify } from 'util';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import ffmpegPath from 'ffmpeg-static';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { deduplicateSubtitleCues, type SubtitleCue } from '@/lib/subtitleParser';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 7200;

const MAX_VIETSUB_CUES = 2500;

const execFileAsync = promisify(execFile);
const ffmpegExecutable =
  ffmpegPath ||
  path.join(
    process.cwd(),
    'node_modules',
    'ffmpeg-static',
    process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg'
  );

/**
 * Kiểm tra xem file video đầu vào có chứa stream Audio hay không
 */
async function checkHasAudio(filePath: string): Promise<boolean> {
  try {
    await execFileAsync(ffmpegExecutable, ['-i', filePath]);
    return false;
  } catch (error: any) {
    const stderr = String(error?.stderr || '');
    return /Stream #0:\d+.*Audio:/i.test(stderr);
  }
}

/**
 * Định dạng số giây thành timestamp chuẩn ASS (H:MM:SS.cc)
 */
function formatAssTime(seconds: number): string {
  const safeSec = Math.max(0, seconds);
  const h = Math.floor(safeSec / 3600);
  const m = Math.floor((safeSec % 3600) / 60);
  const s = Math.floor(safeSec % 60);
  const cs = Math.floor((safeSec % 1) * 100);
  const pad = (n: number, z = 2) => String(n).padStart(z, '0');
  return `${h}:${pad(m)}:${pad(s)}.${pad(cs)}`;
}

/**
 * Chuyển đổi mã màu hex sang định dạng màu BGR của ASS (&HAABBGGRR)
 */
function hexToAssColor(hex: string, alphaHex = '00'): string {
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  if (clean.length !== 6) {
    clean = 'FFFFFF';
  }
  const r = clean.slice(0, 2);
  const g = clean.slice(2, 4);
  const b = clean.slice(4, 6);
  return `&H${alphaHex}${b}${g}${r}`.toUpperCase();
}

interface SubtitleStyleOptions {
  fontSize?: number;
  textColor?: string;
  coverOldSub?: boolean;
  coverType?: 'box' | 'banner' | 'none';
  boxColor?: string;
  boxOpacity?: number; // 0.0 - 1.0
  position?: 'bottom' | 'top' | 'middle';
  fontName?: string;
  marginV?: number;
}

/**
 * Tạo file kịch bản ASS với cấu hình style chuyên nghiệp
 */
function generateAssContent(cues: SubtitleCue[], style: SubtitleStyleOptions): string {
  const fontSize = style.fontSize || 28;
  const fontName = style.fontName || 'Arial';
  const primaryColor = hexToAssColor(style.textColor || '#FFFFFF', '00');
  const coverType = style.coverType || (style.coverOldSub ? 'box' : 'none');

  // BorderStyle:
  // 1 = Viền viền chữ + bóng đổ (Outline + drop shadow)
  // 3 = Hộp nền chữ nhật bao quanh chữ (Opaque box - che kín sub cũ)
  let borderStyle = 1;
  let outlineWidth = 2.5;
  let shadowDepth = 1.2;
  let backColor = '&H00000000';

  if (coverType === 'box') {
    borderStyle = 3;
    outlineWidth = 1.0;
    shadowDepth = 0;
    const opacityHex = Math.round((1 - (style.boxOpacity ?? 0.9)) * 255)
      .toString(16)
      .padStart(2, '0');
    backColor = hexToAssColor(style.boxColor || '#000000', opacityHex);
  }

  // Alignment: 2 = Bottom-Center, 8 = Top-Center, 5 = Middle-Center
  let alignment = 2;
  if (style.position === 'top') alignment = 8;
  if (style.position === 'middle') alignment = 5;

  const marginV = style.marginV || (style.position === 'top' ? 25 : 35);

  let ass = `[Script Info]
Title: DubbingStation VietSub Video
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes
YCbCr Matrix: TV.601
PlayResX: 1920
PlayResY: 1080

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${fontName},${fontSize},${primaryColor},&H000000FF,&H00000000,${backColor},1,0,0,0,100,100,0,0,${borderStyle},${outlineWidth},${shadowDepth},${alignment},20,20,${marginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  for (const cue of cues) {
    const textClean = cue.text
      .replace(/\r\n|\n/g, '\\N')
      .replace(/[{}]/g, '')
      .trim();

    if (!textClean) continue;
    const start = formatAssTime(cue.startTime);
    const end = formatAssTime(Math.max(cue.startTime + 0.3, cue.endTime));
    ass += `Dialogue: 0,${start},${end},Default,,0,0,0,,${textClean}\n`;
  }

  return ass;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Vui lòng đăng nhập để sử dụng tính năng VietSub Video.' }, { status: 401 });
  }

  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dubbing-vietsub-'));

  try {
    const formData = await req.formData();
    const video = formData.get('video');
    const rawCues = formData.get('cues');
    const rawStyle = formData.get('style');
    const title = String(formData.get('title') || 'VietSub Video Project').trim();

    if (!(video instanceof File) || video.size === 0) {
      return NextResponse.json({ error: 'Vui lòng tải lên tệp video cần lồng VietSub.' }, { status: 400 });
    }

    if (!rawCues) {
      return NextResponse.json({ error: 'Thiếu danh sách phụ đề VietSub.' }, { status: 400 });
    }

    let parsedCues: SubtitleCue[] = [];
    try {
      parsedCues = JSON.parse(String(rawCues));
    } catch {
      return NextResponse.json({ error: 'Dữ liệu phụ đề không đúng định dạng JSON.' }, { status: 400 });
    }

    if (!Array.isArray(parsedCues) || parsedCues.length === 0) {
      return NextResponse.json({ error: 'Danh sách phụ đề trống.' }, { status: 400 });
    }

    if (parsedCues.length > MAX_VIETSUB_CUES) {
      return NextResponse.json(
        { error: `Tối đa ${MAX_VIETSUB_CUES} câu phụ đề cho mỗi video.` },
        { status: 400 }
      );
    }

    let subStyle: SubtitleStyleOptions = {};
    try {
      if (rawStyle) subStyle = JSON.parse(String(rawStyle));
    } catch {
      subStyle = {};
    }

    // Làm sạch và căn chỉnh lại cues
    const cleanCues = deduplicateSubtitleCues(
      parsedCues.map((c, i) => ({
        id: c.id || i + 1,
        startTime: Number(c.startTime || 0),
        endTime: Number(c.endTime || 0),
        startTimeFormatted: c.startTimeFormatted || '',
        endTimeFormatted: c.endTimeFormatted || '',
        durationSec: Math.max(0.4, Number(c.endTime || 0) - Number(c.startTime || 0)),
        speaker: c.speaker || 'Speaker',
        text: String(c.text || '').trim(),
      }))
    );

    // Kiểm tra và trừ Credits người dùng
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { wallet: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'Không tìm thấy thông tin người dùng.' }, { status: 404 });
    }

    // Phí dịch vụ VietSub Video: 500 Credits cơ bản + 2 Credits mỗi câu phụ đề
    const creditsRequired = Math.max(200, 500 + cleanCues.length * 2);
    if (!user.wallet || user.wallet.balance < creditsRequired) {
      return NextResponse.json(
        {
          error: `Số dư không đủ để xuất VietSub Video. Cần ${creditsRequired.toLocaleString('vi-VN')} Credits, hiện có ${(user.wallet?.balance ?? 0).toLocaleString('vi-VN')} Credits.`,
          requiredCredits: creditsRequired,
          currentBalance: user.wallet?.balance ?? 0,
        },
        { status: 402 }
      );
    }

    // Lưu file video gốc vào thư mục tạm
    const safeVideoName = video.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const inputVideoPath = path.join(workDir, `input-${Date.now()}-${safeVideoName}`);
    await fs.writeFile(inputVideoPath, Buffer.from(await video.arrayBuffer()));

    // Tạo file ASS subtitle
    const assContent = generateAssContent(cleanCues, subStyle);
    const assPath = path.join(workDir, 'subtitles.ass');
    await fs.writeFile(assPath, assContent, 'utf-8');

    // Chuẩn bị đường dẫn xuất file
    const outputDir = process.env.GENERATED_DIR || path.join(process.cwd(), 'public', 'generated');
    await fs.mkdir(outputDir, { recursive: true });
    const outputName = `${title.replace(/[^a-zA-Z0-9._-]/g, '_')}-vietsub-${Date.now()}.mp4`;
    const outputPath = path.join(outputDir, outputName);

    // Kiểm tra âm thanh gốc của video
    const hasAudio = await checkHasAudio(inputVideoPath);

    // Đường dẫn ASS chuẩn hóa cho FFmpeg filter (escape dấu hai chấm và gạch chéo)
    const escapedAssPath = assPath.replace(/\\/g, '/').replace(/:/g, '\\:');

    // Thiết lập video filter
    // Nếu chọn coverType === 'banner' (che toàn bộ dải băng đáy để che cứng phụ đề cũ bản rộng):
    // Thêm drawbox trước khi chèn phụ đề
    let videoFilter = `subtitles='${escapedAssPath}'`;
    if (subStyle.coverType === 'banner') {
      const bannerHeight = Math.round(Number(subStyle.fontSize || 28) * 2.8);
      const bannerOpacity = (subStyle.boxOpacity ?? 0.95).toFixed(2);
      videoFilter = `drawbox=y=ih-${bannerHeight}-20:color=black@${bannerOpacity}:width=iw:height=${bannerHeight}:t=fill,subtitles='${escapedAssPath}'`;
    }

    const ffmpegArgs = [
      '-y',
      '-i', inputVideoPath,
      '-vf', videoFilter,
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '22',
      '-pix_fmt', 'yuv420p',
    ];

    // GIỮ 100% ÂM THANH GỐC NGUYÊN BẢN
    if (hasAudio) {
      ffmpegArgs.push('-c:a', 'copy');
    } else {
      ffmpegArgs.push('-an');
    }

    ffmpegArgs.push('-movflags', '+faststart', outputPath);

    console.log('[VietSub] Running FFmpeg command with args:', ffmpegArgs.join(' '));
    await execFileAsync(ffmpegExecutable, ffmpegArgs);

    // Cập nhật CSDL trừ credits và lưu AudioProject
    const newBalance = user.wallet.balance - creditsRequired;
    await prisma.$transaction([
      prisma.creditWallet.update({
        where: { id: user.wallet.id },
        data: {
          balance: newBalance,
          totalConsumed: user.wallet.totalConsumed + creditsRequired,
          transactions: {
            create: {
              amount: -creditsRequired,
              balanceAfter: newBalance,
              type: 'VIETSUB_USAGE',
              description: `Tạo VietSub Video: "${title}" (${cleanCues.length} câu)`,
            },
          },
        },
      }),
      prisma.audioProject.create({
        data: {
          userId: user.id,
          name: `VietSub - ${title}`,
          type: 'VIETSUB',
          creditsUsed: creditsRequired,
          status: 'COMPLETED',
          outputUrl: `/api/generated/${outputName}`,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: 'Đã xuất Video VietSub thành công với 100% âm thanh gốc!',
      videoUrl: `/api/generated/${outputName}`,
      downloadUrl: `/api/generated/${outputName}`,
      creditsDeducted: creditsRequired,
      remainingCredits: newBalance,
      totalCues: cleanCues.length,
    });
  } catch (error: any) {
    console.error('[VietSub] Error generating subtitled video:', error);
    return NextResponse.json(
      {
        error: 'Lỗi trong quá trình render VietSub Video.',
        details: error?.message || String(error),
      },
      { status: 500 }
    );
  } finally {
    // Dọn dẹp thư mục tạm
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => undefined);
  }
}
