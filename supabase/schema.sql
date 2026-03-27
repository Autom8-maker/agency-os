-- Agency OS V2 — Supabase Schema
-- Run this in the Supabase SQL editor to set up all tables.

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── research_sessions ────────────────────────────────────────────────────────
-- Each research run represents a scrape session for a specific niche/query

CREATE TABLE IF NOT EXISTS research_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  niche TEXT NOT NULL,
  query TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- pending | running | done | error
  ad_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_research_sessions_status ON research_sessions(status);
CREATE INDEX IF NOT EXISTS idx_research_sessions_created ON research_sessions(created_at DESC);

-- ─── ads ──────────────────────────────────────────────────────────────────────
-- Individual ads scraped from Meta Ad Library

CREATE TABLE IF NOT EXISTS ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES research_sessions(id) ON DELETE CASCADE,
  advertiser TEXT,
  body TEXT,
  hook TEXT,
  cta TEXT,
  offer TEXT,
  link TEXT,
  raw TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ads_session_id ON ads(session_id);
CREATE INDEX IF NOT EXISTS idx_ads_created ON ads(created_at DESC);

-- ─── analyses ─────────────────────────────────────────────────────────────────
-- One analysis per research session, contains extracted intelligence

CREATE TABLE IF NOT EXISTS analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES research_sessions(id) ON DELETE CASCADE,
  niche TEXT,
  hooks JSONB DEFAULT '[]',        -- AnalysisItem[]
  offers JSONB DEFAULT '[]',       -- AnalysisItem[]
  angles JSONB DEFAULT '[]',       -- AnalysisItem[]
  patterns JSONB DEFAULT '[]',     -- AnalysisItem[]
  saturated JSONB DEFAULT '[]',    -- AnalysisItem[]
  gaps JSONB DEFAULT '[]',         -- AnalysisItem[]
  advertisers JSONB DEFAULT '[]',  -- AdvertiserInfo[]
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analyses_session_id ON analyses(session_id);
CREATE INDEX IF NOT EXISTS idx_analyses_created ON analyses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analyses_niche ON analyses(niche);

-- ─── strategies ───────────────────────────────────────────────────────────────
-- One strategy per analysis, contains positioning and campaign concepts

CREATE TABLE IF NOT EXISTS strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID REFERENCES analyses(id) ON DELETE CASCADE,
  niche TEXT,
  audience TEXT,
  offer TEXT,
  goal TEXT,
  offer_angles JSONB DEFAULT '[]',         -- StrategyAngle[]
  positioning JSONB DEFAULT '[]',           -- PositioningItem[]
  campaign_concepts JSONB DEFAULT '[]',     -- CampaignConcept[]
  messaging_priorities JSONB DEFAULT '[]',  -- string[]
  avoid JSONB DEFAULT '[]',                 -- string[]
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_strategies_analysis_id ON strategies(analysis_id);
CREATE INDEX IF NOT EXISTS idx_strategies_created ON strategies(created_at DESC);

-- ─── creatives ────────────────────────────────────────────────────────────────
-- Generated creative output: ad copy, briefs, and image prompts

CREATE TABLE IF NOT EXISTS creatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id UUID REFERENCES strategies(id) ON DELETE SET NULL,
  niche TEXT,
  type TEXT NOT NULL CHECK (type IN ('copy', 'brief', 'image_prompts')),
  content TEXT NOT NULL,
  meta JSONB DEFAULT '{}',  -- audience, offer, tone, generated_at
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_creatives_strategy_id ON creatives(strategy_id);
CREATE INDEX IF NOT EXISTS idx_creatives_type ON creatives(type);
CREATE INDEX IF NOT EXISTS idx_creatives_created ON creatives(created_at DESC);

-- ─── Row Level Security ───────────────────────────────────────────────────────
-- For this internal tool, we'll allow all operations via service role key.
-- Enable RLS on all tables and create permissive policies for now.
-- In production, scope these to authenticated users.

ALTER TABLE research_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE creatives ENABLE ROW LEVEL SECURITY;

-- Allow all operations via anon key (adjust for auth in production)
CREATE POLICY "Allow all on research_sessions" ON research_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on ads" ON ads FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on analyses" ON analyses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on strategies" ON strategies FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on creatives" ON creatives FOR ALL USING (true) WITH CHECK (true);

-- ─── Sample Data (Optional) ───────────────────────────────────────────────────
-- Uncomment to insert sample data for testing the UI without running live scrapes.

/*
INSERT INTO research_sessions (niche, query, status, ad_count) VALUES
  ('Weight Loss Supplements', 'fat burner supplement 2024', 'done', 18),
  ('Online Fitness Coaching', 'online fitness coach program', 'done', 12),
  ('E-commerce Fashion', 'womens activewear sale', 'done', 24);
*/
