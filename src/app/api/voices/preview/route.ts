import { NextResponse } from 'next/server';
import { Communicate } from 'edge-tts-universal';

export const dynamic = 'force-dynamic';

const voiceIdToNeuralModel: Record<string, string> = {
  // Tiếng Việt
  'minh-khang': 'vi-VN-NamMinhNeural',
  'bac-ba-review': 'vi-VN-NamMinhNeural',
  'nam-than-review': 'vi-VN-NamMinhNeural',
  'hoang-nam': 'vi-VN-NamMinhNeural',
  'quoc-bao': 'vi-VN-NamMinhNeural',
  'thay-giao-tung': 'vi-VN-NamMinhNeural',
  'truyen-ma-nguyen-ngoc': 'vi-VN-NamMinhNeural',

  'mai-anh': 'vi-VN-HoaiMyNeural',
  'chi-google': 'vi-VN-HoaiMyNeural',
  'genz-linh-dan': 'vi-VN-HoaiMyNeural',
  'em-be-bap': 'vi-VN-HoaiMyNeural',
  'my-duyen': 'vi-VN-HoaiMyNeural',
  'ngoc-lan': 'vi-VN-HoaiMyNeural',
  'thu-huong': 'vi-VN-HoaiMyNeural',

  // Tiếng Anh
  'john-smith': 'en-US-ChristopherNeural',
  'sarah-jenkins': 'en-US-JennyNeural',
  'emma-watson': 'en-GB-SoniaNeural',
  'william-clarke': 'en-GB-RyanNeural',

  // Tiếng Nhật
  'sakura-tanaka': 'ja-JP-NanamiNeural',
  'kenji-sato': 'ja-JP-KeitaNeural',

  // Tiếng Hàn
  'min-jun': 'ko-KR-InJoonNeural',
  'so-hee': 'ko-KR-SunHiNeural',

  // Tiếng Trung
  'zhi-hao': 'zh-CN-YunxiNeural',
  'xiao-ting': 'zh-CN-XiaoxiaoNeural',
};

// Câu mẫu chào hỏi tự nhiên cho từng giọng đọc để nghe thử (preview)
const samplePhrases: Record<string, string> = {
  'minh-khang': 'Xin chào, tôi là Minh Khang. Giọng đọc trầm ấm, truyền cảm, rất phù hợp cho truyện dài và thuyết minh.',
  'bac-ba-review': 'Chào mừng các bạn đã quay trở lại với kênh tóm tắt phim của Bác Ba. Hôm nay chúng ta sẽ cùng khám phá một siêu phẩm kịch tính nhé!',
  'nam-than-review': 'Hello anh em, hôm nay mình sẽ review cho mọi người một món đồ công nghệ cực kỳ đỉnh chóp nhé!',
  'hoang-nam': 'Chào mọi người nha, tui là Hoàng Nam, giọng miền Nam thân thiện và gần gũi nè.',
  'quoc-bao': 'Kính chào quý vị và các bạn đang theo dõi bản tin thời sự được phát sóng trực tiếp trên đài truyền hình.',
  'thay-giao-tung': 'Chào các em học sinh, hôm nay thầy sẽ hướng dẫn các em giải quyết bài toán này một cách rất đơn giản.',
  'truyen-ma-nguyen-ngoc': 'Đêm đã khuya, xung quanh tĩnh lặng, chỉ còn lại tiếng gió rít qua khe cửa... và câu chuyện kinh dị bắt đầu.',

  'mai-anh': 'Xin chào, tôi là Mai Anh, giọng nữ Hà Nội dịu dàng, ngọt ngào, sẵn sàng đồng hành cùng bạn.',
  'chi-google': 'Xin chào các bạn, đây là chị Google huyền thoại trên TikTok đây, chúc các bạn một ngày thật vui vẻ nhé!',
  'genz-linh-dan': 'Hế lô cả nhà yêu, hôm nay Linh Đan sẽ dẫn mọi người đi khám phá một quán cà phê siêu xịn xò nha!',
  'em-be-bap': 'Con chào cô chú, con là bé Bắp, hôm nay con sẽ kể cho cô chú nghe một câu chuyện cổ tích rất hay ạ!',
  'my-duyen': 'Em chào cả nhà yêu nha, hôm nay shop em có rất nhiều deal sốc, mọi người bấm vào giỏ hàng ngay nha!',
  'ngoc-lan': 'Dạ xin chào mọi người, em là Ngọc Lan, giọng người con xứ Huế mộng mơ và tha thiết.',
  'thu-huong': 'Xin kính chào quý thính giả, mời quý vị cùng lắng nghe chuyên mục phong cách sống và giáo dục tuần này.',

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
    const neuralVoice = voiceIdToNeuralModel[voiceId] || 'vi-VN-NamMinhNeural';
    const sampleText = samplePhrases[voiceId] || 'Xin chào, đây là giọng đọc trí tuệ nhân tạo chất lượng cao của DubbingStation.';

    const comm = new Communicate(sampleText, neuralVoice);
    const stream = comm.stream();
    const chunks: Buffer[] = [];

    for await (const chunk of stream) {
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
      },
    });
  } catch (error) {
    console.error('Neural Voice Preview Error:', error);
    return NextResponse.json({ error: 'Lỗi tạo âm thanh mẫu' }, { status: 500 });
  }
}
