alter table public.mcq_questions enable row level security;

drop policy if exists "Authenticated users can read MCQ questions" on public.mcq_questions;
create policy "Authenticated users can read MCQ questions"
  on public.mcq_questions for select
  to authenticated
  using (exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.approved = true
  ));

drop policy if exists "Exam editors can add MCQ questions" on public.mcq_questions;
create policy "Exam editors can add MCQ questions"
  on public.mcq_questions for insert
  to authenticated
  with check (public.has_teacher_permission('exam', 'edit'));

drop policy if exists "Exam editors can update MCQ questions" on public.mcq_questions;
create policy "Exam editors can update MCQ questions"
  on public.mcq_questions for update
  to authenticated
  using (public.has_teacher_permission('exam', 'edit'))
  with check (public.has_teacher_permission('exam', 'edit'));

drop policy if exists "Exam editors can delete MCQ questions" on public.mcq_questions;
create policy "Exam editors can delete MCQ questions"
  on public.mcq_questions for delete
  to authenticated
  using (public.has_teacher_permission('exam', 'edit'));

drop policy if exists "MCQ reads require authentication" on public.mcq_questions;
create policy "MCQ reads require authentication"
  on public.mcq_questions as restrictive for select
  to public
  using (exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.approved = true
  ));

drop policy if exists "MCQ inserts require exam edit permission" on public.mcq_questions;
create policy "MCQ inserts require exam edit permission"
  on public.mcq_questions as restrictive for insert
  to public
  with check (public.has_teacher_permission('exam', 'edit'));

drop policy if exists "MCQ updates require exam edit permission" on public.mcq_questions;
create policy "MCQ updates require exam edit permission"
  on public.mcq_questions as restrictive for update
  to public
  using (public.has_teacher_permission('exam', 'edit'))
  with check (public.has_teacher_permission('exam', 'edit'));

drop policy if exists "MCQ deletes require exam edit permission" on public.mcq_questions;
create policy "MCQ deletes require exam edit permission"
  on public.mcq_questions as restrictive for delete
  to public
  using (public.has_teacher_permission('exam', 'edit'));