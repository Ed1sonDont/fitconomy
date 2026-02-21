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
    <div className="border border-border bg-card rounded-xl p-3 shadow-lg text-sm">
      <p className="text-muted-foreground mb-1 text-xs">
        {label ? format(parseISO(label), "M月d日 (E)", { locale: zhCN }) : ""}
      </p>
      <p className="font-bold text-lg text-chart-5">{payload[0].value} kg</p>
    </div>
  );
};

export function WeightChart({ data, goalWeight }: WeightChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        暂无体重数据
      </div>
    );
  }

  const values = data.map((d) => d.weight_kg);
  const minVal = Math.min(...values, goalWeight ?? Infinity);
  const maxVal = Math.max(...values);

  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.90 0.005 260)" />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11, fill: "oklch(0.50 0.02 260)" }}
          tickFormatter={(v) => {
            try { return format(parseISO(v), "M/d"); } catch { return v; }
          }}
          interval="preserveStartEnd"
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11, fill: "oklch(0.50 0.02 260)" }}
          domain={[Math.floor(minVal - 1), Math.ceil(maxVal + 1)]}
          width={50}
          tickFormatter={(v) => `${v}kg`}
        />
        <Tooltip content={<CustomTooltip />} />
        {goalWeight && (
          <ReferenceLine
            y={goalWeight}
            stroke="oklch(0.65 0.17 160)"
            strokeDasharray="5 5"
            label={{ value: `目标 ${goalWeight}kg`, fill: "oklch(0.65 0.17 160)", fontSize: 11 }}
          />
        )}
        <Line
          type="monotone"
          dataKey="weight_kg"
          stroke="oklch(0.60 0.16 300)"
          strokeWidth={2.5}
          dot={{ r: 3, fill: "oklch(0.60 0.16 300)", strokeWidth: 0 }}
          activeDot={{ r: 5, strokeWidth: 2, stroke: "white" }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
