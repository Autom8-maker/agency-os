import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';
import { runExtraction } from '@/lib/agents/extraction';
import { runAnalysis } from '@/lib/agents/analysis';
import type { Ad, ResearchSession } from '@/types';

export const runtime = 'nodejs';
export const maxDuration = 180;

export async function POST(req: NextRequest) {
  let sessionId: string;

  try {
    const body = await req.json();
    sessionId = body.sessionId;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
  }

  const supabase = getServerSupabase();

  const { data: session, error: sessionError } = await supabase
    .from('research_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (sessionError || !session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  const typedSession = session as ResearchSession;

  const { data: ads, error: adsError } = await supabase
    .from('ads')
    .select('*')
    .eq('session_id', sessionId)
    .limit(40);

  if (adsError) {
    return NextResponse.json({ error: 'Failed to load ads' }, { status: 500 });
  }

  const typedAds = (ads as Ad[]) || [];

  if (typedAds.length === 0) {
    return NextResponse.json(
      { error: 'No ads found for this session. Run a research scrape first.' },
      { status: 422 }
    );
  }

  try {
    // Step 1 — Extraction Layer: normalize raw ads, no reasoning
    const extraction = await runExtraction(typedAds, typedSession.niche);

    // Step 2 — Analysis Layer: pattern finding + gap identification
    const analysisResult = await runAnalysis(typedAds, typedSession.niche, extraction);

    const { data: savedAnalysis, error: saveError } = await supabase
      .from('analyses')
      .insert({
        session_id:     sessionId,
        niche:          typedSession.niche,
        extracted_data: extraction,       // stored separately for Strategy Brain input
        hooks:          analysisResult.hooks,
        offers:         analysisResult.offers,
        angles:         analysisResult.angles,
        patterns:       analysisResult.patterns,
        saturated:      analysisResult.saturated,
        gaps:           analysisResult.gaps,
        advertisers:    analysisResult.advertisers,
      })
      .select()
      .single();

    if (saveError) {
      throw new Error(`Failed to save analysis: ${saveError.message}`);
    }

    return NextResponse.json(savedAnalysis);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Analysis failed';
    console.error('[/api/analyze]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
