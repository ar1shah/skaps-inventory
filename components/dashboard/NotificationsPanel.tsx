import Link from "next/link";
import {
  AlertTriangle,
  ArrowDownCircle,
  Bell,
  CircleAlert,
  CircleHelp,
  ClipboardList,
} from "lucide-react";
import { WidgetCard } from "./WidgetCard";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { cn, formatDateTime } from "@/lib/utils";

const iconByType: Record<string, React.ReactNode> = {
  new_request: <ClipboardList className="h-3.5 w-3.5" />,
  urgent_request: <CircleAlert className="h-3.5 w-3.5" />,
  low_stock: <AlertTriangle className="h-3.5 w-3.5" />,
  unknown_skaps: <CircleHelp className="h-3.5 w-3.5" />,
  stock_updated: <ArrowDownCircle className="h-3.5 w-3.5" />,
};

const toneByType: Record<string, "accent" | "warning" | "danger" | "neutral" | "success"> = {
  new_request: "accent",
  urgent_request: "danger",
  low_stock: "warning",
  unknown_skaps: "neutral",
  stock_updated: "success",
};

const toneBgByType: Record<string, string> = {
  new_request: "bg-blue-100 text-blue-700",
  urgent_request: "bg-red-100 text-red-700",
  low_stock: "bg-amber-100 text-amber-700",
  unknown_skaps: "bg-slate-100 text-slate-600",
  stock_updated: "bg-green-100 text-green-700",
};

export async function NotificationsPanel() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("id, type, title, body, link, created_at, read_at")
    .order("created_at", { ascending: false })
    .limit(5);

  const notifications = data ?? [];

  return (
    <WidgetCard
      title="Notifications"
      description="Latest 5 alerts"
      icon={<Bell className="h-4 w-4" />}
      href="/admin/notifications"
    >
      {notifications.length === 0 ? (
        <p className="text-xs text-slate-500">No notifications yet.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {notifications.map((n) => (
            <li key={n.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
              <div
                className={cn(
                  "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                  toneBgByType[n.type] ?? "bg-slate-100 text-slate-600",
                )}
              >
                {iconByType[n.type] ?? <Bell className="h-3.5 w-3.5" />}
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <Badge tone={toneByType[n.type] ?? "neutral"} className="w-fit">
                  {n.type.replace(/_/g, " ")}
                </Badge>
                <p className="text-sm font-medium leading-snug text-slate-900">
                  {n.link ? (
                    <Link href={n.link} className="hover:underline">
                      {n.title}
                    </Link>
                  ) : (
                    n.title
                  )}
                </p>
                <p className="text-xs text-slate-500">{formatDateTime(n.created_at)}</p>
              </div>
              {!n.read_at && (
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-700" />
              )}
            </li>
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}
