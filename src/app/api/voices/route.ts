import { NextResponse } from 'next/server';
import { voices } from '@/data/voices';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.toLowerCase() || '';
    const country = searchParams.get('country') || 'all';
    const gender = searchParams.get('gender') || 'all';
    const tier = searchParams.get('tier') || 'all'; // 'all' | 'free' | 'premium'
    const category = searchParams.get('category') || 'all';

    let filtered = voices.filter((voice) => {
      // Search text match (name, style, tags)
      if (search) {
        const matchName = voice.name.toLowerCase().includes(search);
        const matchStyle = voice.style.toLowerCase().includes(search);
        const matchTags = voice.tags.some((t) => t.toLowerCase().includes(search));
        if (!matchName && !matchStyle && !matchTags) return false;
      }

      // Filter by Category
      if (category === 'dataset') {
        const isDataset =
          voice.tags.includes('VIVOS') ||
          voice.tags.includes('Common Voice') ||
          voice.tags.includes('OpenSLR') ||
          voice.tags.includes('Hugging Face') ||
          voice.provider === 'huggingface' ||
          voice.style.includes('VIVOS') ||
          voice.style.includes('Common Voice') ||
          voice.style.includes('OpenSLR');
        if (!isDataset) return false;
      } else if (category === 'huggingface') {
        if (voice.provider !== 'huggingface' && !voice.tags.includes('Hugging Face')) return false;
      } else if (category === 'vivos') {
        if (!voice.tags.includes('VIVOS') && !voice.style.includes('VIVOS')) return false;
      } else if (category === 'common_voice') {
        if (!voice.tags.includes('Common Voice') && !voice.style.includes('Common Voice')) return false;
      } else if (category === 'openslr') {
        if (!voice.tags.includes('OpenSLR') && !voice.style.includes('OpenSLR')) return false;
      } else if (category === 'tiktok') {
        if (!voice.tags.includes('TikTok') && !voice.useCase?.includes('TikTok')) return false;
      } else if (category === 'review') {
        const isReview =
          voice.tags.includes('Review Phim') ||
          voice.tags.includes('Kịch tính') ||
          voice.useCase?.includes('Review') ||
          voice.useCase?.includes('Truyện');
        if (!isReview) return false;
      } else if (category === 'news') {
        const isNews =
          voice.tags.includes('Thời sự') ||
          voice.tags.includes('Bản tin') ||
          voice.tags.includes('E-Learning') ||
          voice.tags.includes('Giáo dục');
        if (!isNews) return false;
      } else if (category === 'mientay') {
        const isMienTay =
          voice.tags.includes('Miền Tây') ||
          voice.tags.includes('Radio') ||
          voice.tags.includes('ASMR') ||
          voice.tags.includes('TVB');
        if (!isMienTay) return false;
      } else if (category === 'international') {
        if (voice.country === 'VIỆT NAM') return false;
      }

      // Filter by Country
      if (country !== 'all' && voice.country !== country) {
        return false;
      }

      // Filter by Gender
      if (gender !== 'all' && voice.gender !== gender) {
        return false;
      }

      // Filter by Tier
      if (tier === 'free' && voice.isPremium) return false;
      if (tier === 'premium' && !voice.isPremium) return false;

      return true;
    });

    return NextResponse.json({
      success: true,
      total: filtered.length,
      voices: filtered,
    });
  } catch (error) {
    console.error('Fetch Voices Error:', error);
    return NextResponse.json(
      { error: 'Lỗi tải danh mục giọng nói' },
      { status: 500 }
    );
  }
}
