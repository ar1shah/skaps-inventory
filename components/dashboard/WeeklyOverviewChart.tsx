import { TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { startOfLocalDayOffset } from "@/lib/inventory/stock";
import { WeeklyOverviewChartClient } from "./WeeklyOverviewChartClient";

export interface DayPoint {
  date: string;
  label: string;
  used: number;
  requests: number;
}

export async function WeeklyOverviewChart() {
  const supabase = await createClient();
  const start = startOfLocalDayOffset(-6);

  // Pull the raw rows for the last 7 days then bucket in TS.
  // Postgres-side date_trunc would be faster but doesn't play nicely with
  // local timezone via PostgREST.
  const { data } = await supabase
    .from("submissions")
    .select("submitted_at, form_type")
    .gte("submitted_at", start.toISOString());

  const buckets: Record<string, DayPoint> = {};
  for (let i = 0; i < 7; i++) {
    const d = startOfLocalDayOffset(-6 + i);
    const key = d.toISOString().slice(0, 10);
    buckets[key] = {
      date: key,
      label: d.toLocaleDateString("en-US", { weekday: "short" }),
      used: 0,
      requests: 0,
    };
  }

  for (const row of data ?? []) {
    if (!row.submitted_at) continue;
    const d = new Date(row.submitted_at);
    d.setHours(0, 0, 0, 0);
    const key = d.toISOString().slice(0, 10);
    if (buckets[key]) {
      if (row.form_type === "used") buckets[key].used += 1;
      else if (row.form_type === "request") buckets[key].requests += 1;
    }
  }

  const series = Object.values(buckets).sort((a, b) => a.date.localeCompare(b.date));

  return (
    <Card className="col-span-full lg:col-span-2">
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
