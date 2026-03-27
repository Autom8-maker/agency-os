import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';
import { runCreative } from '@/lib/agents/creative';
import type { Strategy, StrategyBrainOutput } from '@/types';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  let body: {
    strategyId: string;
    niche: string;
    audience: string;
    offer: string;
    tone: string;
    type: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { strategyId, niche, audience, offer, tone, type } = body;

  if (!strategyId || !niche || !audience || !offer || !type) {
    return NextResponse.json(
      { error: 'strategyId, niche, audience, offer, and type are required' },
      { status: 400 }
    );
  }

  if (!['copy', 'brief', 'image_prompts'].includes(type)) {
    return NextResponse.json(
      { error: 'type must be: copy | brief | image_prompts' },
      { status: 400 }
    );
  }

  const supabase = getServerSupabase();

  // Strategy is required — Creative Layer depends on Strategy Brain output
  const { data: strategyData, error: strategyError } = await supabase
    .from('strategies')
    .select('*')
    .eq('id', strategyId)
    .single();

  if (strategyError || !strategyData) {
    return NextResponse.json(
      { error: 'Strategy not found. Run the Strategy Brain first.' },
      { status: 404 }
    );
  }

  const strategy = strategyData as Strategy;

  // Extract StrategyBrainOutput from stored strategy
  const strategyOutput: StrategyBrainOutput = {
    angle_clusters:      strategy.angle_clusters      || [],
    recommended_angles:  strategy.recommended_angles  || [],
    campaign_directions: strategy.campaign_directions || [],
    testing_plan:        strategy.testing_plan        || [],
    strategic_insights:  strategy.strategic_insights  || [],
  };

  try {
    const output = await runCreative({
      niche,
      audience,
      offer,
      tone: tone || 'Conversational & direct',
      type: type as 'copy' | 'brief' | 'image_prompts',
      strategy_output: strategyOutput,
    });

    const { data: savedCreative, error: saveError } = await supabase
      .from('creatives')
      .insert({
        strategy_id: strategyId,
        niche,
        type,
        content: output,
        meta: { audience, offer, tone, generated_at: new Date().toISOString() },
      })
      .select()
      .single();

    if (saveError) {
      throw new Error(`Failed to save creative: ${saveError.message}`);
    }

    return NextResponse.json(savedCreative);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Creative generation failed';
    console.error('[/api/creative]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
