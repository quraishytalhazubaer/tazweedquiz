alter table public.assignment_submissions
  add column if not exists submission_details text not null default '';

create table if not exists public.assignment_submission_comments (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null,
  profile_id uuid not null,
  batch text not null,
  comment text not null check (char_length(trim(comment)) between 1 and 2000),
  created_at timestamptz not null default now(),
  constraint assignment_submission_comments_submission_fkey
    foreign key (assignment_id, profile_id, batch)
    references public.assignment_submissions(assignment_id, profile_id, batch)
    on delete cascade
);

create index if not exists assignment_submission_comments_submission_idx
  on public.assignment_submission_comments(assignment_id, profile_id, batch, created_at);

alter table public.assignment_submission_comments enable row level security;

drop policy if exists "Students and authorized staff can read assignment comments" on public.assignment_submission_comments;
create policy "Students and authorized staff can read assignment comments"
  on public.assignment_submission_comments for select
  to authenticated
  using (
    profile_id = auth.uid()
    or public.has_teacher_permission('assignments', 'view')
    or public.has_teacher_permission('assignments', 'edit')
  );

drop policy if exists "Students can comment on their submitted assignments" on public.assignment_submission_comments;
create policy "Students can comment on their submitted assignments"
  on public.assignment_submission_comments for insert
  to authenticated
  with check (
    profile_id = auth.uid()
    and exists (
      select 1
      from public.profiles
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
      or new.submission_details is distinct from old.submission_details
    ) then
    raise exception 'Submitted assignments must be reset by authorized staff before they can be changed.';
  end if;

  return new;
end;
$$;
