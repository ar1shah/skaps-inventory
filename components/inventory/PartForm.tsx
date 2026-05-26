"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PartFormState } from "@/app/admin/inventory/actions";
import type { Part } from "@/lib/supabase/types";

interface Props {
  /** Bound server action -- either createPart or updatePart.bind(null, id). */
  action: (state: PartFormState, formData: FormData) => Promise<PartFormState>;
  initial?: Part | null;
  submitLabel: string;
  onSuccess?: () => void;
}

export function PartForm({ action, initial, submitLabel, onSuccess }: Props) {
  const [state, formAction] = useActionState(action, {} as PartFormState);

  // After a successful submit, call onSuccess (e.g. close the dialog).
  if (state.ok && onSuccess) {
    queueMicrotask(onSuccess);
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field
          label="SKAPS number"
          name="skaps_number"
          defaultValue={initial?.skaps_number}
          error={state.fieldErrors?.skaps_number}
          required
        />
        <Field
          label="Name"
          name="name"
          defaultValue={initial?.name}
          error={state.fieldErrors?.name}
          required
        />
        <Field
          label="Category"
          name="category"
          defaultValue={initial?.category ?? ""}
          error={state.fieldErrors?.category}
          placeholder="e.g. Bearing"
        />
        <Field
          label="Location"
          name="location"
          defaultValue={initial?.location ?? ""}
          error={state.fieldErrors?.location}
          placeholder="e.g. Shelf A3"
        />
        <Field
          label="Unit"
          name="unit"
          defaultValue={initial?.unit ?? "each"}
          error={state.fieldErrors?.unit}
          placeholder="each, ft, case"
        />
        <Field
          label="In stock"
          name="current_quantity"
          type="number"
          step="0.01"
          min="0"
          defaultValue={initial?.current_quantity ?? 0}
          error={state.fieldErrors?.current_quantity}
          required
        />
        <Field
          label="Reorder threshold"
          name="reorder_threshold"
          type="number"
          step="0.01"
          min="0"
          defaultValue={initial?.reorder_threshold ?? ""}
          error={state.fieldErrors?.reorder_threshold}
          placeholder="Optional"
          className="col-span-2 sm:col-span-1"
        />
      </div>

      <div>
        <Label htmlFor="notes">Notes</Label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={initial?.notes ?? ""}
          className="mt-1.5 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:border-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/20"
        />
        {state.fieldErrors?.notes && (
          <p className="mt-1 text-xs text-red-600">{state.fieldErrors.notes}</p>
        )}
      </div>

      {state.error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {state.error}
        </p>
      )}

      <SubmitButton label={submitLabel} />
    </form>
  );
}

interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

function Field({ label, name, error, className, ...props }: FieldProps) {
  return (
    <div className={className}>
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} {...props} className="mt-1.5" />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Saving...
        </>
      ) : (
        label
      )}
    </Button>
  );
}
