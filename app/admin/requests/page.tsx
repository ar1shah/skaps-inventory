import { RequestsListClient } from "./RequestsListClient";
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
          Parts requests
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Track and manage parts requests -- mark them complete, add notes, or edit details.
        </p>
      </header>

      <div className="mt-6">
        <RequestsListClient submissions={submissions} />
      </div>
    </div>
  );
}
