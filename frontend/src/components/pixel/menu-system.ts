/**
 * Menu system that links user's food records to the restaurant game.
 */

import type { FoodItem } from "@/types";

export interface MenuItem {
  name: string;
  iconType: string;
  calories: number;
  timesOrdered: number;
  isSignature: boolean;
  profit: number;
}

export interface MenuState {
  items: MenuItem[];
  signatureCount: number;
}

const PROFIT_BY_TYPE: Record<string, number> = {
  rice: 1,
  meat: 3,
  vegetable: 2,
  fruit: 2,
  dairy: 2,
  drink: 1,
  snack: 2,
  other: 1,
};

const FOOD_COLORS: Record<string, string> = {
  rice: "#fff8e1",
  meat: "#d32f2f",
  vegetable: "#4caf50",
  fruit: "#ff9800",
  dairy: "#e3f2fd",
  drink: "#81d4fa",
  snack: "#ffcc02",
  other: "#9e9e9e",
};

export function getFoodColor(iconType: string): string {
  return FOOD_COLORS[iconType] ?? "#9e9e9e";
}

export function buildMenu(foodItems: FoodItem[]): MenuState {
  const map = new Map<string, MenuItem>();

  for (const item of foodItems) {
    const existing = map.get(item.name);
    if (existing) {
      existing.timesOrdered++;
      if (existing.timesOrdered >= 3) {
        existing.isSignature = true;
      }
    } else {
      map.set(item.name, {
        name: item.name,
        iconType: item.pixel_icon_type ?? "other",
        calories: item.calories ?? 0,
        timesOrdered: 1,
        isSignature: false,
        profit: PROFIT_BY_TYPE[item.pixel_icon_type ?? "other"] ?? 1,
      });
    }
  }

  const items = Array.from(map.values());
  const signatureCount = items.filter((i) => i.isSignature).length;

  return { items, signatureCount };
}

export function getRandomMenuItem(menu: MenuState): MenuItem | null {
  if (menu.items.length === 0) return null;

  // Signature dishes are 3x more likely to be ordered
  const weighted: MenuItem[] = [];
  for (const item of menu.items) {
    const weight = item.isSignature ? 3 : 1;
    for (let i = 0; i < weight; i++) weighted.push(item);
  }

  return weighted[Math.floor(Math.random() * weighted.length)];
}

export function getMenuSatisfactionBonus(menu: MenuState): number {
  return Math.min(menu.items.length * 2, 15);
}

export function getMenuProfit(item: MenuItem): number {
  return item.isSignature ? item.profit * 2 : item.profit;
}
