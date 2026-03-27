/**
 * Strategy Brain
 *
 * Responsibility: Structured strategic reasoning. ONE node. ONE call.
 * This is the decision-making layer of the system.
 *
 * Input:  StrategyBrainInput  — strict contract from Analysis Layer
 * Output: StrategyBrainOutput — strict contract consumed by Creative Layer
 *
 * It does NOT extract data. It does NOT generate creative.
 * It reasons about competitive position and produces actionable decisions.
 */

import { Annotation, StateGraph, END } from '@langchain/langgraph';
import { getLLM, toText, parseJSON } from '@/lib/llm';
import type { StrategyBrainInput, StrategyBrainOutput } from '@/types';

// ─── State ────────────────────────────────────────────────────────────────────

const EMPTY_OUTPUT: StrategyBrainOutput = {
  angle_clusters:      [],
  recommended_angles:  [],
  campaign_directions: [],
  testing_plan:        [],
  strategic_insights:  [],
};

const StrategyStateAnnotation = Annotation.Root({
  input:  Annotation<StrategyBrainInput>({ reducer: (_, b) => b }),
  output: Annotation<StrategyBrainOutput>({ reducer: (_, b) => b, default: () => EMPTY_OUTPUT }),
});

type StrategyState = typeof StrategyStateAnnotation.State;

// ─── Node: Strategy Brain (single, authoritative reasoning node) ───────────────

async function strategyBrain(state: StrategyState): Promise<Partial<StrategyState>> {
  const llm = getLLM(0.4);
  const { input } = state;

  const hooksStr    = input.top_hooks.slice(0, 8).map((h, i) => `${i + 1}. ${h}`).join('\n') || 'None available';
  const offersStr   = input.top_offers.slice(0, 8).map((o, i) => `${i + 1}. ${o}`).join('\n') || 'None available';
  const patternsStr = input.patterns.slice(0, 6).map((p, i) => `${i + 1}. ${p}`).join('\n') || 'None available';

  const response = await llm.invoke([
    {
      role: 'system',
      content: `You are a world-class direct response advertising strategist.
You think in terms of what actually converts. You are commercially sharp, opinionated, and never vague.
You produce structured strategic decisions — not descriptions, not general advice.
Every output must be actionable and grounded in the competitive data provided.`,
    },
    {
      role: 'user',
      content: `Produce a complete strategic playbook for the following brand.

━━━ BRAND CONTEXT ━━━
Niche: ${input.niche}
Target Audience: ${input.audience}
Current Offer: ${input.offer}
Campaign Goal: ${input.goal}

━━━ COMPETITIVE INTELLIGENCE ━━━
Top Competitor Hooks:
${hooksStr}

Top Competitor Offers:
${offersStr}

Market Patterns:
${patternsStr}

Competitor Summary: ${input.competitor_summary || 'Not provided'}

━━━ YOUR JOB ━━━
Analyze the competitive landscape and produce a structured strategic playbook.

Return ONLY this JSON object:
{
  "angle_clusters": [
    {
      "angle": "angle name (3-6 words)",
      "description": "what this angle means and how to position around it",
      "why_it_works": "specific psychological or market reason this converts in this niche",
      "market_saturation": "low | medium | high"
    }
  ],
  "recommended_angles": [
    "Top angle to test first — one sentence with rationale",
    "Second angle to test — one sentence with rationale"
  ],
  "campaign_directions": [
    {
      "name": "Campaign name",
      "angle": "which angle cluster this maps to",
      "hook": "exact opening hook line ready to use as-is",
      "format": "Video | Static | Carousel | UGC",
      "audience_segment": "specific audience segment description",
      "priority": "high | medium | low"
    }
  ],
  "testing_plan": [
    {
      "hypothesis": "If we run [X] against [Y], we expect [Z] because...",
      "test_type": "A/B hook test | Angle test | Offer test | Format test",
      "expected_outcome": "specific measurable outcome"
    }
  ],
  "strategic_insights": [
    "Specific, non-obvious insight about this market",
    "What competitors are NOT doing that represents an opening",
    "What the data suggests about audience psychology in this niche"
  ]
}

Requirements:
- angle_clusters: 5-7 distinct, non-overlapping angles specific to this niche (not generic)
- recommended_angles: top 2-3 prioritized by lowest saturation + highest fit for this offer
- campaign_directions: 3-5 ready-to-brief concepts with usable hooks
- testing_plan: 3-4 specific hypotheses grounded in the competitive data
- strategic_insights: 3-5 opinionated, non-obvious observations

Return ONLY the JSON object. No markdown, no preamble.`,
    },
  ]);

  const raw    = toText(response.content);
  const parsed = parseJSON<StrategyBrainOutput>(raw, EMPTY_OUTPUT);

  return {
    output: {
      angle_clusters:      parsed.angle_clusters      || [],
      recommended_angles:  parsed.recommended_angles  || [],
      campaign_directions: parsed.campaign_directions || [],
      testing_plan:        parsed.testing_plan        || [],
      strategic_insights:  parsed.strategic_insights  || [],
    },
  };
}

// ─── Graph ────────────────────────────────────────────────────────────────────

const strategyGraph = new StateGraph(StrategyStateAnnotation)
  .addNode('strategyBrain', strategyBrain)
  .addEdge('__start__', 'strategyBrain')
  .addEdge('strategyBrain', END);

export const strategyWorkflow = strategyGraph.compile();

// ─── Runner ───────────────────────────────────────────────────────────────────

export async function runStrategy(input: StrategyBrainInput): Promise<StrategyBrainOutput> {
  const result = await strategyWorkflow.invoke({ input, output: EMPTY_OUTPUT });
  return result.output;
}

// ─── Input Builder ────────────────────────────────────────────────────────────
// Constructs StrategyBrainInput from Analysis data + user params

export function buildStrategyInput(params: {
  niche: string;
  audience: string;
  offer: string;
  goal: string;
  hooks:       Array<{ text: string }>;
  offers:      Array<{ text: string }>;
  patterns:    Array<{ text: string; notes?: string }>;
  gaps:        Array<{ text: string; notes?: string }>;
  saturated:   Array<{ text: string }>;
  advertisers: Array<{ name: string; dominant_strategy?: string }>;
}): StrategyBrainInput {
  const competitorSummary = [
    params.advertisers.length > 0
      ? `Key advertisers: ${params.advertisers.slice(0, 3).map((a) => `${a.name} (${a.dominant_strategy || 'unknown strategy'})`).join(', ')}`
      : '',
    params.saturated.length > 0
      ? `Saturated angles to avoid: ${params.saturated.slice(0, 4).map((s) => s.text).join('; ')}`
      : '',
    params.gaps.length > 0
      ? `Market gaps: ${params.gaps.slice(0, 3).map((g) => `${g.text}${g.notes ? ` — ${g.notes}` : ''}`).join('; ')}`
      : '',
  ]
    .filter(Boolean)
    .join('. ');

  return {
    niche:              params.niche,
    audience:           params.audience,
    offer:              params.offer,
    goal:               params.goal,
    top_hooks:          params.hooks.slice(0, 8).map((h) => h.text),
    top_offers:         params.offers.slice(0, 8).map((o) => o.text),
    patterns:           params.patterns.slice(0, 6).map((p) => `${p.text}${p.notes ? ` — ${p.notes}` : ''}`),
    competitor_summary: competitorSummary,
  };
}
