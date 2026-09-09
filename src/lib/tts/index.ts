export type TTSProvider = 'microsoft' | 'openai' | 'piper' | 'google' | 'huggingface' | 'capcut';

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

export * from './google';
export * from './huggingface';
export * from './capcut';
export * from './piper';
export * from './openai';
export * from './dsp';
