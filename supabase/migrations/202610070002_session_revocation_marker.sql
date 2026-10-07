alter table public.profiles
  add column if not exists other_sessions_revoked_at timestamptz,
  add column if not exists other_sessions_exempt_session_id uuid;
