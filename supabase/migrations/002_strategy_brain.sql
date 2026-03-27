-- Migration 002: Strategy Brain Architecture
-- Run this if you already applied schema.sql (v1) and need to upgrade.
-- Safe to run multiple times.

-- Add extracted_data column to analyses
ALTER TABLE analyses
  ADD COLUMN IF NOT EXISTS extracted_data JSONB DEFAULT NULL;

-- Replace old strategy columns with Strategy Brain output schema
ALTER TABLE strategies
  ADD COLUMN IF NOT EXISTS angle_clusters      JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS recommended_angles  JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS campaign_directions JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS testing_plan        JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS strategic_insights  JSONB DEFAULT '[]';

-- Drop old columns (only if you want to clean up; safe to skip)
-- ALTER TABLE strategies DROP COLUMN IF EXISTS offer_angles;
-- ALTER TABLE strategies DROP COLUMN IF EXISTS positioning;
-- ALTER TABLE strategies DROP COLUMN IF EXISTS campaign_concepts;
-- ALTER TABLE strategies DROP COLUMN IF EXISTS messaging_priorities;
-- ALTER TABLE strategies DROP COLUMN IF EXISTS avoid;
