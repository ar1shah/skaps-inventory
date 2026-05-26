import type { Metadata } from "next";
import { InventoryTable } from "@/components/inventory/InventoryTable";
import { createClient } from "@/lib/supabase/server";
import type { PublicInventoryRow } from "@/lib/supabase/types";

export const metadata: Metadata = {
  title: "Inventory",
  description: "Browse the current SKAPS parts inventory.",
};

export const revalidate = 30;

async function loadInventory(): Promise<PublicInventoryRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("public_inventory")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("failed to load inventory", error);
    return [];
  }
  return data ?? [];
}

export default async function InventoryPage() {
  const rows = await loadInventory();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="max-w-2xl">
        <p className="text-sm font-medium uppercase tracking-wider text-blue-700">Inventory</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          Current stock
        </h1>
        <p className="mt-3 text-sm text-slate-600">
          Quantities update as the maintenance team submits the parts-used
          form. Cached for a few seconds, so very recent submissions may
          take a moment to appear.
        </p>
      </header>

      <div className="mt-8">
        <InventoryTable rows={rows} />
      </div>
    </div>
  );
}
