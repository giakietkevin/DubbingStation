import { NextResponse } from 'next/server';
import { Communicate } from 'edge-tts-universal';

export const dynamic = 'force-dynamic';

export interface VoicePersonaConfig {
  neuralModel: string;
  pitch: string; // VD: '-45Hz', '+65Hz'
  rate: string;  // VD: '-10%', '+15%'
  volume: string;
}

// Bảng cấu hình âm sắc, cao độ (pitch) và nhịp điệu (rate) đặc trưng cho từng nhân vật
export const voicePersonaProfiles: Record<string, VoicePersonaConfig> = {
  // 1. TIẾNG VIỆT - TIKTOK & VIRAL
  'chi-google': {
    neuralModel: 'vi-VN-HoaiMyNeural',
    pitch: '-8Hz',
    rate: '-4%',
    volume: '+0%',
  },
  'genz-linh-dan': {
    neuralModel: 'vi-VN-HoaiMyNeural',
    pitch: '+28Hz',
    rate: '+18%',
    volume: '+5%',
  },
  'nam-than-review': {
    neuralModel: 'vi-VN-NamMinhNeural',
    pitch: '+8Hz',
    rate: '+12%',
    volume: '+5%',
  },
  'em-be-bap': {
    neuralModel: 'vi-VN-HoaiMyNeural',
    pitch: '+68Hz',
    rate: '+14%',
    volume: '+0%',
  },

  // 2. REVIEW PHIM & TRUYỆN
  'bac-ba-review': {
    neuralModel: 'vi-VN-NamMinhNeural',
    pitch: '-42Hz',
    rate: '-8%',
    volume: '+10%',
  },
  'truyen-ma-nguyen-ngoc': {
    neuralModel: 'vi-VN-NamMinhNeural',
    pitch: '-58Hz',
    rate: '-22%',
    volume: '-5%',
  },
  'minh-khang': {
    neuralModel: 'vi-VN-NamMinhNeural',
    pitch: '-10Hz',
    rate: '+0%',
    volume: '+0%',
  },
  'hoang-nam': {
    neuralModel: 'vi-VN-NamMinhNeural',
    pitch: '+15Hz',
    rate: '+8%',
    volume: '+0%',
  },
  'mai-anh': {
    neuralModel: 'vi-VN-HoaiMyNeural',
    pitch: '+5Hz',
    rate: '+0%',
    volume: '+0%',
  },
  'my-duyen': {
    neuralModel: 'vi-VN-HoaiMyNeural',
    pitch: '+16Hz',
    rate: '+20%',
    volume: '+5%',
  },
  'ngoc-lan': {
    neuralModel: 'vi-VN-HoaiMyNeural',
    pitch: '-12Hz',
    rate: '-10%',
    volume: '+0%',
  },

  // 3. THỜI SỰ & GIÁO DỤC
  'quoc-bao': {
    neuralModel: 'vi-VN-NamMinhNeural',
    pitch: '-5Hz',
    rate: '+2%',
    volume: '+5%',
  },
  'thu-huong': {
    neuralModel: 'vi-VN-HoaiMyNeural',
    pitch: '-2Hz',
    rate: '+2%',
    volume: '+0%',
  },
  'thay-giao-tung': {
    neuralModel: 'vi-VN-NamMinhNeural',
    pitch: '-15Hz',
    rate: '-6%',
    volume: '+0%',
  },

  // 4. TIẾNG ANH (US & UK)
  'john-smith': {
    neuralModel: 'en-US-ChristopherNeural',
    pitch: '-5Hz',
    rate: '+0%',
    volume: '+0%',
  },
  'sarah-jenkins': {
    neuralModel: 'en-US-JennyNeural',
    pitch: '+0Hz',
    rate: '+0%',
    volume: '+0%',
  },
  'emma-watson': {
    neuralModel: 'en-GB-SoniaNeural',
    pitch: '+5Hz',
    rate: '-2%',
    volume: '+0%',
  },
  'william-clarke': {
    neuralModel: 'en-GB-RyanNeural',
    pitch: '-20Hz',
    rate: '-10%',
    volume: '+5%',
  },

  // 5. TIẾNG NHẬT
  'sakura-tanaka': {
    neuralModel: 'ja-JP-NanamiNeural',
    pitch: '+35Hz',
    rate: '+10%',
    volume: '+0%',
  },
  'kenji-sato': {
    neuralModel: 'ja-JP-KeitaNeural',
    pitch: '-15Hz',
    rate: '+5%',
    volume: '+5%',
  },

  // 6. TIẾNG HÀN
  'min-jun': {
    neuralModel: 'ko-KR-InJoonNeural',
    pitch: '-5Hz',
    rate: '+0%',
    volume: '+0%',
  },
  'so-hee': {
    neuralModel: 'ko-KR-SunHiNeural',
    pitch: '+10Hz',
    rate: '+0%',
    volume: '+0%',
  },

  // 7. TIẾNG TRUNG
  'zhi-hao': {
    neuralModel: 'zh-CN-YunxiNeural',
    pitch: '-15Hz',
    rate: '-5%',
    volume: '+0%',
  },
  'xiao-ting': {
    neuralModel: 'zh-CN-XiaoxiaoNeural',
    pitch: '+10Hz',
    rate: '+15%',
    volume: '+0%',
  },
};

const samplePhrases: Record<string, string> = {
  'chi-google': 'Xin chào các bạn, đây là chị Google huyền thoại trên TikTok đây, chúc các bạn một ngày thật vui vẻ nhé!',
  'genz-linh-dan': 'Hế lô cả nhà yêu, hôm nay Linh Đan sẽ dẫn mọi người đi săn deal siêu hời nha!',
  'nam-than-review': 'Hello anh em, hôm nay mình sẽ review cho mọi người một con máy siêu phẩm cực kỳ đỉnh chóp nhé!',
  'em-be-bap': 'Con chào cô chú, con là bé Bắp, hôm nay con sẽ kể cho cô chú nghe một câu chuyện cổ tích rất hay ạ!',
  'bac-ba-review': 'Chào mừng các bạn đã quay trở lại với kênh tóm tắt phim của Bác Ba. Hôm nay chúng ta sẽ cùng khám phá một siêu phẩm kịch tính nhé!',
  'truyen-ma-nguyen-ngoc': 'Đêm đã khuya, xung quanh tĩnh lặng, chỉ còn lại tiếng gió rít qua khe cửa... và câu chuyện kinh dị bắt đầu.',
  'minh-khang': 'Xin chào, tôi là Minh Khang. Giọng đọc trầm ấm, truyền cảm, rất phù hợp cho truyện dài và thuyết minh.',
  'hoang-nam': 'Chào mọi người nha, tui là Hoàng Nam, giọng miền Nam thân thiện và gần gũi nè.',
  'mai-anh': 'Xin chào, tôi là Mai Anh, giọng nữ Hà Nội dịu dàng, ngọt ngào, sẵn sàng đồng hành cùng bạn.',
  'my-duyen': 'Em chào cả nhà yêu nha, hôm nay shop em có rất nhiều deal sốc, mọi người bấm vào giỏ hàng ngay nha!',
  'ngoc-lan': 'Dạ xin chào mọi người, em là Ngọc Lan, giọng người con xứ Huế mộng mơ và tha thiết.',
  'quoc-bao': 'Kính chào quý vị và các bạn đang theo dõi bản tin thời sự được phát sóng trực tiếp trên đài truyền hình.',
  'thu-huong': 'Xin kính chào quý thính giả, mời quý vị cùng lắng nghe chuyên mục phong cách sống và giáo dục tuần này.',
  'thay-giao-tung': 'Chào các em học sinh, hôm nay thầy sẽ hướng dẫn các em giải quyết bài toán này một cách rất đơn giản.',
  'john-smith': 'Hello, I am John Smith. Welcome to the DubbingStation global voice studio.',
  'sarah-jenkins': 'Hi there, I am Sarah Jenkins, offering warm and natural American English narration.',
  'emma-watson': 'Greetings! This is Emma Watson, presenting an elegant British storytelling voice.',
  'william-clarke': 'Deep in the heart of nature, extraordinary creatures thrive. I am William Clarke for BBC Documentary.',
  'sakura-tanaka': 'こんにちは！さくらです。アニメやゲームの世界へようこそ！',
  'kenji-sato': '俺の名前はケンジ！どんな困難にも立ち向かう熱い戦士だ！',
  'min-jun': '안녕하세요, 민준입니다. 당신의 마음에 따뜻한 목소리를 전해드립니다.',
  'so-hee': '안녕하세요, 소희입니다. 로맨틱한 드라마처럼 달콤한 하루 되세요.',
  'zhi-hao': '天地浩瀚，侠骨柔情。我是志豪，为您呈现史诗般的中国传奇。',
  'xiao-ting': '哈喽大家好，我是小婷，今天带大家看最新最火的爆款短剧！',
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const voiceId = searchParams.get('voiceId') || 'minh-khang';
    const profile = voicePersonaProfiles[voiceId] || {
      neuralModel: 'vi-VN-NamMinhNeural',
      pitch: '+0Hz',
      rate: '+0%',
      volume: '+0%',
    };

    const sampleText = samplePhrases[voiceId] || 'Xin chào, đây là giọng đọc trí tuệ nhân tạo chất lượng cao của DubbingStation.';

    // Tạo âm thanh Neural TTS đa dạng âm sắc với Pitch, Rate, Volume đặc trưng
    const comm = new Communicate(sampleText, {
      voice: profile.neuralModel,
      pitch: profile.pitch,
      rate: profile.rate,
      volume: profile.volume,
    });

    const chunks: Buffer[] = [];
    for await (const chunk of comm.stream()) {
      if (chunk.type === 'audio' && chunk.data) {
        chunks.push(chunk.data as Buffer);
      }
    }

    if (chunks.length === 0) {
      return NextResponse.json({ error: 'Không nhận được dữ liệu âm thanh' }, { status: 500 });
    }

    const fullBuffer = Buffer.concat(chunks);
    const uint8 = new Uint8Array(fullBuffer);

    return new NextResponse(uint8, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': uint8.byteLength.toString(),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=86400, immutable',
        'X-Voice-Profile': voiceId,
      },
    });
  } catch (error) {
    console.error('Voice Preview Error:', error);
    return NextResponse.json({ error: 'Lỗi tạo âm thanh mẫu' }, { status: 500 });
  }
}
