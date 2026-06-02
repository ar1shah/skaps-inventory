-- Quiet down the Supabase security advisors:
--
-- 1. Pin search_path on every trigger function so they can't be hijacked
--    by an attacker who creates a same-named schema.
-- 2. Revoke EXECUTE on handle_new_user() from anon/authenticated so it
--    can only ever fire from the auth.users trigger (which runs with
--    elevated privileges anyway).
--
-- The "RLS policy is always true" warnings on submissions/notifications/
-- parts are intentional: in v1 we have a single admin role and any
-- authenticated user IS the admin. When we add multiple roles later
-- we'll narrow these policies with an `auth.uid() = ...` check.

alter function public.touch_updated_at()       set search_path = public, pg_temp;
alter function public.apply_used_submission()  set search_path = public, pg_temp;

revoke execute on function public.handle_new_user() from public;
revoke execute on function public.handle_new_user() from anon;
revoke execute on function public.handle_new_user() from authenticated;
