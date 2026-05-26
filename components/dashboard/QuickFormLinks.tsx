import { ArrowUpRight, ClipboardCheck, FileQuestion } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function QuickFormLinks() {
  const usedUrl = process.env.NEXT_PUBLIC_GFORM_USED_URL ?? "";
  const requestUrl = process.env.NEXT_PUBLIC_GFORM_REQUEST_URL ?? "";

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Quick form links</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              The same forms the maintenance team uses.
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <FormLink
            url={usedUrl}
            icon={<ClipboardCheck className="h-4 w-4" />}
            label="Parts used"
          />
          <FormLink
            url={requestUrl}
            icon={<FileQuestion className="h-4 w-4" />}
            label="Parts request"
          />
        </div>
      </CardContent>
    </Card>
  );
}

function FormLink({
  url,
  icon,
  label,
}: {
  url: string;
  icon: React.ReactNode;
  label: string;
}) {
  const isConfigured = url && url.length > 0 && !url.includes("your-");
  if (!isConfigured) {
    return (
      <div className="rounded-md border border-dashed border-amber-300 bg-amber-50/60 px-3 py-3 text-xs text-amber-800">
        {label}: not configured
      </div>
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:border-blue-300 hover:bg-blue-50/40 hover:text-blue-700"
    >
      <span className="flex items-center gap-2">
        {icon}
        {label}
      </span>
      <ArrowUpRight className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100" />
    </a>
  );
}
