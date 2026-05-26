"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

/**
 * The Zod schema mirrors the constraints in the database. Optional fields
 * are normalized to `null` (or omitted) so the resulting object lines up
 * with the SDK's Insert/Update shape.
 */
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
  skaps_number: z
    .string()
    .trim()
    .min(1, "SKAPS number is required")
    .max(80, "SKAPS number is too long"),
  name: z.string().trim().min(1, "Name is required").max(200),
  category: optionalString(80),
  location: optionalString(80),
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
