drop policy if exists "Staff with course material access can read materials" on public.course_material;
create policy "Approved users can read course materials"
  on public.course_material for select
  to authenticated
  using (
    public.has_teacher_permission('materials', 'view')
    or exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and role = 'student'
        and approved = true
    )
  );

drop policy if exists "Course materials require view permission" on public.course_material;
create policy "Course material reads require approved access"
  on public.course_material as restrictive for select
  to authenticated
  using (
    public.has_teacher_permission('materials', 'view')
    or exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and role = 'student'
        and approved = true
    )
  );
