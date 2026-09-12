/**
 * DubbingStation - Vietnamese Subtitle Contextual Polisher
 * Bộ tinh chỉnh ngữ cảnh & khẩu ngữ tự nhiên cho phụ đề Tiếng Việt (Cinematic Vietnamese Subtitles)
 *
 * Tiêu chí cốt lõi:
 * 1. Thoát khỏi các khuôn mẫu dịch máy thô cứng (word-by-word) của Google Translate.
 * 2. Bảo vệ tuyệt đối các danh từ ghép tiếng Việt (người bạn, làm bạn, bạn bè, bạn gái, bạn trai, anh em...) không bị biến dạng.
 * 3. Xóa bỏ đại từ xưng hô thừa thãi (Subject Pronoun Ellipsis) trong văn thoại giao tiếp tự nhiên của người Việt.
 * 4. Xử lý đại từ xưng hô chuẩn xác theo đúng ngữ cảnh & phong cách đã chọn (cậu-tớ, mày-tao, anh-em, ngươi-ta...).
 * 5. Ngắn gọn, súc tích, giữ nguyên nhịp độ đọc phụ đề điện ảnh (1-3 giây/câu).
 */

export type SubtitleTone = 'natural' | 'conversational' | 'dramatic' | 'romantic' | 'period' | 'polite';

interface PolishOptions {
  tone?: SubtitleTone;
  speaker?: string;
  prevText?: string;
  nextText?: string;
}

/**
 * Danh sách cụm từ danh từ ghép có chứa chữ "bạn", "anh", "em", "người" cần được bảo vệ nguyên vẹn
 */
const PROTECTED_COMPOUNDS = [
  'người bạn thân nhất',
  'người bạn thân',
  'người bạn đời',
  'người bạn cũ',
  'người bạn',
  'người quen',
  'người thân',
  'người yêu',
  'con người',
  'bản thân tôi',
  'bản thân bạn',
  'bản thân mình',
  'chính tôi',
  'chính bạn',
  'bạn bè',
  'bạn thân',
  'làm bạn',
  'kết bạn',
  'tình bạn',
  'nhóm bạn',
  'hội bạn',
  'bạn cùng phòng',
  'bạn cùng lớp',
  'bạn học',
  'bạn gái',
  'bạn trai',
  'bạn đời',
  'bạn đồng hành',
  'bạn diễn',
  'bạn nhậu',
  'anh trai',
  'em gái',
  'anh họ',
  'em họ',
  'chị em',
  'anh em',
  'anh chị em',
  'chị gái',
  'ba mẹ',
  'bố mẹ',
  'ông bà',
];

/**
 * Các khuôn mẫu dịch máy máy móc (Machine Translation Artifacts) cần được viết lại tự nhiên
 */
const MT_REPLACEMENTS: Array<[RegExp, string]> = [
  // Cấu trúc mệnh lệnh / thỉnh cầu cứng nhắc
  [/^Làm ơn hãy\s+/i, 'Làm ơn '],
  [/^Làm ơn,\s+/i, 'Làm ơn '],
  [/^Hãy chắc chắn rằng\s+(bạn|cậu|mày)?\s*/i, 'Nhớ là '],
  [/^Chắc chắn rằng\s+(bạn|cậu|mày)?\s*/i, 'Nhớ là '],
  [/^Đảm bảo rằng\s+(bạn|cậu|mày)?\s*/i, 'Nhớ là '],
  [/^Hãy để tôi\s+/i, 'Để tôi '],
  [/^Hãy để chúng tôi\s+/i, 'Để chúng tôi '],
  [/^Hãy để chúng ta\s+/i, 'Cùng nhau '],
  [/^Hãy nói cho tôi biết\s+/i, 'Nói cho tôi biết '],
  [/^Hãy nói với tôi\s+/i, 'Nói với tôi '],
  [/^Hãy cẩn thận!?$/i, 'Coi chừng đấy!'],
  [/^Hãy nhanh lên!?$/i, 'Nhanh lên nào!'],
  [/^Hãy dừng lại!?$/i, 'Dừng lại ngay!'],
  [/^Hãy im lặng!?$/i, 'Trật tự nào!'],
  [/^Im miệng!?$/i, 'Im đi!'],
  [/^Im mồm!?$/i, 'Im đi!'],

  // Cảm thán / Khẳng định điện ảnh
  [/^Điều đó là không thể\.?$/i, 'Không thể nào!'],
  [/^Điều đó không thể nào xảy ra\.?$/i, 'Chuyện đó không thể nào xảy ra!'],
  [/^Điều đó không thể xảy ra\.?$/i, 'Chuyện đó không thể nào xảy ra!'],
  [/^Không có cách nào!?$/i, 'Không đời nào!'],
  [/^Không có cách nào đâu\.?$/i, 'Không đời nào đâu!'],
  [/^Tôi không thể tin được\s+(rằng)?\s*/i, 'Không thể tin nổi '],
  [/^Tôi không thể tin nổi\s+(rằng)?\s*/i, 'Không thể tin nổi '],
  [/^Đó là một ý tưởng (tuyệt vời|hay)\.?$/i, 'Ý hay đấy!'],
  [/^Đó là ý tưởng (tuyệt vời|hay)\.?$/i, 'Ý hay đấy!'],
  [/^Đó là lý do tại sao\s+/i, 'Thế nên '],
  [/^Đó là lý do vì sao\s+/i, 'Thế nên '],
  [/^Tôi có một cảm giác xấu về điều này\.?$/i, 'Thấy có điềm chẳng lành rồi!'],
  [/^Tôi có cảm giác không lành về chuyện này\.?$/i, 'Thấy có điềm chẳng lành rồi!'],
  [/^Tôi đã nói với bạn rồi mà\.?$/i, 'Đã bảo rồi mà!'],
  [/^Tôi đã bảo bạn rồi mà\.?$/i, 'Đã bảo rồi mà!'],
  [/^Tôi phải đi bây giờ\.?$/i, 'Tôi phải đi đây.'],
  [/^Tôi phải đi ngay bây giờ\.?$/i, 'Tôi phải đi ngay đây.'],
  [/^Bạn đang nói về cái gì vậy\??$/i, 'Nói cái gì thế?'],
  [/^Bạn đang nói cái quái gì vậy\??$/i, 'Nói cái quái gì thế?'],
  [/^Bạn có ý gì\??$/i, 'Ý là sao?'],
  [/^Ý của bạn là gì\??$/i, 'Ý là sao?'],
  [/^Tôi không biết phải nói gì\.?$/i, 'Chẳng biết nói gì nữa.'],
  [/^Tôi chẳng biết phải nói gì\.?$/i, 'Chẳng biết nói gì nữa.'],
  [/^Cảm ơn bạn rất nhiều\.?$/i, 'Cảm ơn nhiều nhé!'],
  [/^Cảm ơn bạn nhiều\.?$/i, 'Cảm ơn nhiều nhé!'],
  [/^Xin chào bạn\.?$/i, 'Chào nhé!'],
  [/^Đừng lo lắng về điều đó\.?$/i, 'Đừng bận tâm chuyện đó.'],
  [/^Đừng lo lắng về nó\.?$/i, 'Đừng bận tâm chuyện đó.'],
  [/^Đừng lo lắng\.?$/i, 'Đừng lo!'],
  [/^Không có gì đâu\.?$/i, 'Không có gì đâu nhé!'],
  [/^Không có vấn đề gì\.?$/i, 'Không vấn đề gì đâu.'],
  [/^Tôi hiểu rồi\.?$/i, 'Hiểu rồi.'],
  [/^Tôi biết rồi\.?$/i, 'Biết rồi.'],
  [/^Tôi đồng ý\.?$/i, 'Đồng ý.'],
  [/^Chuyện gì đang xảy ra ở đây vậy\??$/i, 'Có chuyện gì ở đây thế?'],
  [/^Chuyện gì đang xảy ra vậy\??$/i, 'Có chuyện gì thế?'],
  [/^Chuyện gì đã xảy ra vậy\??$/i, 'Chuyện gì đã xảy ra thế?'],
  [/^Cái quái gì đang diễn ra vậy\??$/i, 'Cái quái gì thế này?'],
  [/^Cái quái gì đang xảy ra vậy\??$/i, 'Cái quái gì thế này?'],
  [/^Cái quái gì thế này\??$/i, 'Cái quái gì thế này?'],
  [/^Bạn có chắc không\??$/i, 'Chắc chứ?'],
  [/^Bạn có ổn không\??$/i, 'Ổn chứ?'],
  [/^Bạn có sao không\??$/i, 'Có sao không?'],
  [/^Tôi không nghĩ vậy\.?$/i, 'Tôi không nghĩ thế đâu.'],
  [/^Hãy để tôi đi\.?$/i, 'Thả tôi ra!'],
  [/^Bạn đang đùa tôi à\??$/i, 'Đang đùa đấy à?'],
  [/^Bạn đang đùa sao\??$/i, 'Đùa đấy à?'],
  [/^Tôi không có thời gian\.?$/i, 'Tôi không có thời gian đâu.'],
  [/^Bạn có nghe thấy tôi không\??$/i, 'Nghe rõ không?'],
  [/^Bạn nghĩ sao\??$/i, 'Thấy sao?'],
  [/^Bạn thấy sao\??$/i, 'Thấy sao?'],
  [/^Thôi nào bạn!?$/i, 'Thôi nào!'],
  [/^Chờ một chút!?$/i, 'Chờ chút!'],
  [/^Đợi một chút!?$/i, 'Đợi chút!'],
  [/^Bình tĩnh nào!?$/i, 'Bình tĩnh đi!'],
  [/^Tha cho tôi đi!?$/i, 'Tha cho tôi đi!'],
  [/^Ôi chúa ơi!?$/i, 'Trời đất ơi!'],
  [/^Lạy chúa tôi!?$/i, 'Trời ơi!'],
  [/^Tất nhiên rồi\.?$/i, 'Tất nhiên rồi!'],
  [/^Chuẩn rồi\.?$/i, 'Chuẩn rồi!'],
  [/^Làm sao có thể như vậy được\??$/i, 'Sao có thể như thế được?'],
  [/^Nhìn bạn kìa\.?$/i, 'Nhìn kìa.'],

  // Bỏ các từ đệm dịch thô rườm rà
  [/\bmột cách nhanh chóng\b/gi, 'nhanh chóng'],
  [/\bmột cách dễ dàng\b/gi, 'dễ dàng'],
  [/\bmột cách cẩn thận\b/gi, 'cẩn thận'],
  [/\bmột cách rõ ràng\b/gi, 'rõ ràng'],
  [/\bmột cách bí mật\b/gi, 'bí mật'],
  [/\bmột cách hoàn hảo\b/gi, 'hoàn hảo'],
  [/\btrong thực tế\b/gi, 'thực ra'],
  [/\btrên thực tế\b/gi, 'thực ra'],
  [/\bcó khả năng là\b/gi, 'có thể là'],
  [/\bcó ý nghĩa\b/gi, 'hợp lý'],
  [/\blàm thế nào trên trái đất\b/gi, 'làm thế quái nào'],
];

/**
 * Xóa bỏ đại từ xưng hô đầu câu trong câu hỏi giao tiếp (Subject Pronoun Ellipsis)
 * Tạo ngữ điệu đàm thoại điện ảnh tự nhiên: "Bạn có đói không?" -> "Đói không?"
 */
function applySubjectPronounEllipsis(text: string): string {
  let res = text;

  // Câu hỏi "Bạn có ... không?"
  res = res.replace(/^Bạn có thể\s+(.*?)\s+không\??$/i, 'Có thể $1 không?');
  res = res.replace(/^Bạn có\s+(.*?)\s+không\??$/i, 'Có $1 không?');
  res = res.replace(/^Bạn đã\s+(.*?)\s+chưa\??$/i, '$1 chưa?');
  res = res.replace(/^Bạn muốn\s+(.*?)\s+không\??$/i, 'Muốn $1 không?');
  res = res.replace(/^Bạn đang làm gì vậy\??$/i, 'Đang làm gì thế?');
  res = res.replace(/^Bạn đang đi đâu vậy\??$/i, 'Đang đi đâu thế?');
  res = res.replace(/^Bạn là ai vậy\??$/i, 'Ai đấy?');
  res = res.replace(/^Bạn nói gì cơ\??$/i, 'Nói gì cơ?');

  return res;
}

/**
 * Tinh chỉnh câu phụ đề Tiếng Việt theo ngữ cảnh
 */
export function polishVietnameseSubtitle(rawText: string, options: PolishOptions = {}): string {
  if (!rawText || !rawText.trim()) return rawText;

  const { tone = 'natural' } = options;
  let text = rawText.trim();

  // BƯỚC 1: Bảo vệ các danh từ ghép bằng Placeholders
  const placeholders: Array<{ token: string; original: string }> = [];
  PROTECTED_COMPOUNDS.forEach((compound, idx) => {
    const regex = new RegExp(`\\b${compound}\\b`, 'gi');
    if (regex.test(text)) {
      const token = `__PROTECTED_COMPOUND_${idx}__`;
      placeholders.push({ token, original: compound });
      text = text.replace(regex, token);
    }
  });

  // BƯỚC 2: Chuẩn hóa các cụm từ dịch máy thô (MT Replacements)
  for (const [pattern, replacement] of MT_REPLACEMENTS) {
    if (pattern.test(text)) {
      text = text.replace(pattern, replacement);
    }
  }

  // BƯỚC 3: Lược bỏ chủ ngữ thô cứng trong hội thoại đời thường (Subject Pronoun Ellipsis)
  text = applySubjectPronounEllipsis(text);

  // BƯỚC 4: Xử lý đại từ xưng hô theo Tone được người dùng lựa chọn
  if (tone === 'conversational') {
    // Văn phong Bạn bè / Đời thường: cậu - tớ / các cậu / mình
    text = text
      .replace(/\bcác bạn\b/gi, 'các cậu')
      .replace(/\bbạn ơi\b/gi, 'cậu ơi')
      .replace(/\bcủa bạn\b/gi, 'của cậu')
      .replace(/\bcho bạn\b/gi, 'cho cậu')
      .replace(/\bvới bạn\b/gi, 'với cậu')
      .replace(/\bbạn\b/gi, 'cậu')
      .replace(/\btôi\b/gi, 'tớ')
      .replace(/\banh ấy\b/gi, 'anh ta')
      .replace(/\bcô ấy\b/gi, 'cô ta');
  } else if (tone === 'dramatic') {
    // Văn phong Kịch tính / Hành động / Đối đầu: mày - tao / tụi mày / bọn tao
    text = text
      .replace(/\bcác bạn\b/gi, 'tụi mày')
      .replace(/\bchúng tôi\b/gi, 'tụi tao')
      .replace(/\bcủa bạn\b/gi, 'của mày')
      .replace(/\bcho bạn\b/gi, 'cho mày')
      .replace(/\bvới bạn\b/gi, 'với mày')
      .replace(/\bbạn ơi\b/gi, 'mày ơi')
      .replace(/\bbạn\b/gi, 'mày')
      .replace(/\btôi\b/gi, 'tao')
      .replace(/\banh ấy\b/gi, 'hắn')
      .replace(/\bcô ấy\b/gi, 'ả ta')
      .replace(/\bhọ\b/gi, 'bọn chúng');
  } else if (tone === 'period') {
    // Văn phong Cổ trang / Kiếm hiệp: ngươi - ta / các ngươi / chúng ta
    text = text
      .replace(/\bcác bạn\b/gi, 'các ngươi')
      .replace(/\bchúng tôi\b/gi, 'chúng ta')
      .replace(/\bcủa bạn\b/gi, 'của ngươi')
      .replace(/\bcho bạn\b/gi, 'cho ngươi')
      .replace(/\bvới bạn\b/gi, 'với ngươi')
      .replace(/\bbạn\b/gi, 'ngươi')
      .replace(/\btôi\b/gi, 'ta')
      .replace(/\bcô ấy\b/gi, 'nàng')
      .replace(/\banh ấy\b/gi, 'hắn');
  } else if (tone === 'romantic') {
    // Văn phong Tình cảm / Lãng mạn: anh - em
    text = text
      .replace(/\bcác bạn\b/gi, 'mọi người')
      .replace(/\bbạn ơi\b/gi, 'em ơi')
      .replace(/\bcủa bạn\b/gi, 'của em')
      .replace(/\bcho bạn\b/gi, 'cho em')
      .replace(/\bvới bạn\b/gi, 'với em')
      .replace(/\bbạn\b/gi, 'em')
      .replace(/\btôi\b/gi, 'anh');
  } else if (tone === 'polite') {
    // Lịch sự / Công sở: giữ xưng hô lịch thiệp
    text = text
      .replace(/\bcác bạn\b/gi, 'các anh chị')
      .replace(/\bbạn\b/gi, 'anh/chị');
  } else {
    // Tone 'natural' mặc định:
    // Thoát ý tự nhiên, xưng hô linh hoạt, không cứng nhắc "bạn/tôi"
    text = text
      .replace(/\bTôi yêu bạn\b/gi, 'Tôi yêu cậu')
      .replace(/\bNhìn bạn kìa\b/gi, 'Nhìn kìa')
      .replace(/\bBạn ơi\b/gi, 'Này ơi')
      .replace(/\bcủa bạn\b/gi, 'của cậu')
      .replace(/\bcho bạn\b/gi, 'cho cậu');
  }

  // BƯỚC 5: Khôi phục lại các danh từ ghép được bảo vệ
  placeholders.forEach(({ token, original }) => {
    text = text.replace(new RegExp(token, 'g'), original);
  });

  // BƯỚC 6: Trợ từ cảm thán tự nhiên ở đuôi câu hỏi
  if (text.endsWith('?')) {
    text = text
      .replace(/\bđúng không\?$/i, 'phải không?')
      .replace(/\bthật không\?$/i, 'thật chứ?')
      .replace(/\bđược không\?$/i, 'được chứ?');
  }

  // BƯỚC 7: Dọn dẹp khoảng trắng, dấu câu và viết hoa đầu câu
  text = text
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.!?;:])/g, '$1')
    .trim();

  if (text.length > 0) {
    text = text.charAt(0).toUpperCase() + text.slice(1);
  }

  return text;
}

/**
 * Tinh chỉnh toàn bộ danh sách phụ đề theo mảng
 */
export function polishVietnameseSubtitleBatch(
  cues: Array<{ text: string; speaker?: string; startTime?: number; endTime?: number }>,
  tone: SubtitleTone = 'natural'
): string[] {
  if (!Array.isArray(cues) || cues.length === 0) return [];

  const results: string[] = [];
  for (let i = 0; i < cues.length; i++) {
    const current = cues[i];
    const prev = i > 0 ? cues[i - 1].text : '';
    const next = i < cues.length - 1 ? cues[i + 1].text : '';

    const polished = polishVietnameseSubtitle(current.text, {
      tone,
      speaker: current.speaker,
      prevText: prev,
      nextText: next,
    });

    results.push(polished);
  }

  return results;
}
