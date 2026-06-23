import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchAllRows } from "@/lib/supabase/fetch-all";
import { createClient } from "@/lib/supabase/server";
import type { InventoryPart, Part, PartVariant, PublicInventoryRow } from "@/lib/supabase/types";
import { AdminInventoryClient } from "./AdminInventoryClient";

export const dynamic = "force-dynamic";

async function loadParts(): Promise<{ parts: Part[]; inventoryParts: InventoryPart[] }> {
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

export default async function AdminInventoryPage() {
  const { parts, inventoryParts } = await loadParts();

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Inventory management
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            The master list of parts. Used-form submissions automatically
            decrement the quantities here.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/inventory/new">
            <Plus className="h-4 w-4" />
            Add part
          </Link>
        </Button>
      </div>

      <div className="mt-8">
        <AdminInventoryClient parts={parts} inventoryParts={inventoryParts} />
      </div>
    </div>
  );
}
