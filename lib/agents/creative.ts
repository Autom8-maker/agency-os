/**
 * Creative Layer
 *
 * Responsibility: Generate ad copy, briefs, and image prompts.
 * Depends entirely on StrategyBrainOutput — no re-analysis, no re-strategizing.
 *
 * Three nodes (conditional routing by type):
 *   writeCopy | writeBrief | writeImagePrompts
 */

import { Annotation, StateGraph, END } from '@langchain/langgraph';
import { getLLM, toText } from '@/lib/llm';
import type { CreativeType, StrategyBrainOutput } from '@/types';

// ─── State ────────────────────────────────────────────────────────────────────

const CreativeStateAnnotation = Annotation.Root({
  niche:           Annotation<string>({ reducer: (_, b) => b }),
  audience:        Annotation<string>({ reducer: (_, b) => b }),
  offer:           Annotation<string>({ reducer: (_, b) => b }),
  tone:            Annotation<string>({ reducer: (_, b) => b }),
  type:            Annotation<CreativeType>({ reducer: (_, b) => b }),
  strategy_output: Annotation<StrategyBrainOutput | undefined>({ reducer: (_, b) => b }),
  output:          Annotation<string>({ reducer: (_, b) => b, default: () => '' }),
});

type CreativeState = typeof CreativeStateAnnotation.State;

// ─── Strategy Context Builder ─────────────────────────────────────────────────
// Distills StrategyBrainOutput into a crisp context block for creative prompts

function buildStrategyContext(s: StrategyBrainOutput | undefined): string {
  if (!s) return '';

  const lines: string[] = ['\n━━━ STRATEGY CONTEXT ━━━'];

  if (s.recommended_angles.length > 0) {
    lines.push('Recommended angles to lead with:');
    s.recommended_angles.slice(0, 3).forEach((a, i) => lines.push(`  ${i + 1}. ${a}`));
  }

  if (s.campaign_directions.length > 0) {
    const top = s.campaign_directions.filter((d) => d.priority === 'high').slice(0, 2);
    if (top.length > 0) {
      lines.push('\nHigh-priority campaign directions:');
      top.forEach((d) => lines.push(`  • ${d.name}: hook → "${d.hook}" (${d.format})`));
    }
  }

  if (s.strategic_insights.length > 0) {
    lines.push('\nKey strategic insights:');
    s.strategic_insights.slice(0, 2).forEach((i) => lines.push(`  • ${i}`));
  }

  return lines.join('\n');
}

// ─── Node: Write Ad Copy ──────────────────────────────────────────────────────

async function writeCopy(state: CreativeState): Promise<Partial<CreativeState>> {
  const llm     = getLLM(0.7);
  const context = buildStrategyContext(state.strategy_output);

  const response = await llm.invoke([
    {
      role: 'user',
      content: `You are a world-class direct response copywriter. Write high-converting Facebook and Instagram ads.

NICHE: ${state.niche}
AUDIENCE: ${state.audience}
OFFER: ${state.offer}
TONE: ${state.tone}
${context}

Write 3 complete ad variations. Each must be deployable as-is.

Format:
---
VARIATION 1: [Angle Name]

HOOK:
[scroll-stopping opening — 1-2 lines max]

BODY:
[3-5 sentences expanding on pain/benefit/proof]

CTA:
[single action line]

---
VARIATION 2: [Angle Name]

HOOK:
[different angle, different opening]

BODY:
[...]

CTA:
[...]

---
VARIATION 3: [Angle Name]

HOOK:
[...]

BODY:
[...]

CTA:
[...]

Rules:
- Each variation uses a different angle from the strategy context
- Hooks must stop the scroll — no generic openers like "Are you tired of..."
- Body must feel native, not salesy
- CTA must be specific and action-oriented`,
    },
  ]);

  return { output: toText(response.content) };
}

// ─── Node: Write Creative Brief ───────────────────────────────────────────────

async function writeBrief(state: CreativeState): Promise<Partial<CreativeState>> {
  const llm     = getLLM(0.5);
  const context = buildStrategyContext(state.strategy_output);

  const response = await llm.invoke([
    {
      role: 'user',
      content: `You are a creative director at a top performance advertising agency. Write a production-ready creative brief.

NICHE: ${state.niche}
AUDIENCE: ${state.audience}
OFFER: ${state.offer}
TONE: ${state.tone}
${context}

# CAMPAIGN OVERVIEW
[2-3 sentences: campaign purpose and strategic approach]

# TARGET AUDIENCE
[Demographics, psychographics, pain points, buyer journey stage]

# CORE MESSAGE
[The single most important thing the audience must feel/think/do]

# TONE & VOICE
[Specific guidelines with do/don't phrase examples]

# CREATIVE DIRECTION
[Visual style, imagery concepts, color/mood]

# AD FORMATS
[Recommended formats with rationale and specs]

# HOOKS TO TEST
[5-7 opening hooks for A/B testing]

# PROOF POINTS
[Evidence, social proof, data to include]

# CALLS TO ACTION
[2-3 CTA options with reasoning]

# SUCCESS METRICS
[KPIs and what winning looks like]

Be specific. Vague briefs produce bad creative.`,
    },
  ]);

  return { output: toText(response.content) };
}

// ─── Node: Write Image Prompts ────────────────────────────────────────────────

async function writeImagePrompts(state: CreativeState): Promise<Partial<CreativeState>> {
  const llm     = getLLM(0.6);
  const context = buildStrategyContext(state.strategy_output);

  const response = await llm.invoke([
    {
      role: 'user',
      content: `You are a creative director specializing in AI-generated advertising visuals.

NICHE: ${state.niche}
AUDIENCE: ${state.audience}
OFFER: ${state.offer}
TONE: ${state.tone}
${context}

Create 8 Midjourney/DALL-E prompts for paid social — 2 each of:
- Lifestyle/aspirational
- Problem/pain state
- Solution/product highlight
- Social proof/results

Format each:
---
PROMPT [N]: [Category — Concept Name]

[Full prompt: subject, setting, lighting, mood, style, composition, technical specs]

USE FOR: [Which campaign direction this supports]
ASPECT RATIO: [16:9 | 1:1 | 9:16]
PLACEMENT: [Feed | Story | Both]
---

Include in each prompt: lighting quality, color palette, emotional tone, subject detail, background, camera angle.`,
    },
  ]);

  return { output: toText(response.content) };
}

// ─── Router ───────────────────────────────────────────────────────────────────

function routeCreative(state: CreativeState): string {
  if (state.type === 'brief')         return 'writeBrief';
  if (state.type === 'image_prompts') return 'writeImagePrompts';
  return 'writeCopy';
}

// ─── Graph ────────────────────────────────────────────────────────────────────

const creativeGraph = new StateGraph(CreativeStateAnnotation)
  .addNode('writeCopy',         writeCopy)
  .addNode('writeBrief',        writeBrief)
  .addNode('writeImagePrompts', writeImagePrompts)
  .addConditionalEdges('__start__', routeCreative, {
    writeCopy:         'writeCopy',
    writeBrief:        'writeBrief',
    writeImagePrompts: 'writeImagePrompts',
  })
  .addEdge('writeCopy',         END)
  .addEdge('writeBrief',        END)
  .addEdge('writeImagePrompts', END);

export const creativeWorkflow = creativeGraph.compile();

// ─── Runner ───────────────────────────────────────────────────────────────────

export async function runCreative(params: {
  niche:            string;
  audience:         string;
  offer:            string;
  tone:             string;
  type:             CreativeType;
  strategy_output?: StrategyBrainOutput;
}): Promise<string> {
  const result = await creativeWorkflow.invoke({
    niche:           params.niche,
    audience:        params.audience,
    offer:           params.offer,
    tone:            params.tone,
    type:            params.type,
    strategy_output: params.strategy_output,
    output:          '',
  });

  return result.output;
}
