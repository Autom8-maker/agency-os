import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';
import { runAnalysis } from '@/lib/agents/analysis';
import type { AnalyzeRequest, Ad, ResearchSession } from '@/types';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  let body: AnalyzeRequest;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { sessionId } = body;

  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
  }

  const supabase = getServerSupabase();

  // Load session
  const { data: session, error: sessionError } = await supabase
    .from('research_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (sessionError || !session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  const typedSession = session as ResearchSession;

  // Load ads for this session
  const { data: ads, error: adsError } = await supabase
    .from('ads')
    .select('*')
    .eq('session_id', sessionId)
    .limit(50);

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
    // Run the LangGraph analysis workflow
    const analysisResult = await runAnalysis(typedAds, typedSession.niche);

    // Store analysis in database
    const { data: savedAnalysis, error: saveError } = await supabase
      .from('analyses')
      .insert({
        session_id: sessionId,
        niche: typedSession.niche,
        hooks: analysisResult.hooks,
        offers: analysisResult.offers,
        angles: analysisResult.angles,
        patterns: analysisResult.patterns,
        saturated: analysisResult.saturated,
        gaps: analysisResult.gaps,
        advertisers: analysisResult.advertisers,
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
