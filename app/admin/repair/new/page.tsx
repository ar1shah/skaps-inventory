import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NewRepairItemClient } from "./NewRepairItemClient";

export const dynamic = "force-dynamic";

export default function NewRepairItemPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link
        href="/admin/repair"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to parts in repair
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Add part in repair</CardTitle>
          <CardDescription>
            Log a part that has been sent out for external repair.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NewRepairItemClient />
        </CardContent>
      </Card>
    </div>
  );
}
