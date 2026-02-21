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
import type { AssetHistoryPoint } from "@/types";
import { format, parseISO } from "date-fns";
import { zhCN } from "date-fns/locale";

interface AssetChartProps {
  data: AssetHistoryPoint[];
}

function aggregateByDay(data: AssetHistoryPoint[]): AssetHistoryPoint[] {
  const map = new Map<string, AssetHistoryPoint>();
  for (const point of data) {
    map.set(point.date, point);
  }
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ value: number; payload: AssetHistoryPoint }>;
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  const deltaColor = point.delta >= 0 ? "text-primary" : "text-destructive";
  const deltaSign = point.delta >= 0 ? "+" : "";

  return (
    <div className="border border-border bg-card rounded-xl p-3 shadow-lg text-sm">
      <p className="font-medium text-muted-foreground mb-1 text-xs">
        {label ? format(parseISO(label), "M月d日", { locale: zhCN }) : ""}
      </p>
      <p className="font-bold text-lg text-primary">
        ₣ {payload[0].value.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </p>
      <p className={`text-xs ${deltaColor}`}>
        {deltaSign}{point.delta.toFixed(2)} ({point.trigger_type})
      </p>
    </div>
  );
};

export function AssetChart({ data }: AssetChartProps) {
  const chartData = aggregateByDay(data);

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        暂无资产数据，先记录一次体重吧
      </div>
    );
  }

  const values = chartData.map((d) => d.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const isGrowing = values[values.length - 1] >= values[0];

  const strokeColor = isGrowing ? "oklch(0.65 0.17 160)" : "oklch(0.58 0.2 25)";

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <defs>
          <linearGradient id="assetGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={strokeColor} stopOpacity={0.2} />
            <stop offset="95%" stopColor={strokeColor} stopOpacity={0.02} />
          </linearGradient>
        </defs>
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
          domain={[Math.floor(minVal * 0.98), Math.ceil(maxVal * 1.02)]}
          width={60}
          tickFormatter={(v) => `₣${v.toFixed(0)}`}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="value"
          stroke={strokeColor}
          strokeWidth={2.5}
          fill="url(#assetGradient)"
          dot={false}
          activeDot={{ r: 4, strokeWidth: 2, stroke: "white" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
