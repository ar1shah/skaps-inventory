import { redirect } from "next/navigation";
import { AdminMobileNav } from "@/components/nav/AdminMobileNav";
import { AdminSidebar } from "@/components/nav/AdminSidebar";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Belt-and-suspenders: middleware also redirects, but if someone disables
  // middleware for testing the page itself still won't render unauth'd.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { count: unreadCount } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);

  return (
    <div className="flex min-h-dvh bg-slate-50">
      <AdminSidebar unreadCount={unreadCount ?? 0} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminMobileNav unreadCount={unreadCount ?? 0} />
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-8 sm:py-8">{children}</div>
      </div>
    </div>
  );
}
