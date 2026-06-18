import { Truck, PackageCheck } from "lucide-react";
import { ComingSoonWidget } from "@/components/dashboard/ComingSoonWidget";
import { ConsumedTodayWidget } from "@/components/dashboard/ConsumedTodayWidget";
import { NotificationsPanel } from "@/components/dashboard/NotificationsPanel";
import { PartsInRepairWidget } from "@/components/dashboard/PartsInRepairWidget";
import { QuickFormLinks } from "@/components/dashboard/QuickFormLinks";
import { WeeklyOverviewChart } from "@/components/dashboard/WeeklyOverviewChart";
import { WelcomeHeader } from "@/components/dashboard/WelcomeHeader";
import { YesterdayReportWidget } from "@/components/dashboard/YesterdayReportWidget";

export const dynamic = "force-dynamic";

export default function AdminDashboardPage() {
  return (
    <div className="space-y-8">
      <WelcomeHeader />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ConsumedTodayWidget />
        <YesterdayReportWidget />
        <NotificationsPanel />
        <PartsInRepairWidget />
        <ComingSoonWidget
          title="Parts delivered"
          description="Received POs"
          icon={<PackageCheck className="h-4 w-4" />}
        />
        <ComingSoonWidget
          title="Parts in transit"
          description="Ordered, not yet received"
          icon={<Truck className="h-4 w-4" />}
        />
        <QuickFormLinks />
      </div>

      <WeeklyOverviewChart />
    </div>
  );
}
