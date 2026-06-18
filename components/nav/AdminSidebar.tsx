"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  BoxIcon,
  Boxes,
  ClipboardCheck,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Settings,
  Truck,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logout } from "@/app/login/actions";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
};

const sections: { label: string; items: NavItem[] }[] = [
  {
    label: "Overview",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
      { href: "/admin/notifications", label: "Notifications", icon: Bell },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/admin/used", label: "Parts used", icon: ClipboardCheck },
      { href: "/admin/requests", label: "Parts requests", icon: ClipboardList },
      { href: "/admin/inventory", label: "Inventory", icon: BoxIcon },
      { href: "/admin/repair", label: "Parts in repair", icon: Wrench },
    ],
  },
  {
    label: "Logistics",
    items: [
      { href: "/admin/delivered", label: "Delivered / In transit", icon: Truck },
    ],
  },
  {
    label: "Account",
    items: [{ href: "/admin/settings", label: "Settings", icon: Settings }],
  },
];

export function AdminSidebar({ unreadCount }: { unreadCount: number }) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
      <div className="flex h-16 items-center gap-2 border-b border-slate-200 px-5">
        <Boxes className="h-6 w-6 text-blue-700" />
        <Link href="/admin" className="text-sm font-semibold text-slate-900">
          SKAPS Admin
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4">
        {sections.map((section, index) => (
          <div key={section.label} className={cn(index > 0 && "mt-5")}>
            <p className="mb-1.5 px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active = item.exact
                  ? pathname === item.href
                  : pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-blue-50 text-blue-700"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="flex-1">{item.label}</span>
                    {item.href === "/admin/notifications" && unreadCount > 0 && (
                      <span className="rounded-full bg-blue-700 px-2 py-0.5 text-[10px] font-semibold text-white">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-slate-200 p-3">
        <form action={logout}>
          <button
            type="submit"
            className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
