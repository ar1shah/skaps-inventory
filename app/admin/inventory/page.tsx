import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import type { Part } from "@/lib/supabase/types";
import { AdminInventoryClient } from "./AdminInventoryClient";

export const dynamic = "force-dynamic";

async function loadParts(): Promise<Part[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("parts")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("failed to load parts", error);
    return [];
  }
  return data ?? [];
}

export default async function AdminInventoryPage() {
  const parts = await loadParts();

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
        <AdminInventoryClient parts={parts} />
      </div>
    </div>
  );
}
