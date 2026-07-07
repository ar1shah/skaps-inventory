/**
 * POST /api/sync-expense-status
 *
 * Receives row-color updates from the Google Apps Script color-sync job
 * (docs/apps-script/ColorSync.gs) and stores them on the matching
 * `submissions` row. Staff mark expense status by coloring a row on the
 * source sheet; the script reads that color and POSTs us:
 *
 *   { "rowId": "sheet-0-row-482", "expenseStatus": "expensed" }
 *
 * `expenseStatus` is null when the row has been un-colored.
 *
 * Auth is the same shared-secret header as /api/ingest. All writes use
 * service-role to bypass RLS -- only the Apps Script hits this endpoint.
 */

import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { createServiceClient } from "@/lib/supabase/server";
import { env } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

const EXPENSE_STATUSES = [
  "expensed",
  "not_expensed",
  "check_inventory",
  "datatex_zero",
  "testing",
] as const;
type ExpenseStatus = (typeof EXPENSE_STATUSES)[number];

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

  const payload = body as { rowId?: unknown; expenseStatus?: unknown };

  if (typeof payload.rowId !== "string" || !payload.rowId) {
    return NextResponse.json({ error: "expected a non-empty rowId string" }, { status: 400 });
  }

  let expenseStatus: ExpenseStatus | null = null;
  if (payload.expenseStatus !== null && payload.expenseStatus !== undefined) {
    if (!EXPENSE_STATUSES.includes(payload.expenseStatus as ExpenseStatus)) {
      return NextResponse.json(
        { error: `expenseStatus must be one of ${EXPENSE_STATUSES.join(", ")} or null` },
        { status: 400 },
      );
    }
    expenseStatus = payload.expenseStatus as ExpenseStatus;
  }

  // 3. Update the matching submission. The row may not have been ingested
  // yet (e.g. the color sync ran before the form-submit ingest finished),
  // so we don't treat "no match" as an error -- the script's periodic
  // resync will pick it up once the row exists.
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("submissions")
    .update({ expense_status: expenseStatus })
    .eq("external_row_id", payload.rowId)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Failed to update expense_status", error, payload);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ ok: true, skipped: true, reason: "no matching submission" });
  }

  return NextResponse.json({ ok: true, id: data.id });
}

// Friendly GET so curl-ing the URL gives something readable instead of a 405.
export async function GET() {
  return NextResponse.json({
    service: "skaps-inventory sync-expense-status",
    method: "POST",
    auth: "x-skaps-secret header",
  });
}
