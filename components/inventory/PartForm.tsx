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
  action: (state: PartFormState, formData: FormData) => Promise<PartFormState>;
  initial?: Part | null;
  submitLabel: string;
  onSuccess?: () => void;
}

export function PartForm({ action, initial, submitLabel, onSuccess }: Props) {
  const [state, formAction] = useActionState(action, {} as PartFormState);

  if (state.ok && onSuccess) {
    queueMicrotask(onSuccess);
  }

  return (
    <form action={formAction} className="space-y-6">
      {/* Core identification */}
      <Section label="Identification">
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="SKAPS Number"
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
            label="SKAPS Name (internal)"
            name="lwhsdesc"
            defaultValue={initial?.lwhsdesc ?? ""}
            error={state.fieldErrors?.lwhsdesc}
            placeholder="e.g. Lubrication Tube 03"
            className="col-span-2"
          />
          <Field
            label="Description"
            name="description"
            defaultValue={initial?.description ?? ""}
            error={state.fieldErrors?.description}
            placeholder="Full part description"
            className="col-span-2"
          />
        </div>
      </Section>

      {/* Classification */}
      <Section label="Classification">
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Main Category"
            name="category"
            defaultValue={initial?.category ?? ""}
            error={state.fieldErrors?.category}
            placeholder="e.g. MOTORS"
          />
          <Field
            label="Sub-Category"
            name="sub_category"
            defaultValue={initial?.sub_category ?? ""}
            error={state.fieldErrors?.sub_category}
            placeholder="e.g. AC Motor"
          />
          <Field
            label="Size"
            name="size"
            defaultValue={initial?.size ?? ""}
            error={state.fieldErrors?.size}
            placeholder="e.g. 25mm"
          />
          <Field
            label="Belt Type"
            name="belt_type"
            defaultValue={initial?.belt_type ?? ""}
            error={state.fieldErrors?.belt_type}
            placeholder="e.g. V-Belt"
          />
          <Field
            label="Vendor Names"
            name="vendor_names"
            defaultValue={initial?.vendor_names ?? ""}
            error={state.fieldErrors?.vendor_names}
            placeholder="e.g. DILO, Inc."
            className="col-span-2"
          />
        </div>
      </Section>

      {/* Location */}
      <Section label="Location">
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Location on Machine"
            name="location_on_machine"
            defaultValue={initial?.location_on_machine ?? ""}
            error={state.fieldErrors?.location_on_machine}
            placeholder="e.g. Tacker / Looms"
          />
          <Field
            label="Line No."
            name="line_no"
            defaultValue={initial?.line_no ?? ""}
            error={state.fieldErrors?.line_no}
            placeholder="e.g. Line 7"
          />
          <Field
            label="Zone"
            name="zone"
            defaultValue={initial?.zone ?? ""}
            error={state.fieldErrors?.zone}
            placeholder="e.g. Athens"
          />
          <Field
            label="Location"
            name="location"
            defaultValue={initial?.location ?? ""}
            error={state.fieldErrors?.location}
            placeholder="e.g. Athens Shop"
          />
          <Field
            label="Storage Location"
            name="storage_location"
            defaultValue={initial?.storage_location ?? ""}
            error={state.fieldErrors?.storage_location}
            placeholder="e.g. Cabinet CB-11 / Green Bins"
            className="col-span-2"
          />
        </div>
      </Section>

      {/* Stock */}
      <Section label="Stock">
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Unit"
            name="unit"
            defaultValue={initial?.unit ?? "each"}
            error={state.fieldErrors?.unit}
            placeholder="each, ft, case"
          />
          <Field
            label="In Stock"
            name="current_quantity"
            type="number"
            step="0.01"
            min="0"
            defaultValue={initial?.current_quantity ?? 0}
            error={state.fieldErrors?.current_quantity}
            required
          />
          <Field
            label="Reorder Threshold"
            name="reorder_threshold"
            type="number"
            step="0.01"
            min="0"
            defaultValue={initial?.reorder_threshold ?? ""}
            error={state.fieldErrors?.reorder_threshold}
            placeholder="Optional"
          />
        </div>
      </Section>

      {/* Notes */}
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

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </h3>
      {children}
    </div>
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
