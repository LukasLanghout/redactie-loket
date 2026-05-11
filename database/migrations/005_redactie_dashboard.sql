-- Adds VPRO-style editorial workflow columns to submissions table.
-- Used by the new /redactie dashboard.

alter table public.submissions
  add column if not exists samenvatting       text,
  add column if not exists trefwoorden        text[] default '{}'::text[],
  add column if not exists prioriteit         int  default 3 check (prioriteit between 1 and 5),
  add column if not exists sentiment          text check (sentiment in ('positief','neutraal','negatief')),
  add column if not exists compleetheid_score int  check (compleetheid_score between 0 and 10),
  add column if not exists labels             text[] default '{}'::text[],
  add column if not exists redactie_status    text default 'nieuw'
    check (redactie_status in ('nieuw','in_behandeling','afgehandeld','gearchiveerd')),
  add column if not exists is_spam            boolean default false;

-- Index to speed up dashboard filtering
create index if not exists submissions_redactie_status_idx
  on public.submissions (redactie_status);
create index if not exists submissions_is_spam_idx
  on public.submissions (is_spam);
