-- Assign today's student accounts to the September 6 TAO batch.
-- Keep any existing profile batches and add the requested batch once.
update public.profiles as profile
set batch = case
  when profile.batch is null then array['TAO:6-10September2026']::text[]
  when 'TAO:6-10September2026' = any(profile.batch) then profile.batch
  else array_append(profile.batch, 'TAO:6-10September2026')
end
from auth.users as auth_user
where auth_user.id = profile.id
  and profile.role = 'student'
  and (auth_user.created_at at time zone 'Asia/Dhaka')::date = date '2026-09-06';
