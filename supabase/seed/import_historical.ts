/**
 * Optional one-shot import: reads the historical xlsx export of the
 * Google Form responses and writes every row through the same mapping
 * pipeline used by /api/ingest.
 *
 * Usage:
 *   pnpm tsx supabase/seed/import_historical.ts <path-to-xlsx>
 *
 * Defaults the path to the file the project was bootstrapped with.
 * Uses external_row_id = "historical-<sheet>-<row>" so re-runs upsert
 * cleanly and live ingest never collides with historical data.
 */

import "dotenv/config";
import * as path from "node:path";
import * as XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";
import { mapRowToSubmission } from "../../lib/forms/mapping";
import type { Database } from "../../lib/supabase/types";

const DEFAULT_FILE = path.join(
  process.env.USERPROFILE ?? process.env.HOME ?? "",
  "Downloads",
  "Copy of Maintenance Parts Reqests (Responses).xlsx",
);

async function main() {
  const file = process.argv[2] ?? DEFAULT_FILE;
  console.log(`Reading ${file}`);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.");
    process.exit(1);
  }

  const wb = XLSX.readFile(file, { cellDates: true });
  const supabase = createClient<Database>(url, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let total = 0;
  let inserted = 0;
  let skipped = 0;

  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      raw: true,
      defval: null,
    });

    if (rows.length < 2) continue;

    const headers = rows[0];
    console.log(`Sheet ${sheetName}: ${rows.length - 1} data rows`);

    // We send rows to Supabase in batches to stay under the request size
    // limit and to avoid having to retry the whole import on a transient
    // failure.
    const BATCH = 200;
    let buffer: ReturnType<typeof mapRowToSubmission>[] = [];

    async function flush() {
      const ok = buffer.filter((r) => r.ok);
      const mappedSubmissions = ok.map((r) =>
        r.ok ? r.submission : null,
      ).filter((s): s is NonNullable<typeof s> => s !== null);

      if (mappedSubmissions.length === 0) {
        buffer = [];
        return;
      }

      const { error } = await supabase
        .from("submissions")
        .upsert(mappedSubmissions, { onConflict: "external_row_id" });

      if (error) {
        console.error("Batch insert failed:", error.message);
      } else {
        inserted += mappedSubmissions.length;
      }
      buffer = [];
    }

    for (let i = 1; i < rows.length; i++) {
      total += 1;
      const result = mapRowToSubmission({
        headers,
        values: rows[i] ?? [],
        rowId: `historical-${sheetName}-${i}`,
      });
      if (!result.ok) {
        skipped += 1;
        continue;
      }
      buffer.push(result);
      if (buffer.length >= BATCH) await flush();
    }
    await flush();
  }

  console.log(`\nDone. Read ${total} rows, inserted ${inserted}, skipped ${skipped}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
