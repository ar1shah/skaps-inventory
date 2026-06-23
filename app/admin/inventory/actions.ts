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

const optionalNumber = z
  .string()
  .trim()
  .transform((s, ctx) => {
    if (s.length === 0) return null;
    const n = Number(s);
    if (!Number.isFinite(n) || n < 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Must be a non-negative number",
      });
      return z.NEVER;
    }
    return n;
  })
  .nullable()
  .optional();

const PartInput = z.object({
  skaps_number: z.string().trim().min(1, "SKAPS number is required").max(80),
  name: z.string().trim().min(1, "Name is required").max(200),
  description: optionalString(1000),
  category: optionalString(80),
  sub_category: optionalString(80),
  location: optionalString(200),
  location_on_machine: optionalString(200),
  line_no: optionalString(80),
  zone: optionalString(80),
  storage_location: optionalString(500),
  lwhsdesc: optionalString(200),
  size: optionalString(80),
  belt_type: optionalString(80),
  vendor_names: optionalString(200),
  unit: z
    .string()
    .trim()
    .max(20)
    .transform((s) => (s.length === 0 ? "each" : s)),
  current_quantity: z.coerce
    .number()
    .nonnegative({ message: "Quantity must be zero or positive" }),
  reorder_threshold: optionalNumber,
  notes: optionalString(2000),
});

export interface PartFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  ok?: boolean;
}

export async function createPart(_prev: PartFormState, formData: FormData): Promise<PartFormState> {
  const parsed = PartInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      fieldErrors: Object.fromEntries(
        parsed.error.issues.map((i) => [i.path.join("."), i.message]),
      ),
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("parts").insert(parsed.data);
  if (error) {
    if (error.code === "23505") {
      return { fieldErrors: { skaps_number: "A part with this SKAPS number already exists." } };
    }
    return { error: error.message };
  }

  revalidatePath("/admin/inventory");
  revalidatePath("/inventory");
  return { ok: true };
}

export async function updatePart(
  id: string,
  _prev: PartFormState,
  formData: FormData,
): Promise<PartFormState> {
  const parsed = PartInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      fieldErrors: Object.fromEntries(
        parsed.error.issues.map((i) => [i.path.join("."), i.message]),
      ),
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("parts").update(parsed.data).eq("id", id);
  if (error) {
    if (error.code === "23505") {
      return { fieldErrors: { skaps_number: "Another part already uses this SKAPS number." } };
    }
    return { error: error.message };
  }

  revalidatePath("/admin/inventory");
  revalidatePath("/inventory");
  return { ok: true };
}

export async function deletePart(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("parts").delete().eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
  revalidatePath("/admin/inventory");
  revalidatePath("/inventory");
}
