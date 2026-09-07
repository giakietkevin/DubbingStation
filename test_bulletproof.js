const fs = require('fs');
const { Communicate } = require('edge-tts-universal');

const rawText = `Bốn vũ khí giúp Arsenal hạ gục Chelsea tại Emirates
09:42 07/09/2026
BongDa.com.vnBàn thắng quyết định của thủ quân Martin Odegaard giúp Arsenal đánh bại Chelsea 2-1 tại vòng 3 Ngoại hạng Anh, đồng thời nối dài mạch bất bại trước đối thủ lên con số 10 trận.

Phong độ

Logo đội bóng
06-09

2 - 1



01-09

0 - 1



22-08

3 - 0



16-08

0 - 3



30-05

1 - 1



Thắng
Hòa
Thua
Arsenal trên cơ sở với Chelsea. (Ảnh: Justin Setterfield/Getty Images)
Arsenal trên cơ sở với Chelsea. (Ảnh: Justin Setterfield/Getty Images)
Arsenal tiếp tục chuỗi ngày thống trị trận derby London khi đánh bại Chelsea với tỷ số 2-1 tại vòng 3 Ngoại hạng Anh, qua đó duy trì khởi đầu hoàn hảo cho chiến dịch năm nay. Kết quả này giúp thầy trò Mikel Arteta nối dài mạch bất bại trước đối thủ cùng thành phố lên con số 10 trận liên tiếp đầy ấn tượng.`;

function cleanAndChunkText(input, maxLen = 220) {
  const normalized = input
    .replace(/\[pause\s+[0-9.]+s\]/gi, ' ... ')
    .replace(/\[thì_thầm\]/gi, '')
    .replace(/\[nhấn_mạnh\]/gi, '')
    .replace(/\[.*?\]/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\n+/g, '. ')
    .replace(/["“”«»]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const sentences = normalized.split(/(?<=[.?!;])\s+/);
  const chunks = [];
  let current = '';

  for (const s of sentences) {
    if (!s.trim()) continue;
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
  if (current && current.trim()) chunks.push(current.trim());
  return chunks;
}

async function fetchGoogleTTS(text, lang = 'vi') {
  try {
    const url = 'https://translate.google.com/translate_tts?ie=UTF-8&q=' + encodeURIComponent(text.slice(0, 200)) + '&tl=' + lang + '&client=tw-ob';
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (err) {
    return null;
  }
}

async function synthesizeChunkWithFallback(chunkText, voice = 'vi-VN-NamMinhNeural', pitch = '-10Hz', rate = '+0%') {
  try {
    const comm = new Communicate(chunkText, { voice, pitch, rate });
    const audioChunks = [];
    for await (const ch of comm.stream()) {
      if (ch.type === 'audio' && ch.data) audioChunks.push(ch.data);
    }
    if (audioChunks.length > 0) {
      return Buffer.concat(audioChunks);
    }
  } catch (err) {
    console.log('Edge chunk fallback triggered for:', chunkText.slice(0, 30));
  }
  return await fetchGoogleTTS(chunkText, 'vi');
}

async function testFullPipeline() {
  const chunks = cleanAndChunkText(rawText);
  console.log('Total chunks:', chunks.length);
  const audioList = [];
  for (let i = 0; i < chunks.length; i++) {
    const buf = await synthesizeChunkWithFallback(chunks[i]);
    if (buf) audioList.push(buf);
  }
  const merged = Buffer.concat(audioList);
  console.log('SUCCESS! Merged audio size:', merged.length);
}

testFullPipeline();
