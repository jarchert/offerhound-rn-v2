-- Add gpa column to hs_football_roster.
-- Confirmed missing via live information_schema query 2026-08-24.
-- RN useFootballRoster writes gpa on every insert/update; without this
-- column every roster save with a non-empty GPA field hard-fails.
ALTER TABLE hs_football_roster
  ADD COLUMN IF NOT EXISTS gpa numeric;
