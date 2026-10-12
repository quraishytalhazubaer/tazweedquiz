update public.profiles
set teacher_permissions = teacher_permissions || jsonb_build_object(
  'questions',
  jsonb_build_object(
    'view',
    coalesce((teacher_permissions -> 'exam' ->> 'edit')::boolean, false),
    'edit',
    coalesce((teacher_permissions -> 'exam' ->> 'edit')::boolean, false)
  )
)
where role = 'teacher'
  and not (teacher_permissions ? 'questions');

drop policy if exists "Authorized staff can read student profiles" on public.profiles;
create policy "Authorized staff can read student profiles"
  on public.profiles for select
  to authenticated
  using (
    role = 'student'
    and (
      public.has_teacher_permission('attendance', 'view')
      or public.has_teacher_permission('exam', 'view')
      or public.has_teacher_permission('questions', 'view')
      or public.has_teacher_permission('questions', 'edit')
      or public.has_teacher_permission('marks', 'view')
      or public.has_teacher_permission('grading', 'view')
    )
  );

drop policy if exists "Submission row access is permission scoped" on public.submissions;
create policy "Submission row access is permission scoped"
  on public.submissions as restrictive for select
  to authenticated
  using (
    profile_id = auth.uid()
    or public.has_teacher_permission('exam', 'view')
    or public.has_teacher_permission('questions', 'view')
    or public.has_teacher_permission('questions', 'edit')
    or public.has_teacher_permission('marks', 'view')
    or public.has_teacher_permission('grading', 'view')
  );

drop policy if exists "Exam editors can add MCQ questions" on public.mcq_questions;
create policy "Question managers can add MCQ questions"
  on public.mcq_questions for insert
  to authenticated
  with check (public.has_teacher_permission('questions', 'edit'));

drop policy if exists "Exam editors can update MCQ questions" on public.mcq_questions;
create policy "Question managers can update MCQ questions"
  on public.mcq_questions for update
  to authenticated
  using (public.has_teacher_permission('questions', 'edit'))
  with check (public.has_teacher_permission('questions', 'edit'));

drop policy if exists "Exam editors can delete MCQ questions" on public.mcq_questions;
create policy "Question managers can delete MCQ questions"
  on public.mcq_questions for delete
  to authenticated
  using (public.has_teacher_permission('questions', 'edit'));

drop policy if exists "MCQ inserts require exam edit permission" on public.mcq_questions;
create policy "MCQ inserts require question management edit permission"
  on public.mcq_questions as restrictive for insert
  to public
  with check (public.has_teacher_permission('questions', 'edit'));

drop policy if exists "MCQ updates require exam edit permission" on public.mcq_questions;
create policy "MCQ updates require question management edit permission"
  on public.mcq_questions as restrictive for update
  to public
  using (public.has_teacher_permission('questions', 'edit'))
  with check (public.has_teacher_permission('questions', 'edit'));

drop policy if exists "MCQ deletes require exam edit permission" on public.mcq_questions;
create policy "MCQ deletes require question management edit permission"
  on public.mcq_questions as restrictive for delete
  to public
  using (public.has_teacher_permission('questions', 'edit'));

drop policy if exists "Exam editors can manage batch question sets" on public.exam_batch_question_sets;
create policy "Question managers can manage batch question sets"
  on public.exam_batch_question_sets for all
  to authenticated
  using (public.has_teacher_permission('questions', 'edit'))
  with check (public.has_teacher_permission('questions', 'edit'));

drop policy if exists "Exam editors can add question sets" on public.exam_question_sets;
create policy "Question managers can add question sets"
  on public.exam_question_sets for insert
  to authenticated
  with check (public.has_teacher_permission('questions', 'edit'));

drop policy if exists "Exam editors can rename question sets" on public.exam_question_sets;
create policy "Question managers can rename question sets"
  on public.exam_question_sets for update
  to authenticated
  using (public.has_teacher_permission('questions', 'edit'))
  with check (public.has_teacher_permission('questions', 'edit'));
