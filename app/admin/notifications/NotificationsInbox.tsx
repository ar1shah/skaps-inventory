"use client";

import { useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  AlertTriangle,
  Bell,
  CircleAlert,
  CircleHelp,
  Check,
  ClipboardList,
  CheckCheck,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, formatDateTime } from "@/lib/utils";
import { markAllAsRead, markAsRead } from "./actions";
import type { Notification } from "@/lib/supabase/types";

const iconByType: Record<string, React.ReactNode> = {
  new_request: <ClipboardList className="h-3.5 w-3.5" />,
  urgent_request: <CircleAlert className="h-3.5 w-3.5" />,
  low_stock: <AlertTriangle className="h-3.5 w-3.5" />,
  unknown_skaps: <CircleHelp className="h-3.5 w-3.5" />,
};

const toneByType: Record<string, "accent" | "warning" | "danger" | "neutral"> = {
  new_request: "accent",
  urgent_request: "danger",
  low_stock: "warning",
  unknown_skaps: "neutral",
};

export function NotificationsInbox({ notifications }: { notifications: Notification[] }) {
  const [pending, startTransition] = useTransition();

  function handleMark(id: string) {
    startTransition(async () => {
      try {
        await markAsRead(id);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to mark as read");
      }
    });
  }

  function handleMarkAll() {
    startTransition(async () => {
      try {
        await markAllAsRead();
        toast.success("All notifications marked as read");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed");
      }
    });
  }

  const unread = notifications.filter((n) => !n.read_at);

  if (notifications.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Bell className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-900">No notifications yet</p>
          <p className="mt-1 text-xs text-slate-500">
            We&apos;ll let you know when a new request comes in or stock dips.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      {unread.length > 0 && (
        <div className="mb-3 flex justify-end">
          <Button size="sm" variant="outline" onClick={handleMarkAll} disabled={pending}>
            <CheckCheck className="h-4 w-4" />
            Mark all as read
          </Button>
        </div>
      )}

      <Card>
        <ul className="divide-y divide-slate-100">
          {notifications.map((n) => (
            <li
              key={n.id}
              className={cn(
                "flex items-start gap-3 px-5 py-4",
                !n.read_at && "bg-blue-50/40",
              )}
            >
              <Badge tone={toneByType[n.type] ?? "neutral"} className="mt-0.5 gap-1">
                {iconByType[n.type] ?? <Bell className="h-3.5 w-3.5" />}
                {n.type.replace(/_/g, " ")}
              </Badge>

              <div className="min-w-0 flex-1">
                <p className="font-medium text-slate-900">
                  {n.link ? (
                    <Link href={n.link} className="hover:underline">
                      {n.title}
                    </Link>
                  ) : (
                    n.title
                  )}
                </p>
                {n.body && <p className="mt-0.5 text-sm text-slate-600">{n.body}</p>}
                <p className="mt-1 text-xs text-slate-400">{formatDateTime(n.created_at)}</p>
              </div>

              {!n.read_at && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleMark(n.id)}
                  disabled={pending}
                  aria-label="Mark as read"
                >
                  <Check className="h-4 w-4 text-slate-500" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
