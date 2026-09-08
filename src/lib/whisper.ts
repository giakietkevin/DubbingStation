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
 * Làm sạch và khử trùng lặp các phân đoạn Whisper (Whisper Segments Deduplication)
 * Khắc phục hiện tượng lặp câu ở biên stride (stride overlapping) mà không bỏ sót lời thoại thực
 */
export function cleanAndDeduplicateWhisperSegments(segments: WhisperSegment[]): WhisperSegment[] {
  if (!Array.isArray(segments) || segments.length === 0) return [];

  const sorted = [...segments]
    .filter((s) => s.text && s.text.trim().length > 0)
    .sort((a, b) => a.start - b.start || a.end - b.end);

  const cleanList: WhisperSegment[] = [];

  const normalize = (t: string) =>
    t.toLowerCase()
      .replace(/[.,/#!$%^&*;:{}=\-_`~()?"'«»“”]/g, ' ')
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
    const isVeryClose = timeOverlap || timeGap <= 0.6;

    // 1. Trùng lặp hoàn toàn
    if (prevNorm === currNorm && isVeryClose) {
      prev.end = Math.max(prev.end, seg.end);
      continue;
    }

    // 2. Câu sau chứa câu trước do cắt dở ở stride boundary
    if (isVeryClose && currNorm.startsWith(prevNorm) && currNorm.length > prevNorm.length) {
      prev.text = seg.text;
      prev.end = Math.max(prev.end, seg.end);
      continue;
    }

    // 3. Câu trước chứa câu sau
    if (isVeryClose && prevNorm.endsWith(currNorm) && prevNorm.length > currNorm.length) {
      prev.end = Math.max(prev.end, seg.end);
      continue;
    }

    // 4. Nếu hai câu độc lập bị đè timestamp nhẹ: điều chỉnh timestamp sát video
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

  return cleanList.map((s, idx) => ({
    ...s,
    id: idx + 1,
    start: Number(s.start.toFixed(2)),
    end: Number(s.end.toFixed(2)),
  }));
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
