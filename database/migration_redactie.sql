-- ── Redactie dashboard migration ──────────────────────────────────────────────
-- Plak dit in de Supabase SQL Editor en klik "Run"

-- 1. Labels kolom op submissions
ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS labels text[] DEFAULT '{}';

-- 2. Redactie-antwoorden tabel
CREATE TABLE IF NOT EXISTS redactie_replies (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  content      text NOT NULL,
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE redactie_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read replies"
  ON redactie_replies FOR SELECT USING (true);

CREATE POLICY "Public insert replies"
  ON redactie_replies FOR INSERT WITH CHECK (true);

-- 3. Zorg dat 'archived' een geldige status is (voeg toe aan check constraint als die bestaat)
ALTER TABLE submissions
  DROP CONSTRAINT IF EXISTS submissions_status_check;

ALTER TABLE submissions
  ADD CONSTRAINT submissions_status_check
  CHECK (status IN ('pending','reviewed','published','rejected','archived'));
