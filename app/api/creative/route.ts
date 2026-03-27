import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';
import { runCreative } from '@/lib/agents/creative';
import type { CreativeRequest, Strategy } from '@/types';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  let body: CreativeRequest;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { strategyId, niche, audience, offer, tone, type } = body;

  if (!niche || !audience || !offer || !type) {
    return NextResponse.json(
      { error: 'niche, audience, offer, and type are required' },
      { status: 400 }
    );
  }

  if (!['copy', 'brief', 'image_prompts'].includes(type)) {
    return NextResponse.json(
      { error: 'type must be one of: copy, brief, image_prompts' },
      { status: 400 }
    );
  }

  const supabase = getServerSupabase();

  // Load strategy if provided
  let strategy: Strategy | undefined;
  if (strategyId) {
    const { data, error } = await supabase
      .from('strategies')
      .select('*')
      .eq('id', strategyId)
      .single();

    if (!error && data) {
      strategy = data as Strategy;
    }
  }

  try {
    const output = await runCreative({
      niche,
      audience,
      offer,
      tone: tone || 'Conversational & direct',
      type,
      strategy,
    });

    // Store creative in database
    const { data: savedCreative, error: saveError } = await supabase
      .from('creatives')
      .insert({
        strategy_id: strategyId || null,
        niche,
        type,
        content: output,
        meta: {
          audience,
          offer,
          tone,
          generated_at: new Date().toISOString(),
        },
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
