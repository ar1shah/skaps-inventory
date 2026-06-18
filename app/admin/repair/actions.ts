"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const optionalString = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((s) => (s.length === 0 ? null : s))
    .nullable()
    .optional();

const optionalDate = z
  .string()
  .trim()
  .transform((s) => (s.length === 0 ? null : new Date(s).toISOString()))
  .nullable()
  .optional();

const RepairItemInput = z.object({
  part_name: z.string().trim().min(1, "Part name is required").max(200),
  skaps_number: optionalString(80),
  quantity: z.coerce.number().positive({ message: "Quantity must be greater than zero" }),
  sent_at: z
    .string()
    .trim()
    .transform((s) => (s.length === 0 ? new Date().toISOString() : new Date(s).toISOString())),
  repair_vendor: optionalString(200),
  expected_return_at: optionalDate,
  line: optionalString(80),
  machine_area: optionalString(80),
  repair_reason: optionalString(500),
  po_reference: optionalString(80),
  notes: optionalString(2000),
});

export interface RepairFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  ok?: boolean;
}

function revalidateRepairPaths() {
  revalidatePath("/admin/repair");
  revalidatePath("/admin");
}

export async function createRepairItem(
  _prev: RepairFormState,
  formData: FormData,
): Promise<RepairFormState> {
  const parsed = RepairItemInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      fieldErrors: Object.fromEntries(
        parsed.error.issues.map((i) => [i.path.join("."), i.message]),
      ),
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("parts_in_repair").insert(parsed.data);
  if (error) {
    return { error: error.message };
  }

  revalidateRepairPaths();
  return { ok: true };
}

export async function updateRepairItem(
  id: string,
  _prev: RepairFormState,
  formData: FormData,
): Promise<RepairFormState> {
  const parsed = RepairItemInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      fieldErrors: Object.fromEntries(
        parsed.error.issues.map((i) => [i.path.join("."), i.message]),
      ),
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("parts_in_repair")
    .update(parsed.data)
    .eq("id", id);
  if (error) {
    return { error: error.message };
  }

  revalidateRepairPaths();
  return { ok: true };
}

export async function markAsReturned(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("parts_in_repair")
    .update({ status: "returned", returned_at: new Date().toISOString() })
    .eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
  revalidateRepairPaths();
}

export async function deleteRepairItem(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("parts_in_repair").delete().eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
  revalidateRepairPaths();
}
