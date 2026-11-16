alter table public.profiles
  add column if not exists gender text check (gender in ('male', 'female'));

alter table public.submissions
  add column if not exists gender text check (gender in ('male', 'female'));
