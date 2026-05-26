import * as React from "react";
import { Construction } from "lucide-react";
import { WidgetCard } from "./WidgetCard";

interface Props {
  title: string;
  description: string;
  icon?: React.ReactNode;
}

/** Used by the Parts Delivered + Parts In Transit widgets in v1. */
export function ComingSoonWidget({ title, description, icon }: Props) {
  return (
    <WidgetCard
      title={title}
      description={description}
      icon={icon ?? <Construction className="h-4 w-4" />}
      href="/admin/delivered"
    >
      <div className="rounded-md border border-dashed border-slate-200 bg-slate-50/60 px-3 py-3">
        <p className="text-xs font-medium text-slate-600">Coming soon</p>
        <p className="mt-0.5 text-xs text-slate-500">
          Tracking workflow is on the roadmap. Submissions already capture the
          status / PO # fields needed for this view.
        </p>
      </div>
    </WidgetCard>
  );
}
