import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';
import { scrapeMetaAdLibrary } from '@/lib/scraper';
import type { ScrapeRequest } from '@/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  let body: ScrapeRequest;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { sessionId, query, niche } = body;

  if (!sessionId || !query) {
    return NextResponse.json(
      { error: 'sessionId and query are required' },
      { status: 400 }
    );
  }

  const supabase = getServerSupabase();

  // Mark session as running
  await supabase
    .from('research_sessions')
    .update({ status: 'running' })
    .eq('id', sessionId);

  try {
    // Run Puppeteer scraper
    const result = await scrapeMetaAdLibrary(query);

    if (result.ads.length === 0) {
      // Still mark as done even with 0 ads (scraper may have hit a captcha or meta changed)
      await supabase
        .from('research_sessions')
        .update({ status: 'done', ad_count: 0 })
        .eq('id', sessionId);

      return NextResponse.json({
        success: true,
        count: 0,
        warning: result.error || 'No ads found. Meta Ad Library may require authentication or the query returned no results.',
      });
    }

    // Batch insert ads
    const adsToInsert = result.ads.map((ad) => ({
      session_id: sessionId,
      advertiser: ad.advertiser || null,
      body: ad.body || null,
      hook: ad.hook || null,
      cta: ad.cta || null,
      offer: ad.offer || null,
      link: ad.link || null,
      raw: ad.raw || null,
    }));

    const { error: insertError } = await supabase.from('ads').insert(adsToInsert);

    if (insertError) {
      throw new Error(`Failed to insert ads: ${insertError.message}`);
    }

    // Update session
    await supabase
      .from('research_sessions')
      .update({ status: 'done', ad_count: result.ads.length })
      .eq('id', sessionId);

    return NextResponse.json({ success: true, count: result.ads.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Scrape failed';

    // Mark session as error
    await supabase
      .from('research_sessions')
      .update({ status: 'error' })
      .eq('id', sessionId);

    return NextResponse.json(
      { success: false, count: 0, error: message },
      { status: 500 }
    );
  }
}
