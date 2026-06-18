"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { RepairFormState } from "@/app/admin/repair/actions";
import type { PartInRepair } from "@/lib/supabase/types";

interface Props {
  action: (state: RepairFormState, formData: FormData) => Promise<RepairFormState>;
  initial?: PartInRepair | null;
  submitLabel: string;
  onSuccess?: () => void;
}

function toDateInputValue(iso: string | null | undefined): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

export function RepairItemForm({ action, initial, submitLabel, onSuccess }: Props) {
  const [state, formAction] = useActionState(action, {} as RepairFormState);

  if (state.ok && onSuccess) {
    queueMicrotask(onSuccess);
  }

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{state.error}</p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Part name"
          name="part_name"
          defaultValue={initial?.part_name}
          error={state.fieldErrors?.part_name}
          required
          className="col-span-2"
        />
        <Field
          label="SKAPS number"
          name="skaps_number"
          defaultValue={initial?.skaps_number ?? ""}
          error={state.fieldErrors?.skaps_number}
          placeholder="Optional"
        />
        <Field
          label="Quantity"
          name="quantity"
          type="number"
          step="1"
          min="1"
          defaultValue={initial?.quantity ?? 1}
          error={state.fieldErrors?.quantity}
          required
        />
        <Field
          label="Date sent for repair"
          name="sent_at"
          type="date"
          defaultValue={toDateInputValue(initial?.sent_at)}
          error={state.fieldErrors?.sent_at}
        />
        <Field
          label="Expected return date"
          name="expected_return_at"
          type="date"
          defaultValue={toDateInputValue(initial?.expected_return_at)}
          error={state.fieldErrors?.expected_return_at}
        />
        <Field
          label="Repair vendor / location"
          name="repair_vendor"
          defaultValue={initial?.repair_vendor ?? ""}
          error={state.fieldErrors?.repair_vendor}
          placeholder="e.g. Acme Repair Co."
        />
        <Field
          label="PO / reference #"
          name="po_reference"
          defaultValue={initial?.po_reference ?? ""}
          error={state.fieldErrors?.po_reference}
          placeholder="Optional"
        />
        <Field
          label="Line"
          name="line"
          defaultValue={initial?.line ?? ""}
          error={state.fieldErrors?.line}
          placeholder="e.g. Line 3"
        />
        <Field
          label="Machine area"
          name="machine_area"
          defaultValue={initial?.machine_area ?? ""}
          error={state.fieldErrors?.machine_area}
          placeholder="e.g. Packaging"
        />
        <Field
          label="Reason for repair"
          name="repair_reason"
          defaultValue={initial?.repair_reason ?? ""}
          error={state.fieldErrors?.repair_reason}
          placeholder="Brief description"
          className="col-span-2"
        />
        <Field
          label="Notes"
          name="notes"
          defaultValue={initial?.notes ?? ""}
          error={state.fieldErrors?.notes}
          placeholder="Any additional notes"
          className="col-span-2"
        />
      </div>

      <SubmitButton label={submitLabel} />
    </form>
  );
}

function Field({
  label,
  name,
  error,
  className,
  required,
  ...inputProps
}: {
  label: string;
  name: string;
  error?: string;
  className?: string;
  required?: boolean;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={className}>
      <Label htmlFor={name} className="mb-1 text-xs font-medium text-slate-700">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </Label>
      <Input id={name} name={name} required={required} {...inputProps} />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {label}
    </Button>
  );
}
