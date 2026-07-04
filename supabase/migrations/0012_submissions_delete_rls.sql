-- Allow admins to delete parts-request submissions from the requests
-- workflow page. Scoped to form_type = 'request' so parts-used audit rows
-- (form_type = 'used') can never be deleted through this policy.
create policy "authenticated users can delete request submissions"
  on public.submissions
  for delete
  to authenticated
  using (form_type = 'request');
