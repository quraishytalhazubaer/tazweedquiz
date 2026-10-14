drop policy if exists "Staff with material edit permission can reset assignment submissions" on public.assignment_submissions;
create policy "Staff with material edit permission can reset assignment submissions"
  on public.assignment_submissions for delete
  to authenticated
  using (public.has_teacher_permission('materials', 'edit'));

drop policy if exists "Students can delete their own assignment images" on storage.objects;
drop policy if exists "Students and staff can delete assignment submission PDFs" on storage.objects;
create policy "Students and staff can delete assignment submission PDFs"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'assignment-submissions'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.has_teacher_permission('materials', 'edit')
    )
  );
