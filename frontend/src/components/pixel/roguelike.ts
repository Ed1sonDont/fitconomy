/**
 * Roguelike daily modifier system.
 * Each "game day" (real session) gets 1-3 random modifiers that alter gameplay.
 */

import type { ReputationState } from "./reputation";
import { getTierInfo } from "./reputation";

export type ModifierPolarity = "positive" | "negative" | "challenge";
export type ModifierRarity = "common" | "rare" | "legendary";

export interface DailyModifier {
  id: string;
  name: string;
  description: string;
  icon: string;
  polarity: ModifierPolarity;
  rarity: ModifierRarity;
  effects: ModifierEffects;
}

export interface ModifierEffects {
  trafficMult?: number;
  satisfactionBonus?: number;
  profitMult?: number;
  cookSpeedMult?: number;
  specialCustomerMult?: number;
  goldFlat?: number;
  timedChallenge?: { seconds: number; target: number; reward: number };
}

export interface RoguelikeState {
  activeModifiers: DailyModifier[];
  dayCount: number;
  lastDayTimestamp: number;
  totalModifiersEncountered: number;
  modifierHistory: string[];
}

const ALL_MODIFIERS: DailyModifier[] = [
  // Positive
  { id: "food_festival", name: "美食节", description: "客流量大增！所有人都想来尝鲜", icon: "🎪", polarity: "positive", rarity: "common", effects: { trafficMult: 1.5 } },
  { id: "catnip_day", name: "猫薄荷日", description: "猫咪们心情大好，满意度提升", icon: "🌿", polarity: "positive", rarity: "common", effects: { satisfactionBonus: 20 } },
  { id: "tycoon_visit", name: "富豪来访", description: "稀有顾客出现概率大增", icon: "💎", polarity: "positive", rarity: "rare", effects: { specialCustomerMult: 3 } },
  { id: "discount_supplies", name: "食材打折", description: "今天进货价便宜了，利润翻倍", icon: "🏷", polarity: "positive", rarity: "common", effects: { profitMult: 2 } },
  { id: "chef_inspiration", name: "厨师灵感爆发", description: "做饭速度翻倍！", icon: "💡", polarity: "positive", rarity: "common", effects: { cookSpeedMult: 0.5 } },
  { id: "word_of_mouth", name: "口口相传", description: "好评如潮，客流和满意度双提升", icon: "📢", polarity: "positive", rarity: "rare", effects: { trafficMult: 1.3, satisfactionBonus: 10 } },
  { id: "lucky_coin", name: "幸运金币", description: "今天开门就捡到金币！", icon: "🍀", polarity: "positive", rarity: "common", effects: { goldFlat: 5 } },
  { id: "celebrity_post", name: "网红推荐", description: "一位网红发了好评，流量暴增", icon: "📱", polarity: "positive", rarity: "rare", effects: { trafficMult: 2.0 } },
  { id: "perfect_weather", name: "完美天气", description: "天气太好了，大家都出来吃饭", icon: "🌈", polarity: "positive", rarity: "common", effects: { trafficMult: 1.3 } },
  { id: "nostalgia", name: "怀旧风潮", description: "复古餐厅今天特别受欢迎", icon: "📻", polarity: "positive", rarity: "common", effects: { satisfactionBonus: 15, profitMult: 1.3 } },

  // Negative
  { id: "supply_shortage", name: "食材涨价", description: "供应链出了问题，利润下降", icon: "📈", polarity: "negative", rarity: "common", effects: { profitMult: 0.5 } },
  { id: "storm", name: "暴风雨", description: "客流骤减，但来的顾客会待更久", icon: "⛈", polarity: "negative", rarity: "common", effects: { trafficMult: 0.5, satisfactionBonus: 10 } },
  { id: "health_inspect", name: "卫生检查", description: "检查员来了！低满意度会被罚款", icon: "🔍", polarity: "negative", rarity: "common", effects: { satisfactionBonus: -15 } },
  { id: "rival_opening", name: "竞争对手开业", description: "隔壁新开了一家餐厅，抢走了一些顾客", icon: "🏬", polarity: "negative", rarity: "common", effects: { trafficMult: 0.7 } },
  { id: "power_outage", name: "停电", description: "厨房设备受影响，做饭变慢", icon: "🔌", polarity: "negative", rarity: "common", effects: { cookSpeedMult: 1.5 } },
  { id: "cat_flu", name: "猫咪感冒", description: "吉祥猫今天没精神，无法触发猫咪事件", icon: "🤧", polarity: "negative", rarity: "common", effects: { satisfactionBonus: -5 } },
  { id: "tax_day", name: "缴税日", description: "季度税款到期，-3 金币", icon: "🧾", polarity: "negative", rarity: "common", effects: { goldFlat: -3 } },
  { id: "noise_complaint", name: "噪音投诉", description: "邻居投诉太吵，满意度降低", icon: "🔇", polarity: "negative", rarity: "common", effects: { satisfactionBonus: -10 } },
  { id: "ingredient_spoil", name: "食材变质", description: "部分食材坏了，今天利润打折", icon: "🦠", polarity: "negative", rarity: "common", effects: { profitMult: 0.7 } },
  { id: "critic_rumor", name: "差评传闻", description: "网上出现了一条差评，影响客流", icon: "👎", polarity: "negative", rarity: "common", effects: { trafficMult: 0.8, satisfactionBonus: -5 } },

  // Challenge
  { id: "speed_challenge", name: "极速挑战", description: "60秒内服务5位顾客，奖励10金币！", icon: "⚡", polarity: "challenge", rarity: "rare", effects: { timedChallenge: { seconds: 60, target: 5, reward: 10 } } },
  { id: "vip_only", name: "VIP包场", description: "今天只来1位VIP，但付10倍金币", icon: "👔", polarity: "challenge", rarity: "legendary", effects: { trafficMult: 0.2, profitMult: 10 } },
  { id: "mystery_menu", name: "盲盒菜单", description: "随机菜品，利润翻倍但满意度随机", icon: "🎁", polarity: "challenge", rarity: "rare", effects: { profitMult: 2, satisfactionBonus: -10 } },
  { id: "golden_hour", name: "黄金一小时", description: "接下来1分钟利润翻3倍！", icon: "⏰", polarity: "challenge", rarity: "legendary", effects: { profitMult: 3 } },
  { id: "cat_parade", name: "猫咪游行", description: "大量猫咪涌入！客流翻倍但场面混乱", icon: "🐈", polarity: "challenge", rarity: "rare", effects: { trafficMult: 2, satisfactionBonus: -10 } },
  { id: "critic_arrival", name: "美食评论家预告", description: "评论家今天会来！准备好了吗？", icon: "📝", polarity: "challenge", rarity: "rare", effects: { specialCustomerMult: 5, satisfactionBonus: -5 } },
  { id: "double_or_nothing", name: "双倍或全无", description: "利润翻倍，但每位不满顾客会倒扣3金币", icon: "🎰", polarity: "challenge", rarity: "legendary", effects: { profitMult: 2 } },
  { id: "rush_hour", name: "超级高峰", description: "客流暴增但厨房压力也翻倍", icon: "🔥", polarity: "challenge", rarity: "rare", effects: { trafficMult: 2.5, cookSpeedMult: 1.3 } },
  { id: "secret_recipe", name: "秘方日", description: "发现一个古老秘方，满意度大增但做菜变慢", icon: "📜", polarity: "challenge", rarity: "rare", effects: { satisfactionBonus: 30, cookSpeedMult: 1.5 } },
  { id: "investor_visit", name: "投资人考察", description: "表现好就获得20金币投资！", icon: "💼", polarity: "challenge", rarity: "legendary", effects: { goldFlat: 20, satisfactionBonus: -10 } },
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function rollDailyModifiers(reputation: ReputationState): DailyModifier[] {
  const tier = getTierInfo(reputation.value);
  const positiveWeight = tier.positiveModifierWeight;

  const count = 1 + Math.floor(Math.random() * 2); // 1-2 modifiers normally, 3 at legendary
  const finalCount = reputation.tier === "legendary" ? Math.min(count + 1, 3) : count;

  const pool = ALL_MODIFIERS.filter((m) => {
    if (m.rarity === "legendary" && Math.random() > 0.15) return false;
    if (m.rarity === "rare" && Math.random() > 0.4) return false;
    return true;
  });

  const positive = pool.filter((m) => m.polarity === "positive");
  const negative = pool.filter((m) => m.polarity === "negative");
  const challenge = pool.filter((m) => m.polarity === "challenge");

  const selected: DailyModifier[] = [];
  const usedIds = new Set<string>();

  for (let i = 0; i < finalCount; i++) {
    const roll = Math.random();
    let candidates: DailyModifier[];
    if (roll < positiveWeight) {
      candidates = positive;
    } else if (roll < positiveWeight + 0.2) {
      candidates = challenge;
    } else {
      candidates = negative;
    }
    if (candidates.length === 0) candidates = pool;

    const available = candidates.filter((m) => !usedIds.has(m.id));
    if (available.length === 0) continue;

    const chosen = pick(available);
    usedIds.add(chosen.id);
    selected.push(chosen);
  }

  return selected.length > 0 ? selected : [pick(positive)];
}

export function getAggregatedEffects(modifiers: DailyModifier[]): Required<Omit<ModifierEffects, "timedChallenge">> & { timedChallenge: ModifierEffects["timedChallenge"] } {
  const agg = {
    trafficMult: 1,
    satisfactionBonus: 0,
    profitMult: 1,
    cookSpeedMult: 1,
    specialCustomerMult: 1,
    goldFlat: 0,
    timedChallenge: undefined as ModifierEffects["timedChallenge"],
  };

  for (const mod of modifiers) {
    const e = mod.effects;
    if (e.trafficMult !== undefined) agg.trafficMult *= e.trafficMult;
    if (e.satisfactionBonus !== undefined) agg.satisfactionBonus += e.satisfactionBonus;
    if (e.profitMult !== undefined) agg.profitMult *= e.profitMult;
    if (e.cookSpeedMult !== undefined) agg.cookSpeedMult *= e.cookSpeedMult;
    if (e.specialCustomerMult !== undefined) agg.specialCustomerMult *= e.specialCustomerMult;
    if (e.goldFlat !== undefined) agg.goldFlat += e.goldFlat;
    if (e.timedChallenge !== undefined) agg.timedChallenge = e.timedChallenge;
  }

  return agg;
}

export function createRoguelikeState(): RoguelikeState {
  return {
    activeModifiers: [],
    dayCount: 0,
    lastDayTimestamp: 0,
    totalModifiersEncountered: 0,
    modifierHistory: [],
  };
}

export function isNewDay(state: RoguelikeState): boolean {
  if (state.lastDayTimestamp === 0) return true;
  const lastDate = new Date(state.lastDayTimestamp).toDateString();
  const today = new Date().toDateString();
  return lastDate !== today;
}

export function startNewDay(state: RoguelikeState, modifiers: DailyModifier[]): void {
  state.activeModifiers = modifiers;
  state.dayCount++;
  state.lastDayTimestamp = Date.now();
  state.totalModifiersEncountered += modifiers.length;
  for (const m of modifiers) {
    if (!state.modifierHistory.includes(m.id)) {
      state.modifierHistory.push(m.id);
    }
  }
}

export function getModifierById(id: string): DailyModifier | undefined {
  return ALL_MODIFIERS.find((m) => m.id === id);
}

export function getAllModifiers(): DailyModifier[] {
  return ALL_MODIFIERS;
}

const STORAGE_KEY = "fitconomy_roguelike";

export function saveRoguelikeState(state: RoguelikeState, userId?: string): void {
  const key = userId ? `${STORAGE_KEY}_${userId}` : STORAGE_KEY;
  try {
    const data = {
      dayCount: state.dayCount,
      lastDayTimestamp: state.lastDayTimestamp,
      totalModifiersEncountered: state.totalModifiersEncountered,
      modifierHistory: state.modifierHistory,
      activeModifierIds: state.activeModifiers.map((m) => m.id),
    };
    localStorage.setItem(key, JSON.stringify(data));
  } catch { /* noop */ }
}

export function loadRoguelikeState(userId?: string): RoguelikeState {
  const key = userId ? `${STORAGE_KEY}_${userId}` : STORAGE_KEY;
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      const state = createRoguelikeState();
      state.dayCount = parsed.dayCount ?? 0;
      state.lastDayTimestamp = parsed.lastDayTimestamp ?? 0;
      state.totalModifiersEncountered = parsed.totalModifiersEncountered ?? 0;
      state.modifierHistory = parsed.modifierHistory ?? [];
      state.activeModifiers = (parsed.activeModifierIds ?? [])
        .map((id: string) => ALL_MODIFIERS.find((m) => m.id === id))
        .filter(Boolean);
      return state;
    }
  } catch { /* noop */ }
  return createRoguelikeState();
}

export const POLARITY_COLORS: Record<ModifierPolarity, string> = {
  positive: "#4ade80",
  negative: "#ef4444",
  challenge: "#ffcc02",
};

export const RARITY_COLORS: Record<ModifierRarity, string> = {
  common: "#8b8b9e",
  rare: "#60a5fa",
  legendary: "#ffcc02",
};
