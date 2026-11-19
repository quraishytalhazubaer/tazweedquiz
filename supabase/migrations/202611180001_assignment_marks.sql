alter table public.assignment_submissions
  add column if not exists marks numeric(4, 2);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'assignment_submissions_marks_range'
      and conrelid = 'public.assignment_submissions'::regclass
  ) then
    alter table public.assignment_submissions
      add constraint assignment_submissions_marks_range
      check (marks is null or marks between 0 and 3);
  end if;
end;
$$;

create or replace function public.guard_assignment_submission_marks()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not public.has_teacher_permission('assignments', 'edit') then
    if tg_op = 'INSERT' and new.marks is not null then
      raise exception 'Only authorized staff can assign marks.';
    elsif tg_op = 'UPDATE' and new.marks is distinct from old.marks then
      raise exception 'Only authorized staff can change assignment marks.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists guard_assignment_submission_marks on public.assignment_submissions;
create trigger guard_assignment_submission_marks
  before insert or update on public.assignment_submissions
  for each row execute function public.guard_assignment_submission_marks();
