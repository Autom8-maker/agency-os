// ─── Core Data Types ──────────────────────────────────────────────────────────

export type SessionStatus = 'pending' | 'running' | 'done' | 'error';

export interface ResearchSession {
  id: string;
  niche: string;
  query: string;
  status: SessionStatus;
  ad_count: number;
  created_at: string;
}

export interface Ad {
  id: string;
  session_id: string;
  advertiser: string | null;
  body: string | null;
  hook: string | null;
  cta: string | null;
  offer: string | null;
  link: string | null;
  raw: string | null;
  created_at: string;
}

export interface Analysis {
  id: string;
  session_id: string;
  niche: string | null;
  extracted_data: ExtractionOutput | null;  // Extraction Layer output
  hooks: AnalysisItem[];
  offers: AnalysisItem[];
  angles: AnalysisItem[];
  patterns: AnalysisItem[];
  saturated: AnalysisItem[];
  gaps: AnalysisItem[];
  advertisers: AdvertiserInfo[];
  created_at: string;
}

export interface AnalysisItem {
  text: string;
  frequency?: number;
  strength?: 'high' | 'medium' | 'low';
  notes?: string;
}

export interface AdvertiserInfo {
  name: string;
  ad_count: number;
  dominant_strategy?: string;
}

export interface Strategy {
  id: string;
  analysis_id: string | null;
  niche: string | null;
  audience: string | null;
  offer: string | null;
  goal: string | null;
  // Strategy Brain structured output (replaces old scattered fields)
  angle_clusters: AngleCluster[];
  recommended_angles: string[];
  campaign_directions: CampaignDirection[];
  testing_plan: TestingHypothesis[];
  strategic_insights: string[];
  created_at: string;
}

export interface Creative {
  id: string;
  strategy_id: string | null;
  niche: string | null;
  type: CreativeType;
  content: string;
  meta: Record<string, unknown>;
  created_at: string;
}

export type CreativeType = 'copy' | 'brief' | 'image_prompts';

// ─── API Request / Response Types ────────────────────────────────────────────

export interface ScrapeRequest {
  sessionId: string;
  query: string;
  niche: string;
}

export interface ScrapeResponse {
  success: boolean;
  count: number;
  error?: string;
}

export interface AnalyzeRequest {
  sessionId: string;
}

export interface StrategyRequest {
  analysisId: string;
  niche: string;
  audience: string;
  offer: string;
  goal: string;
  focus: string;
}

export interface CreativeRequest {
  strategyId?: string;
  niche: string;
  audience: string;
  offer: string;
  tone: string;
  type: CreativeType;
}

// ─── Scraper Types ────────────────────────────────────────────────────────────

export interface ScrapedAd {
  advertiser: string;
  body: string;
  hook: string;
  cta: string;
  offer: string;
  link: string;
  raw: string;
}

export interface ScrapeResult {
  ads: ScrapedAd[];
  error?: string;
}

// ─── Extraction Layer ─────────────────────────────────────────────────────────

/** Output of the Extraction Layer — normalized data, no deep reasoning */
export interface ExtractionOutput {
  top_hooks: string[];
  top_offers: string[];
  top_ctas: string[];
  angles_detected: string[];
  advertiser_count: number;
  ad_count: number;
}

// ─── Strategy Brain ───────────────────────────────────────────────────────────

/** Strict input contract for the Strategy Brain */
export interface StrategyBrainInput {
  niche: string;
  audience: string;
  offer: string;
  goal: string;
  top_hooks: string[];
  top_offers: string[];
  patterns: string[];
  competitor_summary: string;
}

export interface AngleCluster {
  angle: string;
  description: string;
  why_it_works: string;
  market_saturation: 'low' | 'medium' | 'high';
}

export interface CampaignDirection {
  name: string;
  angle: string;
  hook: string;
  format: string;
  audience_segment: string;
  priority: 'high' | 'medium' | 'low';
}

export interface TestingHypothesis {
  hypothesis: string;
  test_type: string;
  expected_outcome: string;
}

/** Strict output contract from the Strategy Brain */
export interface StrategyBrainOutput {
  angle_clusters: AngleCluster[];
  recommended_angles: string[];
  campaign_directions: CampaignDirection[];
  testing_plan: TestingHypothesis[];
  strategic_insights: string[];
}

// ─── LangGraph Agent State Types ─────────────────────────────────────────────

export interface AnalysisState {
  ads: Ad[];
  niche: string;
  extraction: ExtractionOutput;
  hooks: AnalysisItem[];
  offers: AnalysisItem[];
  angles: AnalysisItem[];
  patterns: AnalysisItem[];
  saturated: AnalysisItem[];
  gaps: AnalysisItem[];
  advertisers: AdvertiserInfo[];
}

export interface StrategyState {
  input: StrategyBrainInput;
  output: StrategyBrainOutput;
}

export interface CreativeState {
  niche: string;
  audience: string;
  offer: string;
  tone: string;
  type: CreativeType;
  strategy_output?: StrategyBrainOutput;
  output: string;
}

// ─── UI State Types ───────────────────────────────────────────────────────────

export interface PipelineStep {
  key: string;
  label: string;
  count: number;
  status: 'idle' | 'active' | 'done' | 'error';
}

export interface ActivityItem {
  id: string;
  type: 'session' | 'analysis' | 'strategy' | 'creative';
  label: string;
  timestamp: string;
  status?: string;
}

export interface NavigationItem {
  key: string;
  label: string;
  href: string;
}
