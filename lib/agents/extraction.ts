/**
 * Extraction Layer
 *
 * Responsibility: Convert raw ads into clean structured data.
 * NO deep reasoning here. This layer normalizes, deduplicates, and surfaces
 * the most common elements so the Strategy Brain gets a clean signal.
 *
 * One LLM call — cheap, fast, deterministic (temp=0.2).
 */

import { getLLM, toText, parseJSON } from '@/lib/llm';
import type { Ad, ExtractionOutput } from '@/types';

const MAX_ADS = 40;

/** Build a compact text representation of ads for extraction */
function adsToCompact(ads: Ad[]): string {
  return ads
    .slice(0, MAX_ADS)
    .map((ad, i) => {
      const parts = [
        `[AD ${i + 1}]`,
        ad.advertiser ? `Advertiser: ${ad.advertiser}` : null,
        ad.hook ? `Hook: ${ad.hook}` : null,
        ad.body ? `Body: ${ad.body.slice(0, 200)}` : null,
        ad.cta ? `CTA: ${ad.cta}` : null,
        ad.offer ? `Offer: ${ad.offer}` : null,
      ].filter(Boolean);
      return parts.join('\n');
    })
    .join('\n\n');
}

/** Count unique advertisers from ad list */
function countAdvertisers(ads: Ad[]): number {
  return new Set(ads.map((a) => a.advertiser).filter(Boolean)).size;
}

/**
 * Run extraction on a list of ads.
 * Returns clean, structured data — no interpretation, no strategy.
 */
export async function runExtraction(ads: Ad[], niche: string): Promise<ExtractionOutput> {
  if (ads.length === 0) {
    return {
      top_hooks: [],
      top_offers: [],
      top_ctas: [],
      angles_detected: [],
      advertiser_count: 0,
      ad_count: 0,
    };
  }

  const llm = getLLM(0.2); // low temp — extraction should be deterministic
  const adsText = adsToCompact(ads);

  const response = await llm.invoke([
    {
      role: 'user',
      content: `You are a data extraction specialist. Extract structured data from these ${ads.length} ads in the "${niche}" niche.

DO NOT analyze, reason, or provide opinions. Only extract and normalize what is literally present in the ads.

${adsText}

Return ONLY this JSON object — no explanation, no markdown outside the JSON:
{
  "top_hooks": ["exact hook text 1", "exact hook text 2", ...],
  "top_offers": ["offer pattern 1", "offer pattern 2", ...],
  "top_ctas": ["CTA text 1", "CTA text 2", ...],
  "angles_detected": ["angle family name 1", "angle family name 2", ...]
}

Rules:
- top_hooks: up to 10 most distinct hook openings, quoted verbatim or near-verbatim
- top_offers: up to 10 distinct offer patterns (free trial, % discount, money-back, etc.)
- top_ctas: up to 8 distinct CTA phrases found across ads
- angles_detected: up to 8 named angle families (Pain/Fear, Social Proof, Urgency, Transformation, Cost Savings, etc.)
- No duplicates within each list
- No empty strings`,
    },
  ]);

  const raw = toText(response.content);
  const extracted = parseJSON<Omit<ExtractionOutput, 'advertiser_count' | 'ad_count'>>(raw, {
    top_hooks: [],
    top_offers: [],
    top_ctas: [],
    angles_detected: [],
  });

  return {
    top_hooks: extracted.top_hooks || [],
    top_offers: extracted.top_offers || [],
    top_ctas: extracted.top_ctas || [],
    angles_detected: extracted.angles_detected || [],
    advertiser_count: countAdvertisers(ads),
    ad_count: ads.length,
  };
}
