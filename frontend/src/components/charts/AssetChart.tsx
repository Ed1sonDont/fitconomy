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
  const deltaColor = point.delta >= 0 ? "var(--cozy-positive)" : "var(--cozy-negative)";
  const deltaSign = point.delta >= 0 ? "+" : "";

  return (
    <div className="pixel-border p-2 shadow-lg text-xs" style={{ backgroundColor: "var(--cozy-bg-panel)" }}>
      <p className="pixel-body text-[10px]" style={{ color: "var(--cozy-muted)" }}>
        {label ? format(parseISO(label), "M月d日", { locale: zhCN }) : ""}
      </p>
      <p className="pixel-body text-sm font-bold mt-0.5" style={{ color: "var(--cozy-border)" }}>
        ₣ {payload[0].value.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </p>
      <p className="pixel-body text-[10px] mt-0.5" style={{ color: deltaColor }}>
        {deltaSign}{point.delta.toFixed(2)} ({point.trigger_type})
      </p>
    </div>
  );
};

export function AssetChart({ data }: AssetChartProps) {
  const chartData = aggregateByDay(data);

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-36 text-xs pixel-body" style={{ color: "var(--cozy-muted)" }}>
        暂无资产数据，先记录一次体重吧
      </div>
    );
  }

  const values = chartData.map((d) => d.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const isGrowing = values[values.length - 1] >= values[0];

  const strokeColor = isGrowing ? "#7cb083" : "#c4726a";

  return (
    <ResponsiveContainer width="100%" height={160}>
      <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
        <defs>
          <linearGradient id="assetGradientDark" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={strokeColor} stopOpacity={0.3} />
            <stop offset="95%" stopColor={strokeColor} stopOpacity={0.02} />
          </linearGradient>
        </defs>
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
          domain={[Math.floor(minVal * 0.98), Math.ceil(maxVal * 1.02)]}
          width={50}
          tickFormatter={(v) => `₣${v.toFixed(0)}`}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="value"
          stroke={strokeColor}
          strokeWidth={2}
          fill="url(#assetGradientDark)"
          dot={false}
          activeDot={{ r: 3, strokeWidth: 1, stroke: "#b8956e", fill: strokeColor }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
