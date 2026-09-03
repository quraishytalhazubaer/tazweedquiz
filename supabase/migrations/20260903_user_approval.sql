alter table public.profiles
  add column if not exists approved boolean not null default false;

-- Keep the existing teacher/admin account usable so it can approve new registrations.
update public.profiles
set approved = true
where role = 'teacher';

-- New registrations remain pending until a teacher approves them.
alter table public.profiles enable row level security;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);