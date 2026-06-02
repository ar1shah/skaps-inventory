-- Initial schema for the SKAPS parts inventory app.
--
-- Two tables drive the inventory model:
--   * `parts` is the master list, curated by the admin from /admin/inventory.
--     It starts empty -- nothing shows on the public site until the admin
--     adds rows.
--   * `submissions` is one row per Google Form submission. The on-insert
--     trigger decrements `parts.current_quantity` whenever a "used" form
--     comes in, floored at zero so we never display negative stock.
--
-- The "request" form also writes to `submissions` but does not affect
-- stock. The status / po_number / received_at columns on submissions are
-- here for the future delivered-and-in-transit tracker; v1 ignores them.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- parts: admin-curated master inventory list
-- ---------------------------------------------------------------------------
create table public.parts (
  id                 uuid primary key default gen_random_uuid(),
  skaps_number       text unique not null,
  name               text not null,
  category           text,
  location           text,
  unit               text not null default 'each',
  current_quantity   numeric not null default 0,
  reorder_threshold  numeric,
  notes              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index parts_skaps_number_idx on public.parts (skaps_number);
create index parts_category_idx     on public.parts (category);

-- Touch `updated_at` on every update so admin pages can sort by recency.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_parts_touch_updated_at
  before update on public.parts
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- submissions: one row per Google Form response
-- ---------------------------------------------------------------------------
create table public.submissions (
  id              uuid primary key default gen_random_uuid(),
  external_row_id text unique,
  submitted_at    timestamptz not null,
  form_type       text not null check (form_type in ('used', 'request')),

  employee_name   text,
  skaps_number    text,
  part_description text,
  quantity        numeric,
  line            text,
  machine_area    text,
  pm_type         text,
  urgency         text,
  notes           text,
  raw             jsonb not null,

  -- Reserved for the future "parts delivered / in transit" tracker.
  status      text not null default 'open'
              check (status in ('open', 'ordered', 'in_transit', 'received', 'closed')),
  po_number   text,
  received_at timestamptz,
  price       numeric
);

create index submissions_submitted_at_idx       on public.submissions (submitted_at desc);
create index submissions_form_type_submitted_at on public.submissions (form_type, submitted_at desc);
create index submissions_skaps_number_idx       on public.submissions (skaps_number);

-- ---------------------------------------------------------------------------
-- profiles: extends auth.users with the first/last name used for the
-- "Welcome back, ..." header in the admin dashboard.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id         uuid primary key references auth.users on delete cascade,
  first_name text,
  last_name  text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- notifications: lightweight in-app feed for the admin
-- ---------------------------------------------------------------------------
create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  type       text not null
             check (type in ('new_request', 'urgent_request', 'low_stock', 'unknown_skaps')),
  title      text not null,
  body       text,
  link       text,
  created_at timestamptz not null default now(),
  read_at    timestamptz
);

create index notifications_unread_idx on public.notifications (created_at desc)
  where read_at is null;

-- ---------------------------------------------------------------------------
-- Trigger: decrement stock when a "used" submission arrives.
-- We use greatest(..., 0) so stock can't go negative even if usage is
-- logged before the admin adds the part / restocks it.
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
     where skaps_number = new.skaps_number;
  end if;
  return new;
end;
$$;

create trigger trg_apply_used_submission
  after insert on public.submissions
  for each row execute function public.apply_used_submission();

-- ---------------------------------------------------------------------------
-- public_inventory: what the public /inventory page reads from.
-- The greatest(..., 0) is belt-and-suspenders -- the trigger already
-- floors stock at zero, but if anyone ever writes a negative quantity
-- by hand we still want the public view to stay non-negative.
-- ---------------------------------------------------------------------------
create view public.public_inventory as
select
  p.skaps_number,
  p.name,
  p.category,
  p.location,
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
  p.updated_at
from public.parts p;
