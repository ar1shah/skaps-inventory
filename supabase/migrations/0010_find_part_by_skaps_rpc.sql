-- RPC for app-side SKAPS# lookup using the same normalization as the stock
-- deduction trigger. Avoids PostgREST's 1,000-row cap on client scans.

create or replace function public.find_part_by_skaps_number(submitted text)
returns table (
  skaps_number text,
  name text,
  current_quantity numeric,
  reorder_threshold numeric
)
language sql
stable
set search_path = public
as $$
  select p.skaps_number, p.name, p.current_quantity, p.reorder_threshold
    from public.parts p
   where public.normalize_skaps_number(p.skaps_number)
       = public.normalize_skaps_number(submitted);
$$;

grant execute on function public.find_part_by_skaps_number(text) to service_role;
