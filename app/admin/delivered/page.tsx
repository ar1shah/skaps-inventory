import { Construction, PackageCheck, Truck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = {
  title: "Delivered / In transit",
};

export default function DeliveredPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-slate-900">
          <Truck className="h-5 w-5 text-blue-700" />
          Parts delivered / in transit
        </h1>
        <p className="mt-1 text-sm text-slate-500">See what&apos;s arrived and what&apos;s still on the way.</p>
      </header>

      <Card className="mt-8">
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          <div className="rounded-full bg-blue-50 p-3 text-blue-700">
            <Construction className="h-6 w-6" />
          </div>
          <div>
            <p className="text-base font-semibold text-slate-900">Coming soon</p>
            <p className="mt-2 max-w-md text-sm text-slate-600">
              This page is a planned feature. Soon you&apos;ll be able to view received purchase orders and
              parts that are still in transit, without leaving the admin dashboard.
            </p>
          </div>

          <div className="mt-4 grid w-full max-w-md grid-cols-1 gap-2 text-left sm:grid-cols-2">
            <Mini icon={<PackageCheck className="h-4 w-4" />} label="Received POs" />
            <Mini icon={<Truck className="h-4 w-4" />} label="In transit" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Mini({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-dashed border-slate-200 bg-slate-50/60 px-3 py-2.5 text-sm text-slate-500">
      {icon}
      {label}
    </div>
  );
}
