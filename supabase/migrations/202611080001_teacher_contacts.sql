create table if not exists public.teacher_contacts (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  display_name text not null,
  designation text not null default '',
  branch text not null default '',
  phone text not null default '',
  whatsapp_phone text not null default '',
  office_hours text not null default '',
  about text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.teacher_contacts enable row level security;
revoke all on public.teacher_contacts from anon, authenticated;
grant select, insert, update, delete on public.teacher_contacts to authenticated;

create or replace function public.can_view_teacher_contacts()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'student'
      and approved = true
      and coalesce(archived, false) = false
  );
$$;

create or replace function public.can_manage_teacher_contact(contact_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select contact_profile_id = auth.uid()
    and exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and role in ('teacher', 'admin')
        and approved = true
        and coalesce(archived, false) = false
    );
$$;

create or replace function public.is_active_teacher_contact(contact_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = contact_profile_id
      and role in ('teacher', 'admin')
      and approved = true
      and coalesce(archived, false) = false
  );
$$;

revoke all on function public.can_view_teacher_contacts() from public, anon;
revoke all on function public.can_manage_teacher_contact(uuid) from public, anon;
revoke all on function public.is_active_teacher_contact(uuid) from public, anon;
grant execute on function public.can_view_teacher_contacts() to authenticated;
grant execute on function public.can_manage_teacher_contact(uuid) to authenticated;
grant execute on function public.is_active_teacher_contact(uuid) to authenticated;

drop policy if exists "Teachers manage their own contact card" on public.teacher_contacts;
create policy "Teachers manage their own contact card"
  on public.teacher_contacts for all
  to authenticated
  using (public.can_manage_teacher_contact(profile_id))
  with check (public.can_manage_teacher_contact(profile_id));

drop policy if exists "Approved students can read active teacher contacts" on public.teacher_contacts;
create policy "Approved students can read active teacher contacts"
  on public.teacher_contacts for select
  to authenticated
  using (
    public.can_view_teacher_contacts()
    and public.is_active_teacher_contact(profile_id)
  );
