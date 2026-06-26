import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "./env";
import type { Database } from "./types";

/**
 * Runs on every request. Two jobs:
 *   1. Refresh the Supabase auth session and write the new cookies to the
 *      response (so server components see a fresh session next render).
 *   2. Redirect unauthenticated visitors away from /admin/** and /inventory to /login.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // IMPORTANT: don't put any other Supabase calls between createServerClient
  // and getUser(). The SDK refreshes the session as a side effect of this call.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isProtectedRoute = path.startsWith("/admin") || path === "/inventory";
  const isLoginRoute = path === "/login";

  if (isProtectedRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  if (isLoginRoute && user) {
    const url = request.nextUrl.clone();
    const next = request.nextUrl.searchParams.get("next");
    const safeNext =
      next?.startsWith("/") && !next.startsWith("//") ? next : null;
    url.pathname = safeNext ?? "/admin";
    url.searchParams.delete("next");
    return NextResponse.redirect(url);
  }

  return response;
}
