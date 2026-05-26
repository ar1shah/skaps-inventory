/**
 * Post-insert notification generator. Called from /api/ingest right after
 * a submission is upserted.
 *
 * The submissions table trigger has already decremented stock by the time
 * we get here, so checking for low-stock means doing a fresh SELECT on
 * the part rather than relying on the row we just inserted.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, NotificationInsert, Submission } from "@/lib/supabase/types";
import { isUrgent } from "./normalize";

type Client = SupabaseClient<Database>;

export async function emitNotificationsForSubmission(
  client: Client,
  submission: Submission,
): Promise<void> {
  const inserts: NotificationInsert[] = [];

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

  // For "used" submissions, check if the part exists and whether we've
  // crossed the reorder threshold. If the SKAPS number doesn't exist in
  // the master parts table at all, flag it so the admin can add it.
  if (submission.form_type === "used" && submission.skaps_number) {
    const { data: part } = await client
      .from("parts")
      .select("skaps_number, name, current_quantity, reorder_threshold")
      .eq("skaps_number", submission.skaps_number)
      .maybeSingle();

    if (!part) {
      inserts.push({
        type: "unknown_skaps",
        title: `Unknown SKAPS #: ${submission.skaps_number}`,
        body:
          `${submission.employee_name ?? "Someone"} logged usage for a SKAPS number that isn't in the master parts list. ` +
          `Add it from inventory management or correct the submission.`,
        link: "/admin/inventory",
      });
    } else if (
      part.reorder_threshold !== null &&
      part.current_quantity <= part.reorder_threshold
    ) {
      inserts.push({
        type: "low_stock",
        title: `Low stock: ${part.name} (${part.skaps_number})`,
        body: `Only ${part.current_quantity} ${"unit" in part ? "" : ""}left in stock (reorder at ${part.reorder_threshold}).`,
        link: "/admin/inventory",
      });
    }
  }

  if (inserts.length === 0) return;

  const { error } = await client.from("notifications").insert(inserts);
  if (error) {
    // Don't blow up the ingest pipeline if we can't write a notification.
    // Stock and submissions are the source of truth; notifications are
    // a nice-to-have.
    console.error("Failed to write notifications", error);
  }
}
