"use client";

import { useEffect, useState } from "react";
import { MapPin, Package, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn, formatNumber, formatDate } from "@/lib/utils";
import { getStockStatus } from "@/lib/inventory/stock-status";
import type { InventoryPart, PartVariant } from "@/lib/supabase/types";

interface Props {
  part: InventoryPart;
  onClose: () => void;
  adminMode?: boolean;
  onEdit?: (skapsNumber: string) => void;
}

function DetailField({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div>
      <dt className="text-xs font-medium tracking-wider text-slate-400 uppercase">{label}</dt>
      <dd className="mt-0.5 text-sm break-words text-slate-800">{String(value)}</dd>
    </div>
  );
}

/** Tab label: prefer lwhsdesc, fall back to zone, then "Location N". */
function variantLabel(v: PartVariant, idx: number): string {
  return v.lwhsdesc?.trim() || v.zone?.trim() || `Location ${idx + 1}`;
}

export function PartDetailModal({ part, onClose, adminMode, onEdit }: Props) {
  const qty = part.quantity_on_hand ?? 0;
  const { tone: stockTone, label: stockLabel } = getStockStatus(part);

  // Determine which source to use for location data.
  // If variants are loaded use them; otherwise fall back to view fields on part.
  const variants = part.variants;
  const hasVariants = variants.length > 0;

  const [activeIdx, setActiveIdx] = useState(0);

  // The "active location" — either the selected variant or synthesised from
  // the view's primary-variant columns.
  const activeLocation: Omit<
    PartVariant,
    | "id"
    | "part_id"
    | "created_at"
    | "updated_at"
    | "source_sheet"
    | "external_row_id"
    | "sort_order"
  > = hasVariants
    ? (variants[activeIdx] ?? variants[0])
    : {
        lwhsdesc: part.lwhsdesc,
        zone: part.zone,
        location: part.location,
        storage_location: part.storage_location,
        location_on_machine: part.location_on_machine,
        line_no: part.line_no,
      };

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-label={`Details for ${part.name}`}
      onClick={onClose}
    >
      <div
        className="relative flex w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
        style={{ maxHeight: "90vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-10 rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="overflow-y-auto">
          {/* Top section: image + shared identity */}
          <div className="flex gap-5 border-b border-slate-100 p-5">
            <div className="flex h-32 w-32 flex-shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
              {part.image_url ? (
                <img
                  src={part.image_url}
                  alt={part.name ?? ""}
                  className="h-full w-full rounded-lg object-contain"
                />
              ) : (
                <Package className="h-12 w-12 text-slate-300" />
              )}
            </div>

            <div className="min-w-0 flex-1 pt-1">
              <h2 className="font-mono text-xl leading-tight font-bold text-slate-900">
                {part.skaps_number}
              </h2>
              <p className="mt-1 text-sm text-slate-500">{part.name}</p>
              {part.description && (
                <p className="mt-1.5 text-sm leading-snug text-slate-600">{part.description}</p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge tone={stockTone}>{stockLabel}</Badge>
                <span className="text-sm font-medium text-slate-700">
                  Qty: <span className="font-semibold">{formatNumber(qty)}</span>
                  {part.unit && part.unit !== "each" && (
                    <span className="ml-1 text-slate-400">{part.unit}</span>
                  )}
                </span>
                {part.category && <Badge tone="accent">{part.category}</Badge>}
              </div>
            </div>
          </div>

          {/* Warehouse / location tab bar — only shown when there are ≥2 variants */}
          {hasVariants && variants.length > 1 && (
            <div className="border-b border-slate-100 bg-slate-50 px-5">
              <div className="flex items-center gap-1 overflow-x-auto py-2" role="tablist">
                <MapPin className="mr-1 h-3.5 w-3.5 flex-shrink-0 text-slate-400" aria-hidden />
                {variants.map((v, idx) => (
                  <button
                    key={v.id}
                    role="tab"
                    aria-selected={idx === activeIdx}
                    type="button"
                    onClick={() => setActiveIdx(idx)}
                    className={cn(
                      "flex-shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                      idx === activeIdx
                        ? "bg-blue-700 text-white"
                        : "text-slate-600 hover:bg-slate-200",
                    )}
                  >
                    {variantLabel(v, idx)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Detail grid */}
          <div className="p-5">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
              {/* Shared fields */}
              <DetailField label="Category" value={part.category} />
              <DetailField label="Sub-Category" value={part.sub_category} />
              <DetailField label="Size" value={part.size} />
              <DetailField label="Belt Type" value={part.belt_type} />
              <DetailField label="Vendor" value={part.vendor_names} />
              <DetailField label="Unit" value={part.unit} />
              <DetailField label="Reorder at" value={part.reorder_threshold} />
              <DetailField label="Used (last 30d)" value={part.used_last_30d} />

              {/* Location-specific fields (from active variant / primary view row) */}
              {(activeLocation.lwhsdesc ||
                activeLocation.zone ||
                activeLocation.location ||
                activeLocation.storage_location ||
                activeLocation.location_on_machine ||
                activeLocation.line_no) && (
                <>
                  <div className="col-span-2 mt-2 border-t border-slate-100 pt-3">
                    <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
                      {hasVariants && variants.length > 1
                        ? `Warehouse: ${variantLabel(variants[activeIdx], activeIdx)}`
                        : "Location"}
                    </p>
                  </div>
                  <DetailField label="Warehouse" value={activeLocation.lwhsdesc} />
                  <DetailField label="Zone" value={activeLocation.zone} />
                  <DetailField label="Location" value={activeLocation.location} />
                  <DetailField label="Storage Location" value={activeLocation.storage_location} />
                  <DetailField
                    label="Location on Machine"
                    value={activeLocation.location_on_machine}
                  />
                  <DetailField label="Line No." value={activeLocation.line_no} />
                </>
              )}

              <DetailField label="Last Updated" value={formatDate(part.updated_at)} />
              {part.notes && (
                <div className="col-span-2">
                  <dt className="text-xs font-medium tracking-wider text-slate-400 uppercase">
                    Notes
                  </dt>
                  <dd className="mt-0.5 text-sm text-slate-800">{part.notes}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        {/* Footer */}
        {adminMode && part.skaps_number && onEdit && (
          <div className="flex justify-end border-t border-slate-100 px-5 py-3">
            <button
              type="button"
              onClick={() => {
                onEdit(part.skaps_number!);
                onClose();
              }}
              className="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-800"
            >
              Edit part
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
