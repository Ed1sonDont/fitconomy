/**
 * Upgrade shop system with 9 upgrade types, exponential pricing, and localStorage persistence.
 */

export interface UpgradeItem {
  id: string;
  category: "kitchen" | "hall" | "decor" | "special";
  name: string;
  description: string;
  effect: string;
  maxLevel: number;
  baseCost: number;
  icon: string;
}

export interface UpgradeState {
  levels: Record<string, number>;
  totalGoldSpent: number;
}

export const UPGRADES: UpgradeItem[] = [
  {
    id: "stove_level",
    category: "kitchen",
    name: "灶台等级",
    description: "提升厨师做饭速度",
    effect: "做饭速度 -15%/级",
    maxLevel: 5,
    baseCost: 10,
    icon: "🔥",
  },
  {
    id: "chef_count",
    category: "kitchen",
    name: "厨师数量",
    description: "增加厨师，可以同时做多道菜",
    effect: "+1 厨师/级",
    maxLevel: 3,
    baseCost: 50,
    icon: "👨‍🍳",
  },
  {
    id: "table_count",
    category: "hall",
    name: "桌椅数量",
    description: "增加餐桌，容纳更多顾客",
    effect: "+1 桌/级",
    maxLevel: 6,
    baseCost: 20,
    icon: "🪑",
  },
  {
    id: "table_level",
    category: "hall",
    name: "桌椅等级",
    description: "更好的桌椅提升顾客体验",
    effect: "满意度 +10%/级",
    maxLevel: 5,
    baseCost: 15,
    icon: "✨",
  },
  {
    id: "waiter_count",
    category: "hall",
    name: "服务员数量",
    description: "增加服务员，送餐更快",
    effect: "+1 服务员/级",
    maxLevel: 3,
    baseCost: 40,
    icon: "🤵",
  },
  {
    id: "wall_decor",
    category: "decor",
    name: "墙面装饰",
    description: "挂上装饰画和海报",
    effect: "满意度 +5%/级",
    maxLevel: 5,
    baseCost: 8,
    icon: "🖼",
  },
  {
    id: "floor_level",
    category: "decor",
    name: "地板等级",
    description: "升级地板材质",
    effect: "满意度 +3%/级",
    maxLevel: 3,
    baseCost: 12,
    icon: "🟫",
  },
  {
    id: "cat_mascot",
    category: "decor",
    name: "吉祥猫",
    description: "招来一只猫咪坐镇！触发特殊事件和随机小费",
    effect: "解锁猫咪 + 随机小费",
    maxLevel: 1,
    baseCost: 100,
    icon: "🐱",
  },
  {
    id: "takeout_window",
    category: "special",
    name: "外卖窗口",
    description: "开通外卖服务，被动收入",
    effect: "每 60 秒 +1 金币",
    maxLevel: 1,
    baseCost: 200,
    icon: "📦",
  },
];

export function getUpgradeCost(item: UpgradeItem, currentLevel: number): number {
  return Math.floor(item.baseCost * Math.pow(1.5, currentLevel));
}

export function getLevel(state: UpgradeState, id: string): number {
  return state.levels[id] ?? 0;
}

export function canUpgrade(state: UpgradeState, item: UpgradeItem, gold: number): boolean {
  const current = getLevel(state, item.id);
  if (current >= item.maxLevel) return false;
  return gold >= getUpgradeCost(item, current);
}

export function applyUpgrade(state: UpgradeState, item: UpgradeItem): number {
  const current = getLevel(state, item.id);
  const cost = getUpgradeCost(item, current);
  state.levels[item.id] = current + 1;
  state.totalGoldSpent += cost;
  return cost;
}

export function createUpgradeState(): UpgradeState {
  return { levels: {}, totalGoldSpent: 0 };
}

export function getTableCount(state: UpgradeState): number {
  return 2 + getLevel(state, "table_count");
}

export function getChefCount(state: UpgradeState): number {
  return 1 + getLevel(state, "chef_count");
}

export function getWaiterCount(state: UpgradeState): number {
  return 1 + getLevel(state, "waiter_count");
}

export function getCookSpeedMultiplier(state: UpgradeState): number {
  return 1 - getLevel(state, "stove_level") * 0.15;
}

export function getSatisfactionBonus(state: UpgradeState): number {
  return (
    getLevel(state, "table_level") * 0.10 +
    getLevel(state, "wall_decor") * 0.05 +
    getLevel(state, "floor_level") * 0.03
  );
}

export function hasCat(state: UpgradeState): boolean {
  return getLevel(state, "cat_mascot") >= 1;
}

export function hasTakeout(state: UpgradeState): boolean {
  return getLevel(state, "takeout_window") >= 1;
}

const STORAGE_KEY_PREFIX = "fitconomy_upgrades";

export function saveUpgradeState(state: UpgradeState, userId?: string): void {
  const key = userId ? `${STORAGE_KEY_PREFIX}_${userId}` : STORAGE_KEY_PREFIX;
  try {
    localStorage.setItem(key, JSON.stringify(state));
  } catch { /* quota exceeded */ }
}

export function loadUpgradeState(userId?: string): UpgradeState {
  const key = userId ? `${STORAGE_KEY_PREFIX}_${userId}` : STORAGE_KEY_PREFIX;
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as UpgradeState;
  } catch { /* parse error */ }
  return createUpgradeState();
}

export const CATEGORY_LABELS: Record<string, string> = {
  kitchen: "厨房",
  hall: "大厅",
  decor: "装饰",
  special: "特殊",
};
