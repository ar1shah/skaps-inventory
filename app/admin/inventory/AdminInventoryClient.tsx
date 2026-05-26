"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Filter, Pencil, Search, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PartForm } from "@/components/inventory/PartForm";
import { cn, formatDate, formatNumber } from "@/lib/utils";
import { deletePart, updatePart } from "./actions";
import type { Part } from "@/lib/supabase/types";

type StockFilter = "all" | "in_stock" | "low_stock" | "out_of_stock";

interface Props {
  parts: Part[];
}

export function AdminInventoryClient({ parts }: Props) {
  const [query, setQuery] = useState("");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [editing, setEditing] = useState<Part | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return parts.filter((p) => {
      if (q) {
        const blob = [p.skaps_number, p.name, p.category, p.location].filter(Boolean).join(" ").toLowerCase();
        if (!blob.includes(q)) return false;
      }
      if (stockFilter === "in_stock" && p.current_quantity <= 0) return false;
      if (stockFilter === "out_of_stock" && p.current_quantity > 0) return false;
      if (stockFilter === "low_stock") {
        if (p.reorder_threshold === null || p.reorder_threshold === undefined) return false;
        if (p.current_quantity > p.reorder_threshold) return false;
      }
      return true;
    });
  }, [parts, query, stockFilter]);

  function handleDelete(part: Part) {
    if (!confirm(`Delete part ${part.skaps_number} (${part.name})? This cannot be undone.`)) {
      return;
    }
    startTransition(async () => {
      try {
        await deletePart(part.id);
        toast.success(`Deleted ${part.skaps_number}`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Delete failed");
      }
    });
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by SKAPS #, name, category, location"
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Filter className="h-4 w-4 text-slate-400" />
          {(
            [
              ["all", "All"],
              ["in_stock", "In stock"],
              ["low_stock", "Low"],
              ["out_of_stock", "Out"],
            ] as Array<[StockFilter, string]>
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setStockFilter(value)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                stockFilter === value
                  ? "bg-blue-700 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-500">
        Showing {formatNumber(filtered.length)} of {formatNumber(parts.length)} parts
      </p>

      {parts.length === 0 ? (
        <Card className="mt-6">
          <CardContent className="py-12 text-center text-sm text-slate-600">
            No parts yet. Click <span className="font-semibold">Add part</span> to add your first one.
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="mt-3">
          <CardContent className="py-10 text-center text-sm text-slate-500">
            No parts match your filters.
          </CardContent>
        </Card>
      ) : (
        <Card className="mt-3 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/60 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">SKAPS #</th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Location</th>
                  <th className="px-4 py-3 text-right font-medium">In stock</th>
                  <th className="px-4 py-3 text-right font-medium">Reorder at</th>
                  <th className="px-4 py-3 font-medium">Updated</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((part) => {
                  const tone =
                    part.current_quantity <= 0
                      ? "danger"
                      : part.reorder_threshold !== null &&
                          part.current_quantity <= part.reorder_threshold
                        ? "warning"
                        : "success";
                  return (
                    <tr key={part.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3 font-mono text-xs text-slate-700">
                        {part.skaps_number}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">{part.name}</td>
                      <td className="px-4 py-3 text-slate-600">{part.category ?? "-"}</td>
                      <td className="px-4 py-3 text-slate-600">{part.location ?? "-"}</td>
                      <td className="px-4 py-3 text-right">
                        <Badge tone={tone}>{formatNumber(part.current_quantity)}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {part.reorder_threshold !== null ? formatNumber(part.reorder_threshold) : "-"}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {formatDate(part.updated_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditing(part)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={pending}
                            onClick={() => handleDelete(part)}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-red-600" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {editing && (
        <EditPartModal
          part={editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function EditPartModal({ part, onClose }: { part: Part; onClose: () => void }) {
  const boundAction = updatePart.bind(null, part.id);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Edit part</h2>
            <p className="text-sm text-slate-500">
              {part.skaps_number} &middot; {part.name}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
        </div>
        <div className="mt-4">
          <PartForm
            action={boundAction}
            initial={part}
            submitLabel="Save changes"
            onSuccess={() => {
              toast.success(`Updated ${part.skaps_number}`);
              onClose();
            }}
          />
        </div>
      </div>
    </div>
  );
}
