-- Migration 007: update submissions_type_check to include new intake types
ALTER TABLE submissions DROP CONSTRAINT IF EXISTS submissions_type_check;
ALTER TABLE submissions ADD CONSTRAINT submissions_type_check
  CHECK (type IN ('tip', 'ervaring', 'feedback', 'vraag', 'opmerking', 'question', 'experience'));
