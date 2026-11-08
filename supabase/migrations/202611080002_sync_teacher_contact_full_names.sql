create or replace function public.sync_teacher_contact_full_name()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_full_name text;
begin
  select nullif(btrim(full_name), '')
  into profile_full_name
  from public.profiles
  where id = new.profile_id;

  if profile_full_name is not null then
    new.display_name := profile_full_name;
  end if;

  return new;
end;
$$;

revoke all on function public.sync_teacher_contact_full_name() from public, anon, authenticated;

drop trigger if exists sync_teacher_contact_full_name on public.teacher_contacts;
create trigger sync_teacher_contact_full_name
  before insert or update on public.teacher_contacts
  for each row
  execute function public.sync_teacher_contact_full_name();

update public.teacher_contacts as contact
set display_name = profile.full_name
from public.profiles as profile
where profile.id = contact.profile_id
  and nullif(btrim(profile.full_name), '') is not null;
