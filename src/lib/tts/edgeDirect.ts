import WebSocket from 'ws';
import { createHash, randomBytes } from 'crypto';

const TRUSTED_CLIENT_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';
const BASE_URL = 'speech.platform.bing.com/consumer/speech/synthesize/readaloud';
const CHROMIUM_FULL_VERSION = '143.0.3650.75';
const CHROMIUM_MAJOR_VERSION = '143';
const SEC_MS_GEC_VERSION = `1-${CHROMIUM_FULL_VERSION}`;
const WIN_EPOCH = 11644473600;
const S_TO_NS = 1e9;

function generateSecMsGec(): string {
  let ticks = Math.floor(Date.now() / 1000);
  ticks += WIN_EPOCH;
  ticks -= ticks % 300;
  ticks *= S_TO_NS / 100;
  const strToHash = `${ticks.toFixed(0)}${TRUSTED_CLIENT_TOKEN}`;
  return createHash('sha256').update(strToHash, 'ascii').digest('hex').toUpperCase();
}

export interface DirectEdgeTTSOptions {
  text: string;
  voice: string;
  pitch?: string;
  rate?: string;
  volume?: string;
  timeoutMs?: number;
}

/**
 * Client kết nối trực tiếp WebSocket tới Microsoft Azure Edge Neural Speech Platform.
 * Sử dụng thư viện 'ws' nguyên bản của Node.js, bảo đảm gửi đầy đủ Origin và DRM Token (Sec-MS-GEC).
 * Hoạt động 100% ổn định trong mọi container Linux (Render, Docker, VPS).
 */
export async function synthesizeWithDirectEdgeTTS(options: DirectEdgeTTSOptions): Promise<Buffer | null> {
  const {
    text,
    voice = 'vi-VN-NamMinhNeural',
    pitch = '+0Hz',
    rate = '+0%',
    volume = '+0%',
    timeoutMs = 10000,
  } = options;

  if (!text || !text.trim()) return null;

  return new Promise((resolve) => {
    let timer: NodeJS.Timeout | null = null;
    let ws: WebSocket | null = null;
    const audioChunks: Buffer[] = [];
    let isSettled = false;

    const cleanup = () => {
      if (timer) clearTimeout(timer);
      if (ws) {
        try {
          ws.removeAllListeners();
          ws.close();
        } catch {}
      }
    };

    const settle = (result: Buffer | null) => {
      if (isSettled) return;
      isSettled = true;
      cleanup();
      resolve(result);
    };

    timer = setTimeout(() => {
      if (audioChunks.length > 0) {
        settle(Buffer.concat(audioChunks));
      } else {
        settle(null);
      }
    }, timeoutMs);

    try {
      const connectionId = randomBytes(16).toString('hex').toLowerCase();
      const secMsGec = generateSecMsGec();
      const wssUrl = `wss://${BASE_URL}/edge/v1?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}&Sec-MS-GEC=${secMsGec}&Sec-MS-GEC-Version=${SEC_MS_GEC_VERSION}&ConnectionId=${connectionId}`;

      ws = new WebSocket(wssUrl, {
        headers: {
          'User-Agent': `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${CHROMIUM_MAJOR_VERSION}.0.0.0 Safari/537.36 Edg/${CHROMIUM_MAJOR_VERSION}.0.0.0`,
          'Accept-Encoding': 'gzip, deflate, br, zstd',
          'Accept-Language': 'en-US,en;q=0.9',
          'Pragma': 'no-cache',
          'Cache-Control': 'no-cache',
          'Origin': 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold',
        },
      });

      ws.on('open', () => {
        if (!ws || ws.readyState !== WebSocket.OPEN) return;
        const timestamp = new Date().toUTCString().replace('GMT', 'GMT+0000 (Coordinated Universal Time)');
        const configMessage = `X-Timestamp:${timestamp}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"false"},"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}\r\n`;
        ws.send(configMessage);

        const requestId = randomBytes(16).toString('hex').toLowerCase();
        const escapedText = text
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&apos;');
        const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='vi-VN'><voice name='${voice}'><prosody pitch='${pitch}' rate='${rate}' volume='${volume}'>${escapedText}</prosody></voice></speak>`;
        const ssmlMessage = `X-RequestId:${requestId}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${timestamp}Z\r\nPath:ssml\r\n\r\n${ssml}`;
        ws.send(ssmlMessage);
      });

      ws.on('message', (data: WebSocket.RawData, isBinary: boolean) => {
        if (isBinary && Buffer.isBuffer(data)) {
          if (data.length >= 2) {
            const headerLength = data.readUInt16BE(0);
            if (data.length > headerLength + 2) {
              const headerStr = data.subarray(2, headerLength + 2).toString('utf8');
              if (headerStr.includes('Path:audio')) {
                const audioData = data.subarray(headerLength + 2);
                if (audioData.length > 0) {
                  audioChunks.push(audioData);
                }
              }
            }
          }
        } else if (!isBinary) {
          const textMsg = data.toString('utf8');
          if (textMsg.includes('Path:turn.end')) {
            if (audioChunks.length > 0) {
              settle(Buffer.concat(audioChunks));
            } else {
              settle(null);
            }
          }
        }
      });

      ws.on('error', (err) => {
        console.warn('[DirectEdgeTTS] WebSocket error:', err.message);
        if (audioChunks.length > 0) {
          settle(Buffer.concat(audioChunks));
        } else {
          settle(null);
        }
      });

      ws.on('close', () => {
        if (audioChunks.length > 0) {
          settle(Buffer.concat(audioChunks));
        } else {
          settle(null);
        }
      });
    } catch (e) {
      console.warn('[DirectEdgeTTS] Init failed:', e);
      settle(null);
    }
  });
}
