/**
 * Maps a raw Google Form row (an array of `headers` + an array of `values`)
 * into a normalized record we can insert into `public.submissions`.
 *
 * The Google Sheet has ~48 columns, but most rows only populate ~10 of
 * them depending on whether the user filled in the "Parts Request Form"
 * or the "Parts Used Form" -- both forms write to the same sheet.
 *
 * We do NOT hard-code column indices. The sheet has grown over time and
 * a few columns have moved; matching by (canonicalized) header is far
 * more resilient.
 */

import {
  canonicalHeader,
  cleanString,
  detectFormType,
  parseQuantity,
  parseTimestamp,
} from "./normalize";
import type { Json, SubmissionInsert } from "@/lib/supabase/types";

/**
 * Header substrings (canonicalized first via `canonicalHeader`) that we
 * use to find the right column. We match by `includes` so small wording
 * tweaks in the form don't break ingestion.
 *
 * The order inside each array matters -- the first match wins. That lets
 * us prefer the "request form" version of a column over the "used form"
 * version when both appear on a single row (which happens because the
 * sheet keeps a separate column per form even though it's one sheet).
 */
const COLUMN_HINTS = {
  timestamp: ["timestamp"],
  formType: ["form submission type"],

  // Two name columns -- the request form's is just "Select your name." and
  // the used form's is also "Select your name" (note no trailing period).
  // Both canonicalize to "select your name", so we just take whichever cell
  // is populated.
  employeeName: ["select your name"],

  // Part identifiers vary a lot between the two form types.
  partDescription: [
    "part name and number",
    "part names and numbers",
    "please describe why you requested",
  ],
  skapsNumber: [
    "enter skaps number",
    "please enter the skaps number",
  ],

  quantity: [
    "enter the quantity consumed",
    "quantity requested",
    "quantity requesting",
  ],

  line: [
    // "select where the part was used" is the used-form's production-line column.
    // "select where the part(s) would be installed" is the request-form equivalent.
    // "select where the part was removed" is intentionally excluded -- its answers
    // are storage locations (SP-1, SP-2, SG, AR, TR …), not production lines.
    "select where the part was used",
    "select where the part(s) would be installed",
  ],
  machineArea: ["select area of machine", "is there a specific machine area"],
  pmType: ["select pm type"],
  urgency: ["select the urgency"],
  notes: ["any additional notes"],
} as const;

type FieldKey = keyof typeof COLUMN_HINTS;

/**
 * Walk through the headers and collect ALL column indices that match each
 * field, ordered by hint priority (the order of entries in COLUMN_HINTS)
 * so that when multiple columns match the same field the one whose hint
 * appears first in the array is tried first.  This matters because the
 * sheet has one column per form-type for many questions, and only one of
 * them is populated on any given row.
 */
function buildIndexMap(headers: unknown[]): Partial<Record<FieldKey, number[]>> {
  const canonicalized = headers.map(canonicalHeader);
  const indexMap: Partial<Record<FieldKey, number[]>> = {};

  for (const field of Object.keys(COLUMN_HINTS) as FieldKey[]) {
    const hints = COLUMN_HINTS[field] as readonly string[];
    // Outer loop: hints in priority order so high-priority columns are
    // stored first in the index list even when they appear later in the sheet.
    for (const hint of hints) {
      for (let i = 0; i < canonicalized.length; i++) {
        const h = canonicalized[i];
        if (!h) continue;
        if (h.includes(hint)) {
          if (!indexMap[field]) indexMap[field] = [];
          // Avoid duplicates (a column could theoretically match two hints).
          if (!indexMap[field]!.includes(i)) indexMap[field]!.push(i);
        }
      }
    }
  }
  return indexMap;
}

/**
 * Return the first non-empty cell value from all columns that matched
 * this field.  Falls back to the value at the first index if every
 * matching column is blank (consistent with previous behaviour).
 */
function pickValue(
  indexMap: Partial<Record<FieldKey, number[]>>,
  field: FieldKey,
  values: unknown[],
): unknown {
  const indices = indexMap[field];
  if (!indices || indices.length === 0) return null;
  for (const idx of indices) {
    const v = values[idx];
    if (v !== null && v !== undefined && (typeof v !== "string" || v.trim() !== "")) {
      return v;
    }
  }
  return values[indices[0]] ?? null;
}

/**
 * Some rows populate the "used form" SKAPS column AND the "request form"
 * description column. We fall back through both so we always end up with
 * a non-null value if either was filled in.
 */
function pickFirstNonEmpty(indexMap: Partial<Record<FieldKey, number[]>>, fields: FieldKey[], values: unknown[]): string | null {
  for (const field of fields) {
    const v = cleanString(pickValue(indexMap, field, values));
    if (v) return v;
  }
  return null;
}

export interface MappedRow {
  ok: true;
  submission: SubmissionInsert;
}

export interface MappingError {
  ok: false;
  reason: string;
  raw: Record<string, unknown>;
}

export type MappingResult = MappedRow | MappingError;

/**
 * Convert a raw `{ headers, values, rowId }` payload into a SubmissionInsert.
 *
 * Returns `{ ok: false }` if we couldn't even figure out which form type
 * this row was -- the API endpoint logs that and skips the row instead of
 * inserting garbage.
 */
export function mapRowToSubmission(payload: {
  headers: unknown[];
  values: unknown[];
  rowId?: string | null;
}): MappingResult {
  const { headers, values, rowId } = payload;
  if (!Array.isArray(headers) || !Array.isArray(values)) {
    return { ok: false, reason: "headers and values must be arrays", raw: { headers, values } };
  }

  const indexMap = buildIndexMap(headers);

  // Build a header->value map for the `raw` jsonb column. Useful for
  // debugging and for re-mapping later if we change `COLUMN_HINTS`.
  // Values are stringified to keep the column Json-safe -- Apps Script
  // sometimes sends Date objects which JSON.stringify handles fine but
  // Supabase types don't accept directly.
  const raw: Record<string, Json> = {};
  for (let i = 0; i < headers.length; i++) {
    const key = cleanString(headers[i]);
    if (!key) continue;
    const v = values[i];
    if (v === null || v === undefined) {
      raw[key] = null;
    } else if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
      raw[key] = v;
    } else {
      raw[key] = String(v);
    }
  }

  const formType = detectFormType(pickValue(indexMap, "formType", values));
  if (!formType) {
    return {
      ok: false,
      reason: "could not detect form_type from row",
      raw,
    };
  }

  const submittedAt = parseTimestamp(pickValue(indexMap, "timestamp", values)) ?? new Date();

  const submission: SubmissionInsert = {
    external_row_id: rowId ?? null,
    submitted_at: submittedAt.toISOString(),
    form_type: formType,
    employee_name: cleanString(pickValue(indexMap, "employeeName", values)),
    skaps_number: pickFirstNonEmpty(indexMap, ["skapsNumber"], values),
    part_description: pickFirstNonEmpty(indexMap, ["partDescription"], values),
    quantity: parseQuantity(pickValue(indexMap, "quantity", values)),
    line: cleanString(pickValue(indexMap, "line", values)),
    machine_area: cleanString(pickValue(indexMap, "machineArea", values)),
    pm_type: formType === "used" ? cleanString(pickValue(indexMap, "pmType", values)) : null,
    urgency: formType === "request" ? cleanString(pickValue(indexMap, "urgency", values)) : null,
    notes: cleanString(pickValue(indexMap, "notes", values)),
    raw: raw as Json,
  };

  return { ok: true, submission };
}
