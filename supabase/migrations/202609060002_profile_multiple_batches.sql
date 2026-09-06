alter table public.profiles
  alter column batch type text[]
  using case
    when batch is null or nullif(trim(batch), '') is null then '{}'::text[]
    else array[batch]
  end;

update public.profiles
set batch = '{}'::text[]
where batch is null;

update public.profiles as profile
set batch = batches.batch_values
from (
  select profile_id, array_agg(distinct batch order by batch) as batch_values
  from public.submissions
  where profile_id is not null
    and batch is not null
    and nullif(trim(batch), '') is not null
  group by profile_id
) as batches
where profile.id = batches.profile_id;
