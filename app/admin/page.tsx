import { ConsumedTodayWidget } from "@/components/dashboard/ConsumedTodayWidget";
import { NotificationsPanel } from "@/components/dashboard/NotificationsPanel";
import { PartsInRepairWidget } from "@/components/dashboard/PartsInRepairWidget";
import { PmTypeBreakdownWidget } from "@/components/dashboard/PmTypeBreakdownWidget";
import { QuickFormLinks } from "@/components/dashboard/QuickFormLinks";
import { TopConsumersWidget } from "@/components/dashboard/TopConsumersWidget";
import { UsageByLineWidget } from "@/components/dashboard/UsageByLineWidget";
import { WeeklyOverviewChart } from "@/components/dashboard/WeeklyOverviewChart";
import { WelcomeHeader } from "@/components/dashboard/WelcomeHeader";
import { YesterdayReportWidget } from "@/components/dashboard/YesterdayReportWidget";

export const dynamic = "force-dynamic";

export default function AdminDashboardPage() {
  return (
    <div className="space-y-8">
      <WelcomeHeader />

      {/* Today's operational snapshot -- the numbers the team checks first thing. */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ConsumedTodayWidget />
        <YesterdayReportWidget />
        <PartsInRepairWidget />
      </div>

      {/* Attention feed + quick access to the forms the team submits daily. */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <NotificationsPanel />
        </div>
        <QuickFormLinks />
      </div>

      {/* Usage analytics -- where the parts are going and why. */}
      <div className="grid gap-4 lg:grid-cols-3">
        <TopConsumersWidget />
        <UsageByLineWidget />
        <PmTypeBreakdownWidget />
      </div>

      <WeeklyOverviewChart />
    </div>
  );
}
