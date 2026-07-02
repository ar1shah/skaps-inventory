"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatNumber } from "@/lib/utils";

export interface SlicePoint {
  label: string;
  value: number;
}

// Distinct, colorblind-friendlyish palette reused across the donut/pie widgets.
const COLORS = [
  "#1d4ed8",
  "#0ea5e9",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#64748b",
];

export function UsageByLineChartClient({ data, total }: { data: SlicePoint[]; total: number }) {
  return (
    <div className="flex h-full min-h-0 gap-4">
      <div className="h-full w-1/2 min-w-0 shrink-0 self-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              innerRadius="55%"
              outerRadius="85%"
              paddingAngle={2}
              strokeWidth={0}
            >
              {data.map((entry, idx) => (
                <Cell key={entry.label} fill={COLORS[idx % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                fontSize: 12,
                borderRadius: 8,
                border: "1px solid #e2e8f0",
                boxShadow: "0 1px 3px rgba(15, 23, 42, 0.06)",
              }}
              formatter={(value, name) => {
                const n = Number(value ?? 0);
                return [`${formatNumber(n)} (${Math.round((n / total) * 100)}%)`, String(name)];
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      {/* min-h-0 is required for overflow-y-auto to actually clip inside a
          fixed-height flex row instead of growing the row (and the card)
          to fit every legend item. */}
      <ul className="flex h-full min-h-0 flex-1 flex-col justify-center space-y-1.5 overflow-y-auto pr-1">
        {data.map((entry, idx) => (
          <li key={entry.label} className="flex items-center justify-between gap-2 text-xs">
            <span className="flex min-w-0 items-center gap-1.5 truncate">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: COLORS[idx % COLORS.length] }}
              />
              <span className="truncate text-slate-700">{entry.label}</span>
            </span>
            <span className="shrink-0 font-medium text-slate-900">
              {Math.round((entry.value / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
