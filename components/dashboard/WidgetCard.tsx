import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface WidgetCardProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  href?: string;
  className?: string;
  children: React.ReactNode;
}

/**
 * Shared shell for every dashboard tile. If `href` is provided the
 * whole card becomes a link to a detail page (e.g. the consumed-today
 * widget links to /admin/used). Otherwise it just renders as a plain
 * card.
 */
export function WidgetCard({
  title,
  description,
  icon,
  href,
  className,
  children,
}: WidgetCardProps) {
  const inner = (
    <Card className={cn("h-full transition-shadow", href && "hover:shadow-md", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
            {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
          </div>
          {icon && <div className="rounded-md bg-blue-50 p-2 text-blue-700">{icon}</div>}
        </div>
      </CardHeader>
      <CardContent className="pt-1">{children}</CardContent>
      {href && (
        <div className="px-5 pb-4 pt-1 text-xs font-medium text-blue-700">
          <span className="inline-flex items-center gap-1">
            Open
            <ArrowRight className="h-3 w-3" />
          </span>
        </div>
      )}
    </Card>
  );

  if (href) {
    return (
      <Link href={href} className="block focus-visible:outline-none">
        {inner}
      </Link>
    );
  }
  return inner;
}
