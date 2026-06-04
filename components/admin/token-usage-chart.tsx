"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { TooltipValueType } from "recharts";
import type { TokenUsageByDay } from "@/lib/db/analytics";

type TokenUsageChartProps = {
  data: TokenUsageByDay[];
};

function formatTokenValue(value: TooltipValueType | undefined) {
  const normalized = Array.isArray(value) ? value[0] : value;
  const numeric = typeof normalized === "number" ? normalized : Number(normalized);
  return Number.isFinite(numeric) ? numeric.toLocaleString() : "0";
}

export function TokenUsageChart({ data }: TokenUsageChartProps) {
  const hasUsage = data.some((item) => item.tokens > 0);

  if (!hasUsage) {
    return <ChartEmpty label="No token usage data yet" />;
  }

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="tokenGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "#6b7280" }}
            tickFormatter={(v) => v.slice(5)}
            stroke="#e5e7eb"
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#6b7280" }}
            tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
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
            formatter={(value) => [formatTokenValue(value), "Tokens"]}
            labelFormatter={(label) => `Date: ${label}`}
          />
          <Area
            type="monotone"
            dataKey="tokens"
            stroke="#6366f1"
            strokeWidth={2}
            fill="url(#tokenGrad)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function ChartEmpty({ label }: { label: string }) {
  return (
    <div className="flex h-[300px] items-center justify-center rounded-2xl border border-gray-200 bg-gray-50">
      <p className="text-sm text-gray-400">{label}</p>
    </div>
  );
}
