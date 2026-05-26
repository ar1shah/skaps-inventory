import type { Metadata } from "next";
import Link from "next/link";
import { Boxes } from "lucide-react";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Sign in",
  description: "SKAPS admin sign in.",
};

interface PageProps {
  searchParams: Promise<{ next?: string }>;
}

export default async function LoginPage({ searchParams }: PageProps) {
  const { next } = await searchParams;

  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex items-center gap-2">
          <Boxes className="h-6 w-6 text-blue-700" />
          <span className="text-base font-semibold tracking-tight text-slate-900">
            SKAPS Parts Inventory
          </span>
        </Link>

        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900">Admin sign in</h1>
          <p className="mt-1 text-sm text-slate-500">
            Use the email and password your team admin set up for you.
          </p>

          <LoginForm next={next ?? "/admin"} />
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          Not an admin?{" "}
          <Link href="/inventory" className="font-medium text-blue-700 hover:underline">
            Browse the public inventory
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
