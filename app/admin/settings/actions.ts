"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSiteUrl } from "@/lib/site-url";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export interface ActionState {
  ok?: boolean;
  error?: string;
}

const ProfileInput = z.object({
  first_name: z.string().trim().min(1, "First name is required").max(80),
  last_name: z.string().trim().min(1, "Last name is required").max(80),
});

export async function updateProfile(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const parsed = ProfileInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(", ") };
  }

  const { error } = await supabase
    .from("profiles")
    .upsert({ id: user.id, ...parsed.data });

  if (error) return { error: error.message };

  revalidatePath("/admin");
  return { ok: true };
}

const PasswordInput = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function changePassword(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const parsed = PasswordInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(", ") };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: error.message };

  return { ok: true };
}

const InviteInput = z.object({
  email: z.string().trim().email("Enter a valid email"),
  first_name: z.string().trim().min(1).max(80),
  last_name: z.string().trim().min(1).max(80),
});

export async function inviteAdmin(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = InviteInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(", ") };
  }

  // We need the service role to send invites. The signed-in user is
  // already an admin (middleware gate), so this is safe.
  const service = createServiceClient();
  const redirectTo = `${getSiteUrl()}/auth/callback?next=/admin/settings`;
  const { error } = await service.auth.admin.inviteUserByEmail(parsed.data.email, {
    redirectTo,
    data: {
      first_name: parsed.data.first_name,
      last_name: parsed.data.last_name,
    },
  });

  if (error) return { error: error.message };

  return { ok: true };
}
