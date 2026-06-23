/**
 * Post-insert notification generator. Called from /api/ingest right after
 * a submission is upserted.
 *
 * The submissions table trigger has already decremented stock (for exact
 * or normalized SKAPS# matches) by the time we get here.
 *
 * For "used" submissions:
 *   - Match found → emit stock_updated notification
 *   - No match    → flag submission as needs_review, emit unknown_skaps
 *                   notification with fuzzy-match suggestions if any
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, NotificationInsert, Submission } from "@/lib/supabase/types";
import { isUrgent } from "./normalize";
import {
  findFuzzySkapsMatches,
  findPartBySkapsNumber,
} from "@/lib/inventory/skaps-match";

type Client = SupabaseClient<Database>;

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
    const part = await findPartBySkapsNumber(client, submission.skaps_number);

    if (!part) {
      const fuzzy = await findFuzzySkapsMatches(client, submission.skaps_number);
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

      await client
        .from("submissions")
        .update({ status: "needs_review" })
        .eq("id", submission.id);
    } else {
      const matchedNote =
        submission.skaps_number !== part.skaps_number
          ? ` Typed as "${submission.skaps_number}", matched to ${part.skaps_number}.`
          : "";

      inserts.push({
        type: "stock_updated",
        title: `Stock updated: ${part.name} (${part.skaps_number})`,
        body:
          `${submission.employee_name ?? "Someone"} used ${submission.quantity ?? "?"} unit(s).` +
          `${matchedNote} New qty: ${Math.max(0, part.current_quantity)}.`,
        link: "/admin/inventory",
      });

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
