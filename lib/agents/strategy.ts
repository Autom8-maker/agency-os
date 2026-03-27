import { Annotation, StateGraph, END } from '@langchain/langgraph';
import { ChatAnthropic } from '@langchain/anthropic';
import type {
  Analysis,
  StrategyAngle,
  PositioningItem,
  CampaignConcept,
} from '@/types';

// ─── State Definition ─────────────────────────────────────────────────────────

const StrategyStateAnnotation = Annotation.Root({
  analysis: Annotation<Analysis>({ reducer: (_, b) => b }),
  niche: Annotation<string>({ reducer: (_, b) => b }),
  audience: Annotation<string>({ reducer: (_, b) => b }),
  offer: Annotation<string>({ reducer: (_, b) => b }),
  goal: Annotation<string>({ reducer: (_, b) => b }),
  focus: Annotation<string>({ reducer: (_, b) => b }),
  offer_angles: Annotation<StrategyAngle[]>({ reducer: (_, b) => b, default: () => [] }),
  positioning: Annotation<PositioningItem[]>({ reducer: (_, b) => b, default: () => [] }),
  campaign_concepts: Annotation<CampaignConcept[]>({ reducer: (_, b) => b, default: () => [] }),
  messaging_priorities: Annotation<string[]>({ reducer: (_, b) => b, default: () => [] }),
  avoid: Annotation<string[]>({ reducer: (_, b) => b, default: () => [] }),
});

type StrategyState = typeof StrategyStateAnnotation.State;

// ─── LLM ─────────────────────────────────────────────────────────────────────

function getLLM() {
  return new ChatAnthropic({
    model: 'claude-3-5-sonnet-20241022',
    temperature: 0.5,
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
}

function safeParseJson<T>(text: string, fallback: T): T {
  try {
    const match = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
    const raw = match ? match[1] : text;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function analysisContext(state: StrategyState): string {
  const { analysis } = state;
  const hooksStr = analysis.hooks?.map((h) => `- ${h.text}`).join('\n') || 'None';
  const offersStr = analysis.offers?.map((o) => `- ${o.text}`).join('\n') || 'None';
  const anglesStr = analysis.angles?.map((a) => `- ${a.text}`).join('\n') || 'None';
  const gapsStr = analysis.gaps?.map((g) => `- ${g.text} (${g.notes || ''})`).join('\n') || 'None';
  const saturatedStr = analysis.saturated?.map((s) => `- ${s.text}`).join('\n') || 'None';

  return `NICHE: ${state.niche}
TARGET AUDIENCE: ${state.audience}
OFFER: ${state.offer}
GOAL: ${state.goal}
STRATEGIC FOCUS: ${state.focus}

COMPETITIVE INTELLIGENCE:
Common Hooks in Market:
${hooksStr}

Common Offers in Market:
${offersStr}

Common Angles in Market:
${anglesStr}

Market Gaps (Opportunity):
${gapsStr}

Saturated / Overdone:
${saturatedStr}`;
}

// ─── Node: Generate Angles ────────────────────────────────────────────────────

async function generateAngles(state: StrategyState): Promise<Partial<StrategyState>> {
  const llm = getLLM();
  const context = analysisContext(state);

  const response = await llm.invoke([
    {
      role: 'user',
      content: `You are a world-class direct response advertising strategist.

Based on the competitive intelligence below, generate 5-7 differentiated offer angles for this brand. Each angle should exploit a market gap or underserved positioning opportunity.

${context}

Return a JSON array of offer angle objects:
- angle: the core angle or positioning statement (string)
- rationale: why this angle works given the competitive landscape (string)
- example: a sample hook or headline using this angle (string)

Return ONLY the JSON array:
[{"angle": "...", "rationale": "...", "example": "..."}]`,
    },
  ]);

  const offer_angles = safeParseJson<StrategyAngle[]>(
    typeof response.content === 'string' ? response.content : JSON.stringify(response.content),
    []
  );

  return { offer_angles };
}

// ─── Node: Generate Positioning ───────────────────────────────────────────────

async function generatePositioning(state: StrategyState): Promise<Partial<StrategyState>> {
  const llm = getLLM();
  const context = analysisContext(state);
  const anglesStr = state.offer_angles.map((a) => `- ${a.angle}: ${a.rationale}`).join('\n');

  const response = await llm.invoke([
    {
      role: 'user',
      content: `You are a brand strategist specializing in positioning.

Based on the market intelligence and proposed angles, develop precise positioning statements that differentiate this brand.

${context}

PROPOSED ANGLES:
${anglesStr}

Create 4-5 positioning statements. Each should have:
- statement: the positioning statement (string)
- differentiator: the specific thing that sets this apart from competitors (string)

Return ONLY a JSON array:
[{"statement": "...", "differentiator": "..."}]`,
    },
  ]);

  const positioning = safeParseJson<PositioningItem[]>(
    typeof response.content === 'string' ? response.content : JSON.stringify(response.content),
    []
  );

  return { positioning };
}

// ─── Node: Generate Concepts ──────────────────────────────────────────────────

async function generateConcepts(state: StrategyState): Promise<Partial<StrategyState>> {
  const llm = getLLM();
  const context = analysisContext(state);
  const positioningStr = state.positioning
    .map((p) => `- ${p.statement} (Differentiator: ${p.differentiator})`)
    .join('\n');

  const response = await llm.invoke([
    {
      role: 'user',
      content: `You are a creative strategist developing campaign concepts for a paid advertising campaign.

${context}

POSITIONING:
${positioningStr}

Develop 3-4 distinct campaign concepts that could each run as a separate campaign or ad set. Each concept should target different audience segments or use different emotional angles.

For each concept:
- name: memorable campaign name (string)
- hook: the lead hook or opening line (string)
- format: recommended ad format (Video | Static | Carousel | UGC | etc.) (string)
- audience_segment: the specific audience this targets (string)
- key_message: the core message in one sentence (string)

Return ONLY a JSON array:
[{"name": "...", "hook": "...", "format": "...", "audience_segment": "...", "key_message": "..."}]`,
    },
  ]);

  const campaign_concepts = safeParseJson<CampaignConcept[]>(
    typeof response.content === 'string' ? response.content : JSON.stringify(response.content),
    []
  );

  return { campaign_concepts };
}

// ─── Node: Synthesize ─────────────────────────────────────────────────────────

async function synthesize(state: StrategyState): Promise<Partial<StrategyState>> {
  const llm = getLLM();

  const conceptsStr = state.campaign_concepts
    .map((c) => `- ${c.name}: ${c.key_message}`)
    .join('\n');

  const response = await llm.invoke([
    {
      role: 'user',
      content: `You are a performance marketing strategist wrapping up a strategy brief.

Based on the strategy developed for:
- Niche: ${state.niche}
- Audience: ${state.audience}
- Offer: ${state.offer}
- Goal: ${state.goal}

Campaign Concepts:
${conceptsStr}

Provide two lists:

1. messaging_priorities: 5-7 key messaging priorities ranked by importance (what to emphasize most)
2. avoid: 4-6 specific things to AVOID in messaging based on market saturation and strategic positioning

Return as a JSON object:
{
  "messaging_priorities": ["...", "..."],
  "avoid": ["...", "..."]
}

Return ONLY the JSON object.`,
    },
  ]);

  const contentStr =
    typeof response.content === 'string' ? response.content : JSON.stringify(response.content);

  const result = safeParseJson<{ messaging_priorities: string[]; avoid: string[] }>(contentStr, {
    messaging_priorities: [],
    avoid: [],
  });

  return {
    messaging_priorities: result.messaging_priorities || [],
    avoid: result.avoid || [],
  };
}

// ─── Graph Construction ───────────────────────────────────────────────────────

const strategyGraph = new StateGraph(StrategyStateAnnotation)
  .addNode('generateAngles', generateAngles)
  .addNode('generatePositioning', generatePositioning)
  .addNode('generateConcepts', generateConcepts)
  .addNode('synthesize', synthesize)
  .addEdge('__start__', 'generateAngles')
  .addEdge('generateAngles', 'generatePositioning')
  .addEdge('generatePositioning', 'generateConcepts')
  .addEdge('generateConcepts', 'synthesize')
  .addEdge('synthesize', END);

export const strategyWorkflow = strategyGraph.compile();

// ─── Runner Function ──────────────────────────────────────────────────────────

export async function runStrategy(
  analysis: Analysis,
  niche: string,
  audience: string,
  offer: string,
  goal: string,
  focus: string
): Promise<{
  offer_angles: StrategyAngle[];
  positioning: PositioningItem[];
  campaign_concepts: CampaignConcept[];
  messaging_priorities: string[];
  avoid: string[];
}> {
  const result = await strategyWorkflow.invoke({
    analysis,
    niche,
    audience,
    offer,
    goal,
    focus,
    offer_angles: [],
    positioning: [],
    campaign_concepts: [],
    messaging_priorities: [],
    avoid: [],
  });

  return {
    offer_angles: result.offer_angles,
    positioning: result.positioning,
    campaign_concepts: result.campaign_concepts,
    messaging_priorities: result.messaging_priorities,
    avoid: result.avoid,
  };
}
