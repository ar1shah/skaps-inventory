import { SubmissionsTable } from "@/components/admin/SubmissionsTable";
import { loadParts } from "@/lib/inventory/load-parts";
import { createClient } from "@/lib/supabase/server";
import type { Submission } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

async function loadSubmissions(): Promise<Submission[]> {
  const supabase = await createClient();
  // Cap at 500 for now so the page stays snappy. A future iteration could
  // paginate or add server-side filtering.
  const { data, error } = await supabase
    .from("submissions")
    .select("*")
    .eq("form_type", "used")
    .order("submitted_at", { ascending: false })
    .limit(500);

  if (error) {
    console.error("failed to load used submissions", error);
    return [];
  }
  return data ?? [];
}

export default async function UsedLogPage() {
  const [submissions, { parts, inventoryParts }] = await Promise.all([
    loadSubmissions(),
    loadParts(),
  ]);

  return (
    <div>
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Parts used log</h1>
        <p className="mt-1 text-sm text-slate-500">
          This week&apos;s submissions are shown below. Older entries are grouped by month.
        </p>
      </header>

      <div className="mt-6">
        <SubmissionsTable
          submissions={submissions}
          formType="used"
          groupByPeriod
          parts={parts}
          inventoryParts={inventoryParts}
        />
      </div>
    </div>
  );
}
