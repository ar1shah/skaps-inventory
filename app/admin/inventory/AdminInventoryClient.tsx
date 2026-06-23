"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { InventoryTileGrid } from "@/components/inventory/InventoryTileGrid";
import { PartForm } from "@/components/inventory/PartForm";
import { Button } from "@/components/ui/button";
import { deletePart, updatePart } from "./actions";
import type { InventoryPart, Part } from "@/lib/supabase/types";

interface Props {
  parts: Part[];
  inventoryParts: InventoryPart[];
}

export function AdminInventoryClient({ parts, inventoryParts }: Props) {
  const [editing, setEditing] = useState<Part | null>(null);
  const [pending, startTransition] = useTransition();

  function handleEdit(skapsNumber: string) {
    const part = parts.find((p) => p.skaps_number === skapsNumber);
    if (part) setEditing(part);
  }

  function handleDelete(skapsNumber: string) {
    const part = parts.find((p) => p.skaps_number === skapsNumber);
    if (!part) return;
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
      <InventoryTileGrid
        parts={inventoryParts}
        adminMode
        onEdit={handleEdit}
      />

      {editing && (
        <EditPartModal
          part={editing}
          onClose={() => setEditing(null)}
          onDelete={() => {
            handleDelete(editing.skaps_number);
            setEditing(null);
          }}
          pending={pending}
        />
      )}
    </div>
  );
}

function EditPartModal({
  part,
  onClose,
  onDelete,
  pending,
}: {
  part: Part;
  onClose: () => void;
  onDelete: () => void;
  pending: boolean;
}) {
  const boundAction = updatePart.bind(null, part.id);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-6"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
        style={{ maxHeight: "90vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-shrink-0 items-start justify-between border-b border-slate-100 p-5">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Edit part</h2>
            <p className="text-sm text-slate-500">
              {part.skaps_number} &middot; {part.name}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={onDelete}
              className="text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              Delete
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
        <div className="overflow-y-auto p-5">
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
