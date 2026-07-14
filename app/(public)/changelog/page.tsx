import type { Metadata } from "next";
import { History } from "lucide-react";
import { ChangelogTimeline } from "@/components/changelog/ChangelogTimeline";
import { releases } from "@/lib/changelog/releases";

export const metadata: Metadata = {
  title: "Changelog",
  description: "A running history of updates and improvements to the SKAPS Parts Inventory app.",
};

export default function ChangelogPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <header className="max-w-2xl">
        <p className="text-sm font-medium uppercase tracking-wider text-blue-700">Changelog</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          What&apos;s new
        </h1>
        <p className="mt-3 text-base text-slate-600">
          A running history of the updates and improvements we&apos;ve made to
          the SKAPS Parts Inventory app since launch. Newest changes are listed
          first.
        </p>
      </header>

      <div className="mt-12">
        <ChangelogTimeline releases={releases} />
      </div>

      <div className="mt-14 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
        <History className="h-4 w-4 shrink-0 text-slate-400" />
        <span>
          This page is updated as we ship changes. Have a question about a
          release? Reach out to the maintenance team.
        </span>
      </div>
    </div>
  );
}
