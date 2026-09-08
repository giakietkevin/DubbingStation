export interface VoicePersonaConfig {
  neuralModel: string;
  pitch: string; // VD: '-45Hz', '+65Hz'
  rate: string;  // VD: '-10%', '+15%'
  volume: string;
  samplePhrase: string;
  provider?: 'microsoft' | 'openai' | 'piper' | 'google' | 'huggingface';
  openAIVoice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  piperModel?: string;
  hfModel?: string;
  gender?: 'male' | 'female';
}

// Bảng cấu hình âm sắc, cao độ (pitch), tốc độ (rate) và câu thoại đặc trưng cho từng nhân vật
export const voicePersonaProfiles: Record<string, VoicePersonaConfig> = {
  // ==========================================
  // 1. TIẾNG VIỆT - TIKTOK & VIRAL
  // ==========================================
  'chi-google': {
    neuralModel: 'google-vietnamese',
    pitch: '+0Hz',
    rate: '+0%',
    volume: '+0%',
    samplePhrase: 'Xin chào các bạn, đây là chị Google huyền thoại trên TikTok đây, chúc các bạn một ngày thật vui vẻ nhé!',
    provider: 'google',
  },
  'genz-linh-dan': {
    neuralModel: 'vi-VN-HoaiMyNeural',
    pitch: '+32Hz',
    rate: '+22%',
    volume: '+5%',
    samplePhrase: 'Hế lô cả nhà yêu, hôm nay Linh Đan sẽ dẫn mọi người đi săn deal siêu hời nha!',
    provider: 'microsoft',
  },
  'nam-than-review': {
    neuralModel: 'vi-VN-NamMinhNeural',
    pitch: '+12Hz',
    rate: '+16%',
    volume: '+5%',
    samplePhrase: 'Hello anh em, hôm nay mình sẽ review cho mọi người một con máy siêu phẩm cực kỳ đỉnh chóp nhé!',
    provider: 'microsoft',
  },
  'em-be-bap': {
    neuralModel: 'vi-VN-HoaiMyNeural',
    pitch: '+58Hz',
    rate: '+8%',
    volume: '+0%',
    samplePhrase: 'Con chào cô chú, con là bé Bắp, hôm nay con sẽ kể cho cô chú nghe một câu chuyện cổ tích rất hay ạ!',
    provider: 'microsoft',
  },

  // ==========================================
  // 2. REVIEW PHIM & TRUYỆN DÀI
  // ==========================================
  'bac-ba-review': {
    neuralModel: 'vi-VN-NamMinhNeural',
    pitch: '-35Hz',
    rate: '-10%',
    volume: '+10%',
    samplePhrase: 'Chào mừng các bạn đã quay trở lại với kênh tóm tắt phim của Bác Ba. Hôm nay chúng ta sẽ cùng khám phá một siêu phẩm kịch tính nhé!',
    provider: 'microsoft',
  },
  'truyen-ma-nguyen-ngoc': {
    neuralModel: 'vi-VN-NamMinhNeural',
    pitch: '-48Hz',
    rate: '-24%',
    volume: '-5%',
    samplePhrase: 'Đêm đã khuya, xung quanh tĩnh lặng, chỉ còn lại tiếng gió rít qua khe cửa... và câu chuyện kinh dị bắt đầu.',
    provider: 'microsoft',
  },
  'minh-khang': {
    neuralModel: 'vi-VN-NamMinhNeural',
    pitch: '-10Hz',
    rate: '+0%',
    volume: '+0%',
    samplePhrase: 'Xin chào, tôi là Minh Khang. Giọng đọc trầm ấm, truyền cảm, rất phù hợp cho truyện dài và thuyết minh.',
    provider: 'microsoft',
  },
  'mai-anh': {
    neuralModel: 'vi-VN-HoaiMyNeural',
    pitch: '+6Hz',
    rate: '-4%',
    volume: '+0%',
    samplePhrase: 'Xin chào, tôi là Mai Anh, giọng nữ Hà Nội dịu dàng, ngọt ngào, sẵn sàng đồng hành cùng bạn.',
    provider: 'microsoft',
  },
  'hoang-nam': {
    neuralModel: 'vi_VN-25hours_single-low',
    pitch: '+0Hz',
    rate: '+0%',
    volume: '+0%',
    samplePhrase: 'Chào mọi người nha, tui là Hoàng Nam, giọng miền Nam thân thiện và gần gũi nè.',
    provider: 'piper',
    piperModel: 'vi_VN-25hours_single-low.onnx',
  },
  'ngoc-lan': {
    neuralModel: 'vi-VN-HoaiMyNeural',
    pitch: '-12Hz',
    rate: '-12%',
    volume: '+0%',
    samplePhrase: 'Dạ xin chào mọi người, em là Ngọc Lan, giọng người con xứ Huế mộng mơ và tha thiết.',
    provider: 'microsoft',
  },

  // ==========================================
  // 3. VIVOS DATASET CORPUS (AILAB - ĐHQG TP.HCM • HUGGING FACE)
  // ==========================================
  'vivos-nam-saigon': {
    neuralModel: 'vi_VN-25hours_single-low',
    pitch: '+0Hz',
    rate: '+0%',
    volume: '+5%',
    samplePhrase: 'Chào mọi người, mình là Minh Trí từ VIVOS corpus. Giọng nói người thật Nam Bộ mộc mạc, tự nhiên và gần gũi.',
    provider: 'huggingface',
    piperModel: 'vi_VN-25hours_single-low.onnx',
    hfModel: 'rhasspy/piper-voices/vi_VN-25hours_single-low',
    gender: 'male',
  },
  'vivos-nu-hanoi': {
    neuralModel: 'facebook/mms-tts-vie',
    pitch: '+0Hz',
    rate: '+0%',
    volume: '+0%',
    samplePhrase: 'Xin chào các bạn, mình là Phương Thảo từ VIVOS dataset. Giọng nói trong trẻo, tự nhiên chuẩn người Hà Nội.',
    provider: 'huggingface',
    piperModel: 'vi_VN-vivos-x_low.onnx',
    hfModel: 'facebook/mms-tts-vie',
    gender: 'female',
  },
  'vivos-bao-tram': {
    neuralModel: 'vi_VN-vivos-x_low',
    pitch: '+0Hz',
    rate: '+0%',
    volume: '+5%',
    samplePhrase: 'Xin chào, đây là giọng đọc Bảo Trâm từ bộ dữ liệu VIVOS của AILAB trên Hugging Face, giọng nữ người thật Nam Bộ mộc mạc.',
    provider: 'huggingface',
    piperModel: 'vi_VN-vivos-x_low.onnx',
    hfModel: 'rhasspy/piper-voices/vi_VN-vivos-x_low',
    gender: 'female',
  },

  // ==========================================
  // 4. MOZILLA COMMON VOICE 17.0 (ĐA VÙNG MIỀN • HUGGING FACE)
  // ==========================================
  'cv-nam-mientrung': {
    neuralModel: 'facebook/mms-tts-vie',
    pitch: '+0Hz',
    rate: '+0%',
    volume: '+4%',
    samplePhrase: 'Chào anh em bạn bè bốn phương! Mình là Hải Đăng, giọng nói người con xứ Đà Nẵng - Quảng Nam trên Common Voice.',
    provider: 'huggingface',
    piperModel: 'vi_VN-25hours_single-low.onnx',
    hfModel: 'facebook/mms-tts-vie',
    gender: 'male',
  },
  'cv-nu-nghetinh': {
    neuralModel: 'facebook/mms-tts-vie',
    pitch: '+0Hz',
    rate: '+0%',
    volume: '+2%',
    samplePhrase: 'Dạ xin chào mọi người, em là Lam Giang. Giọng con gái xứ Nghệ ngọt ngào, mộc mạc và chân thành từ Common Voice.',
    provider: 'huggingface',
    piperModel: 'vi_VN-vivos-x_low.onnx',
    hfModel: 'facebook/mms-tts-vie',
    gender: 'female',
  },
  'cv-bac-sau-mientay': {
    neuralModel: 'vi_VN-25hours_single-low',
    pitch: '+0Hz',
    rate: '+0%',
    volume: '+8%',
    samplePhrase: 'Mấy đứa nhỏ về chơi miền Tây hả con? Ngồi xuống đây uống miếng trà, ăn trái cây miệt vườn với chú Sáu nè!',
    provider: 'huggingface',
    piperModel: 'vi_VN-25hours_single-low.onnx',
    hfModel: 'rhasspy/piper-voices/vi_VN-25hours_single-low',
    gender: 'male',
  },
  'cv-nam-phoco': {
    neuralModel: 'facebook/mms-tts-vie',
    pitch: '+0Hz',
    rate: '+0%',
    volume: '+4%',
    samplePhrase: 'Hà Nội mùa này đẹp lắm các bác ạ. Tôi là Hùng, xin gửi tới quý thính giả những câu chuyện về một thời phố cổ nghìn năm.',
    provider: 'huggingface',
    piperModel: 'vi_VN-25hours_single-low.onnx',
    hfModel: 'facebook/mms-tts-vie',
    gender: 'male',
  },
  'cv-nu-congso': {
    neuralModel: 'facebook/mms-tts-vie',
    pitch: '+0Hz',
    rate: '+0%',
    volume: '+0%',
    samplePhrase: 'Chào các bạn, mình là Thanh Trúc từ Common Voice. Một giọng nói đàm thoại đời thường, gần gũi và nhiều năng lượng tích cực.',
    provider: 'huggingface',
    piperModel: 'vi_VN-vivos-x_low.onnx',
    hfModel: 'facebook/mms-tts-vie',
    gender: 'female',
  },

  // ==========================================
  // 5. OPENSLR 57 DATASET (STUDIO MASTER • HUGGING FACE)
  // ==========================================
  'openslr-audiobook-nam': {
    neuralModel: 'facebook/mms-tts-vie',
    pitch: '+0Hz',
    rate: '+0%',
    volume: '+6%',
    samplePhrase: 'Xin chào quý độc giả, tôi là Tuấn Kiệt từ OpenSLR 57. Giọng đọc chuẩn mực phòng thu chuyên nghiệp, âm sắc tròn trịa dành riêng cho sách nói và tiểu thuyết kinh điển.',
    provider: 'huggingface',
    piperModel: 'vi_VN-25hours_single-low.onnx',
    hfModel: 'facebook/mms-tts-vie',
    gender: 'male',
  },
  'openslr-nu-thuyetminh': {
    neuralModel: 'facebook/mms-tts-vie',
    pitch: '+0Hz',
    rate: '+0%',
    volume: '+4%',
    samplePhrase: 'Chào mừng quý khán giả đến với chương trình tài liệu khoa học. Tôi là Hồng Nhung từ OpenSLR 57, phát thanh viên chuẩn studio master.',
    provider: 'huggingface',
    piperModel: 'vi_VN-vivos-x_low.onnx',
    hfModel: 'facebook/mms-tts-vie',
    gender: 'female',
  },
  'openslr-nam-cinematic': {
    neuralModel: 'facebook/mms-tts-vie',
    pitch: '+0Hz',
    rate: '+0%',
    volume: '+8%',
    samplePhrase: 'Hàng triệu năm trước, thiên nhiên đã kiến tạo nên những kỳ quan vĩ đại. Đây là Hoàng Khôi, giọng thuyết minh điện ảnh từ OpenSLR 57.',
    provider: 'huggingface',
    piperModel: 'vi_VN-25hours_single-low.onnx',
    hfModel: 'facebook/mms-tts-vie',
    gender: 'male',
  },

  // ==========================================
  // 6. THỜI SỰ & GIÁO DỤC
  // ==========================================
  'quoc-bao': {
    neuralModel: 'vi-VN-NamMinhNeural',
    pitch: '-4Hz',
    rate: '+4%',
    volume: '+5%',
    samplePhrase: 'Kính chào quý vị và các bạn đang theo dõi bản tin thời sự được phát sóng trực tiếp trên đài truyền hình.',
    provider: 'microsoft',
  },
  'thu-huong': {
    neuralModel: 'vi-VN-HoaiMyNeural',
    pitch: '+0Hz',
    rate: '+2%',
    volume: '+0%',
    samplePhrase: 'Xin kính chào quý thính giả, mời quý vị cùng lắng nghe chuyên mục phong cách sống và giáo dục tuần này.',
    provider: 'microsoft',
  },
  'thay-giao-tung': {
    neuralModel: 'vi-VN-NamMinhNeural',
    pitch: '-14Hz',
    rate: '-10%',
    volume: '+0%',
    samplePhrase: 'Chào các em học sinh, hôm nay thầy sẽ hướng dẫn các em giải quyết bài toán này một cách rất đơn giản.',
    provider: 'microsoft',
  },
  'mc-hai-yen': {
    neuralModel: 'vi-VN-HoaiMyNeural',
    pitch: '+4Hz',
    rate: '+2%',
    volume: '+8%',
    samplePhrase: 'Kính thưa quý vị đại biểu, chào mừng quý vị đến với buổi dạ tiệc vinh danh thường niên ngày hôm nay.',
    provider: 'microsoft',
  },

  // ==========================================
  // 7. MIỀN TÂY, RADIO, ASMR & THỂ THAO GAMING
  // ==========================================
  'chu-bay-mientay': {
    neuralModel: 'vi_VN-25hours_single-low',
    pitch: '+0Hz',
    rate: '+4%',
    volume: '+5%',
    samplePhrase: 'Bữa nay tui dắt mấy bồ về miền Tây tát mương bắt cá, nướng trui ăn tại chỗ nghe bà con!',
    provider: 'piper',
    piperModel: 'vi_VN-25hours_single-low.onnx',
  },
  'di-nam-mientay': {
    neuralModel: 'vi_VN-vivos-x_low',
    pitch: '+0Hz',
    rate: '+2%',
    volume: '+5%',
    samplePhrase: 'Mấy đứa vô nhà ăn bánh xèo má mới chiên nè, giòn rụm thơm phức luôn nghen!',
    provider: 'piper',
    piperModel: 'vi_VN-vivos-x_low.onnx',
  },
  'tvb-huynh-lap': {
    neuralModel: 'vi-VN-NamMinhNeural',
    pitch: '-18Hz',
    rate: '-6%',
    volume: '+10%',
    samplePhrase: 'Huynh đệ, uống cạn chén rượu này rồi hãy cùng ta tương phùng trên đỉnh Hoa Sơn!',
    provider: 'microsoft',
  },
  'ha-my-asmr': {
    neuralModel: 'vi-VN-HoaiMyNeural',
    pitch: '-6Hz',
    rate: '-20%',
    volume: '-10%',
    samplePhrase: 'Hãy nhắm mắt lại, hít một hơi thật sâu... thả lỏng toàn bộ cơ thể và đón nhận sự bình yên.',
    provider: 'microsoft',
  },
  'thanh-binh-radio': {
    neuralModel: 'vi-VN-NamMinhNeural',
    pitch: '-22Hz',
    rate: '-14%',
    volume: '+0%',
    samplePhrase: 'Chào bạn, đêm nay thành phố có lạnh không? Hãy để âm nhạc và giọng nói này sưởi ấm tâm hồn bạn nhé.',
    provider: 'microsoft',
  },
  'caster-hoang-long': {
    neuralModel: 'vi-VN-NamMinhNeural',
    pitch: '+18Hz',
    rate: '+26%',
    volume: '+15%',
    samplePhrase: 'Một pha Pentakill không tưởng! Quét sạch toàn bộ đội hình đối phương trong sự ngỡ ngàng của khán giả!',
    provider: 'microsoft',
  },

  // ==========================================
  // 8. TIẾNG ANH (US & UK) & ĐIỆN ẢNH HOLLYWOOD
  // ==========================================
  'epic-trailer-marcus': {
    neuralModel: 'en-US-ChristopherNeural',
    pitch: '-32Hz',
    rate: '-16%',
    volume: '+15%',
    samplePhrase: 'In a world consumed by darkness, one hero rises to reclaim the destiny of mankind.',
    provider: 'microsoft',
  },
  'john-smith': {
    neuralModel: 'en-US-ChristopherNeural',
    pitch: '-5Hz',
    rate: '+0%',
    volume: '+0%',
    samplePhrase: 'Hello, I am John Smith. Welcome to the DubbingStation global voice studio.',
    provider: 'microsoft',
  },
  'sarah-jenkins': {
    neuralModel: 'en-US-JennyNeural',
    pitch: '+0Hz',
    rate: '+0%',
    volume: '+0%',
    samplePhrase: 'Hi there, I am Sarah Jenkins, offering warm and natural American English narration.',
    provider: 'microsoft',
  },
  'emma-watson': {
    neuralModel: 'en-GB-SoniaNeural',
    pitch: '+5Hz',
    rate: '-2%',
    volume: '+0%',
    samplePhrase: 'Greetings! This is Emma Watson, presenting an elegant British storytelling voice.',
    provider: 'microsoft',
  },
  'william-clarke': {
    neuralModel: 'en-GB-RyanNeural',
    pitch: '-20Hz',
    rate: '-10%',
    volume: '+5%',
    samplePhrase: 'Deep in the heart of nature, extraordinary creatures thrive. I am William Clarke for BBC Documentary.',
    provider: 'microsoft',
  },

  // ==========================================
  // 9. TIẾNG NHẬT
  // ==========================================
  'sakura-tanaka': {
    neuralModel: 'ja-JP-NanamiNeural',
    pitch: '+35Hz',
    rate: '+10%',
    volume: '+0%',
    samplePhrase: 'こんにちは！さくらです。アニメやゲームの世界へようこそ！',
    provider: 'microsoft',
  },
  'kenji-sato': {
    neuralModel: 'ja-JP-KeitaNeural',
    pitch: '-15Hz',
    rate: '+5%',
    volume: '+5%',
    samplePhrase: '俺の名前はケンジ！どんな困難にも立ち向かう熱い戦士だ！',
    provider: 'microsoft',
  },

  // ==========================================
  // 10. TIẾNG HÀN
  // ==========================================
  'min-jun': {
    neuralModel: 'ko-KR-InJoonNeural',
    pitch: '-5Hz',
    rate: '+0%',
    volume: '+0%',
    samplePhrase: '안녕하세요, 민준입니다. 당신의 마음에 따뜻한 목소리를 전해드립니다.',
    provider: 'microsoft',
  },
  'so-hee': {
    neuralModel: 'ko-KR-SunHiNeural',
    pitch: '+10Hz',
    rate: '+0%',
    volume: '+0%',
    samplePhrase: '안녕하세요, 소희입니다. 로맨틱한 드라마처럼 달콤한 하루 되세요.',
    provider: 'microsoft',
  },

  // ==========================================
  // 11. TIẾNG TRUNG
  // ==========================================
  'zhi-hao': {
    neuralModel: 'zh-CN-YunxiNeural',
    pitch: '-15Hz',
    rate: '-5%',
    volume: '+0%',
    samplePhrase: '天地浩瀚，侠骨柔情。我是志豪，为您呈现史诗般的中国传奇。',
    provider: 'microsoft',
  },
  'xiao-ting': {
    neuralModel: 'zh-CN-XiaoxiaoNeural',
    pitch: '+10Hz',
    rate: '+15%',
    volume: '+0%',
    samplePhrase: '哈喽大家好，我是小婷，今天带大家看最新最火的爆款短剧！',
    provider: 'microsoft',
  },

  // ==========================================
  // 12. OPENAI TTS - GIỌNG TỰ NHIÊN CAO CẤP
  // ==========================================
  'openai-nova': {
    neuralModel: 'openai-nova',
    pitch: '+0Hz',
    rate: '+0%',
    volume: '+0%',
    samplePhrase: 'Xin chào, đây là giọng Nova của OpenAI. Giọng đọc tự nhiên, ấm áp và chuyên nghiệp.',
    provider: 'openai',
    openAIVoice: 'nova',
  },
  'openai-echo': {
    neuralModel: 'openai-echo',
    pitch: '-5Hz',
    rate: '+0%',
    volume: '+0%',
    samplePhrase: 'Hello, this is Echo from OpenAI. Deep, resonant, and remarkably human-like.',
    provider: 'openai',
    openAIVoice: 'echo',
  },
  'openai-onyx': {
    neuralModel: 'openai-onyx',
    pitch: '-15Hz',
    rate: '-3%',
    volume: '+5%',
    samplePhrase: 'Greetings, I am Onyx. Authoritative, deep, and perfect for narration and documentaries.',
    provider: 'openai',
    openAIVoice: 'onyx',
  },
  'openai-fable': {
    neuralModel: 'openai-fable',
    pitch: '+0Hz',
    rate: '+0%',
    volume: '+0%',
    samplePhrase: 'Hi there, I am Fable. Warm British accent, expressive, ideal for storytelling.',
    provider: 'openai',
    openAIVoice: 'fable',
  },
  'openai-alloy': {
    neuralModel: 'openai-alloy',
    pitch: '+0Hz',
    rate: '+0%',
    volume: '+0%',
    samplePhrase: 'Hello, I am Alloy. Balanced, clear, and versatile for any content type.',
    provider: 'openai',
    openAIVoice: 'alloy',
  },
  'openai-shimmer': {
    neuralModel: 'openai-shimmer',
    pitch: '+8Hz',
    rate: '+0%',
    volume: '+0%',
    samplePhrase: 'Hi, I am Shimmer. Soft, pleasant, and great for friendly conversations.',
    provider: 'openai',
    openAIVoice: 'shimmer',
  },

  // ==========================================
  // 13. PIPER TTS - OFFLINE FREE NEURAL VOICES
  // ==========================================
  'piper-lessac': {
    neuralModel: 'en_US-lessac-medium',
    pitch: '+0Hz',
    rate: '+0%',
    volume: '+0%',
    samplePhrase: 'Hello, this is Lessac from Piper TTS. A natural, clear voice for narration.',
    provider: 'piper',
    piperModel: 'en_US-lessac-medium.onnx',
  },
  'piper-vivos': {
    neuralModel: 'vi_VN-vivos-x_low',
    pitch: '+0Hz',
    rate: '+0%',
    volume: '+0%',
    samplePhrase: 'Xin chào, đây là giọng đọc tiếng Việt offline Vivos từ Piper TTS.',
    provider: 'piper',
    piperModel: 'vi_VN-vivos-x_low.onnx',
  },
  'piper-25h': {
    neuralModel: 'vi_VN-25hours_single-low',
    pitch: '+0Hz',
    rate: '+0%',
    volume: '+0%',
    samplePhrase: 'Xin chào, đây là giọng đọc tiếng Việt offline 25 Hours từ Piper TTS.',
    provider: 'piper',
    piperModel: 'vi_VN-25hours_single-low.onnx',
  },

  // ==========================================
  // 14. TƯƠNG THÍCH NGƯỢC (BACKWARD COMPATIBILITY)
  // ==========================================
  'my-duyen': {
    neuralModel: 'vi_VN-vivos-x_low',
    pitch: '+0Hz',
    rate: '+0%',
    volume: '+0%',
    samplePhrase: 'Em chào cả nhà yêu nha, hôm nay shop em có rất nhiều deal sốc, mọi người bấm vào giỏ hàng ngay nha!',
    provider: 'piper',
    piperModel: 'vi_VN-vivos-x_low.onnx',
  },
  'piper-ryan': {
    neuralModel: 'en_US-lessac-medium',
    pitch: '-5Hz',
    rate: '+0%',
    volume: '+0%',
    samplePhrase: 'Hi there, I am Ryan from Piper TTS.',
    provider: 'piper',
    piperModel: 'en_US-lessac-medium.onnx',
  },
  'piper-amy': {
    neuralModel: 'en_US-lessac-medium',
    pitch: '+5Hz',
    rate: '+0%',
    volume: '+0%',
    samplePhrase: 'Hello, I am Amy from Piper TTS.',
    provider: 'piper',
    piperModel: 'en_US-lessac-medium.onnx',
  },
  'piper-john': {
    neuralModel: 'en_US-lessac-medium',
    pitch: '-3Hz',
    rate: '+0%',
    volume: '+0%',
    samplePhrase: 'Greetings, I am John from Piper TTS.',
    provider: 'piper',
    piperModel: 'en_US-lessac-medium.onnx',
  },
};
