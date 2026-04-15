-- Run this in your Supabase SQL Editor to update the tournaments table

ALTER TABLE tournaments 
ADD COLUMN IF NOT EXISTS registration_start TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS registration_end TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS capacity INTEGER DEFAULT 64,
ADD COLUMN IF NOT EXISTS entry_fee DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS prize_pool DECIMAL(10, 2) DEFAULT 0;

-- Optional: Add check constraint for dates if supported/desired
-- ALTER TABLE tournaments ADD CONSTRAINT check_dates CHECK (registration_end > registration_start);

-- Add session preference to participants
ALTER TABLE participants
ADD COLUMN IF NOT EXISTS session_preference VARCHAR(20);

-- ── Dispute System Enhancements ──────────────────────────────────────────────

-- Indexes for fast filtering on large datasets (2k+ players)
CREATE INDEX IF NOT EXISTS idx_disputes_status   ON disputes(status);
CREATE INDEX IF NOT EXISTS idx_disputes_match_id ON disputes(match_id);
CREATE INDEX IF NOT EXISTS idx_disputes_submitted_by ON disputes(submitted_by);

-- Admin internal notes (never shown to players)
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- Reason shared with players when dispute is rejected
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS admin_reason TEXT;

