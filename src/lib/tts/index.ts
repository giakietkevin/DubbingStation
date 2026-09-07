export type TTSProvider = 'microsoft' | 'openai' | 'piper';

export interface TTSProviderOptions {
  provider: TTSProvider;
  text: string;
  voice: string;
  speed: number;
  pitch?: string;
  rate?: string;
  volume?: string;
}

export interface TTSResult {
  buffer: Buffer;
  provider: TTSProvider;
  voice: string;
}
