import { ClipboardCheck } from "lucide-react";
import { WidgetCard } from "./WidgetCard";
import { createClient } from "@/lib/supabase/server";
import { dayRange } from "@/lib/inventory/stock";
import { formatNumber } from "@/lib/utils";

export async function ConsumedTodayWidget() {
  const { start, end } = dayRange(0);
  const supabase = await createClient();

  const { data, count, error } = await supabase
    .from("submissions")
    .select("skaps_number, part_description, quantity, line, machine_area, pm_type", {
      count: "exact",
    })
    .eq("form_type", "used")
    .gte("submitted_at", start)
    .lt("submitted_at", end)
    .order("submitted_at", { ascending: false })
    .limit(5);

  if (error) {
    console.error("failed to load today's used submissions", error);
  }

  // `count` reflects every row today; `data` is capped at 5, so total qty
  // needs its own head-less sum query to stay accurate once there are more
  // than 5 submissions in a day.
  const { data: qtyRows, error: qtyError } = await supabase
    .from("submissions")
    .select("quantity")
    .eq("form_type", "used")
    .gte("submitted_at", start)
    .lt("submitted_at", end);

  if (qtyError) {
    console.error("failed to sum today's used quantity", qtyError);
  }

  const totalQty = (qtyRows ?? []).reduce(
    (sum, row) => sum + (typeof row.quantity === "number" ? row.quantity : 0),
    0,
  );

  return (
    <WidgetCard
      title="Parts consumed today"
      description="Used-form submissions"
      icon={<ClipboardCheck className="h-4 w-4" />}
      href="/admin/used"
    >
      <div className="flex items-baseline gap-3">
        <span className="text-3xl font-semibold text-slate-900">{formatNumber(count ?? 0)}</span>
        <span className="text-xs text-slate-500">
          {formatNumber(totalQty)} total qty
        </span>
      </div>

      {data && data.length > 0 ? (
        <ul className="mt-3 space-y-1.5">
          {data.slice(0, 3).map((row, idx) => (
            <li key={idx} className="flex items-baseline justify-between text-xs text-slate-600">
              <span className="truncate">
                <span className="font-mono text-slate-500">{row.skaps_number ?? "?"}</span>
                <span className="mx-1.5 text-slate-300">&middot;</span>
                <span>{row.part_description ?? "(no description)"}</span>
              </span>
              <span className="ml-2 shrink-0 font-medium text-slate-900">
                {formatNumber(row.quantity ?? 0)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-xs text-slate-500">No usage logged today.</p>
      )}
    </WidgetCard>
  );
}
