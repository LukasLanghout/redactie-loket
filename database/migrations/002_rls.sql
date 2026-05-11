-- Row Level Security policies.

alter table public.profiles enable row level security;
alter table public.topics enable row level security;
alter table public.submissions enable row level security;
alter table public.replies enable row level security;
alter table public.likes enable row level security;

-- helper: is current user staff (moderator/editor/admin)?
create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from public.profiles
    where id = auth.uid() and role in ('moderator','editor','admin')
  );
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- profiles
drop policy if exists "profiles self read" on public.profiles;
create policy "profiles self read" on public.profiles
  for select using (auth.uid() = id or public.is_staff());

drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- topics: everyone can read, only admin writes
drop policy if exists "topics read" on public.topics;
create policy "topics read" on public.topics for select using (true);

drop policy if exists "topics admin write" on public.topics;
create policy "topics admin write" on public.topics
  for all using (public.is_admin()) with check (public.is_admin());

-- submissions
drop policy if exists "submissions public read approved" on public.submissions;
create policy "submissions public read approved" on public.submissions
  for select using (
    status in ('approved','published')
    or auth.uid() = user_id
    or public.is_staff()
  );

drop policy if exists "submissions insert any auth" on public.submissions;
create policy "submissions insert any auth" on public.submissions
  for insert with check (auth.uid() = user_id);

drop policy if exists "submissions owner update pending" on public.submissions;
create policy "submissions owner update pending" on public.submissions
  for update using (auth.uid() = user_id and status = 'pending')
  with check (auth.uid() = user_id);

drop policy if exists "submissions staff update" on public.submissions;
create policy "submissions staff update" on public.submissions
  for update using (public.is_staff()) with check (public.is_staff());

drop policy if exists "submissions owner delete pending" on public.submissions;
create policy "submissions owner delete pending" on public.submissions
  for delete using (auth.uid() = user_id and status = 'pending');

drop policy if exists "submissions staff delete" on public.submissions;
create policy "submissions staff delete" on public.submissions
  for delete using (public.is_staff());

-- replies: visible if parent submission is visible; only staff create
drop policy if exists "replies read" on public.replies;
create policy "replies read" on public.replies
  for select using (
    exists (
      select 1 from public.submissions s
      where s.id = submission_id
        and (s.status in ('approved','published') or s.user_id = auth.uid() or public.is_staff())
    )
  );

drop policy if exists "replies staff insert" on public.replies;
create policy "replies staff insert" on public.replies
  for insert with check (public.is_staff() and auth.uid() = user_id);

drop policy if exists "replies staff update" on public.replies;
create policy "replies staff update" on public.replies
  for update using (public.is_staff()) with check (public.is_staff());

drop policy if exists "replies staff delete" on public.replies;
create policy "replies staff delete" on public.replies for delete using (public.is_staff());

-- likes
drop policy if exists "likes read" on public.likes;
create policy "likes read" on public.likes for select using (true);

drop policy if exists "likes self write" on public.likes;
create policy "likes self write" on public.likes
  for insert with check (auth.uid() = user_id);

drop policy if exists "likes self delete" on public.likes;
create policy "likes self delete" on public.likes
  for delete using (auth.uid() = user_id);
