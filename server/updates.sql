-- Run this in your Supabase SQL Editor to update the tournaments table

ALTER TABLE tournaments 
ADD COLUMN IF NOT EXISTS registration_start TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS registration_end TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS capacity INTEGER DEFAULT 64,
ADD COLUMN IF NOT EXISTS entry_fee DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS prize_pool DECIMAL(10, 2) DEFAULT 0;

-- Optional: Add check constraint for dates if supported/desired
-- ALTER TABLE tournaments ADD CONSTRAINT check_dates CHECK (registration_end > registration_start);
