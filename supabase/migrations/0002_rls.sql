-- Row Level Security policies.
--
-- The general rule:
--   * Anyone (anon role) can read the public-facing data: the parts master
--     list and the public_inventory view derived from it.
--   * Only authenticated admins can read raw submissions (they contain
--     employee names + free-text notes we don't want on the public site).
--   * All writes go through the service role (the /api/ingest endpoint
--     and a few server actions for admin CRUD), bypassing RLS.

-- ---------------------------------------------------------------------------
-- parts
-- ---------------------------------------------------------------------------
alter table public.parts enable row level security;

create policy "parts are readable by everyone"
  on public.parts
  for select
  using (true);

create policy "authenticated users can insert parts"
  on public.parts
  for insert
  to authenticated
  with check (true);

create policy "authenticated users can update parts"
  on public.parts
  for update
  to authenticated
  using (true)
  with check (true);

create policy "authenticated users can delete parts"
  on public.parts
  for delete
  to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- submissions: admin-only reads, no client-side writes
-- ---------------------------------------------------------------------------
alter table public.submissions enable row level security;

create policy "authenticated users can read submissions"
  on public.submissions
  for select
  to authenticated
  using (true);

create policy "authenticated users can update submissions"
  on public.submissions
  for update
  to authenticated
  using (true)
  with check (true);

-- ---------------------------------------------------------------------------
-- profiles: each user can only read/update their own row
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

create policy "users can read their own profile"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

create policy "users can update their own profile"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "users can insert their own profile"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- notifications: authenticated-only reads + ability to mark as read
-- ---------------------------------------------------------------------------
alter table public.notifications enable row level security;

create policy "authenticated users can read notifications"
  on public.notifications
  for select
  to authenticated
  using (true);

create policy "authenticated users can update notifications"
  on public.notifications
  for update
  to authenticated
  using (true)
  with check (true);

-- ---------------------------------------------------------------------------
-- Make sure the public_inventory view runs with the permissions of the
-- *caller*, not the view owner. Combined with the SELECT policy on parts
-- this lets anon read aggregated inventory but never raw submissions.
-- ---------------------------------------------------------------------------
alter view public.public_inventory set (security_invoker = true);

grant select on public.public_inventory to anon, authenticated;
grant select on public.parts            to anon, authenticated;
