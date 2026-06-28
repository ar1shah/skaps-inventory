-- Inventory is admin-only: authenticated users can read parts and variants;
-- the anon role can no longer query the master list or public_inventory view.

-- ---------------------------------------------------------------------------
-- parts
-- ---------------------------------------------------------------------------
drop policy if exists "parts are readable by everyone" on public.parts;

create policy "authenticated users can read parts"
  on public.parts
  for select
  to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- part_variants
-- ---------------------------------------------------------------------------
drop policy if exists "part_variants are readable by everyone" on public.part_variants;

create policy "authenticated users can read part_variants"
  on public.part_variants
  for select
  to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- Revoke anon table/view grants (RLS is the primary gate; this is defense in depth)
-- ---------------------------------------------------------------------------
revoke select on public.parts from anon;
revoke select on public.part_variants from anon;
revoke select on public.public_inventory from anon;
