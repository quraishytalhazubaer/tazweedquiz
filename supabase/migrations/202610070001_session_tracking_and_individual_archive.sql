alter table public.profiles
  add column if not exists archived boolean not null default false;

create table if not exists public.user_sessions (
  session_id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  ip_address text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index if not exists user_sessions_user_last_seen_idx
  on public.user_sessions (user_id, last_seen_at desc)
  where revoked_at is null;

alter table public.user_sessions enable row level security;
revoke all on public.user_sessions from anon, authenticated;
grant all on public.user_sessions to service_role;
