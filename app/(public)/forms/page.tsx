import Link from "next/link";
import type { Metadata } from "next";
import { ArrowUpRight, ClipboardCheck, FileQuestion } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Forms",
  description: "Open the parts-used or parts-request Google Form.",
};

export default function FormsPage() {
  const usedUrl = process.env.NEXT_PUBLIC_GFORM_USED_URL ?? "";
  const requestUrl = process.env.NEXT_PUBLIC_GFORM_REQUEST_URL ?? "";

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
      <header className="max-w-2xl">
        <p className="text-sm font-medium uppercase tracking-wider text-blue-700">Forms</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          Submit a parts form
        </h1>
        <p className="mt-3 text-base text-slate-600">
          These open the same Google Forms the maintenance team has always
          used. Submissions sync to this dashboard automatically -- you
          don&apos;t have to do anything extra.
        </p>
      </header>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <FormCta
          title="Parts used"
          description="Log parts you took off the shelf so stock counts stay accurate."
          icon={<ClipboardCheck className="h-6 w-6" />}
          url={usedUrl}
          ctaLabel="Open the parts-used form"
        />
        <FormCta
          title="Parts request"
          description="Ask for a part that's out of stock or that we don't carry yet."
          icon={<FileQuestion className="h-6 w-6" />}
          url={requestUrl}
          ctaLabel="Open the parts-request form"
        />
      </div>

      <p className="mt-10 text-sm text-slate-500">
        Need to view what we have in stock first?{" "}
        <Link href="/inventory" className="font-medium text-blue-700 hover:underline">
          Browse the inventory
        </Link>
        .
      </p>
    </div>
  );
}

function FormCta({
  title,
  description,
  icon,
  url,
  ctaLabel,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  url: string;
  ctaLabel: string;
}) {
  const isConfigured = url && url.length > 0 && !url.includes("your-");

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex h-11 w-11 items-center justify-center rounded-md bg-blue-50 text-blue-700">
          {icon}
        </div>
        <CardTitle className="mt-3 text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="mt-auto pb-6">
        {isConfigured ? (
          <Button asChild size="lg" className="w-full">
            <a href={url} target="_blank" rel="noopener noreferrer">
              {ctaLabel}
              <ArrowUpRight className="h-4 w-4" />
            </a>
          </Button>
        ) : (
          <div className="rounded-md border border-dashed border-amber-300 bg-amber-50 px-3 py-3 text-xs text-amber-800">
            This form link hasn&apos;t been configured yet. Set
            <code className="mx-1 rounded bg-amber-100 px-1 py-0.5 font-mono">
              {title === "Parts used" ? "NEXT_PUBLIC_GFORM_USED_URL" : "NEXT_PUBLIC_GFORM_REQUEST_URL"}
            </code>
            in your environment.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
