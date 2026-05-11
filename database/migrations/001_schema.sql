-- Redactie Loket - initial schema
-- Run this in Supabase SQL editor (or via supabase CLI).

create extension if not exists "pgcrypto";

-- profiles: extends auth.users with role + name
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text,
  role text not null default 'public' check (role in ('public','moderator','editor','admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.topics (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  icon text,
  color text default '#00bcd4',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  topic_id uuid references public.topics(id) on delete set null,
  type text not null default 'tip' check (type in ('tip','question','experience')),
  title text not null,
  content text not null,
  contact_name text,
  contact_email text,
  contact_phone text,
  file_url text,
  anonymous boolean not null default false,
  status text not null default 'pending' check (status in ('pending','approved','rejected','published')),
  moderation_notes text,
  ai_flagged boolean not null default false,
  view_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists submissions_status_idx on public.submissions(status);
create index if not exists submissions_topic_idx on public.submissions(topic_id);
create index if not exists submissions_user_idx on public.submissions(user_id);

create table if not exists public.replies (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.likes (
  submission_id uuid not null references public.submissions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (submission_id, user_id)
);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

drop trigger if exists submissions_updated_at on public.submissions;
create trigger submissions_updated_at
before update on public.submissions
for each row execute function public.set_updated_at();

-- auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
