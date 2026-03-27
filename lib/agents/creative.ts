import { Annotation, StateGraph, END } from '@langchain/langgraph';
import { ChatAnthropic } from '@langchain/anthropic';
import type { CreativeType, Strategy } from '@/types';

// ─── State Definition ─────────────────────────────────────────────────────────

const CreativeStateAnnotation = Annotation.Root({
  niche: Annotation<string>({ reducer: (_, b) => b }),
  audience: Annotation<string>({ reducer: (_, b) => b }),
  offer: Annotation<string>({ reducer: (_, b) => b }),
  tone: Annotation<string>({ reducer: (_, b) => b }),
  type: Annotation<CreativeType>({ reducer: (_, b) => b }),
  strategy: Annotation<Strategy | undefined>({ reducer: (_, b) => b }),
  output: Annotation<string>({ reducer: (_, b) => b, default: () => '' }),
});

type CreativeState = typeof CreativeStateAnnotation.State;

// ─── LLM ─────────────────────────────────────────────────────────────────────

function getLLM() {
  return new ChatAnthropic({
    model: 'claude-3-5-sonnet-20241022',
    temperature: 0.7,
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
}

function strategyContext(state: CreativeState): string {
  if (!state.strategy) return '';

  const anglesStr =
    state.strategy.offer_angles?.map((a) => `- ${a.angle}`).join('\n') || 'None';
  const positioningStr =
    state.strategy.positioning?.map((p) => `- ${p.statement}`).join('\n') || 'None';
  const prioritiesStr = state.strategy.messaging_priorities?.join(', ') || 'None';
  const avoidStr = state.strategy.avoid?.join(', ') || 'None';

  return `
STRATEGY CONTEXT:
Offer Angles:
${anglesStr}

Positioning:
${positioningStr}

Messaging Priorities: ${prioritiesStr}
Avoid: ${avoidStr}`;
}

// ─── Node: Write Ad Copy ──────────────────────────────────────────────────────

async function writeCopy(state: CreativeState): Promise<Partial<CreativeState>> {
  const llm = getLLM();
  const context = strategyContext(state);

  const response = await llm.invoke([
    {
      role: 'user',
      content: `You are a world-class direct response copywriter who writes high-converting Facebook and Instagram ads.

Write 3 complete ad variations for the following:

NICHE: ${state.niche}
AUDIENCE: ${state.audience}
OFFER: ${state.offer}
TONE: ${state.tone}
${context}

For each variation write:
1. HOOK (first 1-2 lines that stop the scroll)
2. BODY (3-5 sentences expanding on the offer/pain/benefit)
3. CTA (clear call-to-action line)

Format as:
---
VARIATION 1: [Theme/Angle Name]

HOOK:
[hook text]

BODY:
[body text]

CTA:
[cta text]

---
VARIATION 2: [Theme/Angle Name]
...and so on

Write for Facebook/Instagram feed placement. Make them feel native, not salesy. Use the specified tone throughout.`,
    },
  ]);

  return {
    output:
      typeof response.content === 'string' ? response.content : JSON.stringify(response.content),
  };
}

// ─── Node: Write Creative Brief ───────────────────────────────────────────────

async function writeBrief(state: CreativeState): Promise<Partial<CreativeState>> {
  const llm = getLLM();
  const context = strategyContext(state);

  const response = await llm.invoke([
    {
      role: 'user',
      content: `You are a creative director at a top-tier digital advertising agency.

Write a comprehensive creative brief for a paid social advertising campaign.

NICHE: ${state.niche}
AUDIENCE: ${state.audience}
OFFER: ${state.offer}
TONE: ${state.tone}
${context}

The brief should cover:

# CAMPAIGN OVERVIEW
[2-3 sentence summary of the campaign's purpose and approach]

# TARGET AUDIENCE
[Detailed audience description: demographics, psychographics, pain points, desires, where they are in the buyer journey]

# CAMPAIGN OBJECTIVES
[Primary and secondary objectives with measurable goals]

# CORE MESSAGE
[The single most important thing we want the audience to feel/think/do]

# TONE & VOICE
[Specific tone guidelines with examples of words/phrases to use and avoid]

# CREATIVE DIRECTION
[Visual style guidelines, imagery concepts, color/mood direction]

# AD FORMATS RECOMMENDED
[Specific formats with rationale: video length, aspect ratios, static specs]

# HOOKS TO TEST
[5-7 opening hooks to A/B test across formats]

# KEY PROOF POINTS
[Evidence, social proof, statistics to include]

# CALLS TO ACTION
[Recommended CTAs with reasoning]

# SUCCESS METRICS
[KPIs and what "winning" looks like for this campaign]

Write this as a professional document a creative team would use to execute the campaign.`,
    },
  ]);

  return {
    output:
      typeof response.content === 'string' ? response.content : JSON.stringify(response.content),
  };
}

// ─── Node: Write Image Prompts ────────────────────────────────────────────────

async function writeImagePrompts(state: CreativeState): Promise<Partial<CreativeState>> {
  const llm = getLLM();
  const context = strategyContext(state);

  const response = await llm.invoke([
    {
      role: 'user',
      content: `You are a creative director specializing in AI-generated advertising visuals.

Create 8 detailed image generation prompts for a paid social campaign.

NICHE: ${state.niche}
AUDIENCE: ${state.audience}
OFFER: ${state.offer}
TONE: ${state.tone}
${context}

For each prompt:
1. Write a detailed prompt optimized for Midjourney or DALL-E 3
2. Include: subject, setting, lighting, mood, style, composition, and technical specs
3. Add a brief note on which ad concept or angle this visual supports

Format as:
---
PROMPT 1: [Concept Name]

[Full detailed prompt text]

USE FOR: [Which angle/concept/audience segment this supports]
ASPECT RATIO: [16:9 | 1:1 | 9:16]
---

Cover these visual categories:
- 2 lifestyle/aspirational images
- 2 problem/before state images
- 2 product/solution highlight images
- 2 social proof/testimonial style images

Make prompts highly specific and actionable.`,
    },
  ]);

  return {
    output:
      typeof response.content === 'string' ? response.content : JSON.stringify(response.content),
  };
}

// ─── Router ───────────────────────────────────────────────────────────────────

function routeCreative(state: CreativeState): string {
  switch (state.type) {
    case 'copy':
      return 'writeCopy';
    case 'brief':
      return 'writeBrief';
    case 'image_prompts':
      return 'writeImagePrompts';
    default:
      return 'writeCopy';
  }
}

// ─── Graph Construction ───────────────────────────────────────────────────────

const creativeGraph = new StateGraph(CreativeStateAnnotation)
  .addNode('writeCopy', writeCopy)
  .addNode('writeBrief', writeBrief)
  .addNode('writeImagePrompts', writeImagePrompts)
  .addConditionalEdges('__start__', routeCreative, {
    writeCopy: 'writeCopy',
    writeBrief: 'writeBrief',
    writeImagePrompts: 'writeImagePrompts',
  })
  .addEdge('writeCopy', END)
  .addEdge('writeBrief', END)
  .addEdge('writeImagePrompts', END);

export const creativeWorkflow = creativeGraph.compile();

// ─── Runner Function ──────────────────────────────────────────────────────────

export async function runCreative(params: {
  niche: string;
  audience: string;
  offer: string;
  tone: string;
  type: CreativeType;
  strategy?: Strategy;
}): Promise<string> {
  const result = await creativeWorkflow.invoke({
    niche: params.niche,
    audience: params.audience,
    offer: params.offer,
    tone: params.tone,
    type: params.type,
    strategy: params.strategy,
    output: '',
  });

  return result.output;
}
