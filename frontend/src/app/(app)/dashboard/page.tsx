"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AssetChart } from "@/components/charts/AssetChart";
import { WeightChart } from "@/components/charts/WeightChart";
import { dashboardApi } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import type { DashboardData } from "@/types";
import { TrendingUp, TrendingDown, Flame, Zap, Trophy } from "lucide-react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await dashboardApi.today();
      setData(res.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const today = format(new Date(), "M月d日 EEEE", { locale: zhCN });
  const isAssetUp = (data?.asset_change_pct ?? 0) >= 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground animate-pulse">加载中…</div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <p className="text-muted-foreground text-sm">{today}</p>
        <h1 className="text-2xl font-bold">
          你好，{user?.username} 👋
        </h1>
      </div>

      {/* Asset Card – Hero */}
      <Card className="border-0 bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-xl">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-emerald-100 text-sm font-medium mb-1">虚拟资产净值</p>
              <p className="text-4xl font-bold tracking-tight">
                ₣ {(data?.asset_current ?? 1000).toLocaleString("zh-CN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
              <div className="flex items-center gap-1.5 mt-2">
                {isAssetUp ? (
                  <TrendingUp className="h-4 w-4 text-emerald-200" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-300" />
                )}
                <span className={`text-sm font-medium ${isAssetUp ? "text-emerald-100" : "text-red-300"}`}>
                  {isAssetUp ? "+" : ""}{data?.asset_change_pct.toFixed(2)}%
                </span>
                <span className="text-emerald-200 text-xs">最近变动</span>
              </div>
            </div>
            <div className="text-right">
              <div className="bg-white/20 rounded-lg px-3 py-1.5">
                <p className="text-xs text-emerald-100">连续打卡</p>
                <p className="text-2xl font-bold">{data?.streak_days ?? 0}</p>
                <p className="text-xs text-emerald-100">天</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Asset Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
            资产曲线（近 30 天）
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AssetChart data={data?.asset_history ?? []} />
        </CardContent>
      </Card>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Calories */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Flame className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-medium">今日热量</span>
            </div>
            <p className="text-2xl font-bold">{data?.today_calories ?? 0}</p>
            <p className="text-xs text-muted-foreground mb-2">
              / {data?.calorie_target ?? 2000} kcal 目标
            </p>
            <Progress
              value={data?.calorie_pct ?? 0}
              className="h-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {(data?.calorie_pct ?? 0).toFixed(0)}% 已完成
            </p>
          </CardContent>
        </Card>

        {/* Weight */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="h-4 w-4 text-indigo-500" />
              <span className="text-sm font-medium">当前体重</span>
            </div>
            {data?.weight_current ? (
              <>
                <p className="text-2xl font-bold">{data.weight_current} kg</p>
                {data.weight_goal && (
                  <p className="text-xs text-muted-foreground mt-1">
                    距目标{" "}
                    <span className={data.weight_current > data.weight_goal ? "text-red-500" : "text-emerald-600"}>
                      {Math.abs(data.weight_current - data.weight_goal).toFixed(1)} kg
                    </span>
                    {data.weight_current > data.weight_goal ? " 需减重" : " 已达标！"}
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">今日未记录体重</p>
            )}
            <Badge variant="secondary" className="mt-2 text-xs">
              目标: {data?.weight_goal ? `${data.weight_goal}kg` : "未设定"}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Weight Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="h-4 w-4 text-indigo-500" />
            体重趋势（近 30 天）
          </CardTitle>
        </CardHeader>
        <CardContent>
          <WeightChart
            data={data?.weight_history ?? []}
            goalWeight={data?.weight_goal}
          />
        </CardContent>
      </Card>
    </div>
  );
}
