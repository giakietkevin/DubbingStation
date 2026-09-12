/**
 * DubbingStation - Subtitle Parser (SRT / VTT / Text)
 * Trích xuất cấu trúc phụ đề, hỗ trợ tính toán timeline và nhận diện nhân vật (Speaker)
 */

import { removeRepeatedText } from '@/lib/whisper';

export interface SubtitleCue {
  id: number;
  startTime: number; // Đơn vị giây (seconds)
  endTime: number;   // Đơn vị giây (seconds)
  startTimeFormatted: string; // "00:01:23,456"
  endTimeFormatted: string;
  durationSec: number;
  speaker: string;   // Ví dụ: "Speaker 1", "Minh Khang", hoặc trích từ "Name: Content"
  text: string;
}

export interface SubtitleParseResult {
  format: 'SRT' | 'VTT' | 'PLAIN_TEXT';
  totalDurationSec: number;
  totalCues: number;
  speakers: string[];
  hasExplicitSpeakers: boolean;
  cues: SubtitleCue[];
}

/**
 * Chuyển timestamp chuỗi (00:01:23,456 hoặc 00:01:23.456) thành số giây
 */
export function timeStringToSeconds(timeStr: string): number {
  const clean = timeStr.trim().replace(',', '.');
  const parts = clean.split(':');

  if (parts.length === 3) {
    const hours = parseFloat(parts[0]) || 0;
    const minutes = parseFloat(parts[1]) || 0;
    const seconds = parseFloat(parts[2]) || 0;
    return hours * 3600 + minutes * 60 + seconds;
  } else if (parts.length === 2) {
    const minutes = parseFloat(parts[0]) || 0;
    const seconds = parseFloat(parts[1]) || 0;
    return minutes * 60 + seconds;
  }

  return parseFloat(clean) || 0;
}

/**
 * Chuyển số giây thành định dạng hiển thị mm:ss hoặc hh:mm:ss
 */
export function secondsToFormattedTime(sec: number): string {
  const hours = Math.floor(sec / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const seconds = Math.floor(sec % 60);
  const ms = Math.floor((sec % 1) * 1000);

  const pad = (n: number, z = 2) => String(n).padStart(z, '0');

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)},${pad(ms, 3)}`;
  }
  return `${pad(minutes)}:${pad(seconds)},${pad(ms, 3)}`;
}

/**
 * Chuẩn hóa chuỗi văn bản để so sánh độ tương đồng
 */
export function normalizeDialogueText(text: string): string {
  return text
    .toLowerCase()
    .replace(/<[^>]+>/g, '') // Bỏ thẻ HTML/VTT tag
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?"'«»“”]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Tính toán độ tương đồng giữa 2 chuỗi văn bản (0.0 - 1.0)
 * Hỗ trợ nhận diện câu lặp lại, câu bao hàm, hoặc lặp từ do Whisper chunk overlap
 */
export function calculateTextSimilarity(str1: string, str2: string): number {
  const s1 = normalizeDialogueText(str1);
  const s2 = normalizeDialogueText(str2);

  if (s1 === s2 && s1.length > 0) return 1.0;
  if (!s1 || !s2) return 0.0;

  // Nếu câu này chứa trọn vẹn câu kia
  if (s1.includes(s2) || s2.includes(s1)) {
    const ratio = Math.min(s1.length, s2.length) / Math.max(s1.length, s2.length);
    if (ratio >= 0.6) return 0.88;
  }

  // So sánh cặp ký tự (Bigram Dice's Coefficient)
  const getBigrams = (str: string) => {
    const bigrams = new Set<string>();
    for (let i = 0; i < str.length - 1; i++) {
      bigrams.add(str.substring(i, i + 2));
    }
    return bigrams;
  };

  const bg1 = getBigrams(s1);
  const bg2 = getBigrams(s2);
  let intersection = 0;
  bg1.forEach((b) => {
    if (bg2.has(b)) intersection++;
  });

  const total = bg1.size + bg2.size;
  return total > 0 ? (2.0 * intersection) / total : 0;
}

/**
 * Thuật toán khử trùng lặp phụ đề thông minh (Smart Subtitle Deduplication & Video Alignment)
 * - Loại bỏ các câu bị lặp lại do Whisper stride overlap hoặc lỗi copy/paste phụ đề
 * - Tuyệt đối không làm mất thoại thật: giữ nguyên các câu thoại lặp có chủ đích cách xa nhau
 * - Gộp các câu bị cắt cụt/lặp nửa câu thành câu hoàn chỉnh và kéo dài timeline tương ứng
 * - Căn chỉnh timeline sát với video, tránh chồng lấn gây nghẽn tiếng
 */
export function deduplicateSubtitleCues(cues: SubtitleCue[]): SubtitleCue[] {
  if (!Array.isArray(cues) || cues.length === 0) return [];

  // 1. Sắp xếp theo startTime tăng dần
  const sorted = [...cues]
    .filter((c) => c.text && c.text.trim().length > 0)
    .map((c) => ({ ...c, text: removeRepeatedText(c.text) }))
    .filter((c) => c.text.length > 0)
    .sort((a, b) => a.startTime - b.startTime || a.endTime - b.endTime);

  const cleanCues: SubtitleCue[] = [];

  for (const current of sorted) {
    if (cleanCues.length === 0) {
      cleanCues.push({ ...current });
      continue;
    }

    const prev = cleanCues[cleanCues.length - 1];
    const prevNorm = normalizeDialogueText(prev.text);
    const currNorm = normalizeDialogueText(current.text);

    // Tính độ tương đồng
    const similarity = calculateTextSimilarity(prev.text, current.text);
    const timeOverlap = current.startTime < prev.endTime;
    const timeGap = current.startTime - prev.endTime; // Âm nếu overlap, dương nếu có khoảng cách

    // Kiểm tra xem hai câu có phải là trùng lặp do Whisper stride overlap không
    // (khoảng cách giữa 2 câu < 0.6s hoặc overlap, và độ tương đồng cao >= 0.75)
    const isVeryCloseInTime = timeOverlap || timeGap <= 0.6;
    const isSameSpeaker = prev.speaker === current.speaker || !prev.speaker || !current.speaker || prev.speaker === 'Speaker 1';

    if (isSameSpeaker && isVeryCloseInTime && (similarity >= 0.75 || prevNorm === currNorm)) {
      // TRƯỜNG HỢP A: Trùng lặp do chunk overlap -> Hợp nhất timeline để KHÔNG BỎ MẤT THOẠI
      // Chọn câu văn bản đầy đủ hơn (dài hơn)
      if (currNorm.length > prevNorm.length) {
        prev.text = current.text;
      }
      // Kéo dài endTime đến điểm kết thúc xa nhất để không bị cắt thoại
      prev.endTime = Math.max(prev.endTime, current.endTime);
      prev.durationSec = Math.max(0.6, prev.endTime - prev.startTime);
      prev.endTimeFormatted = secondsToFormattedTime(prev.endTime);
      continue;
    }

    // TRƯỜNG HỢP B: Câu sau là phần tiếp nối bao hàm câu trước (Whisper cắt dở câu)
    // Ví dụ: prev: "Tôi nghĩ rằng", current: "Tôi nghĩ rằng chúng ta nên bắt đầu"
    if (isSameSpeaker && isVeryCloseInTime && currNorm.startsWith(prevNorm) && currNorm.length > prevNorm.length) {
      prev.text = current.text;
      prev.endTime = Math.max(prev.endTime, current.endTime);
      prev.durationSec = Math.max(0.6, prev.endTime - prev.startTime);
      prev.endTimeFormatted = secondsToFormattedTime(prev.endTime);
      continue;
    }

    // TRƯỜNG HỢP C: Trùng lặp chính xác 100% về text và timeline rất gần (< 1.2s)
    if (prevNorm === currNorm && timeGap <= 1.2 && isSameSpeaker) {
      prev.endTime = Math.max(prev.endTime, current.endTime);
      prev.durationSec = Math.max(0.6, prev.endTime - prev.startTime);
      prev.endTimeFormatted = secondsToFormattedTime(prev.endTime);
      continue;
    }

    // TRƯỜNG HỢP D: Các câu độc lập -> Giữ nguyên thoại, xử lý overlap timeline sát video
    const adjustedCue: SubtitleCue = { ...current };

    // Nếu câu sau bắt đầu trước khi câu trước kết thúc (chồng lấn timeline nhẹ):
    // Điều chỉnh ranh giới sát với video để hai giọng không đè lên nhau
    if (adjustedCue.startTime < prev.endTime) {
      // Nếu câu trước đủ dài, rút ngắn nhẹ đuôi câu trước
      if (prev.endTime - prev.startTime > 0.8) {
        prev.endTime = Math.max(prev.startTime + 0.6, adjustedCue.startTime - 0.05);
        prev.durationSec = prev.endTime - prev.startTime;
        prev.endTimeFormatted = secondsToFormattedTime(prev.endTime);
      } else {
        // Nếu câu trước quá ngắn, đẩy câu sau lùi lại 0.05s
        adjustedCue.startTime = prev.endTime + 0.05;
        if (adjustedCue.endTime <= adjustedCue.startTime) {
          adjustedCue.endTime = adjustedCue.startTime + Math.max(0.8, adjustedCue.durationSec);
        }
        adjustedCue.durationSec = adjustedCue.endTime - adjustedCue.startTime;
        adjustedCue.startTimeFormatted = secondsToFormattedTime(adjustedCue.startTime);
        adjustedCue.endTimeFormatted = secondsToFormattedTime(adjustedCue.endTime);
      }
    }

    cleanCues.push(adjustedCue);
  }

  // Đánh số lại ID từ 1 đến N
  return cleanCues.map((c, idx) => ({
    ...c,
    id: idx + 1,
    durationSec: Math.max(0.5, c.endTime - c.startTime),
    startTimeFormatted: secondsToFormattedTime(c.startTime),
    endTimeFormatted: secondsToFormattedTime(c.endTime),
  }));
}

/**
 * Chuyển đổi danh sách SubtitleCue thành nội dung chuỗi SRT chuẩn
 */
export function cuesToSRT(cues: SubtitleCue[]): string {
  return cues
    .map((cue, idx) => {
      const speakerPrefix = cue.speaker && cue.speaker !== 'Speaker 1' ? `[${cue.speaker}] ` : '';
      return `${idx + 1}\n${cue.startTimeFormatted} --> ${cue.endTimeFormatted}\n${speakerPrefix}${cue.text.trim()}`;
    })
    .join('\n\n');
}

/**
 * Nhận diện speaker từ dòng văn bản:
 * VD: "Minh: Xin chào bạn" -> speaker = "Minh", text = "Xin chào bạn"
 * VD: "[Nhân vật 1] Chào nhé" -> speaker = "Nhân vật 1", text = "Chào nhé"
 */
function extractSpeakerAndText(rawText: string): { speaker: string; text: string; explicit: boolean } {
  const voiceTagMatch = rawText.match(/^<v\s+([^>]+)>\s*(.*)$/i);
  if (voiceTagMatch) {
    return {
      speaker: voiceTagMatch[1].trim(),
      text: voiceTagMatch[2].trim(),
      explicit: true,
    };
  }

  const bracketMatch = rawText.match(/^\[(.*?)\]\s*(.*)$/);
  if (bracketMatch) {
    return {
      speaker: bracketMatch[1].trim(),
      text: bracketMatch[2].trim(),
      explicit: true,
    };
  }

  const colonMatch = rawText.match(/^([A-Za-zÀ-ỹ0-9\s]{2,20}):\s*(.*)$/);
  if (colonMatch) {
    return {
      speaker: colonMatch[1].trim(),
      text: colonMatch[2].trim(),
      explicit: true,
    };
  }

  return {
    speaker: 'Speaker 1',
    text: rawText.trim(),
    explicit: false,
  };
}

/**
 * Parse nội dung chuỗi SRT hoặc VTT
 */
export function parseSubtitle(content: string): SubtitleParseResult {
  const clean = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  const isVtt = clean.startsWith('WEBVTT');
  const format: 'SRT' | 'VTT' | 'PLAIN_TEXT' = isVtt ? 'VTT' : 'SRT';

  // Tách theo block khoảng trắng giữa các cues
  const blocks = clean.split(/\n\s*\n/);
  const cues: SubtitleCue[] = [];
  const speakersSet = new Set<string>();
  let hasExplicitSpeakers = false;

  let cueId = 1;

  for (const block of blocks) {
    const lines = block.trim().split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;

    // Bỏ qua header "WEBVTT"
    if (lines[0].startsWith('WEBVTT') || lines[0].startsWith('NOTE')) {
      continue;
    }

    // Tìm dòng timestamp (chứa '-->')
    let timeLineIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('-->')) {
        timeLineIndex = i;
        break;
      }
    }

    if (timeLineIndex !== -1) {
      const timeLine = lines[timeLineIndex];
      const [startStr, endStr] = timeLine.split('-->').map((s) => s.trim());
      const startTime = timeStringToSeconds(startStr);
      const endTime = timeStringToSeconds(endStr);
      const durationSec = Math.max(0.5, endTime - startTime);

      // Toàn bộ các dòng phía sau timestamp là text của cue
      const textLines = lines.slice(timeLineIndex + 1).join(' ');
      const { speaker, text, explicit } = extractSpeakerAndText(textLines);

      if (text.length > 0) {
        hasExplicitSpeakers = hasExplicitSpeakers || explicit;
        speakersSet.add(speaker);
        cues.push({
          id: cueId++,
          startTime,
          endTime,
          startTimeFormatted: secondsToFormattedTime(startTime),
          endTimeFormatted: secondsToFormattedTime(endTime),
          durationSec,
          speaker,
          text,
        });
      }
    }
  }

  // Nếu không parse được dạng SRT/VTT chuẩn thì coi như dạng Plain Text chia theo dòng
  if (cues.length === 0 && clean.length > 0) {
    const lines = clean.split('\n').filter((l) => l.trim().length > 0);
    let currentTime = 0;

    lines.forEach((line, index) => {
      const { speaker, text, explicit } = extractSpeakerAndText(line);
      const durationSec = Math.max(2, Math.round(text.length / 15));
      const startTime = currentTime;
      const endTime = currentTime + durationSec;
      currentTime = endTime;

      speakersSet.add(speaker);
      hasExplicitSpeakers = hasExplicitSpeakers || explicit;
      cues.push({
        id: index + 1,
        startTime,
        endTime,
        startTimeFormatted: secondsToFormattedTime(startTime),
        endTimeFormatted: secondsToFormattedTime(endTime),
        durationSec,
        speaker,
        text,
      });
    });
  }

  const deduplicatedCues = deduplicateSubtitleCues(cues);

  const finalSpeakersSet = new Set<string>();
  deduplicatedCues.forEach((c) => finalSpeakersSet.add(c.speaker));

  const totalDurationSec = deduplicatedCues.length > 0 ? deduplicatedCues[deduplicatedCues.length - 1].endTime : 0;

  return {
    format,
    totalDurationSec,
    totalCues: deduplicatedCues.length,
    speakers: Array.from(finalSpeakersSet.size > 0 ? finalSpeakersSet : speakersSet),
    hasExplicitSpeakers,
    cues: deduplicatedCues,
  };
}

/**
 * Tịnh tiến toàn bộ timestamp của mảng SubtitleCue theo độ lệch offset (tính bằng giây).
 * Giá trị âm (vd: -0.15s) giúp phụ đề xuất hiện sớm hơn để đón đầu khẩu hình miệng, khắc phục độ trễ.
 * Giá trị dương (vd: +0.2s) đẩy phụ đề xuất hiện muộn hơn.
 */
export function applyTimingOffset(cues: SubtitleCue[], offsetSec: number): SubtitleCue[] {
  if (!Array.isArray(cues) || cues.length === 0 || offsetSec === 0) return cues;

  return cues.map((cue) => {
    const newStart = Math.max(0, Math.round((cue.startTime + offsetSec) * 1000) / 1000);
    const newEnd = Math.max(newStart + 0.3, Math.round((cue.endTime + offsetSec) * 1000) / 1000);
    return {
      ...cue,
      startTime: newStart,
      endTime: newEnd,
      startTimeFormatted: secondsToFormattedTime(newStart),
      endTimeFormatted: secondsToFormattedTime(newEnd),
      durationSec: Math.max(0.3, Math.round((newEnd - newStart) * 1000) / 1000),
    };
  });
}

/**
 * Tạo phụ đề mẫu mặc định (Demo Subtitle)
 */
export const demoSrtContent = `1
00:00:01,000 --> 00:00:05,500
[Người dẫn chuyện] Chào mừng các bạn đến với công nghệ lồng tiếng video tự động bằng trí tuệ nhân tạo.

2
00:00:06,000 --> 00:00:10,200
[Nhân vật 1] Thật tuyệt vời! Video của tôi giờ đây có thể tiếp cận khán giả toàn cầu chỉ trong vài phút.

3
00:00:11,000 --> 00:00:16,800
[Người dẫn chuyện] DubbingStation hỗ trợ nhận diện nhiều nhân vật và gán giọng đọc tương ứng hoàn hảo.`;
