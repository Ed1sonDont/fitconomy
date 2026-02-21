// ── Auth ────────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  username: string;
  region: string | null;
  goal_weight: number | null;
  daily_calorie_target: number;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

// ── Weight ───────────────────────────────────────────────────────────────────
export interface WeightRecord {
  id: string;
  weight_kg: number;
  recorded_date: string;
  note: string | null;
  created_at: string;
}

// ── Food ─────────────────────────────────────────────────────────────────────
export type MealType = "breakfast" | "lunch" | "dinner" | "snack";
export type PixelIconType =
  | "rice"
  | "meat"
  | "vegetable"
  | "fruit"
  | "dairy"
  | "drink"
  | "snack"
  | "other";

export interface FoodItem {
  id: string;
  name: string;
  calories: number;
  amount_g: number | null;
  image_url: string | null;
  pixel_icon_type: PixelIconType;
  created_at: string;
}

export interface FoodRecord {
  id: string;
  meal_type: MealType;
  recorded_date: string;
  total_calories: number;
  note: string | null;
  items: FoodItem[];
  created_at: string;
}

export interface DailyFoodSummary {
  date: string;
  total_calories: number;
  records: FoodRecord[];
}

// ── Asset ─────────────────────────────────────────────────────────────────────
export interface AssetCurrentOut {
  current_value: number;
  previous_value: number | null;
  change_24h: number;
  change_24h_pct: number;
  all_time_high: number;
  all_time_low: number;
}

export interface AssetHistoryPoint {
  date: string;
  value: number;
  delta: number;
  trigger_type: string;
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export interface DashboardData {
  asset_current: number;
  asset_change_pct: number;
  asset_history: AssetHistoryPoint[];
  weight_current: number | null;
  weight_goal: number | null;
  weight_history: { date: string; weight_kg: number }[];
  today_calories: number;
  calorie_target: number;
  calorie_pct: number;
  streak_days: number;
}
