import { NextResponse } from 'next/server';
import { voices } from '@/data/voices';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.toLowerCase() || '';
    const country = searchParams.get('country') || 'all';
    const gender = searchParams.get('gender') || 'all';
    const tier = searchParams.get('tier') || 'all'; // 'all' | 'free' | 'premium'

    let filtered = voices.filter((voice) => {
      // Search text match (name, style, tags)
      if (search) {
        const matchName = voice.name.toLowerCase().includes(search);
        const matchStyle = voice.style.toLowerCase().includes(search);
        const matchTags = voice.tags.some((t) => t.toLowerCase().includes(search));
        if (!matchName && !matchStyle && !matchTags) return false;
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
