"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { UploadStats } from "@/lib/db/analytics";

type UploadChartProps = {
  data: UploadStats[];
};

export function UploadChart({ data }: UploadChartProps) {
  const hasUploads = data.some((item) => item.uploads > 0);

  if (!hasUploads) {
    return (
      <div className="flex h-[300px] items-center justify-center rounded-2xl border border-gray-200 bg-gray-50">
        <p className="text-sm text-gray-400">No upload data yet</p>
      </div>
    );
  }

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "#6b7280" }}
            tickFormatter={(v) => v.slice(5)}
            stroke="#e5e7eb"
          />
          <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} stroke="#e5e7eb" />
          <Tooltip
            contentStyle={{
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: "12px",
              fontSize: "12px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
          />
          <Bar dataKey="ready" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} name="Ready" />
          <Bar dataKey="processing" stackId="a" fill="#6366f1" radius={[0, 0, 0, 0]} name="Processing" />
          <Bar dataKey="failed" stackId="a" fill="#ef4444" radius={[8, 8, 0, 0]} name="Failed" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
