/**
 * SKAPS# lookup helpers. Form submissions often type the number with
 * different casing or separators than the master list (e.g. "insert 164"
 * vs "INSERT_164"). We match on a normalized form before flagging unknown.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { normalizeSkapsNumber } from "@/lib/forms/normalize";
import { fetchAllRows } from "@/lib/supabase/fetch-all";

type Client = SupabaseClient<Database>;

export type PartLookupRow = {
  skaps_number: string;
  name: string;
  current_quantity: number;
  reorder_threshold: number | null;
};

const PART_SELECT =
  "skaps_number, name, current_quantity, reorder_threshold" as const;

function toPartLookupRow(row: {
  skaps_number: string;
  name: string;
  current_quantity: number | string;
  reorder_threshold: number | string | null;
}): PartLookupRow {
  return {
    skaps_number: row.skaps_number,
    name: row.name,
    current_quantity: Number(row.current_quantity),
    reorder_threshold:
      row.reorder_threshold === null ? null : Number(row.reorder_threshold),
  };
}

function pickUniqueMatch(
  rows: Array<{
    skaps_number: string;
    name: string;
    current_quantity: number | string;
    reorder_threshold: number | string | null;
  }>,
): PartLookupRow | null {
  if (rows.length !== 1) return null;
  return toPartLookupRow(rows[0]!);
}

/**
 * Resolve a submitted SKAPS# to a master-list part. Tries exact match first,
 * then a Postgres RPC that uses the same normalization as the stock trigger.
 */
export async function findPartBySkapsNumber(
  client: Client,
  submittedSkaps: string,
): Promise<PartLookupRow | null> {
  const { data: exact } = await client
    .from("parts")
    .select(PART_SELECT)
    .eq("skaps_number", submittedSkaps)
    .maybeSingle();

  if (exact) return toPartLookupRow(exact);

  const { data: rpcRows, error: rpcError } = await client.rpc(
    "find_part_by_skaps_number",
    { submitted: submittedSkaps },
  );

  if (!rpcError && rpcRows) {
    const match = pickUniqueMatch(rpcRows);
    if (match) return match;
  }

  return findPartBySkapsNumberInMemory(client, submittedSkaps);
}

async function findPartBySkapsNumberInMemory(
  client: Client,
  submittedSkaps: string,
): Promise<PartLookupRow | null> {
  const norm = normalizeSkapsNumber(submittedSkaps);
  if (norm.length === 0) return null;

  const { data: allParts, error } = await fetchAllRows<{
    skaps_number: string;
    name: string;
    current_quantity: number | string;
    reorder_threshold: number | string | null;
  }>((from, to) =>
    client.from("parts").select(PART_SELECT).range(from, to),
  );

  if (error) return null;

  const matches = allParts.filter(
    (p) => p.skaps_number && normalizeSkapsNumber(p.skaps_number) === norm,
  );

  return pickUniqueMatch(matches);
}

/**
 * Fuzzy candidates when normalized lookup fails — partial substring match
 * on the normalized form. Returns up to 3 suggestions for admin review.
 */
export async function findFuzzySkapsMatches(
  client: Client,
  submittedSkaps: string,
): Promise<Array<{ skaps_number: string; name: string }>> {
  const norm = normalizeSkapsNumber(submittedSkaps);
  if (norm.length < 2) return [];

  const { data: allParts, error } = await fetchAllRows<{
    skaps_number: string;
    name: string;
  }>((from, to) =>
    client.from("parts").select("skaps_number, name").range(from, to),
  );

  if (error) return [];

  return allParts
    .filter((p) => {
      if (!p.skaps_number) return false;
      const pNorm = normalizeSkapsNumber(p.skaps_number);
      return pNorm.includes(norm) || norm.includes(pNorm);
    })
    .slice(0, 3);
}
