drop policy if exists "Approved students can submit their own assignments" on public.assignment_submissions;
drop policy if exists "Approved students can update their own assignment submissions" on public.assignment_submissions;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'assignment_submissions'
      and column_name = 'image_paths'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'assignment_submissions'
      and column_name = 'file_path'
  ) then
    alter table public.assignment_submissions rename column image_paths to file_path;
  end if;
end;
$$;

alter table public.assignment_submissions
  drop constraint if exists assignment_submissions_image_paths_check;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'assignment_submissions'
      and column_name = 'file_path'
      and udt_name = '_text'
  ) then
    alter table public.assignment_submissions
      alter column file_path type text using file_path[1];
  end if;
end;
$$;

alter table public.assignment_submissions
  drop constraint if exists assignment_submissions_file_path_pdf_check;

drop trigger if exists validate_assignment_submission_file_path on public.assignment_submissions;
create or replace function public.validate_assignment_submission_file_path()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if split_part(new.file_path, '/', 1) <> new.profile_id::text
    or split_part(new.file_path, '/', 2) <> new.assignment_id::text
    or (tg_op = 'INSERT' or new.file_path is distinct from old.file_path)
      and right(lower(new.file_path), 4) <> '.pdf' then
    raise exception 'Assignment submission file path must belong to its student and assignment.';
  end if;
  return new;
end;
$$;

create trigger validate_assignment_submission_file_path
  before insert or update of file_path, profile_id, assignment_id on public.assignment_submissions
  for each row execute function public.validate_assignment_submission_file_path();

create policy "Approved students can submit their own assignment PDFs"
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
  );

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
      select 1 from public.assignments
      where id = assignment_id and (due_at is null or due_at > now())
    )
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

drop policy if exists "Students can upload their own assignment images" on storage.objects;
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
