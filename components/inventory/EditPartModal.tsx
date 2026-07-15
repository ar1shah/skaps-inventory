"use client";

import { toast } from "sonner";
import { PartForm } from "@/components/inventory/PartForm";
import { Button } from "@/components/ui/button";
import { updatePart } from "@/app/admin/inventory/actions";
import type { Part } from "@/lib/supabase/types";

interface Props {
  part: Part;
  onClose: () => void;
  /** Only rendered when provided -- deletion stays opt-in per caller. */
  onDelete?: () => void;
  pending?: boolean;
}

export function EditPartModal({ part, onClose, onDelete, pending }: Props) {
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
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={onDelete}
                className="text-red-600 hover:bg-red-50 hover:text-red-700"
              >
                Delete
              </Button>
            )}
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
