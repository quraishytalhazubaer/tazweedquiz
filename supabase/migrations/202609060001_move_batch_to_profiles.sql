alter table public.profiles
  add column if not exists batch text;

-- Prefer the latest submission when a profile has more than one historical row.
update public.profiles as profile
set batch = source.batch
from (
  select distinct on (profile_id) profile_id, batch
  from public.submissions
  where profile_id is not null
    and batch is not null
    and nullif(trim(batch), '') is not null
  order by profile_id, id desc
) as source
where profile.id = source.profile_id
  and (profile.batch is null or nullif(trim(profile.batch), '') is null);

-- Link older rows that predate profile_id, then migrate their batch values too.
update public.profiles as profile
set batch = source.batch
from (
  select distinct on (profile.employee_id) profile.id as profile_id, submission.batch
  from public.submissions as submission
  join public.profiles as profile
    on profile.employee_id::text = submission.user_id::text
  where submission.profile_id is null
    and submission.batch is not null
    and nullif(trim(submission.batch), '') is not null
  order by profile.employee_id, submission.id desc
) as source
where profile.id = source.profile_id
  and (profile.batch is null or nullif(trim(profile.batch), '') is null);

