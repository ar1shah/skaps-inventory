"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { InventoryTileGrid } from "@/components/inventory/InventoryTileGrid";
import { EditPartModal } from "@/components/inventory/EditPartModal";
import { deletePart } from "./actions";
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
      <InventoryTileGrid parts={inventoryParts} adminMode onEdit={handleEdit} />

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
