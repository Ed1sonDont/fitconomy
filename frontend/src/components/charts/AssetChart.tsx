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

// Keep one point per day – the last snapshot of each day
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
  const deltaColor = point.delta >= 0 ? "text-emerald-600" : "text-red-500";
  const deltaSign = point.delta >= 0 ? "+" : "";

  return (
    <div className="rounded-lg border bg-background p-3 shadow-lg text-sm">
      <p className="font-semibold text-muted-foreground mb-1">
        {label ? format(parseISO(label), "M月d日", { locale: zhCN }) : ""}
      </p>
      <p className="font-bold text-lg">₣ {payload[0].value.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
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

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <defs>
          <linearGradient id="assetGradient" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="5%"
              stopColor={isGrowing ? "#10b981" : "#ef4444"}
              stopOpacity={0.3}
            />
            <stop
              offset="95%"
              stopColor={isGrowing ? "#10b981" : "#ef4444"}
              stopOpacity={0}
            />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          tickFormatter={(v) => {
            try {
              return format(parseISO(v), "M/d");
            } catch {
              return v;
            }
          }}
          interval="preserveStartEnd"
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          domain={[Math.floor(minVal * 0.98), Math.ceil(maxVal * 1.02)]}
          width={60}
          tickFormatter={(v) => `₣${v.toFixed(0)}`}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="value"
          stroke={isGrowing ? "#10b981" : "#ef4444"}
          strokeWidth={2}
          fill="url(#assetGradient)"
          dot={false}
          activeDot={{ r: 4, strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
