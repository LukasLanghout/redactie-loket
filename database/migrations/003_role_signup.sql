-- Allow users to choose a role at signup.
-- Public role: anyone. Editor role: requires invite code.

-- Store the invite code in a simple config table so admins can change it.
create table if not exists public.app_config (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

-- Seed the invite code (change this value in production!)
insert into public.app_config (key, value)
values ('redactie_invite_code', 'REDACTIE-2026')
on conflict (key) do nothing;

-- Replace handle_new_user trigger to honor requested role + invite code.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  requested_role text;
  invite_code text;
  expected_code text;
  final_role text := 'public';
begin
  requested_role := new.raw_user_meta_data->>'role';
  invite_code   := new.raw_user_meta_data->>'invite_code';

  -- Look up the expected invite code
  select value into expected_code from public.app_config where key = 'redactie_invite_code';

  -- Only allow privileged role if invite code matches
  if requested_role in ('moderator', 'editor', 'admin')
     and invite_code is not null
     and invite_code = expected_code then
    final_role := requested_role;
  end if;

  insert into public.profiles (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    final_role
  )
  on conflict (id) do nothing;

  return new;
end $$;

-- Trigger is already created in 001_schema.sql; recreating function above is enough.
