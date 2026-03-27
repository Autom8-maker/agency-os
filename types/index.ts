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
  analysis_id: string;
  niche: string | null;
  audience: string | null;
  offer: string | null;
  goal: string | null;
  offer_angles: StrategyAngle[];
  positioning: PositioningItem[];
  campaign_concepts: CampaignConcept[];
  messaging_priorities: string[];
  avoid: string[];
  created_at: string;
}

export interface StrategyAngle {
  angle: string;
  rationale: string;
  example?: string;
}

export interface PositioningItem {
  statement: string;
  differentiator: string;
}

export interface CampaignConcept {
  name: string;
  hook: string;
  format: string;
  audience_segment: string;
  key_message: string;
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

// ─── LangGraph Agent State Types ─────────────────────────────────────────────

export interface AnalysisState {
  ads: Ad[];
  niche: string;
  hooks: AnalysisItem[];
  offers: AnalysisItem[];
  angles: AnalysisItem[];
  patterns: AnalysisItem[];
  saturated: AnalysisItem[];
  gaps: AnalysisItem[];
  advertisers: AdvertiserInfo[];
}

export interface StrategyState {
  analysis: Analysis;
  niche: string;
  audience: string;
  offer: string;
  goal: string;
  focus: string;
  offer_angles: StrategyAngle[];
  positioning: PositioningItem[];
  campaign_concepts: CampaignConcept[];
  messaging_priorities: string[];
  avoid: string[];
}

export interface CreativeState {
  niche: string;
  audience: string;
  offer: string;
  tone: string;
  type: CreativeType;
  strategy?: Strategy;
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
