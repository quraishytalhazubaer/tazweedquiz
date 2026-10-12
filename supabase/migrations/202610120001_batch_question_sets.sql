alter table public.mcq_questions
  add column if not exists question_set integer not null default 1
  check (question_set between 1 and 4);

create table if not exists public.exam_batch_question_sets (
  batch text primary key check (nullif(trim(batch), '') is not null),
  question_set integer not null check (question_set between 1 and 4)
);

insert into public.exam_batch_question_sets (batch, question_set)
select distinct configured_batches.batch, 1
from public.exam_config
cross join lateral unnest(coalesce(active_batches, '{}'::text[])) as configured_batches(batch)
where id = 1
  and nullif(trim(configured_batches.batch), '') is not null
on conflict (batch) do nothing;

alter table public.exam_batch_question_sets enable row level security;

drop policy if exists "Approved users can read batch question sets" on public.exam_batch_question_sets;
create policy "Approved users can read batch question sets"
  on public.exam_batch_question_sets for select
  to authenticated
  using (exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.approved = true
  ));

drop policy if exists "Exam editors can manage batch question sets" on public.exam_batch_question_sets;
create policy "Exam editors can manage batch question sets"
  on public.exam_batch_question_sets for all
  to authenticated
  using (public.has_teacher_permission('exam', 'edit'))
  with check (public.has_teacher_permission('exam', 'edit'));

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'exam_batch_question_sets'
  ) then
    alter publication supabase_realtime add table public.exam_batch_question_sets;
  end if;
end
$$;
