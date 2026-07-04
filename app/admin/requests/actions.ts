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

const RequestSubmissionInput = z.object({
  employee_name: optionalString(200),
  skaps_number: optionalString(80),
  part_description: optionalString(500),
  quantity: z.coerce.number().nonnegative({ message: "Quantity can't be negative" }).nullable().optional(),
  line: optionalString(80),
  machine_area: optionalString(80),
  urgency: optionalString(80),
  notes: optionalString(2000),
  status: z.enum(["open", "closed"]),
});

export interface RequestFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  ok?: boolean;
}

function revalidateRequestPaths() {
  revalidatePath("/admin/requests");
  revalidatePath("/admin");
}

export async function updateRequestSubmission(
  id: string,
  _prev: RequestFormState,
  formData: FormData,
): Promise<RequestFormState> {
  const parsed = RequestSubmissionInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      fieldErrors: Object.fromEntries(
        parsed.error.issues.map((i) => [i.path.join("."), i.message]),
      ),
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("submissions")
    .update(parsed.data)
    .eq("id", id)
    .eq("form_type", "request");
  if (error) {
    return { error: error.message };
  }

  revalidateRequestPaths();
  return { ok: true };
}

export async function markRequestComplete(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("submissions")
    .update({ status: "closed" })
    .eq("id", id)
    .eq("form_type", "request");
  if (error) {
    throw new Error(error.message);
  }
  revalidateRequestPaths();
}

export async function markRequestRequested(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("submissions")
    .update({ status: "open" })
    .eq("id", id)
    .eq("form_type", "request");
  if (error) {
    throw new Error(error.message);
  }
  revalidateRequestPaths();
}

export async function deleteRequestSubmission(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("submissions")
    .delete()
    .eq("id", id)
    .eq("form_type", "request");
  if (error) {
    throw new Error(error.message);
  }
  revalidateRequestPaths();
}
