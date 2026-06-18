import { Wrench } from "lucide-react";
import { WidgetCard } from "./WidgetCard";
import { createClient } from "@/lib/supabase/server";
import { formatNumber } from "@/lib/utils";

export async function PartsInRepairWidget() {
  const supabase = await createClient();

  const { data, count } = await supabase
    .from("parts_in_repair")
    .select("id, part_name, skaps_number, quantity, expected_return_at", { count: "exact" })
    .eq("status", "in_repair")
    .order("sent_at", { ascending: false })
    .limit(3);

  const now = new Date();
  const overdueCount = (data ?? []).filter(
    (item) => item.expected_return_at && new Date(item.expected_return_at) < now,
  ).length;

  return (
    <WidgetCard
      title="Parts in repair"
      description="Sent for external repair"
      icon={<Wrench className="h-4 w-4" />}
      href="/admin/repair"
    >
      <div className="flex items-baseline gap-3">
        <span className="text-3xl font-semibold text-slate-900">{formatNumber(count ?? 0)}</span>
        {overdueCount > 0 && (
          <span className="text-xs font-medium text-amber-600">
            {formatNumber(overdueCount)} overdue
          </span>
        )}
      </div>

      {data && data.length > 0 ? (
        <ul className="mt-3 space-y-1.5">
          {data.map((item) => (
            <li
              key={item.id}
              className="flex items-baseline justify-between text-xs text-slate-600"
            >
              <span className="truncate">
                {item.skaps_number && (
                  <span className="font-mono text-slate-500">{item.skaps_number}</span>
                )}
                {item.skaps_number && (
                  <span className="mx-1.5 text-slate-300">&middot;</span>
                )}
                <span>{item.part_name}</span>
              </span>
              <span className="ml-2 shrink-0 font-medium text-slate-900">
                {formatNumber(item.quantity)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-xs text-slate-500">No parts currently in repair.</p>
      )}
    </WidgetCard>
  );
}
