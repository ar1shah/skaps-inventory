import { fetchAllRows } from "@/lib/supabase/fetch-all";
import { createClient } from "@/lib/supabase/server";
import type { InventoryPart, Part, PartVariant, PublicInventoryRow } from "@/lib/supabase/types";

/** Loads the raw parts table plus the public_inventory view (with variants attached). */
export async function loadParts(): Promise<{ parts: Part[]; inventoryParts: InventoryPart[] }> {
  const supabase = await createClient();

  const [
    { data: parts, error: partsErr },
    { data: rows, error: rowsErr },
    { data: variants, error: varErr },
  ] = await Promise.all([
    fetchAllRows<Part>((from, to) =>
      supabase.from("parts").select("*").order("name", { ascending: true }).range(from, to),
    ),
    fetchAllRows<PublicInventoryRow>((from, to) =>
      supabase
        .from("public_inventory")
        .select("*")
        .order("name", { ascending: true })
        .range(from, to),
    ),
    fetchAllRows<PartVariant>((from, to) =>
      supabase
        .from("part_variants")
        .select("*")
        .order("sort_order", { ascending: true })
        .range(from, to),
    ),
  ]);

  if (partsErr) console.error("failed to load parts", partsErr);
  if (rowsErr) console.error("failed to load inventory rows", rowsErr);
  if (varErr) console.error("failed to load variants", varErr);

  const variantsByPartId = new Map<string, PartVariant[]>();
  for (const v of variants ?? []) {
    const list = variantsByPartId.get(v.part_id) ?? [];
    list.push(v);
    variantsByPartId.set(v.part_id, list);
  }

  const inventoryParts: InventoryPart[] = (rows ?? []).map((row) => ({
    ...row,
    variants: row.id ? (variantsByPartId.get(row.id) ?? []) : [],
  }));

  return { parts: parts ?? [], inventoryParts };
}
