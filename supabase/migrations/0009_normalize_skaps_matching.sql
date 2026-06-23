-- Match parts-used submissions on normalized SKAPS# (case + separator
-- insensitive) so "insert 164" deducts stock for "INSERT_164".

-- ---------------------------------------------------------------------------
-- 1. Shared normalizer (mirrors lib/forms/normalize.ts normalizeSkapsNumber)
-- ---------------------------------------------------------------------------
create or replace function public.normalize_skaps_number(s text)
returns text
language sql
immutable
as $$
  select upper(regexp_replace(s, '[^A-Za-z0-9]', '', 'g'));
$$;

-- ---------------------------------------------------------------------------
-- 2. Stock deduction trigger — normalized match
-- ---------------------------------------------------------------------------
create or replace function public.apply_used_submission()
returns trigger
language plpgsql
as $$
begin
  if new.form_type = 'used'
     and new.skaps_number is not null
     and new.quantity is not null
  then
    update public.parts
       set current_quantity = greatest(0, current_quantity - new.quantity),
           updated_at       = now()
     where public.normalize_skaps_number(skaps_number)
         = public.normalize_skaps_number(new.skaps_number);
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Rebuild public_inventory — used_last_30d uses normalized SKAPS# match
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
       and public.normalize_skaps_number(s.skaps_number)
         = public.normalize_skaps_number(p.skaps_number)
       and s.submitted_at >= now() - interval '30 days'
  ), 0) as used_last_30d,
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
