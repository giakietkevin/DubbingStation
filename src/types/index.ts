export type StudioMode = 'tts' | 'dubbing' | 'stt' | 'clone';

export interface Voice {
  id: string;
  name: string;
  country: string;
  countryCode: string;
  avatarInitials: string;
  gender: 'male' | 'female';
  style: string;
  tags: string[];
  previewUrl?: string;
  isPremium?: boolean;
  age?: 'young' | 'adult' | 'senior';
  useCase?: string;
  provider?: 'microsoft' | 'openai' | 'piper' | 'google';
  isCustom?: boolean;
  customPitch?: string;
  customRate?: string;
  customVolume?: string;
  baseModel?: string;
  clonedSampleCount?: number;
  analysisProfile?: {
    pitchHz?: number;
    rateWpm?: number;
    qualityScore?: number;
    timbreDescription?: string;
  };
  vocalFingerprint?: {
    fingerprintId?: string;
    f0?: number;
    f1?: number;
    f2?: number;
    warmth?: number;
    brightness?: number;
    fullness?: number;
    tempoWpm?: number;
    gender?: 'male' | 'female';
    vocalType?: string;
    waveformPoints?: number[];
  };
}

export interface PricingPlan {
  id: string;
  name: string;
  badge: string;
  badgeStyle?: string;
  monthlyPrice: number;
  originalPrice: number;
  annualPrice: number;
  credits: number;
  creditsFormatted: string;
  isPopular?: boolean;
  features: string[];
  ctaText: string;
  ctaVariant?: 'primary' | 'secondary' | 'gradient';
}

export interface AudioTool {
  id: string;
  name: string;
  description: string;
  icon: string;
  colorClass: string;
  badge: string;
  category: 'basic' | 'ai' | 'fx' | 'format';
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface CoreService {
  id: string;
  name: string;
  tag: string;
  tagColorClass: string;
  icon: string;
  iconColorClass: string;
  description: string;
  specs: string;
  actionText: string;
  actionColorClass: string;
  href?: string;
}

export interface MetricPillar {
  id: string;
  icon: string;
  iconBgClass: string;
  iconColorClass: string;
  value: string;
  title: string;
  titleColorClass: string;
  description: string;
  href?: string;
}
