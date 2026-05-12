-- Migration 006: add share_consent column to submissions
-- Tracks whether the submitter allows their tip (anonymised) to be shown in the community tab.
-- Default false = opt-out (safest default).

ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS share_consent boolean NOT NULL DEFAULT false;
