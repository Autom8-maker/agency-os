import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';
import { runStrategy, buildStrategyInput } from '@/lib/agents/strategy';
import type { Analysis } from '@/types';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  let body: {
    analysisId: string;
    niche: string;
    audience: string;
    offer: string;
    goal: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { analysisId, niche, audience, offer, goal } = body;

  if (!analysisId || !niche || !audience || !offer || !goal) {
    return NextResponse.json(
      { error: 'analysisId, niche, audience, offer, and goal are all required' },
      { status: 400 }
    );
  }

  const supabase = getServerSupabase();

  // Analysis is required — Strategy Brain must have real competitive data
  const { data: analysisData, error: analysisError } = await supabase
    .from('analyses')
    .select('*')
    .eq('id', analysisId)
    .single();

  if (analysisError || !analysisData) {
    return NextResponse.json(
      { error: 'Analysis not found. Run analysis first to feed the Strategy Brain.' },
      { status: 404 }
    );
  }

  const analysis = analysisData as Analysis;

  try {
    // Build the strict StrategyBrainInput from analysis data + user params
    const strategyInput = buildStrategyInput({
      niche,
      audience,
      offer,
      goal,
      hooks:       analysis.hooks       || [],
      offers:      analysis.offers      || [],
      patterns:    analysis.patterns    || [],
      gaps:        analysis.gaps        || [],
      saturated:   analysis.saturated   || [],
      advertisers: analysis.advertisers || [],
    });

    // Run the Strategy Brain — single node, strict structured output
    const strategyOutput = await runStrategy(strategyInput);

    const { data: savedStrategy, error: saveError } = await supabase
      .from('strategies')
      .insert({
        analysis_id:         analysisId,
        niche,
        audience,
        offer,
        goal,
        angle_clusters:      strategyOutput.angle_clusters,
        recommended_angles:  strategyOutput.recommended_angles,
        campaign_directions: strategyOutput.campaign_directions,
        testing_plan:        strategyOutput.testing_plan,
        strategic_insights:  strategyOutput.strategic_insights,
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
