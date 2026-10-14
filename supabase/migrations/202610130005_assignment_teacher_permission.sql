-- Preserve current assignment access for teachers while making it independently configurable.
update public.profiles
set teacher_permissions = teacher_permissions || jsonb_build_object(
  'assignments',
  coalesce(
    teacher_permissions -> 'assignments',
    teacher_permissions -> 'materials',
    '{"view": false, "edit": false}'::jsonb
  )
)
where role = 'teacher'
  and not (teacher_permissions ? 'assignments');

drop policy if exists "Approved students and authorized staff can read assignments" on public.assignments;
create policy "Approved students and authorized staff can read assignments"
  on public.assignments for select
  to authenticated
  using (
    public.has_teacher_permission('assignments', 'view')
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'student' and approved = true
    )
  );

drop policy if exists "Staff with material edit permission can create assignments" on public.assignments;
drop policy if exists "Staff with assignment edit permission can create assignments" on public.assignments;
create policy "Staff with assignment edit permission can create assignments"
  on public.assignments for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and public.has_teacher_permission('assignments', 'edit')
  );

drop policy if exists "Owners and authorized staff can read assignment submissions" on public.assignment_submissions;
create policy "Owners and authorized staff can read assignment submissions"
  on public.assignment_submissions for select
  to authenticated
  using (
    profile_id = auth.uid()
    or public.has_teacher_permission('assignments', 'view')
  );

drop policy if exists "Staff with material edit permission can update assignment submissions" on public.assignment_submissions;
drop policy if exists "Staff with assignment edit permission can update assignment submissions" on public.assignment_submissions;
create policy "Staff with assignment edit permission can update assignment submissions"
  on public.assignment_submissions for update
  to authenticated
  using (public.has_teacher_permission('assignments', 'edit'))
  with check (public.has_teacher_permission('assignments', 'edit'));

drop policy if exists "Staff with material edit permission can reset assignment submissions" on public.assignment_submissions;
drop policy if exists "Staff with assignment edit permission can reset assignment submissions" on public.assignment_submissions;
create policy "Staff with assignment edit permission can reset assignment submissions"
  on public.assignment_submissions for delete
  to authenticated
  using (public.has_teacher_permission('assignments', 'edit'));

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

drop policy if exists "Students and staff can read assignment submission PDFs" on storage.objects;
create policy "Students and staff can read assignment submission PDFs"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'assignment-submissions'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.has_teacher_permission('assignments', 'view')
    )
  );

drop policy if exists "Students and staff can delete assignment submission PDFs" on storage.objects;
drop policy if exists "Staff with material edit permission can delete assignment submission PDFs" on storage.objects;
drop policy if exists "Staff with assignment edit permission can delete assignment submission PDFs" on storage.objects;
create policy "Staff with assignment edit permission can delete assignment submission PDFs"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'assignment-submissions'
    and (
      public.has_teacher_permission('assignments', 'edit')
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
