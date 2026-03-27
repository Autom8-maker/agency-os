/**
 * Analysis Layer
 *
 * Responsibility: Find patterns, saturation, and gaps in the market.
 * Receives clean ExtractionOutput from the Extraction Layer.
 * Does NOT re-extract hooks/offers — that work is already done upstream.
 *
 * Two nodes: findPatterns → findGaps
 */

import { Annotation, StateGraph, END } from '@langchain/langgraph';
import { getLLM, toText, parseJSON } from '@/lib/llm';
import type { Ad, AnalysisItem, AdvertiserInfo, ExtractionOutput } from '@/types';

// ─── State ────────────────────────────────────────────────────────────────────

const AnalysisStateAnnotation = Annotation.Root({
  ads:         Annotation<Ad[]>({ reducer: (_, b) => b }),
  niche:       Annotation<string>({ reducer: (_, b) => b }),
  extraction:  Annotation<ExtractionOutput>({ reducer: (_, b) => b }),
  hooks:       Annotation<AnalysisItem[]>({ reducer: (_, b) => b, default: () => [] }),
  offers:      Annotation<AnalysisItem[]>({ reducer: (_, b) => b, default: () => [] }),
  angles:      Annotation<AnalysisItem[]>({ reducer: (_, b) => b, default: () => [] }),
  patterns:    Annotation<AnalysisItem[]>({ reducer: (_, b) => b, default: () => [] }),
  saturated:   Annotation<AnalysisItem[]>({ reducer: (_, b) => b, default: () => [] }),
  gaps:        Annotation<AnalysisItem[]>({ reducer: (_, b) => b, default: () => [] }),
  advertisers: Annotation<AdvertiserInfo[]>({ reducer: (_, b) => b, default: () => [] }),
});

type AnalysisState = typeof AnalysisStateAnnotation.State;

// ─── Node: Find Patterns ──────────────────────────────────────────────────────
// Annotates extraction output with frequency signals and structural patterns

async function findPatterns(state: AnalysisState): Promise<Partial<AnalysisState>> {
  const llm = getLLM(0.3);
  const { extraction, niche } = state;

  const response = await llm.invoke([
    {
      role: 'user',
      content: `You are a competitive advertising analyst. Annotate these extracted elements from ${extraction.ad_count} ads in the "${niche}" niche with frequency signals and strategic notes.

EXTRACTED HOOKS:
${extraction.top_hooks.map((h, i) => `${i + 1}. ${h}`).join('\n') || 'None'}

EXTRACTED OFFERS:
${extraction.top_offers.map((o, i) => `${i + 1}. ${o}`).join('\n') || 'None'}

ANGLES DETECTED: ${extraction.angles_detected.join(', ') || 'None'}
ADVERTISERS: ${extraction.advertiser_count} unique advertisers

Return a JSON object with 4 arrays — annotate what's already extracted, do not invent new data:
{
  "hooks":    [{"text": "...", "frequency": 3, "strength": "high|medium|low", "notes": "why this hook works or doesn't"}],
  "offers":   [{"text": "...", "frequency": 2, "strength": "high|medium|low", "notes": "competitive context"}],
  "angles":   [{"text": "...", "frequency": 4, "strength": "high|medium|low", "notes": "market prevalence"}],
  "patterns": [{"text": "structural market pattern", "notes": "why this pattern exists in this niche"}]
}

- hooks: annotate all provided hooks
- offers: annotate all provided offers
- angles: annotate all detected angles
- patterns: identify 4-6 structural/tactical patterns across the market (e.g., "All ads lead with fear, not aspiration")

Return ONLY the JSON object.`,
    },
  ]);

  const result = parseJSON<{ hooks: AnalysisItem[]; offers: AnalysisItem[]; angles: AnalysisItem[]; patterns: AnalysisItem[] }>(
    toText(response.content),
    { hooks: [], offers: [], angles: [], patterns: [] }
  );

  return {
    hooks:    result.hooks    || [],
    offers:   result.offers   || [],
    angles:   result.angles   || [],
    patterns: result.patterns || [],
  };
}

// ─── Node: Find Gaps ──────────────────────────────────────────────────────────
// Takes annotated patterns → surfaces saturation + strategic openings

async function findGaps(state: AnalysisState): Promise<Partial<AnalysisState>> {
  const llm = getLLM(0.3);

  const commonHooks   = state.hooks.slice(0, 5).map((h) => h.text).join(' | ') || 'None';
  const commonOffers  = state.offers.slice(0, 5).map((o) => o.text).join(' | ') || 'None';
  const commonAngles  = state.angles.slice(0, 6).map((a) => a.text).join(' | ') || 'None';
  const patternNotes  = state.patterns.slice(0, 4).map((p) => `- ${p.text}: ${p.notes}`).join('\n') || 'None';

  const response = await llm.invoke([
    {
      role: 'user',
      content: `You are a senior advertising strategist. Based on this competitive analysis of the "${state.niche}" market, identify saturation and strategic gaps.

COMMON HOOKS: ${commonHooks}
COMMON OFFERS: ${commonOffers}
COMMON ANGLES: ${commonAngles}
MARKET PATTERNS:
${patternNotes}
ADVERTISER COUNT: ${state.extraction.advertiser_count}

Return a JSON object:
{
  "saturated":   [{"text": "overdone angle or approach", "notes": "specific reason it's losing effectiveness"}],
  "gaps":        [{"text": "underserved opportunity", "notes": "specific reason this angle is open and how to win with it"}],
  "advertisers": [{"name": "advertiser name", "ad_count": 1, "dominant_strategy": "their apparent approach in 1 sentence"}]
}

- saturated: 4-6 specific angles/hooks/offers that are clearly overdone
- gaps: 4-6 specific underserved angles with actionable, non-generic reasoning
- advertisers: top 3-5 inferred advertisers with their dominant strategy

Return ONLY the JSON object.`,
    },
  ]);

  const result = parseJSON<{ saturated: AnalysisItem[]; gaps: AnalysisItem[]; advertisers: AdvertiserInfo[] }>(
    toText(response.content),
    { saturated: [], gaps: [], advertisers: [] }
  );

  return {
    saturated:   result.saturated   || [],
    gaps:        result.gaps        || [],
    advertisers: result.advertisers || [],
  };
}

// ─── Graph ────────────────────────────────────────────────────────────────────

const analysisGraph = new StateGraph(AnalysisStateAnnotation)
  .addNode('findPatterns', findPatterns)
  .addNode('findGaps', findGaps)
  .addEdge('__start__', 'findPatterns')
  .addEdge('findPatterns', 'findGaps')
  .addEdge('findGaps', END);

export const analysisWorkflow = analysisGraph.compile();

// ─── Runner ───────────────────────────────────────────────────────────────────

export async function runAnalysis(
  ads: Ad[],
  niche: string,
  extraction: ExtractionOutput
): Promise<Omit<AnalysisState, 'ads' | 'niche' | 'extraction'>> {
  const result = await analysisWorkflow.invoke({
    ads,
    niche,
    extraction,
    hooks:       [],
    offers:      [],
    angles:      [],
    patterns:    [],
    saturated:   [],
    gaps:        [],
    advertisers: [],
  });

  return {
    hooks:       result.hooks,
    offers:      result.offers,
    angles:      result.angles,
    patterns:    result.patterns,
    saturated:   result.saturated,
    gaps:        result.gaps,
    advertisers: result.advertisers,
  };
}
