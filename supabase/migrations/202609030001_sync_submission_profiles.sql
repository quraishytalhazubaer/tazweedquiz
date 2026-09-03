alter table public.submissions
  add column if not exists profile_id uuid references public.profiles(id) on delete set null;

create index if not exists submissions_profile_id_idx
  on public.submissions(profile_id);

-- Link existing submissions to the profile that owns the employee ID.
update public.submissions as submission
set profile_id = profile.id
from public.profiles as profile
where submission.profile_id is null
  and submission.user_id is not null
  and profile.employee_id::text = submission.user_id::text;