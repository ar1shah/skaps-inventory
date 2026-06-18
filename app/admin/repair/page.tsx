import { Wrench } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { RepairListClient } from "./RepairListClient";
import type { PartInRepair } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

async function loadRepairItems(): Promise<PartInRepair[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("parts_in_repair")
    .select("*")
    .order("sent_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export default async function RepairPage() {
  const items = await loadRepairItems();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Wrench className="h-6 w-6 text-slate-700" />
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Parts in repair</h1>
          <p className="text-sm text-slate-500">
            Track parts sent out for external repair.
          </p>
        </div>
      </div>

      <RepairListClient items={items} />
    </div>
  );
}
