import type { Metadata } from "next";
import { ChangelogTimeline } from "@/components/changelog/ChangelogTimeline";
import { releases } from "@/lib/changelog/releases";

export const metadata: Metadata = {
  title: "Changelog",
};

export default function AdminChangelogPage() {
  return (
    <div>
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Changelog</h1>
        <p className="mt-1 text-sm text-slate-500">
          A running history of updates and improvements to the SKAPS Parts Inventory app.
          Newest changes are listed first.
        </p>
      </header>

      <div className="mt-6 max-w-3xl">
        <ChangelogTimeline releases={releases} />
      </div>
    </div>
  );
}
