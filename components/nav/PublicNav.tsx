import Link from "next/link";
import { Boxes } from "lucide-react";
import { Button } from "@/components/ui/button";

const links = [
  { href: "/", label: "Home" },
  { href: "/inventory", label: "Inventory" },
  { href: "/forms", label: "Forms" },
];

export function PublicNav() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <Boxes className="h-6 w-6 text-blue-700" />
          <span className="text-base font-semibold tracking-tight text-slate-900">
            SKAPS Parts Inventory
          </span>
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <Button variant="outline" size="sm" asChild>
          <Link href="/login">Admin sign in</Link>
        </Button>
      </div>
    </header>
  );
}
