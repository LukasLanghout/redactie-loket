-- Allow anonymous (logged-out) users to submit tips.
-- Tips without a user account get user_id = NULL.
-- They cannot edit or view their submission afterwards (no account to claim ownership).

-- Replace the insert policy: allow either authenticated users inserting their own row,
-- or anonymous users inserting a row with user_id = NULL.
drop policy if exists "submissions insert any auth" on public.submissions;
drop policy if exists "submissions insert anon or owner" on public.submissions;
create policy "submissions insert anon or owner" on public.submissions
  for insert
  with check (
    (auth.uid() is null and user_id is null)        -- anonymous insert
    or (auth.uid() = user_id)                        -- authenticated own insert
  );

-- Make storage attachments bucket readable + writable for anyone (best-effort).
-- If the bucket does not exist this is a no-op; create it in Supabase Studio first.
-- Keep this commented and run manually in the Supabase storage UI if you want anon uploads.
-- (Anonymous uploads to storage require careful policy setup; we skip files for anon users
--  in the client-side intake code instead.)
