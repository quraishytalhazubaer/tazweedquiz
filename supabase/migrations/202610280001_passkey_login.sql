create table if not exists public.passkey_credentials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  credential_id text not null unique,
  public_key text not null,
  signature_counter bigint not null default 0,
  transports text[] not null default '{}',
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create index if not exists passkey_credentials_user_id_idx
  on public.passkey_credentials (user_id);

alter table public.passkey_credentials enable row level security;
revoke all on public.passkey_credentials from anon, authenticated;
grant all on public.passkey_credentials to service_role;

create table if not exists public.passkey_challenges (
  challenge text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  purpose text not null check (purpose in ('registration', 'authentication')),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists passkey_challenges_expires_at_idx
  on public.passkey_challenges (expires_at);

alter table public.passkey_challenges enable row level security;
revoke all on public.passkey_challenges from anon, authenticated;
grant all on public.passkey_challenges to service_role;
