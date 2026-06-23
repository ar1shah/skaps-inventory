-- Part variants: warehouse-specific location rows for parts with the same
-- SKAPS# stocked at multiple sites. The parent `parts` row holds shared
-- identity (name, category, qty); each `part_variants` row holds location
-- data for one warehouse.
--
-- The public_inventory view is rebuilt to include variant_count so the
-- UI can show a "N locations" badge without loading all variants.

-- ---------------------------------------------------------------------------
-- 1. part_variants table
-- ---------------------------------------------------------------------------
create table public.part_variants (
  id               uuid primary key default gen_random_uuid(),
  part_id          uuid not null references public.parts(id) on delete cascade,
  lwhsdesc         text,
  zone             text,
  location         text,
  storage_location text,
  location_on_machine text,
  line_no          text,
  source_sheet     text,
  external_row_id  text unique,          -- e.g. master-<sheetId>-row-N
  sort_order       integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index part_variants_part_id_idx    on public.part_variants (part_id);
create index part_variants_sort_order_idx on public.part_variants (part_id, sort_order);

-- Prevent perfectly identical warehouse variants per part.
create unique index part_variants_dedup_idx
  on public.part_variants (part_id, coalesce(lwhsdesc,''), coalesce(zone,''), coalesce(storage_location,''));

create trigger trg_part_variants_touch_updated_at
  before update on public.part_variants
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- 2. RLS
-- ---------------------------------------------------------------------------
alter table public.part_variants enable row level security;

create policy "part_variants are readable by everyone"
  on public.part_variants
  for select
  using (true);

create policy "authenticated users can insert part_variants"
  on public.part_variants
  for insert
  to authenticated
  with check (true);

create policy "authenticated users can update part_variants"
  on public.part_variants
  for update
  to authenticated
  using (true)
  with check (true);

create policy "authenticated users can delete part_variants"
  on public.part_variants
  for delete
  to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- 3. Rebuild public_inventory view with variant_count
-- ---------------------------------------------------------------------------
drop view if exists public.public_inventory;

create view public.public_inventory as
select
  p.id,
  p.skaps_number,
  p.name,
  p.description,
  p.category,
  p.sub_category,
  -- Location fields come from the primary variant (sort_order = 0) when
  -- present, otherwise fall back to the columns still cached on parts.
  coalesce(pv.lwhsdesc,         p.lwhsdesc)          as lwhsdesc,
  coalesce(pv.zone,             p.zone)               as zone,
  coalesce(pv.location,         p.location)           as location,
  coalesce(pv.storage_location, p.storage_location)   as storage_location,
  coalesce(pv.location_on_machine, p.location_on_machine) as location_on_machine,
  coalesce(pv.line_no,          p.line_no)             as line_no,
  p.size,
  p.belt_type,
  p.vendor_names,
  p.image_url,
  p.unit,
  greatest(p.current_quantity, 0) as quantity_on_hand,
  p.reorder_threshold,
  coalesce((
    select sum(s.quantity)
      from public.submissions s
     where s.form_type = 'used'
       and s.skaps_number = p.skaps_number
       and s.submitted_at >= now() - interval '30 days'
  ), 0) as used_last_30d,
  -- variant_count: 0 means no variants loaded yet (show part-level data).
  -- >1 means the tile should show a locations badge.
  coalesce((
    select count(*)::int
      from public.part_variants v
     where v.part_id = p.id
  ), 0) as variant_count,
  p.notes,
  p.created_at,
  p.updated_at
from public.parts p
left join lateral (
  select *
    from public.part_variants v
   where v.part_id = p.id
   order by v.sort_order asc
   limit 1
) pv on true;

alter view public.public_inventory set (security_invoker = true);

grant select on public.public_inventory to anon, authenticated;
grant select on public.part_variants    to anon, authenticated;
