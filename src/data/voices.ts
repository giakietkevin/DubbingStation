import type { Voice } from '@/types';

export const defaultVoice: Voice = {
  id: 'minh-khang',
  name: 'Minh Khang',
  country: 'VIỆT NAM',
  countryCode: 'vi-VN',
  avatarInitials: 'MK',
  gender: 'male',
  style: 'Tự nhiên • Trầm ấm • Đọc truyện',
  tags: ['Tự nhiên', 'Trầm ấm', 'Đọc truyện'],
  isPremium: false,
};

export const voices: Voice[] = [
  defaultVoice,
  {
    id: 'mai-anh',
    name: 'Mai Anh',
    country: 'VIỆT NAM',
    countryCode: 'vi-VN',
    avatarInitials: 'MA',
    gender: 'female',
    style: 'Ngọt ngào • Thuyết minh • Quảng cáo',
    tags: ['Ngọt ngào', 'Thuyết minh', 'Quảng cáo'],
    isPremium: false,
  },
  {
    id: 'quoc-bao',
    name: 'Quốc Bảo',
    country: 'VIỆT NAM',
    countryCode: 'vi-VN',
    avatarInitials: 'QB',
    gender: 'male',
    style: 'Bản tin • Trang trọng • Chuyên nghiệp',
    tags: ['Bản tin', 'Trang trọng', 'Chuyên nghiệp'],
    isPremium: true,
  },
  {
    id: 'thu-huong',
    name: 'Thu Hương',
    country: 'VIỆT NAM',
    countryCode: 'vi-VN',
    avatarInitials: 'TH',
    gender: 'female',
    style: 'Truyền cảm • E-learning • Hướng dẫn',
    tags: ['Truyền cảm', 'E-learning', 'Hướng dẫn'],
    isPremium: true,
  },
  {
    id: 'john-smith',
    name: 'John Smith',
    country: 'USA',
    countryCode: 'en-US',
    avatarInitials: 'JS',
    gender: 'male',
    style: 'Professional • Podcast • Narration',
    tags: ['Professional', 'Podcast', 'Narration'],
    isPremium: true,
  },
  {
    id: 'sakura-tanaka',
    name: 'Sakura Tanaka',
    country: 'JAPAN',
    countryCode: 'ja-JP',
    avatarInitials: 'ST',
    gender: 'female',
    style: 'Anime • Cute • Storytelling',
    tags: ['Anime', 'Cute', 'Storytelling'],
    isPremium: true,
  },
];

export const emotions = ['Tự nhiên', 'Truyền cảm', 'Hào hứng', 'Bản tin'];
