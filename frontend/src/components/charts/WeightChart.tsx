"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { format, parseISO } from "date-fns";
import { zhCN } from "date-fns/locale";

interface WeightPoint {
  date: string;
  weight_kg: number;
}

interface WeightChartProps {
  data: WeightPoint[];
  goalWeight?: number | null;
}

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="pixel-border p-2 shadow-lg text-xs" style={{ backgroundColor: "var(--cozy-bg-panel)" }}>
      <p className="pixel-body text-[10px]" style={{ color: "var(--cozy-muted)" }}>
        {label ? format(parseISO(label), "M月d日 (E)", { locale: zhCN }) : ""}
      </p>
      <p className="pixel-body text-sm font-bold mt-0.5" style={{ color: "var(--cozy-border)" }}>
        {payload[0].value} kg
      </p>
    </div>
  );
};

export function WeightChart({ data, goalWeight }: WeightChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-36 text-xs pixel-body" style={{ color: "var(--cozy-muted)" }}>
        暂无体重数据
      </div>
    );
  }

  const values = data.map((d) => d.weight_kg);
  const minVal = Math.min(...values, goalWeight ?? Infinity);
  const maxVal = Math.max(...values);

  return (
    <ResponsiveContainer width="100%" height={140}>
      <LineChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--cozy-bg-deep)" />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 9, fill: "var(--cozy-muted)", fontFamily: "Silkscreen, monospace" }}
          tickFormatter={(v) => {
            try { return format(parseISO(v), "M/d"); } catch { return v; }
          }}
          interval="preserveStartEnd"
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 9, fill: "var(--cozy-muted)", fontFamily: "Silkscreen, monospace" }}
          domain={[Math.floor(minVal - 1), Math.ceil(maxVal + 1)]}
          width={45}
          tickFormatter={(v) => `${v}kg`}
        />
        <Tooltip content={<CustomTooltip />} />
        {goalWeight && (
          <ReferenceLine
            y={goalWeight}
            stroke="#7cb083"
            strokeDasharray="5 5"
            label={{ value: `目标 ${goalWeight}kg`, fill: "#7cb083", fontSize: 9 }}
          />
        )}
        <Line
          type="monotone"
          dataKey="weight_kg"
          stroke="#b8956e"
          strokeWidth={2}
          dot={{ r: 2, fill: "#b8956e", strokeWidth: 0 }}
          activeDot={{ r: 4, strokeWidth: 1, stroke: "#b8956e", fill: "#b8956e" }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
