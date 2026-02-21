"use client";

import { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PixelRestaurant } from "@/components/pixel/PixelRestaurant";
import { assetApi, foodApi } from "@/lib/api";
import type { AssetCurrentOut, FoodItem } from "@/types";
import { Gamepad2, TrendingUp, TrendingDown, Sparkles } from "lucide-react";

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

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Gamepad2 className="h-6 w-6 text-purple-500" />
          虚拟餐厅
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          你记录的食物会出现在这里，餐厅随资产成长而升级
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground animate-pulse">加载餐厅中…</div>
      ) : (
        <>
          {/* Asset summary */}
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-xs text-muted-foreground">当前净值</p>
                <p className="font-bold text-lg mt-1">
                  ₣ {(asset?.current_value ?? 1000).toFixed(0)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-xs text-muted-foreground">最近变动</p>
                <p className={`font-bold text-lg mt-1 flex items-center justify-center gap-1 ${isUp ? "text-emerald-600" : "text-red-500"}`}>
                  {isUp ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                  {isUp ? "+" : ""}{(asset?.change_24h_pct ?? 0).toFixed(1)}%
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-xs text-muted-foreground">历史最高</p>
                <p className="font-bold text-lg mt-1 text-amber-500">
                  ₣ {(asset?.all_time_high ?? 1000).toFixed(0)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Main restaurant */}
          <Card>
            <CardContent className="p-4">
              <PixelRestaurant
                foodItems={recentItems}
                assetValue={asset?.current_value ?? 1000}
              />
            </CardContent>
          </Card>

          {/* How it works */}
          <Card className="bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-purple-700 dark:text-purple-300">
                <Sparkles className="h-4 w-4" />
                餐厅成长规则
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-purple-800 dark:text-purple-200 space-y-1.5">
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="text-xs shrink-0">体重下降</Badge>
                <span>每减 0.1 kg → 资产 +0.5%，餐厅客流增加</span>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="text-xs shrink-0">记录饮食</Badge>
                <span>每次记录 → 资产 +0.1%，食物加入菜单</span>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="text-xs shrink-0">热量达标</Badge>
                <span>热量在目标范围内 → 额外 +0.2%</span>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="text-xs shrink-0">连续打卡</Badge>
                <span>3 天 +1%，7 天 +3% 额外奖励</span>
              </div>
              <p className="pt-1 text-purple-600 dark:text-purple-400">
                资产 ≥ ₣1200 → 小有名气 &nbsp;
                ≥ ₣2000 → 街坊口碑店 &nbsp;
                ≥ ₣3000 → 人气名店 &nbsp;
                ≥ ₣5000 → 米其林星级 ⭐
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
