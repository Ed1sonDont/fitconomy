"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { AssetChart } from "@/components/charts/AssetChart";
import { WeightChart } from "@/components/charts/WeightChart";
import { dashboardApi } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import type { DashboardData } from "@/types";
import { TrendingUp, TrendingDown, Flame, Zap, Trophy, Wallet, CalendarDays } from "lucide-react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { motion } from "framer-motion";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.07 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

function DashboardSkeleton() {
  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-5">
      <div>
        <Skeleton className="h-4 w-28 rounded-full" />
        <Skeleton className="h-7 w-44 mt-2 rounded-full" />
      </div>
      <Skeleton className="h-44 w-full rounded-2xl" />
      <Skeleton className="h-56 w-full rounded-2xl" />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
      <Skeleton className="h-56 w-full rounded-2xl" />
    </div>
  );
}

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
    return <DashboardSkeleton />;
  }

  return (
    <motion.div
      className="p-4 md:p-6 max-w-4xl mx-auto space-y-5"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {/* Header */}
      <motion.div variants={item}>
        <p className="text-muted-foreground text-sm flex items-center gap-1.5">
          <CalendarDays className="h-3.5 w-3.5" />
          {today}
        </p>
        <h1 className="text-2xl font-bold mt-1">
          你好，{user?.username} 👋
        </h1>
      </motion.div>

      {/* Asset Card – Hero */}
      <motion.div variants={item}>
        <Card className="border-0 shadow-lg shadow-primary/5 bg-gradient-to-br from-primary/8 via-card to-chart-5/5 overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-muted-foreground text-sm flex items-center gap-1.5 font-medium">
                  <Wallet className="h-4 w-4" />
                  虚拟资产净值
                </p>
                <p className="text-4xl md:text-5xl font-bold text-foreground mt-3 tracking-tight">
                  ₣{(data?.asset_current ?? 1000).toLocaleString("zh-CN", {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  })}
                  <span className="text-lg text-muted-foreground font-normal">
                    .{((data?.asset_current ?? 1000) % 1).toFixed(2).slice(2)}
                  </span>
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <span className={`inline-flex items-center gap-1 text-sm font-semibold px-2.5 py-0.5 rounded-full ${isAssetUp ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>
                    {isAssetUp ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                    {isAssetUp ? "+" : ""}{data?.asset_change_pct.toFixed(2)}%
                  </span>
                  <span className="text-muted-foreground text-xs">最近变动</span>
                </div>
              </div>
              <div className="bg-card rounded-2xl px-5 py-4 text-center shadow-sm border border-border">
                <p className="text-xs text-muted-foreground font-medium">连续打卡</p>
                <p className="text-3xl font-bold text-chart-3 mt-1">{data?.streak_days ?? 0}</p>
                <p className="text-xs text-muted-foreground">天</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Asset Chart */}
      <motion.div variants={item}>
        <Card className="border-0 shadow-md shadow-black/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 font-semibold">
              <TrendingUp className="h-4 w-4 text-primary" />
              资产曲线（近 30 天）
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AssetChart data={data?.asset_history ?? []} />
          </CardContent>
        </Card>
      </motion.div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-4">
        <motion.div variants={item}>
          <Card className="h-full border-0 shadow-md shadow-black/5">
            <CardContent className="p-5">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="p-2 rounded-xl bg-chart-3/10">
                  <Flame className="h-5 w-5 text-chart-3" />
                </div>
                <span className="text-sm font-semibold">今日热量</span>
              </div>
              <p className="text-3xl font-bold text-chart-3">{data?.today_calories ?? 0}</p>
              <p className="text-sm text-muted-foreground mb-3">
                / {data?.calorie_target ?? 2000} kcal
              </p>
              <Progress value={data?.calorie_pct ?? 0} className="h-2.5 rounded-full" />
              <p className="text-xs text-muted-foreground mt-2">
                {(data?.calorie_pct ?? 0).toFixed(0)}% 已完成
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="h-full border-0 shadow-md shadow-black/5">
            <CardContent className="p-5">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="p-2 rounded-xl bg-chart-5/10">
                  <Zap className="h-5 w-5 text-chart-5" />
                </div>
                <span className="text-sm font-semibold">当前体重</span>
              </div>
              {data?.weight_current ? (
                <>
                  <p className="text-3xl font-bold text-chart-5">{data.weight_current}<span className="text-lg font-normal text-muted-foreground"> kg</span></p>
                  {data.weight_goal && (
                    <p className="text-sm text-muted-foreground mt-1">
                      距目标{" "}
                      <span className={`font-semibold ${data.weight_current > data.weight_goal ? "text-chart-3" : "text-primary"}`}>
                        {Math.abs(data.weight_current - data.weight_goal).toFixed(1)} kg
                      </span>
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground mt-2">今日未记录体重</p>
              )}
              <Badge variant="secondary" className="mt-3 rounded-full">
                目标: {data?.weight_goal ? `${data.weight_goal}kg` : "未设定"}
              </Badge>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Weight Chart */}
      <motion.div variants={item}>
        <Card className="border-0 shadow-md shadow-black/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 font-semibold">
              <Trophy className="h-4 w-4 text-chart-4" />
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
      </motion.div>
    </motion.div>
  );
}
