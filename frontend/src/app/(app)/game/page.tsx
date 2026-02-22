"use client";

import { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { PixelRestaurant } from "@/components/pixel/PixelRestaurant";
import { assetApi, foodApi, dashboardApi, weightApi } from "@/lib/api";
import type {
  AssetCurrentOut,
  AssetHistoryPoint,
  FoodItem,
  DashboardData,
  WeightRecord,
  DailyFoodSummary,
} from "@/types";

export default function GamePage() {
  const [asset, setAsset] = useState<AssetCurrentOut | null>(null);
  const [assetHistory, setAssetHistory] = useState<AssetHistoryPoint[]>([]);
  const [recentItems, setRecentItems] = useState<FoodItem[]>([]);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [weightRecords, setWeightRecords] = useState<WeightRecord[]>([]);
  const [foodSummary, setFoodSummary] = useState<DailyFoodSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const today = format(new Date(), "yyyy-MM-dd");
      const [assetRes, foodRes, dashRes, weightRes, historyRes, foodSumRes] =
        await Promise.all([
          assetApi.current(),
          foodApi.getDaily(today),
          dashboardApi.today(),
          weightApi.list(90),
          assetApi.history(30),
          foodApi.getDaily(today),
        ]);
      setAsset(assetRes.data);
      const items = (foodRes.data.records as { items: FoodItem[] }[]).flatMap(
        (r) => r.items
      );
      setRecentItems(items);
      setDashboard(dashRes.data);
      setWeightRecords(weightRes.data);
      setAssetHistory(historyRes.data);
      setFoodSummary(foodSumRes.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refreshData = useCallback(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-3">
        <Skeleton className="h-10 w-full rounded bg-[var(--cozy-bg-panel)]" />
        <Skeleton className="h-[300px] w-full rounded bg-[var(--cozy-bg-panel)]" />
        <Skeleton className="h-10 w-full rounded bg-[var(--cozy-bg-panel)]" />
        <Skeleton className="h-[200px] w-full rounded bg-[var(--cozy-bg-panel)]" />
      </div>
    );
  }

  return (
    <div className="p-3 md:p-4 max-w-2xl mx-auto">
      <PixelRestaurant
        foodItems={recentItems}
        assetValue={asset?.current_value ?? 1000}
        asset={asset}
        assetHistory={assetHistory}
        dashboard={dashboard}
        weightRecords={weightRecords}
        foodSummary={foodSummary}
        onDataRefresh={refreshData}
      />
    </div>
  );
}
