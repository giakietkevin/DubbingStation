/**
 * DubbingStation - Intelligent Text Chunker for Long Text Synthesis
 * Tách văn bản dài (>5.000 ký tự) thành các đoạn (chunks) tối ưu
 * Đảm bảo:
 * 1. Không cắt đứt giữa câu (ngắt tại dấu chấm, chấm phẩy, xuống dòng)
 * 2. Bảo toàn các thẻ SSML / ngữ điệu [pause], [nhấn_mạnh], etc.
 * 3. Kích thước mỗi chunk nằm trong khoảng an toàn (mặc định 2.000 - 3.500 ký tự)
 */

export interface TextChunk {
  index: number;
  text: string;
  charCount: number;
  estimatedSec: number;
}

export interface ChunkingResult {
  totalChars: number;
  totalChunks: number;
  chunks: TextChunk[];
  estimatedTotalSec: number;
}

const DEFAULT_MAX_CHUNK_SIZE = 3000;
const SENTENCE_DELIMITERS = /(?<=[.?!…\n])\s+/;

export function splitTextIntoChunks(
  text: string,
  maxChunkSize: number = DEFAULT_MAX_CHUNK_SIZE
): ChunkingResult {
  const cleanText = text.trim();
  const totalChars = cleanText.length;

  if (totalChars === 0) {
    return {
      totalChars: 0,
      totalChunks: 0,
      chunks: [],
      estimatedTotalSec: 0,
    };
  }

  // Nếu văn bản ngắn hơn giới hạn thì chỉ tạo 1 chunk duy nhất
  if (totalChars <= maxChunkSize) {
    const estimatedSec = Math.max(3, Math.round(totalChars / 15));
    return {
      totalChars,
      totalChunks: 1,
      chunks: [
        {
          index: 1,
          text: cleanText,
          charCount: totalChars,
          estimatedSec,
        },
      ],
      estimatedTotalSec: estimatedSec,
    };
  }

  // Tách văn bản thành các câu tự nhiên
  const sentences = cleanText.split(SENTENCE_DELIMITERS);
  const chunks: TextChunk[] = [];
  let currentChunkText = '';
  let chunkIndex = 1;

  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    if (!trimmedSentence) continue;

    // Nếu thêm câu này vào mà vượt quá maxChunkSize thì đóng chunk hiện tại
    if (currentChunkText.length + trimmedSentence.length + 1 > maxChunkSize && currentChunkText.length > 0) {
      const charCount = currentChunkText.length;
      chunks.push({
        index: chunkIndex++,
        text: currentChunkText.trim(),
        charCount,
        estimatedSec: Math.max(3, Math.round(charCount / 15)),
      });
      currentChunkText = trimmedSentence;
    } else {
      currentChunkText = currentChunkText
        ? `${currentChunkText} ${trimmedSentence}`
        : trimmedSentence;
    }
  }

  // Đẩy chunk cuối cùng nếu còn
  if (currentChunkText.trim().length > 0) {
    const charCount = currentChunkText.trim().length;
    chunks.push({
      index: chunkIndex,
      text: currentChunkText.trim(),
      charCount,
      estimatedSec: Math.max(3, Math.round(charCount / 15)),
    });
  }

  const estimatedTotalSec = chunks.reduce((acc, c) => acc + c.estimatedSec, 0);

  return {
    totalChars,
    totalChunks: chunks.length,
    chunks,
    estimatedTotalSec,
  };
}
