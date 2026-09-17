alter table public.exam_config enable row level security;

drop policy if exists "Anyone can read exam configuration" on public.exam_config;
create policy "Anyone can read exam configuration"
  on public.exam_config for select
  to anon, authenticated
  using (true);

drop policy if exists "Teachers can update exam configuration" on public.exam_config;
create policy "Teachers can update exam configuration"
  on public.exam_config for update
  to authenticated
  using (exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role = 'teacher'
  ))
  with check (exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role = 'teacher'
  ));