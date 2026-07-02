import Link from "next/link";
import { ArrowLeft, CalendarClock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { SubmissionsTable } from "@/components/admin/SubmissionsTable";
import { createClient } from "@/lib/supabase/server";
import { dayRange } from "@/lib/inventory/stock";
import { groupSubmissionsByField, type FieldBreakdown } from "@/lib/inventory/aggregate";
import { cn, formatDate, formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

async function loadYesterdayReport() {
  const supabase = await createClient();
  const yesterday = dayRange(-1);
  const dayBefore = dayRange(-2);

  const [rowsRes, priorCountRes] = await Promise.all([
    supabase
      .from("submissions")
      .select("*")
      .eq("form_type", "used")
      .gte("submitted_at", yesterday.start)
      .lt("submitted_at", yesterday.end)
      .order("submitted_at", { ascending: false }),
    supabase
      .from("submissions")
      .select("id", { count: "exact", head: true })
      .eq("form_type", "used")
      .gte("submitted_at", dayBefore.start)
      .lt("submitted_at", dayBefore.end),
  ]);

  if (rowsRes.error) {
    console.error("failed to load yesterday's submissions", rowsRes.error);
  }
  if (priorCountRes.error) {
    console.error("failed to load day-before-yesterday count", priorCountRes.error);
  }

  const rows = rowsRes.data ?? [];
  const priorCount = priorCountRes.count ?? 0;
  const totalQty = rows.reduce(
    (sum, row) => sum + (typeof row.quantity === "number" ? row.quantity : 0),
    0,
  );

  return {
    yesterdayDate: new Date(yesterday.start),
    rows,
    priorCount,
    totalQty,
    pmTypeBreakdown: groupSubmissionsByField(rows, "pm_type"),
    lineBreakdown: groupSubmissionsByField(rows, "line"),
  };
}

function BreakdownList({ title, items }: { title: string; items: FieldBreakdown[] }) {
  const maxCount = Math.max(1, ...items.map((i) => i.count));

  return (
    <Card>
      <CardContent className="p-5">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {items.length === 0 ? (
          <p className="mt-3 text-xs text-slate-500">No used-form submissions yesterday.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {items.map((item) => (
              <li key={item.label}>
                <div className="flex items-baseline justify-between text-xs">
                  <span className="font-medium text-slate-700">{item.label}</span>
                  <span className="text-slate-500">
                    {formatNumber(item.count)} submission{item.count === 1 ? "" : "s"} &middot;{" "}
                    {formatNumber(item.quantity)} qty
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-blue-600"
                    style={{ width: `${(item.count / maxCount) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export default async function YesterdayReportPage() {
  const { yesterdayDate, rows, priorCount, totalQty, pmTypeBreakdown, lineBreakdown } =
    await loadYesterdayReport();

  const delta = rows.length - priorCount;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to dashboard
        </Link>
        <div className="mt-2 flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-blue-700" />
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Yesterday&apos;s report
          </h1>
        </div>
        <p className="mt-1 text-sm text-slate-500">{formatDate(yesterdayDate)}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium text-slate-500">Used submissions</p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-3xl font-semibold text-slate-900">
                {formatNumber(rows.length)}
              </span>
              <span
                className={cn(
                  "text-xs font-medium",
                  delta > 0 ? "text-amber-700" : delta < 0 ? "text-green-700" : "text-slate-500",
                )}
              >
                {delta === 0
                  ? "no change vs prior day"
                  : delta > 0
                    ? `+${delta} vs prior day`
                    : `${delta} vs prior day`}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium text-slate-500">Total quantity used</p>
            <span className="mt-1 block text-3xl font-semibold text-slate-900">
              {formatNumber(totalQty)}
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium text-slate-500">Day before yesterday</p>
            <span className="mt-1 block text-3xl font-semibold text-slate-900">
              {formatNumber(priorCount)}
            </span>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <BreakdownList title="By PM type" items={pmTypeBreakdown} />
        <BreakdownList title="By line" items={lineBreakdown} />
      </div>

      <div>
        <h2 className="text-sm font-semibold text-slate-900">All submissions</h2>
        <div className="mt-3">
          <SubmissionsTable submissions={rows} formType="used" />
        </div>
      </div>
    </div>
  );
}
