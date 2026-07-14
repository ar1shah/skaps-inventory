"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { CheckCircle2, Download, Pencil, Search, Trash2, Undo2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { RequestItemForm } from "@/components/requests/RequestItemForm";
import { cn, formatDateTime, formatNumber } from "@/lib/utils";
import { urgencyTone } from "@/lib/forms/normalize";
import {
  deleteRequestSubmission,
  markRequestComplete,
  markRequestRequested,
  updateRequestSubmission,
} from "./actions";
import type { Submission } from "@/lib/supabase/types";

type StatusFilter = "open" | "closed" | "all";

interface Props {
  submissions: Submission[];
}

export function RequestsListClient({ submissions }: Props) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("open");
  const [editing, setEditing] = useState<Submission | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return submissions.filter((row) => {
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (q) {
        const blob = [
          row.skaps_number,
          row.part_description,
          row.employee_name,
          row.line,
          row.machine_area,
          row.urgency,
          row.notes,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [submissions, query, statusFilter]);

  const requestedCount = submissions.filter((s) => s.status !== "closed").length;

  function handleMarkComplete(row: Submission) {
    if (!confirm(`Mark "${row.part_description ?? "this request"}" as complete?`)) return;
    startTransition(async () => {
      try {
        await markRequestComplete(row.id);
        toast.success("Marked as complete");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to update status");
      }
    });
  }

  function handleMarkRequested(row: Submission) {
    if (!confirm(`Mark "${row.part_description ?? "this request"}" as requested again?`)) return;
    startTransition(async () => {
      try {
        await markRequestRequested(row.id);
        toast.success("Marked as requested");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to update status");
      }
    });
  }

  function handleDelete(row: Submission) {
    if (!confirm(`Delete request for "${row.part_description ?? "this item"}"? This cannot be undone.`))
      return;
    startTransition(async () => {
      try {
        await deleteRequestSubmission(row.id);
        toast.success("Request deleted");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Delete failed");
      }
    });
  }

  function downloadCsv() {
    const columns: Array<{ key: keyof Submission; label: string }> = [
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
    a.download = `requests-log-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search SKAPS #, part, employee, notes..."
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="sm" onClick={downloadCsv}>
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            ["open", "Requested"],
            ["closed", "Complete"],
            ["all", "All"],
          ] as Array<[StatusFilter, string]>
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setStatusFilter(value)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              statusFilter === value
                ? "bg-blue-700 text-white"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
            )}
          >
            {label}
          </button>
        ))}
        <span className="ml-auto text-xs text-slate-500">
          {formatNumber(requestedCount)} requested
        </span>
      </div>

      <p className="text-xs text-slate-500">
        Showing {formatNumber(filtered.length)} of {formatNumber(submissions.length)} requests
      </p>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-slate-500">
            {statusFilter === "open" ? "No open requests." : "No requests match your search."}
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">Submitted</th>
                <th className="px-4 py-3 text-left">Employee</th>
                <th className="px-4 py-3 text-left">Part</th>
                <th className="px-4 py-3 text-right">Qty</th>
                <th className="px-4 py-3 text-left">Line / Area</th>
                <th className="px-4 py-3 text-left">Urgency</th>
                <th className="px-4 py-3 text-left">Notes</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((row) => (
                <tr key={row.id} className="bg-white hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                    {formatDateTime(row.submitted_at)}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{row.employee_name ?? "-"}</td>
                  <td className="px-4 py-3">
                    <p className="font-mono font-medium text-slate-900">
                      {row.skaps_number ?? "-"}
                    </p>
                    {row.part_description && (
                      <p className="text-xs text-slate-500">{row.part_description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700">
                    {row.quantity !== null ? formatNumber(row.quantity) : "-"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {[row.line, row.machine_area].filter(Boolean).join(" / ") || "-"}
                  </td>
                  <td className="px-4 py-3">
                    {row.urgency ? (
                      <Badge tone={urgencyTone(row.urgency)}>{row.urgency}</Badge>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="max-w-[220px] truncate px-4 py-3 text-slate-600" title={row.notes ?? undefined}>
                    {row.notes ?? "-"}
                  </td>
                  <td className="px-4 py-3">
                    {row.status === "closed" ? (
                      <Badge tone="success">Complete</Badge>
                    ) : (
                      <Badge tone="accent">Requested</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {row.status === "closed" ? (
                        <button
                          type="button"
                          title="Mark as requested"
                          disabled={pending}
                          onClick={() => handleMarkRequested(row)}
                          className="rounded p-1 text-slate-400 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-40"
                        >
                          <Undo2 className="h-4 w-4" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          title="Mark as complete"
                          disabled={pending}
                          onClick={() => handleMarkComplete(row)}
                          className="rounded p-1 text-slate-400 hover:bg-green-50 hover:text-green-700 disabled:opacity-40"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        title="Edit"
                        onClick={() => setEditing(row)}
                        className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        title="Delete"
                        disabled={pending}
                        onClick={() => handleDelete(row)}
                        className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-700 disabled:opacity-40"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && <EditRequestModal row={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function EditRequestModal({ row, onClose }: { row: Submission; onClose: () => void }) {
  const boundAction = updateRequestSubmission.bind(null, row.id);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/40 px-4 py-10"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-lg border border-slate-200 bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Edit request</h2>
            <p className="text-sm text-slate-500">{row.part_description ?? "Untitled request"}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
        </div>
        <RequestItemForm
          action={boundAction}
          initial={row}
          submitLabel="Save changes"
          onSuccess={() => {
            toast.success(`Updated "${row.part_description ?? "request"}"`);
            onClose();
          }}
        />
      </div>
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
