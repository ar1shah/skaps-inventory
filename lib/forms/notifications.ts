/**
 * Post-insert notification generator. Called from /api/ingest right after
 * a submission is upserted.
 *
 * The submissions table trigger has already decremented stock (for exact
 * SKAPS# matches) by the time we get here.
 *
 * For "used" submissions:
 *   - Exact match → emit stock_updated notification
 *   - No match    → flag submission as needs_review, emit unknown_skaps
 *                   notification with fuzzy-match suggestions if any
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, NotificationInsert, Submission } from "@/lib/supabase/types";
import { isUrgent } from "./normalize";

type Client = SupabaseClient<Database>;

/** Normalize a SKAPS# for fuzzy comparison: uppercase, strip non-alphanum */
function normalizeSkaps(s: string): string {
  return s.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/**
 * Find parts whose normalized skaps_number is similar to the submitted value.
 * Returns up to 3 candidates.
 */
async function findFuzzyMatches(
  client: Client,
  submittedSkaps: string,
): Promise<Array<{ skaps_number: string; name: string }>> {
  const norm = normalizeSkaps(submittedSkaps);
  if (norm.length < 2) return [];

  // Fetch all parts (parts table is small enough; ~2k rows is fine)
  const { data: allParts } = await client
    .from("parts")
    .select("skaps_number, name")
    .limit(5000);

  if (!allParts) return [];

  return allParts
    .filter((p) => {
      if (!p.skaps_number) return false;
      const pNorm = normalizeSkaps(p.skaps_number);
      return pNorm.includes(norm) || norm.includes(pNorm);
    })
    .slice(0, 3);
}

export async function emitNotificationsForSubmission(
  client: Client,
  submission: Submission,
): Promise<void> {
  const inserts: NotificationInsert[] = [];

  // ── Parts Requests ────────────────────────────────────────────────────────
  if (submission.form_type === "request") {
    inserts.push({
      type: "new_request",
      title: `Parts request: ${submission.part_description ?? "(no description)"}`,
      body: `${submission.employee_name ?? "Someone"} requested ${submission.quantity ?? "?"} ${
        submission.skaps_number ? `of ${submission.skaps_number}` : ""
      }`.trim(),
      link: "/admin/requests",
    });

    if (isUrgent(submission.urgency)) {
      inserts.push({
        type: "urgent_request",
        title: `Urgent: ${submission.part_description ?? "(no description)"}`,
        body: submission.notes ?? null,
        link: "/admin/requests",
      });
    }
  }

  // ── Parts Used ────────────────────────────────────────────────────────────
  if (submission.form_type === "used" && submission.skaps_number) {
    const { data: part } = await client
      .from("parts")
      .select("skaps_number, name, current_quantity, reorder_threshold")
      .eq("skaps_number", submission.skaps_number)
      .maybeSingle();

    if (!part) {
      // No exact match — flag for manual review and suggest fuzzy candidates
      const fuzzy = await findFuzzyMatches(client, submission.skaps_number);
      const suggestions =
        fuzzy.length > 0
          ? `\nPossible matches: ${fuzzy.map((f) => `${f.skaps_number} (${f.name})`).join(", ")}`
          : "\nNo similar SKAPS# found in the master list.";

      inserts.push({
        type: "unknown_skaps",
        title: `Unmatched SKAPS #: ${submission.skaps_number}`,
        body:
          `${submission.employee_name ?? "Someone"} logged ${submission.quantity ?? "?"} used but ` +
          `"${submission.skaps_number}" doesn't match any part in the master list. ` +
          `Qty was NOT deducted. Please review manually.${suggestions}`,
        link: "/admin/used",
      });

      // Mark the submission so it's highlighted in the admin used log
      await client
        .from("submissions")
        .update({ status: "needs_review" })
        .eq("id", submission.id);
    } else {
      // Exact match — stock was already decremented by the DB trigger
      inserts.push({
        type: "stock_updated",
        title: `Stock updated: ${part.name} (${part.skaps_number})`,
        body:
          `${submission.employee_name ?? "Someone"} used ${submission.quantity ?? "?"} unit(s). ` +
          `New qty: ${Math.max(0, part.current_quantity)}.`,
        link: "/admin/inventory",
      });

      // Also check for low stock after the deduction
      if (
        part.reorder_threshold !== null &&
        part.current_quantity <= part.reorder_threshold
      ) {
        inserts.push({
          type: "low_stock",
          title: `Low stock: ${part.name} (${part.skaps_number})`,
          body: `Only ${Math.max(0, part.current_quantity)} left (reorder at ${part.reorder_threshold}).`,
          link: "/admin/inventory",
        });
      }
    }
  }

  if (submission.form_type === "used" && !submission.skaps_number) {
    // Used form submitted without any SKAPS# at all
    inserts.push({
      type: "unknown_skaps",
      title: "Parts used: no SKAPS # provided",
      body:
        `${submission.employee_name ?? "Someone"} logged a parts-used entry with no SKAPS number. ` +
        `Part: ${submission.part_description ?? "(no description)"}. Qty was NOT deducted.`,
      link: "/admin/used",
    });

    await client
      .from("submissions")
      .update({ status: "needs_review" })
      .eq("id", submission.id);
  }

  if (inserts.length === 0) return;

  const { error } = await client.from("notifications").insert(inserts);
  if (error) {
    console.error("Failed to write notifications", error);
  }
}
