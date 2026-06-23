/**
 * One-shot import: reads the Athens Inventory Excel master list and upserts
 * every part into `public.parts` with current_quantity = 0, then inserts
 * all warehouse-specific rows into `public.part_variants`.
 *
 * Parts with the same SKAPSNo appearing on multiple rows (different zones /
 * warehouses) are now properly preserved as separate part_variants rows
 * rather than collapsed into one row.
 *
 * Usage:
 *   pnpm tsx supabase/seed/import_master_list.ts <path-to-xlsx>
 *
 * Safe to re-run: parts upsert on skaps_number (preserves live qty),
 * variants are deleted-and-reinserted per part to stay fresh.
 */

import { config } from "dotenv";
config({ path: ".env.local" });
config();

import * as path from "node:path";
import * as XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";
import type { Database, PartInsert, PartVariantInsert } from "../../lib/supabase/types";
import {
  buildHeaderMap,
  rowToPartFields,
  rowToVariantFields,
} from "../../lib/inventory/master-list-map";

const MASTER_SHEETS = [
  "PLC_CARDS",
  "MOTORS",
  "GEARMOTORS",
  "GEARBOXES",
  "BEARINGS",
  "INSERTS",
  "BELTS",
  "DRIVES",
  "MODULES",
  "APRONS",
  "GLOVES",
  "BATTERIES",
  "OIL",
] as const;

const DEFAULT_FILE = path.join(
  process.env.USERPROFILE ?? process.env.HOME ?? "",
  "Downloads",
  "Athens Inventory 2026.xlsx",
);

type VariantSeed = Omit<PartVariantInsert, "part_id">;

interface PartGroup {
  part: Omit<PartInsert, "current_quantity">;
  variants: VariantSeed[];
}

async function main() {
  const file = process.argv[2] ?? DEFAULT_FILE;
  console.log(`Reading: ${file}`);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }

  const wb = XLSX.readFile(file, { cellDates: false });
  const supabase = createClient<Database>(url, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Pass 1 — collect all rows grouped by SKAPS#.
  // Map key: upper-cased skaps_number.
  const groups = new Map<string, PartGroup>();
  let totalRows = 0;
  let skipped = 0;

  for (const sheetName of MASTER_SHEETS) {
    const sheet = wb.Sheets[sheetName];
    if (!sheet) {
      console.warn(`Sheet "${sheetName}" not found, skipping.`);
      continue;
    }

    const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      raw: false,
      defval: "",
    });

    if (rows.length < 2) continue;

    const headerMap = buildHeaderMap(rows[0]);
    console.log(`  Sheet ${sheetName}: ${rows.length - 1} rows`);

    for (let i = 1; i < rows.length; i++) {
      totalRows++;
      const partFields = rowToPartFields(rows[i], headerMap, sheetName);
      if (!partFields) {
        skipped++;
        continue;
      }

      const key = partFields.skaps_number.trim().toUpperCase();
      const externalRowId = `master-${sheetName}-row-${i}`;

      if (!groups.has(key)) {
        groups.set(key, { part: partFields, variants: [] });
      }

      const group = groups.get(key)!;
      const sortOrder = group.variants.length;
      group.variants.push(
        rowToVariantFields(rows[i], headerMap, sheetName, externalRowId, sortOrder),
      );
    }
  }

  const groupList = Array.from(groups.values());
  const totalVariants = groupList.reduce((s, g) => s + g.variants.length, 0);
  const multiVariant = groupList.filter((g) => g.variants.length > 1).length;

  console.log(
    `\nFound ${groupList.length} unique parts, ${totalVariants} total variants` +
      ` (${multiVariant} parts with 2+ warehouses), ${skipped} rows skipped (no SKAPS#).`,
  );

  // Pass 2 — upsert parts (preserves live current_quantity on conflict).
  const BATCH = 200;
  let partsDone = 0;
  let partsErrors = 0;

  const partRows: PartInsert[] = groupList.map((g) => ({
    ...g.part,
    current_quantity: 0, // only applied for brand-new rows
  }));

  for (let i = 0; i < partRows.length; i += BATCH) {
    const batch = partRows.slice(i, i + BATCH);
    const { error } = await supabase
      .from("parts")
      .upsert(batch, { onConflict: "skaps_number", ignoreDuplicates: false });

    if (error) {
      console.error(`Parts batch ${Math.floor(i / BATCH) + 1} error:`, error.message);
      partsErrors += batch.length;
    } else {
      partsDone += batch.length;
      process.stdout.write(`\rUpserted ${partsDone}/${partRows.length} parts...`);
    }
  }
  console.log();

  // Pass 3 — load all part IDs keyed by skaps_number so we can link variants.
  const { data: existingParts, error: fetchErr } = await supabase
    .from("parts")
    .select("id, skaps_number");
  if (fetchErr || !existingParts) {
    console.error("Failed to fetch part IDs:", fetchErr?.message);
    process.exit(1);
  }
  const partIdMap = new Map(existingParts.map((p) => [p.skaps_number.toUpperCase(), p.id]));

  // Pass 4 — delete old variants and insert fresh ones in batches.
  // We clear-and-reinsert per batch of parts to keep memory low.
  let variantsDone = 0;
  let variantsErrors = 0;

  for (let i = 0; i < groupList.length; i += BATCH) {
    const batchGroups = groupList.slice(i, i + BATCH);

    // Collect part_ids for this batch.
    const batchPartIds = batchGroups
      .map((g) => partIdMap.get(g.part.skaps_number.toUpperCase()))
      .filter((id): id is string => !!id);

    // Delete all existing variants for these parts.
    if (batchPartIds.length > 0) {
      await supabase.from("part_variants").delete().in("part_id", batchPartIds);
    }

    // Build and insert fresh variants.
    const variantRows: PartVariantInsert[] = [];
    for (const group of batchGroups) {
      const partId = partIdMap.get(group.part.skaps_number.toUpperCase());
      if (!partId) continue;
      for (const v of group.variants) {
        variantRows.push({ ...v, part_id: partId });
      }
    }

    if (variantRows.length === 0) continue;

    const { error: vErr } = await supabase.from("part_variants").insert(variantRows);
    if (vErr) {
      console.error(`Variants batch ${Math.floor(i / BATCH) + 1} error:`, vErr.message);
      variantsErrors += variantRows.length;
    } else {
      variantsDone += variantRows.length;
      process.stdout.write(`\rInserted ${variantsDone}/${totalVariants} variants...`);
    }
  }

  console.log(
    `\n\nDone.\n` +
      `  Parts:    ${partsDone} upserted, ${partsErrors} errors\n` +
      `  Variants: ${variantsDone} inserted, ${variantsErrors} errors\n` +
      `  Skipped:  ${skipped} rows (no SKAPS#)`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
