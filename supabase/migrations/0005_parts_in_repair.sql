-- Parts in repair tracker.
--
-- Admins manually log parts sent out for external repair. Entries stay in
-- the table permanently; "Mark as returned" flips status to 'returned'
-- and sets returned_at. This is intentionally decoupled from parts.current_quantity
-- -- stock impact can be added in a future version.

create table public.parts_in_repair (
  id                  uuid primary key default gen_random_uuid(),
  skaps_number        text,                   -- soft reference to parts.skaps_number; nullable for free-form entries
  part_name           text not null,
  quantity            numeric not null default 1,
  sent_at             timestamptz not null default now(),
  repair_vendor       text,
  expected_return_at  timestamptz,
  line                text,
  machine_area        text,
  repair_reason       text,
  po_reference        text,
  notes               text,
  status              text not null default 'in_repair'
                      check (status in ('in_repair', 'returned')),
  returned_at         timestamptz,            -- set automatically by markAsReturned action
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index parts_in_repair_status_idx  on public.parts_in_repair (status);
create index parts_in_repair_sent_at_idx on public.parts_in_repair (sent_at desc);

-- Reuse the touch_updated_at() function defined in 0001_init.sql.
create trigger trg_parts_in_repair_touch_updated_at
  before update on public.parts_in_repair
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- RLS: admin-only (authenticated) read/write; no public access.
-- ---------------------------------------------------------------------------
alter table public.parts_in_repair enable row level security;

create policy "authenticated users can select parts_in_repair"
  on public.parts_in_repair
  for select
  to authenticated
  using (true);

create policy "authenticated users can insert parts_in_repair"
  on public.parts_in_repair
  for insert
  to authenticated
  with check (true);

create policy "authenticated users can update parts_in_repair"
  on public.parts_in_repair
  for update
  to authenticated
  using (true)
  with check (true);

create policy "authenticated users can delete parts_in_repair"
  on public.parts_in_repair
  for delete
  to authenticated
  using (true);
