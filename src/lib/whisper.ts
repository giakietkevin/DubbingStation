/**
 * DubbingStation - Whisper AI Speech-to-Text Transcriber Service
 * Xử lý định dạng kết quả nhận diện giọng nói chuẩn OpenAI Whisper
 * Hỗ trợ xuất SRT, VTT, TXT và format phân đoạn theo timestamp
 */

export interface WhisperSegment {
  id: number;
  start: number;       // Thời gian bắt đầu (giây)
  end: number;         // Thời gian kết thúc (giây)
  text: string;        // Nội dung câu thoại
  speaker?: string;    // Nhận diện nhân vật (Speaker 1, Speaker 2)
  confidence?: number; // Độ tin cậy (0.0 - 1.0)
}

export interface WhisperTranscriptionResult {
  text: string;
  language: string;
  durationSec: number;
  segments: WhisperSegment[];
}

/**
 * Chuyển số giây sang timestamp chuẩn SRT: 00:01:23,456
 */
export function formatTimestampSRT(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);

  const pad = (n: number, z = 2) => String(n).padStart(z, '0');
  return `${pad(hrs)}:${pad(mins)}:${pad(secs)},${pad(ms, 3)}`;
}

/**
 * Chuyển số giây sang timestamp chuẩn VTT: 00:01:23.456
 */
export function formatTimestampVTT(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);

  const pad = (n: number, z = 2) => String(n).padStart(z, '0');
  return `${pad(hrs)}:${pad(mins)}:${pad(secs)}.${pad(ms, 3)}`;
}

/**
 * Whisper đôi khi chèn lại cùng một cụm từ nhiều lần trong một chunk.
 * Chỉ gộp khi các từ lặp liền nhau và chiếm phần lớn segment, tránh xóa
 * những câu lặp có chủ đích ở các timestamp khác nhau.
 */
export function removeRepeatedText(text: string): string {
  let cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';

  // 1. L\u1ecdc c\u00e1c c\u00e2u r\u00e1c / hallucination th\u01b0\u1eddng g\u1eb7p c\u1ee7a Whisper trong c\u00e1c \u0111o\u1ea1n im l\u1eb7ng/nh\u1ea1c n\u1ec1n
  const hallucinationPatterns = [
    /^\s*([*^~#_\-.\\/|+=:;?!,])+\s*$/i,
    /^\s*(\[|\()?(music|applause|laughter|silence|blank_audio|ambient noise|chatter|whispering|gasp|sigh|sighs|cough|groan|groans|screams|panting|crying)(\]|\))?\s*$/i,
    /^\s*(\[|\()?(ti\u1ebfng nh\u1ea1c|\u00e2m nh\u1ea1c|ti\u1ebfng v\u1ed7 tay|ti\u1ebfng c\u01b0\u1eddi|im l\u1eb7ng|ti\u1ebfng th\u1edf d\u00e0i|ti\u1ebfng \u0111\u1ed9ng|ti\u1ebfng \u1ed3n)(\]|\))?\s*$/i,
    /^\s*(\[|\()?(ph\u1ee5 \u0111\u1ec1|vi\u1ec7t h\u00f3a|th\u1ef1c hi\u1ec7n)(\s+(b\u1edfi|\u0111\u01b0\u1ee3c th\u1ef1c hi\u1ec7n|vi\u1ec7t h\u00f3a|d\u1ecbch b\u1edfi))?(\]|\))?.*$/i,
    /^\s*(\[|\()?(subtitles? by|transcribed by|captioned by|translated by|amara\.org|opensubtitles)(\]|\))?.*$/i,
    /^\s*(please subscribe|like and subscribe|thanks for watching|thank you for watching|\u0111\u0103ng k\u00fd k\u00eanh|h\u00e3y like v\u00e0 share|c\u1ea3m \u01a1n \u0111\u00e3 theo d\u00f5i|c\u1ea3m \u01a1n c\u00e1c b\u1ea1n \u0111\u00e3 xem)\.?\s*$/i,
    /^[\u266a\u266b\u266c\s]+$/i,
  ];

  for (const pattern of hallucinationPatterns) {
    if (pattern.test(cleaned)) {
      return '';
    }
  }

  // 2. Kh\u1eed l\u1eb7p 1 t\u1eeb ho\u1eb7c c\u1ee5m t\u1eeb ng\u1eafn li\u00ean ti\u1ebfp d\u00f9ng Unicode boundaries (\p{L}\p{N})
  // Tr\u00e1nh tri\u1ec7t \u0111\u1ec3 vi\u1ec7c \b l\u00e0m \u0111\u1ee9t g\u00e3y t\u1eeb c\u00f3 d\u1ea5u ti\u1ebfng Vi\u1ec7t (r\u1ea5t, ng\u01b0\u1eddi, vi\u1ec7t, b\u1ea1n...)
  try {
    const repeatRegex = new RegExp('(?:^|\\s)([\\p{L}\\p{N}_\\-]+)(?:\\s+\\1){2,}(?=\\s|$)', 'giu');
    cleaned = cleaned.replace(repeatRegex, ' $1 $1').trim();
  } catch {
    cleaned = cleaned.replace(/\b(\w+)(?:\s+\1\b){2,}/gi, '$1 $1').trim();
  }

  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length < 4) return cleaned;

  // Chu\u1ea9n h\u00f3a t\u1eeb b\u1ea3o t\u1ed3n 100% nguy\u00ean \u00e2m c\u00f3 d\u1ea5u ti\u1ebfng Vi\u1ec7t (d\u1ea3i \u1ea0-\u1ef9 v\u00e0 Unicode Letters)
  let cleanWordRegex: RegExp;
  try {
    cleanWordRegex = new RegExp('[^\\p{L}\\p{N}]+', 'gu');
  } catch {
    cleanWordRegex = /[^a-z0-9\u00e0-\u1ef9\u00c0-\u1ef8]+/gi;
  }
  const normalizedWords = words.map((word) =>
    word.toLowerCase().replace(cleanWordRegex, ''),
  );

  for (let size = Math.min(14, Math.floor(words.length / 2)); size >= 1; size -= 1) {
    for (let start = 0; start + size * 2 <= words.length; start += 1) {
      const pattern = normalizedWords.slice(start, start + size).join(' ');
      if (!pattern || pattern.length < 2) continue;

      let repetitions = 1;
      let cursor = start + size;

      while (
        cursor + size <= words.length &&
        normalizedWords.slice(cursor, cursor + size).join(' ') === pattern
      ) {
        repetitions += 1;
        cursor += size;
      }

      const repeatedWordCount = repetitions * size;
      const coverage = repeatedWordCount / words.length;
      if (repetitions >= 2 && (repetitions >= 3 || coverage >= 0.45 || size >= 3)) {
        const deduplicated = [
          ...words.slice(0, start),
          ...words.slice(start, start + size),
          ...words.slice(cursor),
        ];
        return deduplicated.join(' ').replace(/\s+([,.!?;:])/g, '$1').trim();
      }
    }
  }

  return cleaned;
}

/**
 * Làm sạch và khử trùng lặp các phân đoạn Whisper (Whisper Segments Deduplication)
 * Khắc phục hiện tượng lặp câu ở biên stride (stride overlapping) mà không bỏ sót lời thoại thực
 */
export function cleanAndDeduplicateWhisperSegments(segments: WhisperSegment[]): WhisperSegment[] {
  if (!Array.isArray(segments) || segments.length === 0) return [];

  const sorted = [...segments]
    .filter((s) => s.text && s.text.trim().length > 0)
    .map((s) => ({ ...s, text: removeRepeatedText(s.text) }))
    .filter((s) => s.text.length > 0)
    .sort((a, b) => a.start - b.start || a.end - b.end);

  const cleanList: WhisperSegment[] = [];

  let normRegex: RegExp;
  try {
    normRegex = new RegExp('[^\\p{L}\\p{N}\\s]+', 'gu');
  } catch {
    normRegex = /[^a-z0-9à-ỹÀ-Ỹ\s]+/gi;
  }

  const normalize = (t: string) =>
    t.toLowerCase()
      .replace(normRegex, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  for (const seg of sorted) {
    if (cleanList.length === 0) {
      cleanList.push({ ...seg });
      continue;
    }

    const prev = cleanList[cleanList.length - 1];
    const prevNorm = normalize(prev.text);
    const currNorm = normalize(seg.text);

    const timeOverlap = seg.start < prev.end;
    const timeGap = seg.start - prev.end;
    const isVeryClose = timeOverlap || timeGap <= 0.8;

    // 1. Trùng lặp hoàn toàn
    if (prevNorm === currNorm && (timeOverlap || timeGap <= 3.0)) {
      prev.end = Math.max(prev.end, seg.end);
      continue;
    }

    // 2. Whisper stride can repeat a cue without placing it directly next to the original
    const recentDuplicate = cleanList
      .slice(-4)
      .find((candidate) => {
        const candidateNorm = normalize(candidate.text);
        const gap = seg.start - candidate.end;
        return candidateNorm.length >= 6 && candidateNorm === currNorm && gap <= 3.5;
      });

    if (recentDuplicate && recentDuplicate !== prev) {
      recentDuplicate.end = Math.max(recentDuplicate.end, seg.end);
      continue;
    }

    // 3. Câu sau chứa trọn vẹn câu trước do cắt dở ở stride boundary
    if (isVeryClose && currNorm.startsWith(prevNorm) && currNorm.length > prevNorm.length) {
      prev.text = seg.text;
      prev.end = Math.max(prev.end, seg.end);
      continue;
    }

    // 4. Câu trước chứa trọn vẹn câu sau
    if (isVeryClose && prevNorm.endsWith(currNorm) && prevNorm.length > currNorm.length) {
      prev.end = Math.max(prev.end, seg.end);
      continue;
    }

    // 5. Khử trùng lặp từ nối ở biên stride (Cross-Chunk Boundary Word Overlap)
    // Ví dụ: prev = "We have to find" và seg = "to find a way out" -> cắt bớt từ lặp "to find"
    if (isVeryClose) {
      const prevWords = prev.text.split(/\s+/);
      const currWords = seg.text.split(/\s+/);

      let overlapCount = 0;
      const maxOverlapCheck = Math.min(6, prevWords.length, currWords.length);

      for (let k = maxOverlapCheck; k >= 2; k--) {
        const prevTail = prevWords.slice(-k).map((w) => normalize(w)).join(' ');
        const currHead = currWords.slice(0, k).map((w) => normalize(w)).join(' ');
        if (prevTail && prevTail === currHead) {
          overlapCount = k;
          break;
        }
      }

      if (overlapCount > 0) {
        const trimmedWords = currWords.slice(overlapCount);
        if (trimmedWords.length === 0) {
          prev.end = Math.max(prev.end, seg.end);
          continue;
        }
        seg.text = trimmedWords.join(' ');
        seg.start = Math.max(seg.start, prev.end - 0.1);
      }
    }

    // 6. Nếu hai câu độc lập bị đè timestamp nhẹ: điều chỉnh timestamp sát video
    const adjusted: WhisperSegment = { ...seg };
    if (adjusted.start < prev.end) {
      if (prev.end - prev.start > 0.8) {
        prev.end = Math.max(prev.start + 0.5, adjusted.start - 0.05);
      } else {
        adjusted.start = prev.end + 0.05;
        if (adjusted.end <= adjusted.start) {
          adjusted.end = adjusted.start + 1.0;
        }
      }
    }

    cleanList.push(adjusted);
  }

  // 7. Tách các phân đoạn quá dài chứa nhiều câu thoại để phụ đề hiển thị tự nhiên
  const finalSegments = splitLongWhisperSegments(cleanList);

  return finalSegments.map((s, idx) => ({
    ...s,
    id: idx + 1,
    start: Number(s.start.toFixed(2)),
    end: Number(s.end.toFixed(2)),
  }));
}

/**
 * Tách các phân đoạn dài (> 5.5s) có nhiều câu thành các câu thoại ngắn
 * Giúp phụ đề ăn khớp nhịp nói và khẩu hình miệng của diễn viên
 */
export function splitLongWhisperSegments(segments: WhisperSegment[]): WhisperSegment[] {
  const result: WhisperSegment[] = [];

  for (const seg of segments) {
    const duration = seg.end - seg.start;
    const text = seg.text.trim();
    const words = text.split(/\s+/).filter(Boolean);

    // Chỉ tách khi phân đoạn dài hơn 5.5s và có ít nhất 8 từ
    if (duration > 5.5 && words.length >= 8) {
      // Tách câu theo các dấu câu kết thúc (. ! ? hoặc xuống dòng)
      const rawSentences = text
        .split(/(?<=[.!?])\s+|\n+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      if (rawSentences.length >= 2) {
        const totalWordCount = rawSentences.reduce(
          (sum, s) => sum + s.split(/\s+/).filter(Boolean).length,
          0
        );

        let currentStart = seg.start;
        for (let i = 0; i < rawSentences.length; i++) {
          const sText = rawSentences[i];
          const sWords = sText.split(/\s+/).filter(Boolean).length;
          const proportion = totalWordCount > 0 ? sWords / totalWordCount : 1 / rawSentences.length;
          const sDuration = Math.max(0.8, duration * proportion);
          const sEnd = i === rawSentences.length - 1 ? seg.end : Math.min(seg.end, currentStart + sDuration);

          result.push({
            id: result.length + 1,
            start: currentStart,
            end: sEnd,
            text: sText,
            speaker: seg.speaker,
          });

          currentStart = sEnd;
        }
        continue;
      }
    }

    result.push({ ...seg, id: result.length + 1 });
  }

  return result;
}

/**
 * Chuyển đổi danh sách WhisperSegments thành định dạng file .SRT
 */
export function exportToSRT(segments: WhisperSegment[]): string {
  const clean = cleanAndDeduplicateWhisperSegments(segments);
  return clean
    .map((seg, index) => {
      const startStr = formatTimestampSRT(seg.start);
      const endStr = formatTimestampSRT(seg.end);
      const speakerPrefix = seg.speaker ? `[${seg.speaker}] ` : '';
      return `${index + 1}\n${startStr} --> ${endStr}\n${speakerPrefix}${seg.text.trim()}\n`;
    })
    .join('\n');
}

/**
 * Chuyển đổi danh sách WhisperSegments thành định dạng file .VTT
 */
export function exportToVTT(segments: WhisperSegment[]): string {
  const clean = cleanAndDeduplicateWhisperSegments(segments);
  const body = clean
    .map((seg, index) => {
      const startStr = formatTimestampVTT(seg.start);
      const endStr = formatTimestampVTT(seg.end);
      const speakerPrefix = seg.speaker ? `<v ${seg.speaker}>` : '';
      return `${index + 1}\n${startStr} --> ${endStr}\n${speakerPrefix}${seg.text.trim()}\n`;
    })
    .join('\n');

  return `WEBVTT\n\n${body}`;
}

/**
 * Chuyển đổi thành văn bản thuần TXT
 */
export function exportToTXT(segments: WhisperSegment[]): string {
  const clean = cleanAndDeduplicateWhisperSegments(segments);
  return clean
    .map((seg) => {
      const speakerPrefix = seg.speaker ? `${seg.speaker}: ` : '';
      return `${speakerPrefix}${seg.text.trim()}`;
    })
    .join('\n\n');
}

/**
 * Bộ tạo dữ liệu mô phỏng Whisper AI (Mock Intelligent Transcriber)
 * Tự động tạo phân đoạn theo thời lượng và nội dung âm thanh
 */
export function mockWhisperTranscribe(
  durationSec: number = 24,
  language: string = 'vi'
): WhisperTranscriptionResult {
  const sampleSentencesVi = [
    { text: 'Chào mừng các bạn đã quay trở lại với kênh công nghệ DubbingStation.', speaker: 'Người dẫn' },
    { text: 'Hôm nay chúng ta sẽ cùng trải nghiệm tính năng nhận diện giọng nói siêu tốc bằng Whisper AI.', speaker: 'Người dẫn' },
    { text: 'Công nghệ này có khả năng bóc băng chính xác và tự động gắn mốc thời gian phụ đề.', speaker: 'Khách mời' },
    { text: 'Sau đó, bạn có thể chuyển trực tiếp file phụ đề này sang phòng thu để lồng tiếng đa ngôn ngữ.', speaker: 'Người dẫn' },
  ];

  const sampleSentencesEn = [
    { text: 'Welcome back to the DubbingStation AI audio platform.', speaker: 'Host' },
    { text: 'Today we are exploring ultra-accurate speech-to-text powered by OpenAI Whisper.', speaker: 'Host' },
    { text: 'It automatically detects languages, timestamps each sentence, and removes background noise.', speaker: 'Speaker 2' },
    { text: 'You can immediately export to SRT subtitles or convert it into a video dubbing project.', speaker: 'Host' },
  ];

  const sentences = language === 'en' ? sampleSentencesEn : sampleSentencesVi;
  const timePerSegment = durationSec / sentences.length;

  const segments: WhisperSegment[] = sentences.map((item, idx) => {
    const start = idx * timePerSegment;
    const end = Math.min(durationSec, (idx + 1) * timePerSegment);
    return {
      id: idx + 1,
      start: parseFloat(start.toFixed(2)),
      end: parseFloat(end.toFixed(2)),
      text: item.text,
      speaker: item.speaker,
      confidence: 0.96,
    };
  });

  const fullText = segments.map((s) => s.text).join(' ');

  return {
    text: fullText,
    language,
    durationSec,
    segments,
  };
}
