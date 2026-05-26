import { SubmissionsTable } from "@/components/admin/SubmissionsTable";
import { createClient } from "@/lib/supabase/server";
import type { Submission } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

async function loadSubmissions(): Promise<Submission[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("submissions")
    .select("*")
    .eq("form_type", "request")
    .order("submitted_at", { ascending: false })
    .limit(500);

  if (error) {
    console.error("failed to load request submissions", error);
    return [];
  }
  return data ?? [];
}

export default async function RequestsLogPage() {
  const submissions = await loadSubmissions();

  return (
    <div>
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Parts request log
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Most recent 500 parts-request submissions, newest first.
        </p>
      </header>

      <div className="mt-6">
        <SubmissionsTable submissions={submissions} formType="request" />
      </div>
    </div>
  );
}
