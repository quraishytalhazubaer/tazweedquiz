alter table public.assignment_submissions
  alter column submitted_at drop not null;

drop policy if exists "Approved students can delete their own assignment drafts" on public.assignment_submissions;
create policy "Approved students can delete their own assignment drafts"
  on public.assignment_submissions for delete
  to authenticated
  using (
    profile_id = auth.uid()
    and submitted_at is null
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'student' and approved = true
    )
  );

drop policy if exists "Staff with material edit permission can update assignment submissions" on public.assignment_submissions;
create policy "Staff with material edit permission can update assignment submissions"
  on public.assignment_submissions for update
  to authenticated
  using (public.has_teacher_permission('materials', 'edit'))
  with check (public.has_teacher_permission('materials', 'edit'));

create or replace function public.guard_assignment_submission_state()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.assignment_id is distinct from old.assignment_id
    or new.profile_id is distinct from old.profile_id then
    raise exception 'Assignment submission ownership cannot be changed.';
  end if;

  if not public.has_teacher_permission('materials', 'edit')
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

drop trigger if exists guard_assignment_submission_state on public.assignment_submissions;
create trigger guard_assignment_submission_state
  before update on public.assignment_submissions
  for each row execute function public.guard_assignment_submission_state();

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
    and not exists (
      select 1 from public.assignment_submissions
      where profile_id = auth.uid()
        and assignment_id::text = (storage.foldername(name))[2]
    )
  );

drop policy if exists "Students and staff can delete assignment submission PDFs" on storage.objects;
create policy "Students and staff can delete assignment submission PDFs"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'assignment-submissions'
    and (
      public.has_teacher_permission('materials', 'edit')
      or (
        (storage.foldername(name))[1] = auth.uid()::text
        and not exists (
          select 1 from public.assignment_submissions
          where profile_id = auth.uid()
            and file_path = name
            and submitted_at is not null
        )
      )
    )
  );
