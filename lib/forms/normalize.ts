/**
 * Helpers for taking raw Google Form values and coercing them into the
 * shape our database expects.
 *
 * The Google Form is bilingual (English / Spanish) so almost every cell
 * we look at can either be plain English, plain Spanish, or the slash-
 * separated combination -- e.g. "Parts Used Form / Partes utilizadas".
 *
 * We don't try to be clever about translating Spanish text. We just
 * detect the English half (which always comes first in this sheet) and
 * use that as the canonical value.
 */

/** Empty / undefined / whitespace -> null. Everything else returns the trimmed string. */
export function cleanString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  if (s.length === 0) return null;
  return s;
}

/**
 * The form labels themselves are "Foo / Bar". When matching by header we
 * want to ignore both the leading English part and the trailing Spanish
 * part, so we collapse the label to just its first slash-delimited token
 * and lowercase it for case-insensitive comparison.
 */
export function canonicalHeader(label: unknown): string {
  if (label === null || label === undefined) return "";
  return String(label)
    .split("/")[0]
    .toLowerCase()
    .replace(/[\s\u00a0]+/g, " ")
    .trim();
}

/**
 * Tries to coerce a quantity cell into a number. The sheet has a mix of
 * real numbers ("2", "200000"), free-text quantities ("A few", "200ft",
 * "Case"), and blanks. We return null for anything we can't parse so
 * downstream code can decide whether to keep the raw string in `notes`.
 */
export function parseQuantity(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const s = String(value).trim();
  if (s.length === 0) return null;

  // Pull out the first numeric token. Handles "200ft", "2 cases", "  3.5 ".
  const match = s.match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const n = Number(match[0]);
  return Number.isFinite(n) ? n : null;
}

/**
 * The form submission type column comes in three flavors we have to
 * recognize: "Parts Used Form / Partes utilizadas", "Parts Usage Form"
 * (older), and "Parts Request Form / Solicitud de repuestos". Anything
 * that isn't a request is treated as "used".
 */
export function detectFormType(value: unknown): "used" | "request" | null {
  const cleaned = cleanString(value);
  if (!cleaned) return null;
  const head = canonicalHeader(cleaned);
  if (head.includes("request")) return "request";
  if (head.includes("used") || head.includes("usage")) return "used";
  return null;
}

/**
 * Normalize an urgency string into one of three buckets. Used by the
 * notifications check inside the ingest endpoint.
 */
export function isUrgent(urgency: string | null): boolean {
  if (!urgency) return false;
  const u = urgency.toLowerCase();
  return u.includes("urgent");
}

/**
 * Parses Google Forms' timestamp string. Apps Script sends ISO strings
 * but the export-to-sheet flow uses locale dates like "4/3/2026 11:42:45"
 * -- both should parse via the Date constructor.
 */
export function parseTimestamp(value: unknown): Date | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const s = String(value).trim();
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}
