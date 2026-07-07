import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Run on every path except static assets and the ingest / color-sync
     * endpoints. Those authenticate themselves via the x-skaps-secret
     * header, so we don't want to spend time refreshing a session on them.
     */
    "/((?!_next/static|_next/image|favicon.ico|api/ingest|api/sync-expense-status|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
