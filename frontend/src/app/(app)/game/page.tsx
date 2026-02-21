"use client";

import { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PixelRestaurant } from "@/components/pixel/PixelRestaurant";
import { assetApi, foodApi } from "@/lib/api";
import type { AssetCurrentOut, FoodItem } from "@/types";
import { Gamepad2, TrendingUp, TrendingDown, Sparkles, Wallet, Trophy } from "lucide-react";
import { motion } from "framer-motion";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

export default function GamePage() {
  const [asset, setAsset] = useState<AssetCurrentOut | null>(null);
  const [recentItems, setRecentItems] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [assetRes, foodRes] = await Promise.all([
        assetApi.current(),
        foodApi.getDaily(format(new Date(), "yyyy-MM-dd")),
      ]);
      setAsset(assetRes.data);
      const items = (foodRes.data.records as { items: FoodItem[] }[]).flatMap((r) => r.items);
      setRecentItems(items);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const isUp = (asset?.change_24h ?? 0) >= 0;

  if (loading) {
    return (
      <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-5">
        <Skeleton className="h-7 w-32 rounded-full" />
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
        <Skeleton className="h-80 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    );
  }

  return (
    <motion.div
      className="p-4 md:p-6 max-w-2xl mx-auto space-y-5"
      variants={container}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Gamepad2 className="h-5 w-5 text-chart-5" />
          虚拟餐厅
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          你记录的食物会出现在这里，餐厅随资产成长而升级
        </p>
      </motion.div>

      {/* Asset summary */}
      <div className="grid grid-cols-3 gap-3">
        <motion.div variants={item}>
          <Card className="border-0 shadow-md shadow-black/5">
            <CardContent className="p-4 text-center">
              <div className="mx-auto w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
                <Wallet className="h-4 w-4 text-primary" />
              </div>
              <p className="text-[10px] text-muted-foreground font-medium">当前净值</p>
              <p className="text-base font-bold text-primary mt-0.5">
                ₣{(asset?.current_value ?? 1000).toFixed(0)}
              </p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div variants={item}>
          <Card className="border-0 shadow-md shadow-black/5">
            <CardContent className="p-4 text-center">
              <div className={`mx-auto w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${isUp ? "bg-primary/10" : "bg-destructive/10"}`}>
                {isUp ? <TrendingUp className="h-4 w-4 text-primary" /> : <TrendingDown className="h-4 w-4 text-destructive" />}
              </div>
              <p className="text-[10px] text-muted-foreground font-medium">最近变动</p>
              <p className={`text-base font-bold mt-0.5 ${isUp ? "text-primary" : "text-destructive"}`}>
                {isUp ? "+" : ""}{(asset?.change_24h_pct ?? 0).toFixed(1)}%
              </p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div variants={item}>
          <Card className="border-0 shadow-md shadow-black/5">
            <CardContent className="p-4 text-center">
              <div className="mx-auto w-9 h-9 rounded-xl bg-chart-4/10 flex items-center justify-center mb-2">
                <Trophy className="h-4 w-4 text-chart-4" />
              </div>
              <p className="text-[10px] text-muted-foreground font-medium">历史最高</p>
              <p className="text-base font-bold mt-0.5 text-chart-4">
                ₣{(asset?.all_time_high ?? 1000).toFixed(0)}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Pixel restaurant — dark container for pixel art */}
      <motion.div variants={item} className="rounded-2xl overflow-hidden bg-[#1a1a2e] p-1">
        <PixelRestaurant
          foodItems={recentItems}
          assetValue={asset?.current_value ?? 1000}
        />
      </motion.div>

      {/* How it works */}
      <motion.div variants={item}>
        <Card className="border-0 shadow-md shadow-black/5 bg-gradient-to-br from-chart-5/5 to-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 font-semibold text-chart-5">
              <Sparkles className="h-4 w-4" />
              餐厅成长规则
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-2.5">
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="text-[10px] shrink-0 rounded-full">体重下降</Badge>
              <span>每减 0.1 kg → 资产 +0.5%，餐厅客流增加</span>
            </div>
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="text-[10px] shrink-0 rounded-full">记录饮食</Badge>
              <span>每次记录 → 资产 +0.1%，食物加入菜单</span>
            </div>
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="text-[10px] shrink-0 rounded-full">热量达标</Badge>
              <span>热量在目标范围内 → 额外 +0.2%</span>
            </div>
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="text-[10px] shrink-0 rounded-full">连续打卡</Badge>
              <span>3 天 +1%，7 天 +3% 额外奖励</span>
            </div>
            <p className="pt-1 text-chart-5/70 leading-relaxed">
              资产 ≥ ₣1200 → 小有名气 · ≥ ₣2000 → 街坊口碑店 · ≥ ₣3000 → 人气名店 · ≥ ₣5000 → 米其林星级
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
