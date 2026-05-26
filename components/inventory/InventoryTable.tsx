"use client";

import { useMemo, useState } from "react";
import { Filter, Package, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn, formatNumber } from "@/lib/utils";
import type { PublicInventoryRow } from "@/lib/supabase/types";

interface Props {
  rows: PublicInventoryRow[];
  /** Show admin-only columns and actions */
  adminMode?: boolean;
  onEdit?: (skapsNumber: string) => void;
}

type StockFilter = "all" | "in_stock" | "low_stock" | "out_of_stock";

export function InventoryTable({ rows, adminMode = false, onEdit }: Props) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) {
      if (r.category) set.add(r.category);
    }
    return Array.from(set).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (q) {
        const haystack = [row.skaps_number, row.name, row.location, row.category]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (category && row.category !== category) return false;

      const qty = row.quantity_on_hand ?? 0;
      const threshold = row.reorder_threshold;
      if (stockFilter === "in_stock" && qty <= 0) return false;
      if (stockFilter === "out_of_stock" && qty > 0) return false;
      if (stockFilter === "low_stock") {
        if (threshold === null || threshold === undefined) return false;
        if (qty > threshold) return false;
      }
      return true;
    });
  }, [rows, query, category, stockFilter]);

  return (
    <div>
      {/* Filter bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-md">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by SKAPS #, name, or location"
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Filter className="h-4 w-4 text-slate-400" aria-hidden />
          <FilterChip
            active={stockFilter === "all"}
            onClick={() => setStockFilter("all")}
            label="All"
          />
          <FilterChip
            active={stockFilter === "in_stock"}
            onClick={() => setStockFilter("in_stock")}
            label="In stock"
          />
          <FilterChip
            active={stockFilter === "low_stock"}
            onClick={() => setStockFilter("low_stock")}
            label="Low stock"
          />
          <FilterChip
            active={stockFilter === "out_of_stock"}
            onClick={() => setStockFilter("out_of_stock")}
            label="Out of stock"
          />

          {categories.length > 0 && (
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700"
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Result count + table */}
      <div className="mt-4 text-xs text-slate-500">
        Showing {formatNumber(filtered.length)} of {formatNumber(rows.length)} parts
      </div>

      {rows.length === 0 ? (
        <EmptyState />
      ) : filtered.length === 0 ? (
        <NoMatchesState />
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
                  <th className="px-4 py-3 text-right font-medium">Used (30d)</th>
                  {adminMode && <th className="px-4 py-3 font-medium">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((row) => (
                  <Row key={row.skaps_number ?? row.name} row={row} adminMode={adminMode} onEdit={onEdit} />
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "bg-blue-700 text-white"
          : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
      )}
    >
      {label}
    </button>
  );
}

function Row({
  row,
  adminMode,
  onEdit,
}: {
  row: PublicInventoryRow;
  adminMode: boolean;
  onEdit?: (skapsNumber: string) => void;
}) {
  const qty = row.quantity_on_hand ?? 0;
  const threshold = row.reorder_threshold;
  const tone =
    qty <= 0
      ? "danger"
      : threshold !== null && threshold !== undefined && qty <= threshold
        ? "warning"
        : "success";

  return (
    <tr className="hover:bg-slate-50/60">
      <td className="px-4 py-3 font-mono text-xs text-slate-700">{row.skaps_number}</td>
      <td className="px-4 py-3 font-medium text-slate-900">{row.name}</td>
      <td className="px-4 py-3 text-slate-600">{row.category ?? "-"}</td>
      <td className="px-4 py-3 text-slate-600">{row.location ?? "-"}</td>
      <td className="px-4 py-3 text-right">
        <Badge tone={tone}>{formatNumber(qty)}</Badge>
      </td>
      <td className="px-4 py-3 text-right text-slate-700">
        {formatNumber(row.used_last_30d ?? 0)}
      </td>
      {adminMode && (
        <td className="px-4 py-3">
          <button
            type="button"
            onClick={() => row.skaps_number && onEdit?.(row.skaps_number)}
            className="text-xs font-medium text-blue-700 hover:underline"
          >
            Edit
          </button>
        </td>
      )}
    </tr>
  );
}

function EmptyState() {
  return (
    <Card className="mt-6">
      <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
        <Package className="h-8 w-8 text-slate-400" />
        <div>
          <p className="font-medium text-slate-900">No parts have been added yet</p>
          <p className="mt-1 text-sm text-slate-600">
            An admin needs to add inventory before it shows up here. Sign in
            and head to <span className="font-mono text-xs">/admin/inventory</span> to get
            started.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function NoMatchesState() {
  return (
    <Card className="mt-3">
      <CardContent className="py-10 text-center">
        <p className="text-sm font-medium text-slate-900">No parts match your filters</p>
        <p className="mt-1 text-xs text-slate-500">Try clearing the search or filter chips.</p>
      </CardContent>
    </Card>
  );
}
