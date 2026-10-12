insert into public.exam_batch_question_sets (batch, question_set)
select distinct submissions.batch, 1
from public.submissions
where nullif(trim(submissions.batch), '') is not null
on conflict (batch) do nothing;

create or replace function public.prevent_submitted_batch_question_set_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'DELETE' then
    if exists (
      select 1 from public.submissions
      where batch = old.batch
    ) then
      raise exception 'Question set assignment cannot be deleted after submissions exist for batch %.', old.batch;
    end if;
    return old;
  end if;

  if tg_op = 'UPDATE'
    and new.question_set is distinct from old.question_set
    and exists (
      select 1 from public.submissions
      where batch = old.batch
    ) then
    raise exception 'Question set assignment cannot be changed after submissions exist for batch %.', old.batch;
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_submitted_batch_question_set_change on public.exam_batch_question_sets;
create trigger prevent_submitted_batch_question_set_change
  before update or delete on public.exam_batch_question_sets
  for each row
  execute function public.prevent_submitted_batch_question_set_change();

create or replace function public.question_set_has_submissions(set_number integer)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.exam_batch_question_sets assignments
    join public.submissions
      on submissions.batch = assignments.batch
    where assignments.question_set = set_number
  ) or exists (
    select 1
    from public.submissions
    where answers ->> 'question_set' = set_number::text
  );
$$;

create or replace function public.prevent_changes_to_submitted_question_sets()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  protected_set integer;
begin
  if tg_op = 'INSERT' then
    protected_set := new.question_set;
    if public.question_set_has_submissions(protected_set) then
      raise exception 'Questions cannot be added to set % after submissions exist.', protected_set;
    end if;
    return new;
  end if;

  protected_set := old.question_set;
  if public.question_set_has_submissions(protected_set) then
    raise exception 'Questions in set % cannot be changed after submissions exist.', protected_set;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  if new.question_set is distinct from old.question_set
    and public.question_set_has_submissions(new.question_set) then
    raise exception 'Questions cannot be moved to set % after submissions exist.', new.question_set;
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_changes_to_submitted_question_sets on public.mcq_questions;
create trigger prevent_changes_to_submitted_question_sets
  before insert or update or delete on public.mcq_questions
  for each row
  execute function public.prevent_changes_to_submitted_question_sets();

revoke all on function public.prevent_submitted_batch_question_set_change() from public, anon, authenticated;
revoke all on function public.prevent_changes_to_submitted_question_sets() from public, anon, authenticated;
revoke all on function public.question_set_has_submissions(integer) from public, anon, authenticated;
