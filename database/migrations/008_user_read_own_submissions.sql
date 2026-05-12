-- Migration 008: users can read their own submissions
CREATE POLICY "Users can read own submissions"
  ON submissions FOR SELECT
  USING (auth.uid() = user_id);
