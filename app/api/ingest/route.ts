/**
 * POST /api/ingest
 *
 * Receives form submissions from the Google Apps Script trigger and
 * upserts them into Supabase. The Apps Script runs as the spreadsheet
 * owner so it can read the full row; it then POSTs us a payload like:
 *
 *   {
 *     "rowId": "0-12345",
 *     "headers": ["Timestamp", "Select your name. / ...", ...],
 *     "values":  ["2026-04-03T11:42:45.172Z", "Kenny", ...]
 *   }
 *
 * Auth is a single shared-secret header (constant-time compare). All
 * inserts use service-role to bypass RLS -- the public never hits this
 * endpoint, only the Apps Script does.
 */

import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { createServiceClient } from "@/lib/supabase/server";
import { env } from "@/lib/supabase/env";
import { mapRowToSubmission } from "@/lib/forms/mapping";
import { emitNotificationsForSubmission } from "@/lib/forms/notifications";

// Don't cache responses, ever -- this endpoint is fire-and-forget.
export const dynamic = "force-dynamic";

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export async function POST(request: Request) {
  // 1. Authenticate the call.
  const providedSecret = request.headers.get("x-skaps-secret") ?? "";
  let expectedSecret: string;
  try {
    expectedSecret = env.ingestSecret;
  } catch (e) {
    // env var missing -- still 401 (don't leak the misconfiguration).
    console.error("INGEST_SECRET is not set", e);
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!safeCompare(providedSecret, expectedSecret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // 2. Parse and validate the body.
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "expected an object" }, { status: 400 });
  }

  const payload = body as { headers?: unknown; values?: unknown; rowId?: unknown };

  if (!Array.isArray(payload.headers) || !Array.isArray(payload.values)) {
    return NextResponse.json(
      { error: "expected { headers: [], values: [] }" },
      { status: 400 },
    );
  }

  // 3. Convert the row into our normalized shape.
  const mapped = mapRowToSubmission({
    headers: payload.headers,
    values: payload.values,
    rowId: typeof payload.rowId === "string" ? payload.rowId : null,
  });

  if (!mapped.ok) {
    // We log the failure but still 200 so Apps Script doesn't retry
    // forever on a row we can't parse. The raw row stays in the sheet
    // and the admin can investigate.
    console.warn("Skipping unmappable row", mapped.reason, mapped.raw);
    return NextResponse.json({ ok: true, skipped: true, reason: mapped.reason });
  }

  // 4. Upsert. external_row_id is a unique column so retries are safe.
  const supabase = createServiceClient();
  const { data: inserted, error } = await supabase
    .from("submissions")
    .upsert(mapped.submission, { onConflict: "external_row_id" })
    .select()
    .single();

  if (error) {
    console.error("Failed to insert submission", error, mapped.submission);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 5. Best-effort notifications. Failures here are logged but never
  // bubble back up to Apps Script -- we don't want a notifications
  // hiccup to cause a sheet row to be retried indefinitely.
  try {
    await emitNotificationsForSubmission(supabase, inserted);
  } catch (e) {
    console.error("notification generation failed", e);
  }

  return NextResponse.json({ ok: true, id: inserted.id });
}

// Friendly GET so curl-ing the URL gives something readable instead of
// a 405. Useful when you're verifying the deployment is up.
export async function GET() {
  return NextResponse.json({
    service: "skaps-inventory ingest",
    method: "POST",
    auth: "x-skaps-secret header",
  });
}
