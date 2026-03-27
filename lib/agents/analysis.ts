import { Annotation, StateGraph, END } from '@langchain/langgraph';
import { ChatAnthropic } from '@langchain/anthropic';
import type { Ad, AnalysisItem, AdvertiserInfo } from '@/types';

// ─── State Definition ─────────────────────────────────────────────────────────

const AnalysisStateAnnotation = Annotation.Root({
  ads: Annotation<Ad[]>({ reducer: (_, b) => b }),
  niche: Annotation<string>({ reducer: (_, b) => b }),
  hooks: Annotation<AnalysisItem[]>({ reducer: (_, b) => b, default: () => [] }),
  offers: Annotation<AnalysisItem[]>({ reducer: (_, b) => b, default: () => [] }),
  angles: Annotation<AnalysisItem[]>({ reducer: (_, b) => b, default: () => [] }),
  patterns: Annotation<AnalysisItem[]>({ reducer: (_, b) => b, default: () => [] }),
  saturated: Annotation<AnalysisItem[]>({ reducer: (_, b) => b, default: () => [] }),
  gaps: Annotation<AnalysisItem[]>({ reducer: (_, b) => b, default: () => [] }),
  advertisers: Annotation<AdvertiserInfo[]>({ reducer: (_, b) => b, default: () => [] }),
});

type AnalysisState = typeof AnalysisStateAnnotation.State;

// ─── LLM Instance ─────────────────────────────────────────────────────────────

function getLLM() {
  return new ChatAnthropic({
    model: 'claude-3-5-sonnet-20241022',
    temperature: 0.3,
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function adsToText(ads: Ad[]): string {
  return ads
    .slice(0, 30)
    .map(
      (ad, i) =>
        `AD ${i + 1}:\nAdvertiser: ${ad.advertiser || 'Unknown'}\nBody: ${ad.body || ''}\nHook: ${ad.hook || ''}\nCTA: ${ad.cta || ''}\nOffer: ${ad.offer || ''}`
    )
    .join('\n\n---\n\n');
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

// ─── Node: Extract Hooks ──────────────────────────────────────────────────────

async function extractHooks(state: AnalysisState): Promise<Partial<AnalysisState>> {
  const llm = getLLM();
  const adsText = adsToText(state.ads);

  const response = await llm.invoke([
    {
      role: 'user',
      content: `You are an expert advertising analyst specializing in direct response marketing.

Analyze these ${state.ads.length} ads from the "${state.niche}" niche and extract the most notable hooks used.

ADS:
${adsText}

Return a JSON array of hook objects. Each hook should have:
- text: the hook pattern or example (string)
- frequency: how many ads use this pattern (number 1-${state.ads.length})
- strength: "high" | "medium" | "low" based on likely effectiveness
- notes: brief analysis of why this hook works or doesn't

Return ONLY a JSON array, no other text:
[{"text": "...", "frequency": 3, "strength": "high", "notes": "..."}]`,
    },
  ]);

  const hooks = safeParseJson<AnalysisItem[]>(
    typeof response.content === 'string' ? response.content : JSON.stringify(response.content),
    []
  );

  return { hooks };
}

// ─── Node: Extract Offers ─────────────────────────────────────────────────────

async function extractOffers(state: AnalysisState): Promise<Partial<AnalysisState>> {
  const llm = getLLM();
  const adsText = adsToText(state.ads);

  const response = await llm.invoke([
    {
      role: 'user',
      content: `You are an expert advertising analyst.

Analyze these ads from the "${state.niche}" niche and extract the offers and value propositions being used.

ADS:
${adsText}

Return a JSON array of offer objects. Each should have:
- text: the offer or value proposition (string)
- frequency: how many ads use this type of offer (number)
- strength: "high" | "medium" | "low" based on competitiveness
- notes: brief insight about this offer type

Return ONLY a JSON array:
[{"text": "...", "frequency": 2, "strength": "high", "notes": "..."}]`,
    },
  ]);

  const offers = safeParseJson<AnalysisItem[]>(
    typeof response.content === 'string' ? response.content : JSON.stringify(response.content),
    []
  );

  return { offers };
}

// ─── Node: Extract Angles ─────────────────────────────────────────────────────

async function extractAngles(state: AnalysisState): Promise<Partial<AnalysisState>> {
  const llm = getLLM();
  const adsText = adsToText(state.ads);

  const response = await llm.invoke([
    {
      role: 'user',
      content: `You are an expert advertising strategist.

Analyze these ads from the "${state.niche}" niche. Identify the core messaging angles, emotional appeals, and positioning strategies being used.

ADS:
${adsText}

Return a JSON array of angle objects:
- text: the messaging angle or positioning approach (string)
- frequency: how common is this angle (number)
- strength: "high" | "medium" | "low"
- notes: explain the underlying psychology or strategy

Return ONLY a JSON array:
[{"text": "...", "frequency": 4, "strength": "medium", "notes": "..."}]`,
    },
  ]);

  const angles = safeParseJson<AnalysisItem[]>(
    typeof response.content === 'string' ? response.content : JSON.stringify(response.content),
    []
  );

  return { angles };
}

// ─── Node: Find Gaps ──────────────────────────────────────────────────────────

async function findGaps(state: AnalysisState): Promise<Partial<AnalysisState>> {
  const llm = getLLM();

  const summary = {
    hooks: state.hooks.map((h) => h.text).join(', '),
    offers: state.offers.map((o) => o.text).join(', '),
    angles: state.angles.map((a) => a.text).join(', '),
  };

  const response = await llm.invoke([
    {
      role: 'user',
      content: `You are a senior advertising strategist. Based on the competitive analysis of the "${state.niche}" niche, identify what's saturated and what gaps exist.

COMMON HOOKS: ${summary.hooks}
COMMON OFFERS: ${summary.offers}
COMMON ANGLES: ${summary.angles}

Provide 4 separate JSON arrays:

1. patterns: recurring structural/tactical patterns across ads
2. saturated: angles/offers/approaches that are overdone and likely have diminishing returns
3. gaps: underserved angles, audiences, or messaging approaches that represent opportunity
4. advertisers: extract advertiser names and their apparent strategy from the ad data context

Return as a JSON object with these 4 keys:
{
  "patterns": [{"text": "...", "notes": "..."}],
  "saturated": [{"text": "...", "notes": "..."}],
  "gaps": [{"text": "...", "notes": "..."}],
  "advertisers": [{"name": "...", "ad_count": 1, "dominant_strategy": "..."}]
}

Return ONLY the JSON object.`,
    },
  ]);

  const contentStr =
    typeof response.content === 'string' ? response.content : JSON.stringify(response.content);

  const result = safeParseJson<{
    patterns: AnalysisItem[];
    saturated: AnalysisItem[];
    gaps: AnalysisItem[];
    advertisers: AdvertiserInfo[];
  }>(contentStr, { patterns: [], saturated: [], gaps: [], advertisers: [] });

  return {
    patterns: result.patterns || [],
    saturated: result.saturated || [],
    gaps: result.gaps || [],
    advertisers: result.advertisers || [],
  };
}

// ─── Graph Construction ───────────────────────────────────────────────────────

const analysisGraph = new StateGraph(AnalysisStateAnnotation)
  .addNode('extractHooks', extractHooks)
  .addNode('extractOffers', extractOffers)
  .addNode('extractAngles', extractAngles)
  .addNode('findGaps', findGaps)
  .addEdge('__start__', 'extractHooks')
  .addEdge('extractHooks', 'extractOffers')
  .addEdge('extractOffers', 'extractAngles')
  .addEdge('extractAngles', 'findGaps')
  .addEdge('findGaps', END);

export const analysisWorkflow = analysisGraph.compile();

// ─── Runner Function ──────────────────────────────────────────────────────────

export async function runAnalysis(
  ads: Ad[],
  niche: string
): Promise<Omit<AnalysisState, 'ads' | 'niche'>> {
  const result = await analysisWorkflow.invoke({
    ads,
    niche,
    hooks: [],
    offers: [],
    angles: [],
    patterns: [],
    saturated: [],
    gaps: [],
    advertisers: [],
  });

  return {
    hooks: result.hooks,
    offers: result.offers,
    angles: result.angles,
    patterns: result.patterns,
    saturated: result.saturated,
    gaps: result.gaps,
    advertisers: result.advertisers,
  };
}
