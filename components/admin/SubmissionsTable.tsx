"use client";

import { useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDateTime, formatNumber } from "@/lib/utils";
import type { Submission } from "@/lib/supabase/types";

interface Props {
  submissions: Submission[];
  /** "used" or "request" -- controls which columns are shown. */
  formType: "used" | "request";
}

export function SubmissionsTable({ submissions, formType }: Props) {
  const [query, setQuery] = useState("");
  const [showNeedsReview, setShowNeedsReview] = useState(false);

  const needsReviewCount = useMemo(
    () => submissions.filter((s) => s.status === "needs_review").length,
    [submissions],
  );

  const filtered = useMemo(() => {
    let list = showNeedsReview
      ? submissions.filter((s) => s.status === "needs_review")
      : submissions;
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((row) => {
      const blob = [
        row.skaps_number,
        row.part_description,
        row.employee_name,
        row.line,
        row.machine_area,
        row.pm_type,
        row.urgency,
        row.notes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return blob.includes(q);
    });
  }, [submissions, query, showNeedsReview]);

  function downloadCsv() {
    const columns: Array<{ key: keyof Submission; label: string }> =
      formType === "used"
        ? [
            { key: "submitted_at", label: "Submitted" },
            { key: "employee_name", label: "Employee" },
            { key: "skaps_number", label: "SKAPS #" },
            { key: "part_description", label: "Part" },
            { key: "quantity", label: "Quantity" },
            { key: "line", label: "Line" },
            { key: "machine_area", label: "Machine area" },
            { key: "pm_type", label: "PM type" },
            { key: "notes", label: "Notes" },
          ]
        : [
            { key: "submitted_at", label: "Submitted" },
            { key: "employee_name", label: "Employee" },
            { key: "skaps_number", label: "SKAPS #" },
            { key: "part_description", label: "Part" },
            { key: "quantity", label: "Quantity" },
            { key: "urgency", label: "Urgency" },
            { key: "line", label: "Line" },
            { key: "machine_area", label: "Machine area" },
            { key: "notes", label: "Notes" },
            { key: "status", label: "Status" },
          ];

    const lines = [columns.map((c) => csvEscape(c.label)).join(",")];
    for (const row of filtered) {
      lines.push(columns.map((c) => csvEscape(row[c.key])).join(","));
    }

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${formType}-log-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search SKAPS #, part, employee..."
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          {formType === "used" && needsReviewCount > 0 && (
            <button
              type="button"
              onClick={() => setShowNeedsReview((v) => !v)}
              className={
                showNeedsReview
                  ? "rounded-full bg-amber-500 px-3 py-1 text-xs font-medium text-white"
                  : "rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100"
              }
            >
              Needs review ({needsReviewCount})
            </button>
          )}
          <Button variant="outline" size="sm" onClick={downloadCsv}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-500">
        Showing {formatNumber(filtered.length)} of {formatNumber(submissions.length)} submissions
      </p>

      {filtered.length === 0 ? (
        <Card className="mt-3">
          <CardContent className="py-10 text-center text-sm text-slate-500">
            No submissions match your search.
          </CardContent>
        </Card>
      ) : (
        <Card className="mt-3 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/60 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Submitted</th>
                  <th className="px-4 py-3 font-medium">Employee</th>
                  <th className="px-4 py-3 font-medium">SKAPS #</th>
                  <th className="px-4 py-3 font-medium">Part</th>
                  <th className="px-4 py-3 text-right font-medium">Qty</th>
                  <th className="px-4 py-3 font-medium">Line</th>
                  <th className="px-4 py-3 font-medium">Machine</th>
                  {formType === "used" ? (
                    <th className="px-4 py-3 font-medium">PM type</th>
                  ) : (
                    <th className="px-4 py-3 font-medium">Urgency</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((row) => (
                  <tr
                    key={row.id}
                    className={
                      row.status === "needs_review"
                        ? "bg-amber-50/60 hover:bg-amber-50"
                        : "hover:bg-slate-50/60"
                    }
                  >
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {formatDateTime(row.submitted_at)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{row.employee_name ?? "-"}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span className="font-mono text-xs text-slate-700">
                          {row.skaps_number ?? "-"}
                        </span>
                        {row.status === "needs_review" && (
                          <Badge tone="warning" className="w-fit text-[10px]">
                            Needs review
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {row.part_description ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {row.quantity !== null ? formatNumber(row.quantity) : "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{row.line ?? "-"}</td>
                    <td className="px-4 py-3 text-slate-600">{row.machine_area ?? "-"}</td>
                    {formType === "used" ? (
                      <td className="px-4 py-3 text-slate-600">{row.pm_type ?? "-"}</td>
                    ) : (
                      <td className="px-4 py-3">
                        {row.urgency ? (
                          <Badge
                            tone={
                              row.urgency.toLowerCase().includes("urgent")
                                ? "danger"
                                : "neutral"
                            }
                          >
                            {row.urgency}
                          </Badge>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  let s = String(value);
  if (value instanceof Date) {
    s = value.toISOString();
  }
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    s = `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
