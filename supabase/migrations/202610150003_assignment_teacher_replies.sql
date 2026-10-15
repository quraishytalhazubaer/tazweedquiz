alter table public.assignment_submission_comments
  add column if not exists author_id uuid references public.profiles(id) on delete set null;

update public.assignment_submission_comments
set author_id = profile_id
where author_id is null;

drop policy if exists "Students can comment on their submitted assignments" on public.assignment_submission_comments;
create policy "Students can comment on their submitted assignments"
  on public.assignment_submission_comments for insert
  to authenticated
  with check (
    author_id = auth.uid()
    and profile_id = auth.uid()
    and exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role = 'student'
        and approved = true
    )
    and exists (
      select 1
      from public.assignment_submissions as submission
      where submission.assignment_id = assignment_submission_comments.assignment_id
        and submission.profile_id = auth.uid()
        and submission.batch = assignment_submission_comments.batch
        and submission.submitted_at is not null
    )
  );

drop policy if exists "Assignment editors can reply to submitted assignments" on public.assignment_submission_comments;
create policy "Assignment editors can reply to submitted assignments"
  on public.assignment_submission_comments for insert
  to authenticated
  with check (
    author_id = auth.uid()
    and public.has_teacher_permission('assignments', 'edit')
    and exists (
      select 1
      from public.assignment_submissions as submission
      where submission.assignment_id = assignment_submission_comments.assignment_id
        and submission.profile_id = assignment_submission_comments.profile_id
        and submission.batch = assignment_submission_comments.batch
        and submission.submitted_at is not null
    )
  );
