import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Tạo một file audio WAV đơn giản với giai điệu/âm thanh âm chuẩn tần số mẫu (Sound Synthesis)
 * để đảm bảo 100% không bao giờ bị 404 hay lỗi mạng bên thứ ba khi nghe thử giọng đọc!
 */
function generateToneWav(frequency: number = 440, durationSec: number = 2.5, pitchShift: number = 1.0): Buffer {
  const sampleRate = 22050;
  const numSamples = Math.floor(sampleRate * durationSec);
  const numChannels = 1;
  const bytesPerSample = 2; // 16-bit
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;

  const buffer = Buffer.alloc(totalSize);

  // RIFF Chunk
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(totalSize - 8, 4);
  buffer.write('WAVE', 8);

  // fmt Chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  buffer.writeUInt16LE(1, 20); // AudioFormat (1 for PCM)
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(16, 34); // BitsPerSample

  // data Chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Generate pleasant harmonic wave (chimes/melodic tone for voice preview)
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    // Envelope (Attack - Decay)
    const envelope = Math.exp(-3 * (t / durationSec));
    // Voice harmonic combination
    const f1 = frequency * pitchShift;
    const f2 = f1 * 1.5;
    const f3 = f1 * 2.0;

    const sampleVal =
      (Math.sin(2 * Math.PI * f1 * t) * 0.6 +
        Math.sin(2 * Math.PI * f2 * t) * 0.25 +
        Math.sin(2 * Math.PI * f3 * t) * 0.15) *
      envelope;

    const sample16 = Math.max(-32768, Math.min(32767, Math.floor(sampleVal * 16000)));
    buffer.writeInt16LE(sample16, headerSize + i * 2);
  }

  return buffer;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const voiceId = searchParams.get('voiceId') || 'minh-khang';
    const gender = searchParams.get('gender') || 'male';

    // Điều chỉnh tần số âm thanh mô phỏng đặc tính giới tính & giọng
    let baseFreq = 220; // Male
    if (gender === 'female') {
      baseFreq = 340; // Female
    } else if (gender === 'child') {
      baseFreq = 440; // Child
    } else if (gender === 'senior') {
      baseFreq = 160; // Senior
    }

    // Seed nhỏ dựa trên voiceId để mỗi giọng có âm sắc riêng biệt
    const hash = voiceId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const pitchShift = 0.9 + (hash % 20) / 50;

    const wavBuffer = generateToneWav(baseFreq, 2.0, pitchShift);
    const uint8Array = new Uint8Array(wavBuffer);

    return new NextResponse(uint8Array, {
      status: 200,
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Length': uint8Array.byteLength.toString(),
        'Cache-Control': 'public, max-age=86400, immutable',
      },
    });
  } catch (error) {
    console.error('Generate Voice Preview Error:', error);
    return NextResponse.json({ error: 'Lỗi tạo âm thanh mẫu' }, { status: 500 });
  }
}
