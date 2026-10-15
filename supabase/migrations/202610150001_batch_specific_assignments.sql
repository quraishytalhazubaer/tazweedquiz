create table if not exists public.assignment_batches (
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  batch text not null check (char_length(trim(batch)) > 0),
  due_at timestamptz,
  primary key (assignment_id, batch)
);

create table if not exists public.assignment_attachments (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  file_path text not null unique,
  file_name text not null,
  content_type text not null check (content_type in ('application/pdf', 'image/jpeg', 'image/png', 'image/webp')),
  created_at timestamptz not null default now()
);

alter table public.assignment_submissions
  add column if not exists batch text not null default '';

update public.assignment_submissions as submission
set batch = coalesce(
  (
    select nullif(trim(profile_batch), '')
    from public.profiles as profile
    cross join lateral unnest(profile.batch) as profile_batches(profile_batch)
    where profile.id = submission.profile_id
    order by profile_batch
    limit 1
  ),
  nullif(trim(split_part(submission.batch, ',', 1)), ''),
  'Unassigned'
);

insert into public.assignment_batches (assignment_id, batch, due_at)
select assignment_row.id, target.batch, assignment_row.due_at
from public.assignments as assignment_row
cross join (
  select distinct trim(profile_batch) as batch
  from public.profiles as profile
  cross join lateral unnest(profile.batch) as profile_batches(profile_batch)
  where nullif(trim(profile_batch), '') is not null
  union
  select distinct nullif(trim(submission.batch), '')
  from public.assignment_submissions as submission
  where nullif(trim(submission.batch), '') is not null
) as target
where target.batch is not null
on conflict (assignment_id, batch) do nothing;

alter table public.assignment_submissions
  drop constraint if exists assignment_submissions_pkey;
alter table public.assignment_submissions
  add constraint assignment_submissions_pkey primary key (assignment_id, profile_id, batch);

alter table public.assignment_batches enable row level security;
alter table public.assignment_attachments enable row level security;

drop policy if exists "Staff and assigned students can read assignment batches" on public.assignment_batches;
create policy "Staff and assigned students can read assignment batches"
  on public.assignment_batches for select
  to authenticated
  using (
    public.has_teacher_permission('assignments', 'view')
    or public.has_teacher_permission('assignments', 'edit')
    or exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role = 'student'
        and approved = true
        and batch @> array[assignment_batches.batch]
    )
  );

drop policy if exists "Staff with assignment edit permission can manage assignment batches" on public.assignment_batches;
create policy "Staff with assignment edit permission can manage assignment batches"
  on public.assignment_batches for all
  to authenticated
  using (public.has_teacher_permission('assignments', 'edit'))
  with check (public.has_teacher_permission('assignments', 'edit'));

drop policy if exists "Staff and assigned students can read assignment attachments" on public.assignment_attachments;
create policy "Staff and assigned students can read assignment attachments"
  on public.assignment_attachments for select
  to authenticated
  using (
    public.has_teacher_permission('assignments', 'view')
    or public.has_teacher_permission('assignments', 'edit')
    or exists (
      select 1
      from public.assignment_batches as assignment_batch
      join public.profiles as profile
        on profile.id = auth.uid()
       and profile.role = 'student'
       and profile.approved = true
       and profile.batch @> array[assignment_batch.batch]
      where assignment_batch.assignment_id = assignment_attachments.assignment_id
    )
  );

drop policy if exists "Staff with assignment edit permission can manage assignment attachments" on public.assignment_attachments;
create policy "Staff with assignment edit permission can manage assignment attachments"
  on public.assignment_attachments for all
  to authenticated
  using (public.has_teacher_permission('assignments', 'edit'))
  with check (public.has_teacher_permission('assignments', 'edit'));

drop policy if exists "Approved students and authorized staff can read assignments" on public.assignments;
create policy "Approved students and authorized staff can read assignments"
  on public.assignments for select
  to authenticated
  using (
    public.has_teacher_permission('assignments', 'view')
    or public.has_teacher_permission('assignments', 'edit')
    or exists (
      select 1
      from public.assignment_batches as assignment_batch
      join public.profiles as profile
        on profile.id = auth.uid()
       and profile.role = 'student'
       and profile.approved = true
       and profile.batch @> array[assignment_batch.batch]
      where assignment_batch.assignment_id = assignments.id
    )
  );

drop policy if exists "Staff with assignment edit permission can update assignments" on public.assignments;
create policy "Staff with assignment edit permission can update assignments"
  on public.assignments for update
  to authenticated
  using (public.has_teacher_permission('assignments', 'edit'))
  with check (public.has_teacher_permission('assignments', 'edit'));

drop policy if exists "Staff with assignment edit permission can delete assignments" on public.assignments;
create policy "Staff with assignment edit permission can delete assignments"
  on public.assignments for delete
  to authenticated
  using (public.has_teacher_permission('assignments', 'edit'));

drop policy if exists "Owners and authorized staff can read assignment submissions" on public.assignment_submissions;
create policy "Owners and authorized staff can read assignment submissions"
  on public.assignment_submissions for select
  to authenticated
  using (
    profile_id = auth.uid()
    or public.has_teacher_permission('assignments', 'view')
    or public.has_teacher_permission('assignments', 'edit')
  );

drop policy if exists "Approved students can submit their own assignment PDFs" on public.assignment_submissions;
create policy "Approved students can submit their own assignment PDFs"
  on public.assignment_submissions for insert
  to authenticated
  with check (
    profile_id = auth.uid()
    and exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role = 'student'
        and approved = true
        and batch @> array[assignment_submissions.batch]
    )
    and exists (
      select 1 from public.assignment_batches
      where assignment_id = assignment_submissions.assignment_id
        and batch = assignment_submissions.batch
        and (due_at is null or due_at > now())
    )
  );

drop policy if exists "Approved students can update their own assignment PDFs" on public.assignment_submissions;
create policy "Approved students can update their own assignment PDFs"
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
      select 1 from public.profiles
      where id = auth.uid()
        and role = 'student'
        and approved = true
        and batch @> array[assignment_submissions.batch]
    )
    and exists (
      select 1 from public.assignment_batches
      where assignment_id = assignment_submissions.assignment_id
        and batch = assignment_submissions.batch
        and (due_at is null or due_at > now())
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
      select 1 from public.profiles as profile
      where profile.id = auth.uid()
        and profile.role = 'student'
        and profile.approved = true
        and exists (
          select 1 from public.assignment_batches as assignment_batch
          where assignment_batch.assignment_id::text = (storage.foldername(name))[2]
            and profile.batch @> array[assignment_batch.batch]
            and (assignment_batch.due_at is null or assignment_batch.due_at > now())
        )
    )
  );

drop policy if exists "Students and staff can read assignment submission PDFs" on storage.objects;
create policy "Students and staff can read assignment submission PDFs"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'assignment-submissions'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.has_teacher_permission('assignments', 'view')
      or public.has_teacher_permission('assignments', 'edit')
    )
  );

create or replace function public.guard_assignment_submission_state()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.assignment_id is distinct from old.assignment_id
    or new.profile_id is distinct from old.profile_id
    or new.batch is distinct from old.batch then
    raise exception 'Assignment submission ownership cannot be changed.';
  end if;

  if not public.has_teacher_permission('assignments', 'edit')
    and old.submitted_at is not null
    and (
      new.submitted_at is distinct from old.submitted_at
      or new.file_path is distinct from old.file_path
    ) then
    raise exception 'Submitted assignments must be reset by authorized staff before they can be changed.';
  end if;

  return new;
end;
$$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'assignment-instructions',
  'assignment-instructions',
  false,
  20971520,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Students and staff can read assignment instructions" on storage.objects;
create policy "Students and staff can read assignment instructions"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'assignment-instructions'
    and (
      public.has_teacher_permission('assignments', 'view')
      or public.has_teacher_permission('assignments', 'edit')
      or exists (
        select 1
        from public.assignment_attachments as attachment
        join public.assignment_batches as assignment_batch
          on assignment_batch.assignment_id = attachment.assignment_id
        join public.profiles as profile
          on profile.id = auth.uid()
         and profile.role = 'student'
         and profile.approved = true
         and profile.batch @> array[assignment_batch.batch]
        where attachment.file_path = storage.objects.name
      )
    )
  );

drop policy if exists "Staff with assignment edit permission can upload assignment instructions" on storage.objects;
create policy "Staff with assignment edit permission can upload assignment instructions"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'assignment-instructions'
    and public.has_teacher_permission('assignments', 'edit')
    and exists (
      select 1 from public.assignments
      where id::text = (storage.foldername(name))[1]
    )
    and right(lower(name), 4) in ('.pdf', '.png', '.jpg', '.webp')
  );

drop policy if exists "Staff with assignment edit permission can delete assignment instructions" on storage.objects;
create policy "Staff with assignment edit permission can delete assignment instructions"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'assignment-instructions'
    and public.has_teacher_permission('assignments', 'edit')
  );
