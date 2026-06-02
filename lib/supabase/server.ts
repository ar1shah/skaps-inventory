import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { env } from "./env";
import type { Database } from "./types";

/**
 * Server-side Supabase client bound to the request cookies. Use this in
 * server components, route handlers, and server actions whenever you want
 * the action to run as the currently signed-in user (RLS enforced).
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        // In server components Next.js disallows mutating cookies, so we
        // swallow the error -- the middleware refreshes the session on
        // every request anyway.
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          /* called from a server component -- safe to ignore */
        }
      },
    },
  });
}

/**
 * Service-role Supabase client. **Bypasses RLS** -- only use from trusted
 * server contexts (the /api/ingest endpoint, admin server actions).
 *
 * Never import this from a "use client" file.
 */
export function createServiceClient() {
  return createSupabaseClient<Database>(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
