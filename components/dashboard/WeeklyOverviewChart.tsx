import { TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { startOfBusinessDayOffset } from "@/lib/inventory/stock";
import { WeeklyOverviewChartClient } from "./WeeklyOverviewChartClient";

export interface DayPoint {
  date: string;
  label: string;
  used: number;
  requests: number;
}

export async function WeeklyOverviewChart() {
  const supabase = await createClient();
  const start = startOfBusinessDayOffset(-6);

  // Pull the raw rows for the last 7 days then bucket in TS.
  // Postgres-side date_trunc would be faster but doesn't play nicely with
  // business timezone via PostgREST.
  const { data, error } = await supabase
    .from("submissions")
    .select("submitted_at, form_type")
    .gte("submitted_at", start.toISOString());

  if (error) {
    console.error("failed to load weekly overview submissions", error);
  }

  // Day boundaries for each of the 7 buckets, computed once so we can bucket
  // each row by comparing its instant against these ranges (rather than
  // re-deriving a "key" from the row's own timestamp, which is fragile
  // around DST).
  const dayStarts: Date[] = [];
  for (let i = 0; i < 8; i++) {
    dayStarts.push(startOfBusinessDayOffset(-6 + i));
  }

  const buckets: DayPoint[] = [];
  for (let i = 0; i < 7; i++) {
    const d = dayStarts[i];
    buckets.push({
      date: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" }),
      used: 0,
      requests: 0,
    });
  }

  for (const row of data ?? []) {
    if (!row.submitted_at) continue;
    const instant = new Date(row.submitted_at).getTime();
    const idx = dayStarts.findIndex(
      (d, i) => instant >= d.getTime() && instant < dayStarts[i + 1]?.getTime(),
    );
    if (idx >= 0 && idx < 7) {
      if (row.form_type === "used") buckets[idx].used += 1;
      else if (row.form_type === "request") buckets[idx].requests += 1;
    }
  }

  // Buckets were built in chronological order already.
  const series = buckets;

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Weekly overview</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Submission count for the last 7 days
            </p>
          </div>
          <div className="rounded-md bg-blue-50 p-2 text-blue-700">
            <TrendingUp className="h-4 w-4" />
          </div>
        </div>

        <div className="mt-4 h-56">
          <WeeklyOverviewChartClient data={series} />
        </div>
      </CardContent>
    </Card>
  );
}
