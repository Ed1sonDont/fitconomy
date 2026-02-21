"use client";

import { useEffect, useState } from "react";
import type { FoodItem } from "@/types";

interface Props {
  foodItems: FoodItem[];
  assetValue: number;
}

const PIXEL_MAP: Record<string, string> = {
  rice: "🍚",
  meat: "🥩",
  vegetable: "🥦",
  fruit: "🍎",
  dairy: "🥛",
  drink: "🍵",
  snack: "🍪",
  other: "🍽️",
};

function RestaurantLevel(assetValue: number): { level: number; name: string; color: string } {
  if (assetValue >= 5000) return { level: 5, name: "米其林星级", color: "text-yellow-500" };
  if (assetValue >= 3000) return { level: 4, name: "人气名店", color: "text-orange-500" };
  if (assetValue >= 2000) return { level: 3, name: "街坊口碑店", color: "text-emerald-600" };
  if (assetValue >= 1200) return { level: 2, name: "小有名气", color: "text-sky-500" };
  return { level: 1, name: "初创小店", color: "text-muted-foreground" };
}

const TABLES = [
  { x: 10, y: 30, seats: 2 },
  { x: 40, y: 30, seats: 2 },
  { x: 70, y: 30, seats: 2 },
  { x: 10, y: 60, seats: 4 },
  { x: 55, y: 60, seats: 4 },
];

// Simple pseudo-random visitor count based on asset value
function visitorCount(assetValue: number): number {
  return Math.min(Math.floor((assetValue / 1000) * 3), 12);
}

export function PixelRestaurant({ foodItems, assetValue }: Props) {
  const [tick, setTick] = useState(0);

  // Animate every 2 seconds
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 2000);
    return () => clearInterval(id);
  }, []);

  const { level, name, color } = RestaurantLevel(assetValue);
  const visitors = visitorCount(assetValue);

  const menuItems = foodItems.slice(0, 8);

  return (
    <div className="font-mono select-none">
      {/* Restaurant sign */}
      <div className="text-center mb-4">
        <div className="inline-block border-4 border-amber-400 bg-amber-50 dark:bg-amber-950 px-6 py-3 rounded-lg">
          <p className="text-2xl">🏮 Fitconomy 食堂 🏮</p>
          <p className={`text-sm font-bold ${color} mt-1`}>
            {"⭐".repeat(level)} {name}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            今日客流：{visitors} 桌
          </p>
        </div>
      </div>

      {/* Pixel grid scene */}
      <div className="relative bg-amber-50 dark:bg-zinc-900 border-2 border-amber-200 dark:border-zinc-700 rounded-lg overflow-hidden"
        style={{ height: "220px", fontFamily: "monospace" }}
      >
        {/* Floor tiles */}
        <div className="absolute inset-0 grid grid-cols-12 grid-rows-6 opacity-20">
          {Array.from({ length: 72 }).map((_, i) => (
            <div key={i} className="border border-amber-200 dark:border-zinc-700" />
          ))}
        </div>

        {/* Tables */}
        {TABLES.map((table, i) => {
          const isOccupied = i < Math.ceil(visitors / 2);
          const customerEmoji = isOccupied
            ? tick % 2 === 0 ? "🧑‍🍽️" : "👤"
            : "  ";
          return (
            <div
              key={i}
              className="absolute text-center"
              style={{ left: `${table.x}%`, top: `${table.y}%` }}
            >
              <div className="text-lg leading-none">🪑</div>
              <div className="text-base leading-none">{isOccupied ? customerEmoji : "💺"}</div>
            </div>
          );
        })}

        {/* Counter / kitchen area */}
        <div className="absolute bottom-0 left-0 right-0 bg-amber-100 dark:bg-zinc-800 border-t-2 border-amber-300 dark:border-zinc-600 flex items-center gap-2 px-3 py-1.5">
          <span>👨‍🍳</span>
          <div className="flex gap-1 flex-wrap">
            {menuItems.length > 0 ? (
              menuItems.map((item, i) => (
                <span key={i} title={item.name} className="text-base cursor-default" style={{ imageRendering: "pixelated" }}>
                  {PIXEL_MAP[item.pixel_icon_type] || "🍽️"}
                </span>
              ))
            ) : (
              <span className="text-xs text-muted-foreground italic">记录饮食来填充菜单…</span>
            )}
          </div>
        </div>
      </div>

      {/* Menu display */}
      {menuItems.length > 0 && (
        <div className="mt-3 border rounded-lg p-3 bg-card">
          <p className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wide">今日菜单</p>
          <div className="grid grid-cols-2 gap-1.5">
            {menuItems.map((item, i) => (
              <div key={i} className="flex items-center gap-1.5 text-sm">
                <span>{PIXEL_MAP[item.pixel_icon_type] || "🍽️"}</span>
                <span className="truncate text-muted-foreground">{item.name}</span>
                <span className="ml-auto text-xs text-orange-500 shrink-0">{item.calories}k</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
