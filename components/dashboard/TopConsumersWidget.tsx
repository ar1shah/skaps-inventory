import { TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { TopConsumersChartClient } from "./TopConsumersChartClient";

const TOP_N = 8;

export async function TopConsumersWidget() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("public_inventory")
    .select("skaps_number, name, used_last_30d")
    .gt("used_last_30d", 0)
    .order("used_last_30d", { ascending: false })
    .limit(TOP_N);

  if (error) {
    console.error("failed to load top consumers", error);
  }

  const series = (data ?? []).map((row) => ({
    label: row.skaps_number ?? row.name ?? "Unknown part",
    value: row.used_last_30d ?? 0,
  }));

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Top consumers</h3>
            <p className="mt-0.5 text-xs text-slate-500">Highest usage in the last 30 days</p>
          </div>
          <div className="rounded-md bg-blue-50 p-2 text-blue-700">
            <TrendingUp className="h-4 w-4" />
          </div>
        </div>

        {series.length === 0 ? (
          <p className="mt-6 text-xs text-slate-500">No usage recorded in the last 30 days.</p>
        ) : (
          <div className="mt-4 h-72">
            <TopConsumersChartClient data={series} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
