import type { Metadata } from "next";
import { InventoryTileGrid } from "@/components/inventory/InventoryTileGrid";
import { fetchAllRows } from "@/lib/supabase/fetch-all";
import { createClient } from "@/lib/supabase/server";
import type { InventoryPart, PartVariant, PublicInventoryRow } from "@/lib/supabase/types";

export const metadata: Metadata = {
  title: "Inventory",
  description: "Browse the current SKAPS parts inventory.",
};

export const revalidate = 30;

async function loadInventory(): Promise<InventoryPart[]> {
  const supabase = await createClient();

  const [{ data: rows, error: rowsErr }, { data: variants, error: varErr }] = await Promise.all([
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

  if (rowsErr) console.error("failed to load inventory", rowsErr);
  if (varErr) console.error("failed to load variants", varErr);

  const variantsByPartId = new Map<string, PartVariant[]>();
  for (const v of variants ?? []) {
    const list = variantsByPartId.get(v.part_id) ?? [];
    list.push(v);
    variantsByPartId.set(v.part_id, list);
  }

  return (rows ?? []).map((row) => ({
    ...row,
    variants: row.id ? (variantsByPartId.get(row.id) ?? []) : [],
  }));
}

export default async function InventoryPage() {
  const parts = await loadInventory();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="max-w-2xl">
        <p className="text-sm font-medium uppercase tracking-wider text-blue-700">Inventory</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          Current stock
        </h1>
        <p className="mt-3 text-sm text-slate-600">
          Quantities update as the maintenance team submits the parts-used form.
          Click any tile to see full part details.
        </p>
      </header>

      <div className="mt-8">
        <InventoryTileGrid parts={parts} />
      </div>
    </div>
  );
}
