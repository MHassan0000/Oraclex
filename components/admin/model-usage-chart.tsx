"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { TooltipValueType } from "recharts";
import type { ModelUsage } from "@/lib/db/analytics";

const COLORS = ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd", "#e0e7ff", "#818cf8"];

type ModelUsageChartProps = {
  data: ModelUsage[];
};

function formatNumericValue(value: TooltipValueType | undefined) {
  const normalized = Array.isArray(value) ? value[0] : value;
  const numeric = typeof normalized === "number" ? normalized : Number(normalized);
  return Number.isFinite(numeric) ? numeric.toLocaleString() : "0";
}

export function ModelUsageChart({ data }: ModelUsageChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center rounded-2xl border border-gray-200 bg-gray-50">
        <p className="text-sm text-gray-400">No model usage data yet</p>
      </div>
    );
  }

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="model"
            tick={{ fontSize: 10, fill: "#6b7280" }}
            stroke="#e5e7eb"
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#6b7280" }}
            stroke="#e5e7eb"
          />
          <Tooltip
            contentStyle={{
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: "12px",
              fontSize: "12px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            }}
            formatter={(value, name) => {
              if (name === "count") return [formatNumericValue(value), "Requests"];
              if (name === "tokens") return [formatNumericValue(value), "Tokens"];
              return [value, name];
            }}
          />
          <Bar dataKey="count" radius={[8, 8, 0, 0]} barSize={40}>
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
