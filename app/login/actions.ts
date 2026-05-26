"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface LoginState {
  error?: string;
}

/**
 * Server action backing the login form. Returns an error string on
 * failure (handled by the form's useFormState hook); on success it
 * redirects out to /admin (or wherever `next` says to go).
 */
export async function login(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/admin");

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Don't reveal whether it was the email or the password that was wrong --
    // that's how Supabase phrases the default error anyway.
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect(next);
}

/** Server action used by the admin sidebar's "Sign out" item. */
export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
