-- Auto-create a profile row whenever a new auth.users row appears.
-- This lets the dashboard show "Welcome back, <first> <last>" without
-- the admin having to manually insert anything.
--
-- The first_name / last_name come from raw_user_meta_data which the
-- /admin/settings invite flow populates. Missing values are left null
-- and the UI falls back to the email username.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, first_name, last_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'first_name', null),
    coalesce(new.raw_user_meta_data->>'last_name', null)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger trg_handle_new_user
  after insert on auth.users
  for each row execute function public.handle_new_user();
