const fs = require('fs');
const { Communicate } = require('edge-tts-universal');

const content = fs.readFileSync('test_article.js', 'utf8');
const text = content.substring(content.indexOf('`') + 1, content.lastIndexOf('`'));

function cleanAndChunk(input, maxLen = 350) {
  // Thay thế ký tự ngắt dòng nhiều bằng chấm câu để câu đọc ngắt nghỉ tự nhiên
  const normalized = input
    .replace(/\r\n/g, '\n')
    .replace(/\n+/g, '. ')
    .replace(/["“”«»]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Tách theo dấu chấm, chấm than, hỏi, chấm phẩy
  const sentences = normalized.split(/(?<=[.?!;])\s+/);
  const chunks = [];
  let current = '';

  for (const s of sentences) {
    if ((current + ' ' + s).trim().length <= maxLen) {
      current = (current + ' ' + s).trim();
    } else {
      if (current) chunks.push(current);
      if (s.length > maxLen) {
        const words = s.split(' ');
        let sub = '';
        for (const w of words) {
          if ((sub + ' ' + w).trim().length <= maxLen) {
            sub = (sub + ' ' + w).trim();
          } else {
            if (sub) chunks.push(sub);
            sub = w;
          }
        }
        current = sub;
      } else {
        current = s;
      }
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

async function run() {
  const chunks = cleanAndChunk(text, 300);
  console.log('Total chunks created:', chunks.length);

  const audioBuffers = [];
  for (let i = 0; i < chunks.length; i++) {
    const chunkText = chunks[i];
    console.log(`Processing chunk ${i + 1}/${chunks.length} (length ${chunkText.length}): ${chunkText.slice(0, 40)}...`);
    const comm = new Communicate(chunkText, { voice: 'vi-VN-NamMinhNeural', pitch: '-10Hz' });
    for await (const ch of comm.stream()) {
      if (ch.type === 'audio' && ch.data) audioBuffers.push(ch.data);
    }
  }

  const fullAudio = Buffer.concat(audioBuffers);
  console.log('SUCCESS! Full article converted to audio. Total bytes:', fullAudio.length);
  fs.writeFileSync('full_article_audio.mp3', fullAudio);
}
run();
