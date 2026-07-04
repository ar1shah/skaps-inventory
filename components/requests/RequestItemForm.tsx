"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { RequestFormState } from "@/app/admin/requests/actions";
import type { Submission } from "@/lib/supabase/types";

interface Props {
  action: (state: RequestFormState, formData: FormData) => Promise<RequestFormState>;
  initial?: Submission | null;
  submitLabel: string;
  onSuccess?: () => void;
}

export function RequestItemForm({ action, initial, submitLabel, onSuccess }: Props) {
  const [state, formAction] = useActionState(action, {} as RequestFormState);

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
          label="Part description"
          name="part_description"
          defaultValue={initial?.part_description ?? ""}
          error={state.fieldErrors?.part_description}
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
          min="0"
          defaultValue={initial?.quantity ?? ""}
          error={state.fieldErrors?.quantity}
        />
        <Field
          label="Employee"
          name="employee_name"
          defaultValue={initial?.employee_name ?? ""}
          error={state.fieldErrors?.employee_name}
        />
        <Field
          label="Urgency"
          name="urgency"
          defaultValue={initial?.urgency ?? ""}
          error={state.fieldErrors?.urgency}
          placeholder="e.g. Urgent"
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

        <div className="col-span-2">
          <Label htmlFor="status" className="mb-1 text-xs font-medium text-slate-700">
            Status
          </Label>
          <select
            id="status"
            name="status"
            defaultValue={initial?.status === "closed" ? "closed" : "open"}
            className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:border-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/20"
          >
            <option value="open">Requested</option>
            <option value="closed">Complete</option>
          </select>
        </div>

        <div className="col-span-2">
          <Label htmlFor="notes" className="mb-1 text-xs font-medium text-slate-700">
            Notes
          </Label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            defaultValue={initial?.notes ?? ""}
            placeholder="Shipping details, PO info, or anything else worth noting"
            className={cn(
              "flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm",
              "placeholder:text-slate-400",
              "focus-visible:border-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/20",
            )}
          />
          {state.fieldErrors?.notes && (
            <p className="mt-1 text-xs text-red-600">{state.fieldErrors.notes}</p>
          )}
        </div>
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
