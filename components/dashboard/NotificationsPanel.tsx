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
import { formatDateTime } from "@/lib/utils";

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
        <ul className="space-y-2">
          {notifications.map((n) => (
            <li key={n.id} className="flex items-start gap-2">
              <Badge tone={toneByType[n.type] ?? "neutral"} className="mt-0.5 gap-1">
                {iconByType[n.type] ?? <Bell className="h-3.5 w-3.5" />}
                {n.type.replace(/_/g, " ")}
              </Badge>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-slate-900">
                  {n.link ? (
                    <Link href={n.link} className="hover:underline">
                      {n.title}
                    </Link>
                  ) : (
                    n.title
                  )}
                </p>
                <p className="text-[11px] text-slate-500">{formatDateTime(n.created_at)}</p>
              </div>
              {!n.read_at && <span className="mt-1 h-2 w-2 rounded-full bg-blue-700" />}
            </li>
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}
