/**
 * Reputation system: 0-100 score across 5 tiers.
 * Affects customer traffic quality, special customer probability, and event pools.
 */

export type ReputationTier = "stall" | "local" | "popular" | "famous" | "legendary";

export interface ReputationState {
  value: number;
  tier: ReputationTier;
  history: number[];
  peakValue: number;
}

export interface TierInfo {
  id: ReputationTier;
  name: string;
  minValue: number;
  trafficMultiplier: number;
  specialCustomerChance: number;
  positiveModifierWeight: number;
  icon: string;
}

export const TIERS: TierInfo[] = [
  { id: "stall", name: "路边摊", minValue: 0, trafficMultiplier: 0.8, specialCustomerChance: 0.02, positiveModifierWeight: 0.3, icon: "🏚" },
  { id: "local", name: "社区小店", minValue: 21, trafficMultiplier: 1.0, specialCustomerChance: 0.05, positiveModifierWeight: 0.4, icon: "🏠" },
  { id: "popular", name: "人气餐厅", minValue: 41, trafficMultiplier: 1.2, specialCustomerChance: 0.10, positiveModifierWeight: 0.5, icon: "🏪" },
  { id: "famous", name: "网红打卡地", minValue: 61, trafficMultiplier: 1.5, specialCustomerChance: 0.18, positiveModifierWeight: 0.6, icon: "🌟" },
  { id: "legendary", name: "传说猫咪餐厅", minValue: 81, trafficMultiplier: 2.0, specialCustomerChance: 0.25, positiveModifierWeight: 0.7, icon: "👑" },
];

export function createReputationState(): ReputationState {
  return { value: 15, tier: "stall", history: [], peakValue: 15 };
}

export function getTierInfo(value: number): TierInfo {
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (value >= TIERS[i].minValue) return TIERS[i];
  }
  return TIERS[0];
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function addReputation(state: ReputationState, delta: number): void {
  state.value = clamp(state.value + delta, 0, 100);
  state.tier = getTierInfo(state.value).id;
  state.peakValue = Math.max(state.peakValue, state.value);
  state.history.push(state.value);
  if (state.history.length > 100) state.history.shift();
}

export function getReputationFromSatisfaction(satisfactionLevel: "happy" | "neutral" | "angry"): number {
  switch (satisfactionLevel) {
    case "happy": return 1.5;
    case "neutral": return 0.2;
    case "angry": return -2;
  }
}

export function getTrafficMultiplier(state: ReputationState): number {
  return getTierInfo(state.value).trafficMultiplier;
}

export function getSpecialCustomerChance(state: ReputationState): number {
  return getTierInfo(state.value).specialCustomerChance;
}

const STORAGE_KEY = "fitconomy_reputation";

export function saveReputationState(state: ReputationState, userId?: string): void {
  const key = userId ? `${STORAGE_KEY}_${userId}` : STORAGE_KEY;
  try {
    localStorage.setItem(key, JSON.stringify(state));
  } catch { /* noop */ }
}

export function loadReputationState(userId?: string): ReputationState {
  const key = userId ? `${STORAGE_KEY}_${userId}` : STORAGE_KEY;
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ReputationState>;
      const base = createReputationState();
      return {
        value: parsed.value ?? base.value,
        tier: getTierInfo(parsed.value ?? base.value).id,
        history: parsed.history ?? [],
        peakValue: parsed.peakValue ?? base.peakValue,
      };
    }
  } catch { /* noop */ }
  return createReputationState();
}
