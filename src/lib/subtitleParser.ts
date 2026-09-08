/**
 * DubbingStation - Subtitle Parser (SRT / VTT / Text)
 * Trích xuất cấu trúc phụ đề, hỗ trợ tính toán timeline và nhận diện nhân vật (Speaker)
 */

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

  const totalDurationSec = cues.length > 0 ? cues[cues.length - 1].endTime : 0;

  return {
    format,
    totalDurationSec,
    totalCues: cues.length,
    speakers: Array.from(speakersSet),
    hasExplicitSpeakers,
    cues,
  };
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
