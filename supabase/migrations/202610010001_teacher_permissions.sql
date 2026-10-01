alter table public.profiles
  add column if not exists teacher_permissions jsonb not null default '{}'::jsonb;

update public.profiles
set teacher_permissions = '{
  "attendance": {"view": true, "edit": true},
  "materials": {"view": true, "edit": true},
  "exam": {"view": true, "edit": true},
  "marks": {"view": true, "edit": true},
  "grading": {"view": true, "edit": true}
}'::jsonb
where role = 'teacher' and teacher_permissions = '{}'::jsonb;

create or replace function public.has_teacher_permission(feature_key text, permission_level text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and approved = true
      and (
        role = 'admin'
        or (
          role = 'teacher'
          and (
            coalesce((teacher_permissions -> feature_key ->> permission_level)::boolean, false)
            or (
              feature_key = 'marks'
              and permission_level = 'view'
              and coalesce((teacher_permissions -> 'grading' ->> 'edit')::boolean, false)
            )
          )
        )
      )
  );
$$;

drop policy if exists "Authorized staff can read student profiles" on public.profiles;
create policy "Authorized staff can read student profiles"
  on public.profiles for select
  to authenticated
  using (
    role = 'student'
    and (
      public.has_teacher_permission('attendance', 'view')
      or public.has_teacher_permission('exam', 'view')
      or public.has_teacher_permission('marks', 'view')
      or public.has_teacher_permission('grading', 'view')
    )
  );

create or replace function public.enforce_teacher_feature_permissions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_table_name = 'course_material' then
    if not public.has_teacher_permission('materials', 'edit') then
      raise exception 'Course material edit permission required.' using errcode = '42501';
    end if;
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  if tg_table_name = 'exam_config' then
    if (new.is_active is distinct from old.is_active
      or new.active_batches is distinct from old.active_batches
      or new.all_batches is distinct from old.all_batches)
      and not public.has_teacher_permission('exam', 'edit') then
      raise exception 'Exam edit permission required.' using errcode = '42501';
    end if;

    if (new.attendance_is_active is distinct from old.attendance_is_active
      or new.attendance_code is distinct from old.attendance_code
      or new.attendance_date is distinct from old.attendance_date
      or new.attendance_generated_at is distinct from old.attendance_generated_at)
      and not public.has_teacher_permission('attendance', 'edit') then
      raise exception 'Attendance edit permission required.' using errcode = '42501';
    end if;
    return new;
  end if;

  if tg_table_name = 'submissions'
    and (new.viva_marks is distinct from old.viva_marks
      or new.total_marks is distinct from old.total_marks)
    and not public.has_teacher_permission('marks', 'edit')
    and not public.has_teacher_permission('grading', 'edit') then
    raise exception 'Marks edit permission required.' using errcode = '42501';
  end if;

  if tg_table_name = 'submissions'
    and (new.marks is distinct from old.marks
      or new.status is distinct from old.status
      or new.user_id is distinct from old.user_id
      or new.user_name is distinct from old.user_name
      or new.user_branch is distinct from old.user_branch
      or new.designation is distinct from old.designation)
    and not public.has_teacher_permission('grading', 'edit') then
    raise exception 'Grading edit permission required.' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_course_material_permissions on public.course_material;
create trigger enforce_course_material_permissions
  before insert or update or delete on public.course_material
  for each row execute function public.enforce_teacher_feature_permissions();

alter table public.course_material enable row level security;

drop policy if exists "Staff with course material access can read materials" on public.course_material;
create policy "Staff with course material access can read materials"
  on public.course_material for select
  to authenticated
  using (public.has_teacher_permission('materials', 'view'));

drop policy if exists "Staff with course material edit can add materials" on public.course_material;
create policy "Staff with course material edit can add materials"
  on public.course_material for insert
  to authenticated
  with check (public.has_teacher_permission('materials', 'edit'));

drop policy if exists "Staff with course material edit can update materials" on public.course_material;
create policy "Staff with course material edit can update materials"
  on public.course_material for update
  to authenticated
  using (public.has_teacher_permission('materials', 'edit'))
  with check (public.has_teacher_permission('materials', 'edit'));

drop policy if exists "Staff with course material edit can delete materials" on public.course_material;
create policy "Staff with course material edit can delete materials"
  on public.course_material for delete
  to authenticated
  using (public.has_teacher_permission('materials', 'edit'));

drop policy if exists "Course materials require view permission" on public.course_material;
create policy "Course materials require view permission"
  on public.course_material as restrictive for select
  to authenticated
  using (public.has_teacher_permission('materials', 'view'));

drop policy if exists "Course material inserts require edit permission" on public.course_material;
create policy "Course material inserts require edit permission"
  on public.course_material as restrictive for insert
  to authenticated
  with check (public.has_teacher_permission('materials', 'edit'));

drop policy if exists "Course material updates require edit permission" on public.course_material;
create policy "Course material updates require edit permission"
  on public.course_material as restrictive for update
  to authenticated
  using (public.has_teacher_permission('materials', 'edit'))
  with check (public.has_teacher_permission('materials', 'edit'));

drop policy if exists "Course material deletes require edit permission" on public.course_material;
create policy "Course material deletes require edit permission"
  on public.course_material as restrictive for delete
  to authenticated
  using (public.has_teacher_permission('materials', 'edit'));

drop trigger if exists enforce_exam_config_permissions on public.exam_config;
create trigger enforce_exam_config_permissions
  before update on public.exam_config
  for each row execute function public.enforce_teacher_feature_permissions();

drop trigger if exists enforce_submission_grading_permissions on public.submissions;
create trigger enforce_submission_grading_permissions
  before update on public.submissions
  for each row execute function public.enforce_teacher_feature_permissions();

drop policy if exists "Teachers can read attendance" on public.attendance_records;
create policy "Staff with attendance access can read attendance"
  on public.attendance_records for select
  to authenticated
  using (public.has_teacher_permission('attendance', 'view'));

drop policy if exists "Attendance reads are owner or permission scoped" on public.attendance_records;
create policy "Attendance reads are owner or permission scoped"
  on public.attendance_records as restrictive for select
  to authenticated
  using (
    profile_id = auth.uid()
    or public.has_teacher_permission('attendance', 'view')
  );

alter table public.submissions enable row level security;

drop policy if exists "Authenticated users can query submissions" on public.submissions;
create policy "Authenticated users can query submissions"
  on public.submissions for select
  to authenticated
  using (true);

drop policy if exists "Submission owners can add submissions" on public.submissions;
create policy "Submission owners can add submissions"
  on public.submissions for insert
  to authenticated
  with check (
    profile_id = auth.uid()
    and exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'student'
        and profiles.approved = true
    )
  );

drop policy if exists "Submission inserts are owner scoped" on public.submissions;
create policy "Submission inserts are owner scoped"
  on public.submissions as restrictive for insert
  to authenticated
  with check (
    profile_id = auth.uid()
    and exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'student'
        and profiles.approved = true
    )
  );

drop policy if exists "Authorized staff can update submissions" on public.submissions;
create policy "Authorized staff can update submissions"
  on public.submissions for update
  to authenticated
  using (
    public.has_teacher_permission('marks', 'edit')
    or public.has_teacher_permission('grading', 'edit')
  )
  with check (
    public.has_teacher_permission('marks', 'edit')
    or public.has_teacher_permission('grading', 'edit')
  );

drop policy if exists "Submission row access is permission scoped" on public.submissions;
create policy "Submission row access is permission scoped"
  on public.submissions as restrictive for select
  to authenticated
  using (
    profile_id = auth.uid()
    or public.has_teacher_permission('exam', 'view')
    or public.has_teacher_permission('marks', 'view')
    or public.has_teacher_permission('grading', 'view')
  );

drop policy if exists "Submission updates require edit access" on public.submissions;
create policy "Submission updates require edit access"
  on public.submissions as restrictive for update
  to authenticated
  using (
    public.has_teacher_permission('marks', 'edit')
    or public.has_teacher_permission('grading', 'edit')
  )
  with check (
    public.has_teacher_permission('marks', 'edit')
    or public.has_teacher_permission('grading', 'edit')
  );

drop policy if exists "Teachers can update exam configuration" on public.exam_config;
create policy "Staff with feature access can update exam configuration"
  on public.exam_config for update
  to authenticated
  using (
    public.has_teacher_permission('attendance', 'edit')
    or public.has_teacher_permission('exam', 'edit')
  )
  with check (
    public.has_teacher_permission('attendance', 'edit')
    or public.has_teacher_permission('exam', 'edit')
  );

-- Bootstrap once after applying this migration by promoting the intended account:
-- update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'admin@example.com');