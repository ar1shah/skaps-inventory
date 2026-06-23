"use client";

import { useMemo, useState } from "react";
import { Filter, Package, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { PartTileCard } from "./PartTileCard";
import { PartDetailModal } from "./PartDetailModal";
import type { InventoryPart } from "@/lib/supabase/types";

interface Props {
  parts: InventoryPart[];
  adminMode?: boolean;
  onEdit?: (skapsNumber: string) => void;
}

type StockFilter = "all" | "in_stock" | "low_stock" | "out_of_stock";

export function InventoryTileGrid({ parts, adminMode = false, onEdit }: Props) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [selected, setSelected] = useState<InventoryPart | null>(null);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const p of parts) {
      if (p.category) set.add(p.category);
    }
    return Array.from(set).sort();
  }, [parts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return parts.filter((part) => {
      if (q) {
        // Search across shared fields + all variant location fields.
        const sharedHaystack = [
          part.skaps_number,
          part.name,
          part.description,
          part.category,
          part.sub_category,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        const variantHaystack = part.variants
          .flatMap((v) => [
            v.lwhsdesc,
            v.zone,
            v.location,
            v.storage_location,
            v.location_on_machine,
            v.line_no,
          ])
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        // Also search primary view fields for parts with no variants yet.
        const primaryHaystack = [
          part.lwhsdesc,
          part.zone,
          part.location,
          part.storage_location,
          part.location_on_machine,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        const full = `${sharedHaystack} ${variantHaystack} ${primaryHaystack}`;
        if (!full.includes(q)) return false;
      }

      if (category && part.category !== category) return false;

      const qty = part.quantity_on_hand ?? 0;
      const threshold = part.reorder_threshold;
      if (stockFilter === "in_stock" && qty <= 0) return false;
      if (stockFilter === "out_of_stock" && qty > 0) return false;
      if (stockFilter === "low_stock") {
        if (threshold === null || threshold === undefined) return false;
        if (qty > threshold) return false;
      }
      return true;
    });
  }, [parts, query, category, stockFilter]);

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
            placeholder="Search by SKAPS #, name, location…"
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Filter className="h-4 w-4 text-slate-400" aria-hidden />
          {(
            [
              ["all", "All"],
              ["in_stock", "In stock"],
              ["low_stock", "Low stock"],
              ["out_of_stock", "Out of stock"],
            ] as Array<[StockFilter, string]>
          ).map(([value, label]) => (
            <FilterChip
              key={value}
              active={stockFilter === value}
              onClick={() => setStockFilter(value)}
              label={label}
            />
          ))}

          {categories.length > 0 && (
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
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

      <p className="mt-3 text-xs text-slate-500">
        Showing {filtered.length.toLocaleString()} of {parts.length.toLocaleString()} parts
      </p>

      {parts.length === 0 ? (
        <EmptyState />
      ) : filtered.length === 0 ? (
        <NoMatchesState />
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {filtered.map((part) => (
            <PartTileCard
              key={part.skaps_number ?? part.name}
              part={part}
              onClick={() => setSelected(part)}
            />
          ))}
        </div>
      )}

      {selected && (
        <PartDetailModal
          part={selected}
          onClose={() => setSelected(null)}
          adminMode={adminMode}
          onEdit={onEdit}
        />
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

function EmptyState() {
  return (
    <Card className="mt-6">
      <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
        <Package className="h-8 w-8 text-slate-400" />
        <div>
          <p className="font-medium text-slate-900">No parts in the inventory yet</p>
          <p className="mt-1 text-sm text-slate-600">
            Run the master list import or add parts manually from the admin panel.
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
