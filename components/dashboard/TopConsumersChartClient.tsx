"use client";

import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis, ResponsiveContainer } from "recharts";

export interface ConsumerPoint {
  label: string;
  value: number;
}

export function TopConsumersChartClient({ data }: { data: ConsumerPoint[] }) {
  // Charts read top-to-bottom, but we want the biggest consumer on top --
  // recharts renders vertical bar categories bottom-up, so reverse the list.
  const chartData = [...data].reverse();

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ left: 8, right: 24, top: 8, bottom: 8 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
        <XAxis type="number" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="label"
          stroke="#94a3b8"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          width={92}
        />
        <Tooltip
          cursor={{ fill: "rgba(15, 23, 42, 0.04)" }}
          contentStyle={{
            fontSize: 12,
            borderRadius: 8,
            border: "1px solid #e2e8f0",
            boxShadow: "0 1px 3px rgba(15, 23, 42, 0.06)",
          }}
          formatter={(value) => [String(value ?? 0), "Units used (30d)"]}
        />
        <Bar dataKey="value" name="Units used" fill="#1d4ed8" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
