/**
 * POST /api/ingest-master
 *
 * Receives a single row from the Athens Inventory Google Sheet whenever
 * a new row is manually added by a user. The Apps Script (MasterListCode.gs)
 * sends:
 *
 *   {
 *     "rowId":     "master-<sheetId>-row-<rowNumber>",
 *     "sheetName": "MOTORS",
 *     "headers":   ["SKAPSNo", "ProductName", ...],
 *     "values":    ["M001", "Motor 5HP", ...]
 *   }
 *
 * The part is upserted on skaps_number (shared identity fields).
 * current_quantity is ONLY set to 0 for brand-new rows — existing parts
 * keep their current stock level.
 *
 * The warehouse-specific location row is upserted into part_variants using
 * the external_row_id as the dedup key, so re-sends are idempotent.
 *
 * Auth: same x-skaps-secret shared secret as /api/ingest.
 */

import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { createServiceClient } from "@/lib/supabase/server";
import { env } from "@/lib/supabase/env";
import { buildHeaderMap, rowToPartFields, rowToVariantFields } from "@/lib/inventory/master-list-map";

export const dynamic = "force-dynamic";

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export async function POST(request: Request) {
  // 1. Auth
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

  // 2. Parse body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const payload = body as {
    headers?: unknown;
    values?: unknown;
    rowId?: unknown;
    sheetName?: unknown;
  };

  if (!Array.isArray(payload.headers) || !Array.isArray(payload.values)) {
    return NextResponse.json(
      { error: "expected { headers: [], values: [], sheetName: string }" },
      { status: 400 },
    );
  }

  const sheetName = typeof payload.sheetName === "string" ? payload.sheetName : "UNKNOWN";
  const rowId = typeof payload.rowId === "string" ? payload.rowId : null;

  // 3. Map row to shared part fields and variant fields
  const headerMap = buildHeaderMap(payload.headers);
  const partFields = rowToPartFields(payload.values, headerMap, sheetName);

  if (!partFields) {
    console.warn("ingest-master: row has no SKAPSNo, skipping", { rowId, sheetName });
    return NextResponse.json({ ok: true, skipped: true, reason: "no SKAPSNo in row" });
  }

  const supabase = createServiceClient();

  // 4. Upsert part (shared identity; current_quantity preserved on conflict)
  const { data: partData, error: partErr } = await supabase
    .from("parts")
    .upsert(
      { ...partFields, current_quantity: 0 },
      { onConflict: "skaps_number", ignoreDuplicates: false },
    )
    .select("id, skaps_number")
    .single();

  if (partErr || !partData) {
    console.error("ingest-master: part upsert failed", partErr, partFields);
    return NextResponse.json({ error: partErr?.message ?? "upsert failed" }, { status: 500 });
  }

  // 5. Upsert warehouse variant — use external_row_id as the unique key so
  //    re-sends from the Apps Script are idempotent.
  if (rowId) {
    // Determine sort_order by counting existing variants for this part.
    const { count } = await supabase
      .from("part_variants")
      .select("id", { count: "exact", head: true })
      .eq("part_id", partData.id)
      .neq("external_row_id", rowId); // don't count self if it already exists

    const sortOrder = count ?? 0;

    const variantFields = rowToVariantFields(
      payload.values,
      headerMap,
      sheetName,
      rowId,
      sortOrder,
    );

    const { error: varErr } = await supabase
      .from("part_variants")
      .upsert(
        { ...variantFields, part_id: partData.id },
        { onConflict: "external_row_id", ignoreDuplicates: false },
      );

    if (varErr) {
      // Non-fatal: the part was upserted, just the variant failed.
      console.error("ingest-master: variant upsert failed", varErr);
    }
  }

  console.log(`ingest-master: upserted ${partData.skaps_number} from sheet ${sheetName}`);
  return NextResponse.json({ ok: true, skaps_number: partData.skaps_number });
}

export async function GET() {
  return NextResponse.json({
    service: "skaps-inventory master-list ingest",
    method: "POST",
    auth: "x-skaps-secret header",
  });
}
