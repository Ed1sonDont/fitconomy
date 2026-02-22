/**
 * Achievement system with 15+ achievements, unlock detection, localStorage persistence.
 */

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition: (stats: GameStats) => boolean;
  unlockedAt?: number;
}

export interface GameStats {
  totalGold: number;
  totalCustomers: number;
  totalUpgrades: number;
  maxConcurrentCustomers: number;
  satisfactionAvg: number;
  hasCat: boolean;
  signatureDishes: number;
  nightCustomers: number;
  daysPlayed: number;
  maxGoldOnce: number;
  rareEventsSeen: number;
  totalEventsGenerated: number;
  allTablesFull: boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first_customer",
    name: "开张大吉",
    description: "迎来第一位顾客",
    icon: "🎉",
    condition: (s) => s.totalCustomers >= 1,
  },
  {
    id: "gold_100",
    name: "财源广进",
    description: "累计赚取 100 金币",
    icon: "💰",
    condition: (s) => s.totalGold >= 100,
  },
  {
    id: "gold_500",
    name: "小有身家",
    description: "累计赚取 500 金币",
    icon: "🏦",
    condition: (s) => s.totalGold >= 500,
  },
  {
    id: "gold_1000",
    name: "百万富翁",
    description: "累计赚取 1000 金币",
    icon: "👑",
    condition: (s) => s.totalGold >= 1000,
  },
  {
    id: "full_house",
    name: "满堂红",
    description: "所有桌位同时坐满顾客",
    icon: "🏠",
    condition: (s) => s.allTablesFull,
  },
  {
    id: "five_star",
    name: "五星好评",
    description: "平均满意度达到 90 分",
    icon: "⭐",
    condition: (s) => s.satisfactionAvg >= 90,
  },
  {
    id: "night_owl",
    name: "深夜食堂",
    description: "有 5 位凌晨顾客",
    icon: "🌙",
    condition: (s) => s.nightCustomers >= 5,
  },
  {
    id: "signature_dish",
    name: "招牌菜诞生",
    description: "有一道菜被点了 3 次以上",
    icon: "🍽",
    condition: (s) => s.signatureDishes >= 1,
  },
  {
    id: "cat_unlock",
    name: "猫主子驾到",
    description: "解锁吉祥猫",
    icon: "🐱",
    condition: (s) => s.hasCat,
  },
  {
    id: "regular_7",
    name: "日理万机",
    description: "累计玩了 7 天",
    icon: "📅",
    condition: (s) => s.daysPlayed >= 7,
  },
  {
    id: "customers_50",
    name: "人气餐厅",
    description: "服务了 50 位顾客",
    icon: "👥",
    condition: (s) => s.totalCustomers >= 50,
  },
  {
    id: "customers_200",
    name: "网红打卡地",
    description: "服务了 200 位顾客",
    icon: "📸",
    condition: (s) => s.totalCustomers >= 200,
  },
  {
    id: "upgrade_5",
    name: "装修狂人",
    description: "完成 5 次升级",
    icon: "🔧",
    condition: (s) => s.totalUpgrades >= 5,
  },
  {
    id: "upgrade_15",
    name: "完美主义者",
    description: "完成 15 次升级",
    icon: "✨",
    condition: (s) => s.totalUpgrades >= 15,
  },
  {
    id: "rare_event",
    name: "奇遇连连",
    description: "遇到 3 次稀有事件",
    icon: "🎲",
    condition: (s) => s.rareEventsSeen >= 3,
  },
  {
    id: "big_tipper",
    name: "大手笔",
    description: "单次获得 5 金币以上",
    icon: "🤑",
    condition: (s) => s.maxGoldOnce >= 5,
  },
  {
    id: "events_100",
    name: "故事收集者",
    description: "见证 100 个事件",
    icon: "📖",
    condition: (s) => s.totalEventsGenerated >= 100,
  },
];

export interface AchievementState {
  unlocked: Record<string, number>; // id -> timestamp
  stats: GameStats;
}

export function createAchievementState(): AchievementState {
  return {
    unlocked: {},
    stats: {
      totalGold: 0,
      totalCustomers: 0,
      totalUpgrades: 0,
      maxConcurrentCustomers: 0,
      satisfactionAvg: 50,
      hasCat: false,
      signatureDishes: 0,
      nightCustomers: 0,
      daysPlayed: 0,
      maxGoldOnce: 0,
      rareEventsSeen: 0,
      totalEventsGenerated: 0,
      allTablesFull: false,
    },
  };
}

export function checkAchievements(state: AchievementState): Achievement[] {
  const newlyUnlocked: Achievement[] = [];
  for (const ach of ACHIEVEMENTS) {
    if (state.unlocked[ach.id]) continue;
    if (ach.condition(state.stats)) {
      state.unlocked[ach.id] = Date.now();
      newlyUnlocked.push(ach);
    }
  }
  return newlyUnlocked;
}

export function getUnlockedCount(state: AchievementState): number {
  return Object.keys(state.unlocked).length;
}

const STORAGE_KEY_PREFIX = "fitconomy_achievements";

export function saveAchievementState(state: AchievementState, userId?: string): void {
  const key = userId ? `${STORAGE_KEY_PREFIX}_${userId}` : STORAGE_KEY_PREFIX;
  try {
    localStorage.setItem(key, JSON.stringify(state));
  } catch { /* noop */ }
}

export function loadAchievementState(userId?: string): AchievementState {
  const key = userId ? `${STORAGE_KEY_PREFIX}_${userId}` : STORAGE_KEY_PREFIX;
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AchievementState>;
      const base = createAchievementState();
      return {
        unlocked: { ...base.unlocked, ...(parsed.unlocked ?? {}) },
        stats: { ...base.stats, ...(parsed.stats ?? {}) },
      };
    }
  } catch { /* noop */ }
  return createAchievementState();
}
