-- Drop the overly-strict composite dedup index that rejects legitimate
-- variants sharing the same lwhsdesc+zone+storage_location but differing in
-- other fields (line_no, location_on_machine, etc.).
-- The external_row_id UNIQUE constraint (one value per Excel row) is
-- the correct dedup key for import idempotency.
drop index if exists public.part_variants_dedup_idx;
