import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { Notification } from "@/lib/supabase/types";
import { NotificationsInbox } from "./NotificationsInbox";

export const dynamic = "force-dynamic";

async function load(): Promise<Notification[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("failed to load notifications", error);
    return [];
  }
  return data ?? [];
}

export default async function NotificationsPage() {
  const notifications = await load();
  const unread = notifications.filter((n) => !n.read_at).length;

  return (
    <div>
      <header className="flex items-end justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-slate-900">
            <Bell className="h-5 w-5 text-blue-700" />
            Notifications
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {unread > 0 ? `${unread} unread` : "All caught up"}
          </p>
        </div>
      </header>

      <div className="mt-6">
        <NotificationsInbox notifications={notifications} />
      </div>
    </div>
  );
}
