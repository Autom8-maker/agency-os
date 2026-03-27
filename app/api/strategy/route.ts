import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';
import { runStrategy } from '@/lib/agents/strategy';
import type { StrategyRequest, Analysis } from '@/types';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  let body: StrategyRequest;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { analysisId, niche, audience, offer, goal, focus } = body;

  if (!niche || !audience || !offer || !goal) {
    return NextResponse.json(
      { error: 'niche, audience, offer, and goal are required' },
      { status: 400 }
    );
  }

  const supabase = getServerSupabase();

  // Load analysis if provided
  let analysis: Analysis | null = null;
  if (analysisId) {
    const { data, error } = await supabase
      .from('analyses')
      .select('*')
      .eq('id', analysisId)
      .single();

    if (error) {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
    }
    analysis = data as Analysis;
  } else {
    // Create a minimal empty analysis for manual strategy generation
    analysis = {
      id: '',
      session_id: '',
      niche,
      hooks: [],
      offers: [],
      angles: [],
      patterns: [],
      saturated: [],
      gaps: [],
      advertisers: [],
      created_at: new Date().toISOString(),
    };
  }

  try {
    const strategyResult = await runStrategy(
      analysis,
      niche,
      audience,
      offer,
      goal,
      focus || 'Differentiation from competitors'
    );

    // Store strategy in database
    const { data: savedStrategy, error: saveError } = await supabase
      .from('strategies')
      .insert({
        analysis_id: analysisId || null,
        niche,
        audience,
        offer,
        goal,
        offer_angles: strategyResult.offer_angles,
        positioning: strategyResult.positioning,
        campaign_concepts: strategyResult.campaign_concepts,
        messaging_priorities: strategyResult.messaging_priorities,
        avoid: strategyResult.avoid,
      })
      .select()
      .single();

    if (saveError) {
      throw new Error(`Failed to save strategy: ${saveError.message}`);
    }

    return NextResponse.json(savedStrategy);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Strategy generation failed';
    console.error('[/api/strategy]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
