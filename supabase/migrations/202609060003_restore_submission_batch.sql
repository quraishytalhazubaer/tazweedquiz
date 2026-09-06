-- Each submission belongs to exactly one batch. Keep the batch on the
-- submission while profiles.batch stores all batches assigned to the user.
alter table public.submissions
  add column if not exists batch text;

create index if not exists submissions_profile_batch_idx
  on public.submissions(profile_id, batch);
