/**
 * Shared mapping helpers for the Athens Inventory master list.
 * Used by both the one-time seed script and the /api/ingest-master route
 * so column name handling stays in one place.
 *
 * Column names from the Excel (lowercased for matching):
 *   skapsno, productname, product desc, location on machine,
 *   line no, quantity, zone, location, storage location,
 *   lwhsdesc, new_sub_category, new_main_category,
 *   size (bearings/inserts), unit (bearings/inserts), belt type (belts)
 */

import type { PartInsert, PartVariantInsert } from "@/lib/supabase/types";

export function clean(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

export function buildHeaderMap(headers: unknown[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (let i = 0; i < headers.length; i++) {
    const key = clean(headers[i]);
    if (key) map[key.toLowerCase()] = i;
  }
  return map;
}

export function get(
  row: unknown[],
  map: Record<string, number>,
  ...keys: string[]
): string | null {
  for (const key of keys) {
    const idx = map[key.toLowerCase()];
    if (idx !== undefined) {
      const val = clean(row[idx]);
      if (val) return val;
    }
  }
  return null;
}

/**
 * Extract the shared (non-location) part fields from a master list row.
 * These go into the `parts` table.
 */
export function rowToPartFields(
  row: unknown[],
  headerMap: Record<string, number>,
  sheetName: string,
): Omit<PartInsert, "current_quantity"> | null {
  const skapsNumber = get(row, headerMap, "skapsno");
  if (!skapsNumber) return null;

  return {
    skaps_number: skapsNumber,
    name: get(row, headerMap, "productname") ?? skapsNumber,
    description: get(row, headerMap, "product desc"),
    category: get(row, headerMap, "new_main_category") ?? sheetName,
    sub_category: get(row, headerMap, "new_sub_category"),
    size: get(row, headerMap, "size"),
    belt_type: get(row, headerMap, "belt type"),
    unit: get(row, headerMap, "unit") ?? "each",
    // Location fields below are kept on parts as a primary-variant cache.
    // The canonical source is part_variants; these are overwritten by the
    // first variant on import.
    lwhsdesc: get(row, headerMap, "lwhsdesc"),
    zone: get(row, headerMap, "zone"),
    location: get(row, headerMap, "location"),
    storage_location: get(row, headerMap, "storage location"),
    location_on_machine: get(row, headerMap, "location on machine"),
    line_no: get(row, headerMap, "line no"),
  };
}

/**
 * Extract the warehouse-specific fields for a `part_variants` row.
 * `partId` and `sortOrder` are supplied by the caller.
 */
export function rowToVariantFields(
  row: unknown[],
  headerMap: Record<string, number>,
  sheetName: string,
  externalRowId: string | null,
  sortOrder: number,
): Omit<PartVariantInsert, "part_id"> {
  return {
    lwhsdesc: get(row, headerMap, "lwhsdesc"),
    zone: get(row, headerMap, "zone"),
    location: get(row, headerMap, "location"),
    storage_location: get(row, headerMap, "storage location"),
    location_on_machine: get(row, headerMap, "location on machine"),
    line_no: get(row, headerMap, "line no"),
    source_sheet: sheetName,
    external_row_id: externalRowId,
    sort_order: sortOrder,
  };
}
