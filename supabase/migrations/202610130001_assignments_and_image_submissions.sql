create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 1 and 160),
  description text not null default '',
  due_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists public.assignment_submissions (
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  student_name text not null default '',
  employee_id text not null default '',
  batch text not null default '',
  file_path text not null,
  submitted_at timestamptz not null default now(),
  primary key (assignment_id, profile_id)
);

create index if not exists assignment_submissions_profile_idx
  on public.assignment_submissions(profile_id);

alter table public.assignments enable row level security;
alter table public.assignment_submissions enable row level security;

drop policy if exists "Approved students and authorized staff can read assignments" on public.assignments;
create policy "Approved students and authorized staff can read assignments"
  on public.assignments for select
  to authenticated
  using (
    public.has_teacher_permission('materials', 'view')
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'student' and approved = true
    )
  );

drop policy if exists "Staff with material edit permission can create assignments" on public.assignments;
create policy "Staff with material edit permission can create assignments"
  on public.assignments for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and public.has_teacher_permission('materials', 'edit')
  );

drop policy if exists "Owners and authorized staff can read assignment submissions" on public.assignment_submissions;
create policy "Owners and authorized staff can read assignment submissions"
  on public.assignment_submissions for select
  to authenticated
  using (
    profile_id = auth.uid()
    or public.has_teacher_permission('materials', 'view')
  );

drop policy if exists "Approved students can submit their own assignments" on public.assignment_submissions;
create policy "Approved students can submit their own assignments"
  on public.assignment_submissions for insert
  to authenticated
  with check (
    profile_id = auth.uid()
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'student' and approved = true
    )
    and exists (
      select 1 from public.assignments
      where id = assignment_id and (due_at is null or due_at > now())
    )
    and split_part(file_path, '/', 1) = auth.uid()::text
    and split_part(file_path, '/', 2) = assignment_id::text
    and right(lower(file_path), 4) = '.pdf'
  );

drop policy if exists "Approved students can update their own assignment submissions" on public.assignment_submissions;
create policy "Approved students can update their own assignment submissions"
  on public.assignment_submissions for update
  to authenticated
  using (
    profile_id = auth.uid()
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'student' and approved = true
    )
  )
  with check (
    profile_id = auth.uid()
    and exists (
      select 1 from public.assignments
      where id = assignment_id and (due_at is null or due_at > now())
    )
    and split_part(file_path, '/', 1) = auth.uid()::text
    and split_part(file_path, '/', 2) = assignment_id::text
    and right(lower(file_path), 4) = '.pdf'
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'assignment-submissions',
  'assignment-submissions',
  false,
  20971520,
  array['application/pdf']::text[]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Students and staff can read assignment submission PDFs" on storage.objects;
create policy "Students and staff can read assignment submission PDFs"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'assignment-submissions'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.has_teacher_permission('materials', 'view')
    )
  );

drop policy if exists "Students can upload their own assignment PDFs" on storage.objects;
create policy "Students can upload their own assignment PDFs"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'assignment-submissions'
    and (storage.foldername(name))[1] = auth.uid()::text
    and right(lower(name), 4) = '.pdf'
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'student' and approved = true
    )
    and exists (
      select 1 from public.assignments
      where id::text = (storage.foldername(name))[2]
        and (due_at is null or due_at > now())
    )
  );

drop policy if exists "Students can delete their own assignment images" on storage.objects;
create policy "Students can delete their own assignment images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'assignment-submissions'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
