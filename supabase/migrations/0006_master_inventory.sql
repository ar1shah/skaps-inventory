-- Master inventory expansion.
--
-- Adds columns to `parts` to hold all identifying information from the
-- Athens Inventory Excel master list. Also broadens the notifications.type
-- and submissions.status check constraints to support the new workflows
-- (stock_updated notification, needs_review status for unmatched SKAPS #s).

-- ---------------------------------------------------------------------------
-- 1. New columns on parts
-- ---------------------------------------------------------------------------
alter table public.parts
  add column if not exists description       text,
  add column if not exists location_on_machine text,
  add column if not exists line_no           text,
  add column if not exists zone              text,
  add column if not exists storage_location  text,
  add column if not exists lwhsdesc          text,
  add column if not exists sub_category      text,
  add column if not exists size              text,
  add column if not exists belt_type         text,
  add column if not exists image_url         text,
  add column if not exists vendor_names      text;

-- ---------------------------------------------------------------------------
-- 2. Widen the notifications.type constraint to include stock_updated
-- ---------------------------------------------------------------------------
alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check
  check (type in (
    'new_request',
    'urgent_request',
    'low_stock',
    'unknown_skaps',
    'stock_updated'
  ));

-- ---------------------------------------------------------------------------
-- 3. Widen submissions.status constraint to include needs_review
-- ---------------------------------------------------------------------------
alter table public.submissions
  drop constraint if exists submissions_status_check;

alter table public.submissions
  add constraint submissions_status_check
  check (status in (
    'open',
    'ordered',
    'in_transit',
    'received',
    'closed',
    'needs_review'
  ));

-- ---------------------------------------------------------------------------
-- 4. Rebuild public_inventory view with all new columns
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
  p.location,
  p.location_on_machine,
  p.line_no,
  p.zone,
  p.storage_location,
  p.lwhsdesc,
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
  p.notes,
  p.created_at,
  p.updated_at
from public.parts p;

alter view public.public_inventory set (security_invoker = true);

grant select on public.public_inventory to anon, authenticated;
