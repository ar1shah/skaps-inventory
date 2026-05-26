import { CalendarClock } from "lucide-react";
import { WidgetCard } from "./WidgetCard";
import { createClient } from "@/lib/supabase/server";
import { dayRange } from "@/lib/inventory/stock";
import { cn, formatNumber } from "@/lib/utils";

export async function YesterdayReportWidget() {
  const yesterday = dayRange(-1);
  const today = dayRange(0);
  const supabase = await createClient();

  const [yest, tod] = await Promise.all([
    supabase
      .from("submissions")
      .select("id", { count: "exact", head: true })
      .eq("form_type", "used")
      .gte("submitted_at", yesterday.start)
      .lt("submitted_at", yesterday.end),
    supabase
      .from("submissions")
      .select("id", { count: "exact", head: true })
      .eq("form_type", "used")
      .gte("submitted_at", today.start)
      .lt("submitted_at", today.end),
  ]);

  const yCount = yest.count ?? 0;
  const tCount = tod.count ?? 0;
  const delta = tCount - yCount;

  return (
    <WidgetCard
      title="Yesterday report"
      description="Yesterday vs today (used-form count)"
      icon={<CalendarClock className="h-4 w-4" />}
      href="/admin/used"
    >
      <div className="flex items-baseline gap-3">
        <span className="text-3xl font-semibold text-slate-900">{formatNumber(yCount)}</span>
        <span
          className={cn(
            "text-xs font-medium",
            delta > 0 ? "text-amber-700" : delta < 0 ? "text-green-700" : "text-slate-500",
          )}
        >
          {delta === 0 ? "no change" : delta > 0 ? `+${delta} today` : `${delta} today`}
        </span>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        Open the full log to see each submission and its PM type.
      </p>
    </WidgetCard>
  );
}
