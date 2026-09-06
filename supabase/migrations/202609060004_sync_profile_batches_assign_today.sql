-- Make profiles.batch the distinct set of batches represented by submissions.
update public.profiles as profile
set batch = coalesce(
  (
    select array_agg(distinct submission.batch order by submission.batch)
    from public.submissions as submission
    where submission.profile_id = profile.id
      and submission.batch is not null
      and nullif(trim(submission.batch), '') is not null
  ),
  '{}'::text[]
);

-- Assign today's newly created student accounts to the requested batch.
update public.profiles as profile
set batch = array['TAO:6-10September2026']::text[]
from auth.users as auth_user
where auth_user.id = profile.id
  and profile.role = 'student'
  and (auth_user.created_at at time zone 'Asia/Dhaka')::date = date '2026-09-06';
