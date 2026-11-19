alter table public.exam_config
  add column if not exists batch_date_ranges jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'exam_config_batch_date_ranges_object'
      and conrelid = 'public.exam_config'::regclass
  ) then
    alter table public.exam_config
      add constraint exam_config_batch_date_ranges_object
      check (jsonb_typeof(batch_date_ranges) = 'object');
  end if;
end;
$$;

create or replace function public.get_exam_academic_marks()
returns table (
  profile_id uuid,
  batch text,
  attendance_marks numeric,
  assignment_marks numeric
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or not public.has_teacher_permission('marks', 'view') then
    raise exception 'Marks view permission required.'
      using errcode = '42501';
  end if;

  return query
  with exam_pairs as (
    select distinct exam_submission.profile_id, exam_submission.batch
    from public.submissions as exam_submission
    where exam_submission.profile_id is not null
      and nullif(trim(exam_submission.batch), '') is not null
  ),
  batch_ranges as (
    select
      range_entry.key as batch,
      nullif(range_entry.value ->> 'startDate', '')::date as start_date,
      nullif(range_entry.value ->> 'endDate', '')::date as end_date
    from public.exam_config as config
    cross join lateral jsonb_each(config.batch_date_ranges) as range_entry
    where config.id = 1
  ),
  attendance_scores as (
    select
      exam_pair.profile_id,
      exam_pair.batch,
      case
        when batch_range.start_date is not null
          and batch_range.end_date is not null
          and batch_range.start_date <= batch_range.end_date
          then least(count(distinct attendance.attendance_date), 4)::numeric / 2
        else null
      end as attendance_marks
    from exam_pairs as exam_pair
    left join batch_ranges as batch_range on batch_range.batch = exam_pair.batch
    left join public.attendance_records as attendance
      on attendance.profile_id = exam_pair.profile_id
      and attendance.attendance_date >= batch_range.start_date
      and attendance.attendance_date <= batch_range.end_date
    group by
      exam_pair.profile_id,
      exam_pair.batch,
      batch_range.start_date,
      batch_range.end_date
  ),
  assignment_scores as (
    select
      assignment_submission.profile_id,
      assignment_submission.batch,
      avg(assignment_submission.marks)::numeric as assignment_marks
    from public.assignment_submissions as assignment_submission
    where assignment_submission.marks is not null
      and assignment_submission.submitted_at is not null
    group by assignment_submission.profile_id, assignment_submission.batch
  )
  select
    exam_pair.profile_id,
    exam_pair.batch,
    attendance_score.attendance_marks,
    assignment_score.assignment_marks
  from exam_pairs as exam_pair
  left join attendance_scores as attendance_score
    on attendance_score.profile_id = exam_pair.profile_id
    and attendance_score.batch = exam_pair.batch
  left join assignment_scores as assignment_score
    on assignment_score.profile_id = exam_pair.profile_id
    and assignment_score.batch = exam_pair.batch;
end;
$$;

revoke all on function public.get_exam_academic_marks() from public, anon;
grant execute on function public.get_exam_academic_marks() to authenticated;
