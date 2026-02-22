"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import { toast as sonnerToast } from "sonner";
import type {
  FoodItem, AssetCurrentOut, AssetHistoryPoint,
  DashboardData, WeightRecord, DailyFoodSummary,
  MealType, PixelIconType,
} from "@/types";
import { weightApi, foodApi, uploadApi } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { AssetChart } from "@/components/charts/AssetChart";
import { WeightChart } from "@/components/charts/WeightChart";
import {
  createGameState, updateGame, renderGame, saveGameState,
  generateRandomEvent, applyUpgradeToGame, updateMenu,
  setupNewDay, CANVAS_W, CANVAS_H,
} from "./game-engine";
import type { GameState, EngineCallbacks } from "./game-engine";
import type { GameEvent } from "./events";
import { CATEGORY_COLORS, CATEGORY_ICONS, generateUpgradeEvent } from "./events";
import { UPGRADES, getUpgradeCost, getLevel, canUpgrade, applyUpgrade, saveUpgradeState, CATEGORY_LABELS } from "./upgrade-system";
import { ACHIEVEMENTS, getUnlockedCount } from "./achievements";
import { WEATHER_ICONS, TIME_LABELS } from "./day-night";
import { TIERS, getTierInfo, addReputation } from "./reputation";
import type { DailyModifier, ModifierPolarity, ModifierRarity } from "./roguelike";
import { getAllModifiers } from "./roguelike";

const COZY_POLARITY_COLORS: Record<ModifierPolarity, string> = {
  positive: "#7cb083",
  negative: "#c4726a",
  challenge: "#b8956e",
};
const COZY_RARITY_COLORS: Record<ModifierRarity, string> = {
  common: "#8b7d6b",
  rare: "#c9a86c",
  legendary: "#b8956e",
};
import { rollChoiceEvent, makeChoice, recordChoice, saveChoiceEventState } from "./choice-events";
import type { ChoiceEvent, ChoiceResult } from "./choice-events";
import { getAllChoiceEvents } from "./choice-events";

interface Props {
  foodItems: FoodItem[];
  assetValue: number;
  asset: AssetCurrentOut | null;
  assetHistory: AssetHistoryPoint[];
  dashboard: DashboardData | null;
  weightRecords: WeightRecord[];
  foodSummary: DailyFoodSummary | null;
  onDataRefresh: () => void;
}

type TabId = "events" | "shop" | "asset" | "recipe" | "achievements" | "codex";

const FRAME_INTERVAL = 125;
const EVENT_INTERVAL_MIN = 8_000;
const EVENT_INTERVAL_MAX = 20_000;
const CHOICE_INTERVAL_MIN = 30_000;
const CHOICE_INTERVAL_MAX = 90_000;

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "早餐", lunch: "午餐", dinner: "晚餐", snack: "加餐",
};

const FOOD_ICONS: Record<PixelIconType, string> = {
  rice: "🍚", meat: "🥩", vegetable: "🥦", fruit: "🍎",
  dairy: "🥛", drink: "🍵", snack: "🍪", other: "🍽️",
};

export function PixelRestaurant({
  foodItems, assetValue, asset, assetHistory, dashboard, weightRecords, foodSummary, onDataRefresh,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState | null>(null);
  const animRef = useRef<number>(0);
  const lastFrameRef = useRef<number>(0);
  const eventTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const choiceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [gold, setGold] = useState(0);
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>("events");
  const [, forceRender] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  const [showDailySetup, setShowDailySetup] = useState(false);
  const [dailyModifiers, setDailyModifiers] = useState<DailyModifier[]>([]);
  const [cardsRevealed, setCardsRevealed] = useState<boolean[]>([]);

  const [activeChoice, setActiveChoice] = useState<ChoiceEvent | null>(null);
  const [choiceResult, setChoiceResult] = useState<ChoiceResult | null>(null);

  // Form overlays
  const [showWeightForm, setShowWeightForm] = useState(false);
  const [showRecipeForm, setShowRecipeForm] = useState(false);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  const callbacksRef = useRef<EngineCallbacks>({
    onGoldChange: (g) => setGold(g),
    onEvent: (evt) => {
      setEvents((prev) => [evt, ...prev].slice(0, 50));
      if (evt.goldReward) showToast(`+${evt.goldReward} 金币！`);
    },
    onAchievement: (name) => showToast(`🏆 成就解锁：${name}`),
    onReputationChange: (_val, tier) => {
      const info = TIERS.find((t) => t.id === tier);
      if (info) showToast(`${info.icon} 声望提升！${info.name}`);
    },
  });

  const scheduleNextEvent = useCallback(() => {
    const delay = EVENT_INTERVAL_MIN + Math.random() * (EVENT_INTERVAL_MAX - EVENT_INTERVAL_MIN);
    eventTimerRef.current = setTimeout(() => {
      if (stateRef.current) {
        const s = stateRef.current;
        const evt = generateRandomEvent(s);
        s.events.unshift(evt);
        if (s.events.length > 50) s.events.pop();
        setEvents([...s.events]);
        s.achievements.stats.totalEventsGenerated++;
        if (evt.isRare) s.achievements.stats.rareEventsSeen++;
        if (evt.goldReward) {
          s.gold += evt.goldReward;
          s.totalGoldEarned += evt.goldReward;
          setGold(s.gold);
          showToast(`+${evt.goldReward} 金币！`);
        }
      }
      scheduleNextEvent();
    }, delay);
  }, [showToast]);

  const scheduleNextChoice = useCallback(() => {
    const delay = CHOICE_INTERVAL_MIN + Math.random() * (CHOICE_INTERVAL_MAX - CHOICE_INTERVAL_MIN);
    choiceTimerRef.current = setTimeout(() => {
      if (stateRef.current && !activeChoice) {
        const evt = rollChoiceEvent(stateRef.current.reputation.value);
        if (evt) {
          setActiveChoice(evt);
          setChoiceResult(null);
        }
      }
      scheduleNextChoice();
    }, delay);
  }, [activeChoice]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    const state = createGameState(foodItems);
    stateRef.current = state;
    setGold(state.gold);
    setEvents([...state.events]);

    if (state.needsDailySetup) {
      setShowDailySetup(true);
      const mods = setupNewDay(state);
      setDailyModifiers(mods);
      setCardsRevealed(mods.map(() => false));
    }

    const loop = (timestamp: number) => {
      if (!stateRef.current) return;
      if (timestamp - lastFrameRef.current >= FRAME_INTERVAL) {
        lastFrameRef.current = timestamp;
        updateGame(stateRef.current, callbacksRef.current);
        renderGame(ctx, stateRef.current);
      }
      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    scheduleNextEvent();
    scheduleNextChoice();

    return () => {
      cancelAnimationFrame(animRef.current);
      if (eventTimerRef.current) clearTimeout(eventTimerRef.current);
      if (choiceTimerRef.current) clearTimeout(choiceTimerRef.current);
      if (stateRef.current) saveGameState(stateRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (stateRef.current) updateMenu(stateRef.current, foodItems);
  }, [foodItems]);

  const handleRevealCard = (index: number) => {
    setCardsRevealed((prev) => { const next = [...prev]; next[index] = true; return next; });
  };

  const handleStartDay = () => {
    if (stateRef.current) stateRef.current.needsDailySetup = false;
    setShowDailySetup(false);
  };

  const handleChoice = (optionIndex: number) => {
    if (!activeChoice || !stateRef.current) return;
    const result = makeChoice(activeChoice, optionIndex);
    setChoiceResult(result);
    const s = stateRef.current;
    recordChoice(s.choiceEvents, activeChoice);
    saveChoiceEventState(s.choiceEvents);
    const o = result.outcome;
    if (o.goldDelta !== 0) {
      s.gold += o.goldDelta;
      if (o.goldDelta > 0) s.totalGoldEarned += o.goldDelta;
      if (s.gold < 0) s.gold = 0;
      setGold(s.gold);
      if (o.goldDelta > 0) showToast(`+${o.goldDelta} 金币！`);
      else if (o.goldDelta < 0) showToast(`${o.goldDelta} 金币`);
    }
    if (o.reputationDelta !== 0) addReputation(s.reputation, o.reputationDelta);
    forceRender((n) => n + 1);
  };

  const handleDismissChoice = () => { setActiveChoice(null); setChoiceResult(null); };

  const handleUpgrade = (upgradeId: string) => {
    const state = stateRef.current;
    if (!state) return;
    const item = UPGRADES.find((u) => u.id === upgradeId);
    if (!item || !canUpgrade(state.upgrades, item, state.gold)) return;
    const cost = applyUpgrade(state.upgrades, item);
    state.gold -= cost;
    setGold(state.gold);
    applyUpgradeToGame(state, upgradeId);
    saveUpgradeState(state.upgrades);
    saveGameState(state);
    const evt = generateUpgradeEvent(upgradeId);
    if (evt) { state.events.unshift(evt); setEvents([...state.events]); }
    showToast(`${item.icon} ${item.name} 升级成功！`);
    forceRender((n) => n + 1);
  };

  const state = stateRef.current;
  const satisfactionAvg = state?.satisfaction.getAverage() ?? 50;
  const satisfactionRating = state?.satisfaction.getRating() ?? 3;
  const weatherIcon = state ? WEATHER_ICONS[state.dayNight.weather] : "☀";
  const timeLabel = state ? TIME_LABELS[state.dayNight.timeOfDay] : "白天";
  const level = state?.level ?? 1;
  const repTier = state ? getTierInfo(state.reputation.value) : TIERS[0];

  const isUp = (asset?.change_24h ?? 0) >= 0;
  const caloriePct = dashboard?.calorie_pct ?? 0;

  return (
    <div className="space-y-3">
      {/* Toast */}
      {toast && (
        <div className="fixed top-14 right-4 z-50 pixel-border bg-[var(--cozy-bg-panel)] px-4 py-2 text-sm pixel-body text-[var(--cozy-border)] animate-pixel-float shadow-lg">
          {toast}
        </div>
      )}

      {/* Daily Modifier Setup */}
      {showDailySetup && (
        <DailySetupOverlay
          modifiers={dailyModifiers} cardsRevealed={cardsRevealed}
          onReveal={handleRevealCard} onStart={handleStartDay}
          dayCount={state?.roguelike.dayCount ?? 1}
        />
      )}

      {/* Choice Event */}
      {activeChoice && (
        <ChoiceEventOverlay
          event={activeChoice} result={choiceResult}
          hasCat={state ? !!state.mascot : false}
          onChoice={handleChoice} onDismiss={handleDismissChoice}
        />
      )}

      {/* Weight Form */}
      {showWeightForm && (
        <WeightFormOverlay
          onClose={() => setShowWeightForm(false)}
          onSubmit={onDataRefresh}
        />
      )}

      {/* Recipe Form */}
      {showRecipeForm && (
        <RecipeFormOverlay
          onClose={() => setShowRecipeForm(false)}
          onSubmit={onDataRefresh}
        />
      )}

      {/* Status Bar - Enhanced with dashboard data */}
      <div className="pixel-border bg-[var(--cozy-bg-panel)] p-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="pixel-font text-xs text-[var(--cozy-border)] pixel-glow">🐱 猫咪餐厅</span>
            <span className="text-[10px] text-[var(--cozy-muted)] pixel-body">Lv.{level}</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] pixel-body">
            <span className="text-[var(--cozy-border)]" title="游戏金币">
              <span className="animate-coin-spin inline-block mr-1">●</span>{gold}
            </span>
            <span className="text-[var(--cozy-positive)]">
              {"★".repeat(satisfactionRating)}{"☆".repeat(5 - satisfactionRating)}
            </span>
            <span title={timeLabel}>{weatherIcon}</span>
          </div>
        </div>

        {/* Real data row */}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <span className="text-[10px] pixel-body px-1.5 py-0.5 border border-[var(--cozy-positive)] text-[var(--cozy-positive)] bg-[var(--cozy-positive)]/20" title="虚拟资产净值">
            ₣{(asset?.current_value ?? 1000).toFixed(0)}
            <span className={`ml-1 ${isUp ? "text-[var(--cozy-positive)]" : "text-[var(--cozy-negative)]"}`}>
              {isUp ? "▲" : "▼"}{Math.abs(asset?.change_24h_pct ?? 0).toFixed(1)}%
            </span>
          </span>
          {dashboard?.weight_current && (
            <span className="text-[10px] pixel-body px-1.5 py-0.5 border border-[var(--cozy-border)] text-[var(--cozy-border)] bg-[var(--cozy-border)]/20" title="当前体重">
              ⚖ {dashboard.weight_current}kg
            </span>
          )}
          <span className="text-[10px] pixel-body px-1.5 py-0.5 border border-[var(--cozy-warm-orange)] text-[var(--cozy-warm-orange)] bg-[var(--cozy-warm-orange)]/20" title="今日热量">
            🔥 {dashboard?.today_calories ?? 0}/{dashboard?.calorie_target ?? 2000}
          </span>
          {(dashboard?.streak_days ?? 0) > 0 && (
            <span className="text-[10px] pixel-body px-1.5 py-0.5 border border-[var(--cozy-border)] text-[var(--cozy-border)] bg-[var(--cozy-border)]/20" title="连续打卡">
              📅 {dashboard?.streak_days}天
            </span>
          )}
        </div>

        {/* Game stats row */}
        <div className="flex items-center gap-3 mt-1 text-[10px] text-[var(--cozy-muted)] pixel-body flex-wrap">
          <span>满意度 {satisfactionAvg.toFixed(0)}%</span>
          <span>·</span>
          <span>顾客 {state?.totalCustomers ?? 0}</span>
          <span>·</span>
          <span>{repTier.icon} {repTier.name}</span>
          <span>·</span>
          <span>声望 {state?.reputation.value.toFixed(0) ?? 15}</span>
          <span>·</span>
          <span>{timeLabel} {weatherIcon}</span>
        </div>

        {state && state.roguelike.activeModifiers.length > 0 && (
          <div className="flex gap-1.5 mt-1.5 flex-wrap">
            {state.roguelike.activeModifiers.map((mod) => (
              <span key={mod.id} className="text-[9px] px-1.5 py-0.5 border pixel-body"
                style={{ borderColor: COZY_POLARITY_COLORS[mod.polarity], color: COZY_POLARITY_COLORS[mod.polarity], backgroundColor: `${COZY_POLARITY_COLORS[mod.polarity]}15` }}
                title={mod.description}>
                {mod.icon} {mod.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Canvas */}
      <div className="pixel-border bg-[var(--cozy-bg-deep)] p-1 overflow-hidden">
        <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H} className="w-full"
          style={{ imageRendering: "pixelated", aspectRatio: `${CANVAS_W}/${CANVAS_H}` }} />
      </div>

      {/* Calorie bar below canvas */}
      <div className="pixel-border bg-[var(--cozy-bg-panel)] p-2">
        <div className="flex items-center justify-between text-[10px] pixel-body mb-1">
          <span className="text-[var(--cozy-warm-orange)]">🔥 今日热量</span>
          <span className="text-[var(--cozy-muted)]">{dashboard?.today_calories ?? 0} / {dashboard?.calorie_target ?? 2000} kcal</span>
        </div>
        <div className="h-2 bg-[var(--cozy-bg-deep)] border border-[var(--cozy-border)] overflow-hidden">
          <div
            className="h-full transition-all duration-500"
            style={{
              width: `${Math.min(caloriePct, 100)}%`,
              backgroundColor: caloriePct > 110 ? "var(--cozy-negative)" : caloriePct > 80 ? "var(--cozy-warm-orange)" : "var(--cozy-positive)",
            }}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 flex-wrap">
        {([
          { id: "events", label: "事件", icon: "📋" },
          { id: "shop", label: "商店", icon: "🛒" },
          { id: "asset", label: "资产", icon: "📈" },
          { id: "recipe", label: "菜谱", icon: "🍳" },
          { id: "achievements", label: "成就", icon: "🏆" },
          { id: "codex", label: "图鉴", icon: "📖" },
        ] as { id: TabId; label: string; icon: string }[]).map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 px-1 text-[10px] pixel-body border-2 transition-colors ${
              activeTab === tab.id
                ? "bg-[var(--cozy-bg-panel)] border-[var(--cozy-border)] text-[var(--cozy-border)]"
                : "bg-[var(--cozy-bg-elevated)] border-[var(--cozy-border)] text-[var(--cozy-muted)] hover:border-[var(--cozy-muted)]"
            }`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="pixel-border bg-[var(--cozy-bg-elevated)] p-3 min-h-[180px] max-h-[360px] overflow-y-auto scrollbar-thin">
        {activeTab === "events" && <EventsPanel events={events} />}
        {activeTab === "shop" && <ShopPanel upgrades={state?.upgrades} gold={gold} onUpgrade={handleUpgrade} />}
        {activeTab === "asset" && (
          <AssetPanel
            asset={asset}
            assetHistory={assetHistory}
            dashboard={dashboard}
            weightRecords={weightRecords}
            onRecordWeight={() => setShowWeightForm(true)}
          />
        )}
        {activeTab === "recipe" && (
          <RecipePanel
            menu={state?.menu}
            foodSummary={foodSummary}
            dashboard={dashboard}
            onAddRecipe={() => setShowRecipeForm(true)}
          />
        )}
        {activeTab === "achievements" && <AchievementsPanel achievements={state?.achievements} />}
        {activeTab === "codex" && <CodexPanel state={state} />}
      </div>
    </div>
  );
}

// ─── Asset Panel ───────────────────────────────────────────────────

function AssetPanel({
  asset, assetHistory, dashboard, weightRecords, onRecordWeight,
}: {
  asset: AssetCurrentOut | null;
  assetHistory: AssetHistoryPoint[];
  dashboard: DashboardData | null;
  weightRecords: WeightRecord[];
  onRecordWeight: () => void;
}) {
  const isUp = (asset?.change_24h ?? 0) >= 0;

  return (
    <div className="space-y-4">
      {/* Asset summary */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] text-[var(--cozy-muted)] pixel-body">虚拟资产净值</p>
          <p className="pixel-font text-lg text-[var(--cozy-positive)]">₣{(asset?.current_value ?? 1000).toFixed(0)}</p>
          <p className={`text-[10px] pixel-body ${isUp ? "text-[var(--cozy-positive)]" : "text-[var(--cozy-negative)]"}`}>
            {isUp ? "▲" : "▼"} {isUp ? "+" : ""}{(asset?.change_24h_pct ?? 0).toFixed(1)}% · 最高 ₣{(asset?.all_time_high ?? 1000).toFixed(0)}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onRecordWeight}
            className="px-3 py-1.5 text-[10px] pixel-body border-2 border-[var(--cozy-border)] text-[var(--cozy-border)] bg-[var(--cozy-border)]/20 hover:bg-[var(--cozy-border)]/30 transition-colors"
          >
            ⚖ 记录体重
          </button>
        </div>
      </div>

      {/* Asset curve */}
      <div>
        <p className="text-[10px] text-[var(--cozy-border)] pixel-body mb-1">📈 资产曲线（近30天）</p>
        <div className="bg-[var(--cozy-bg-deep)] border border-[var(--cozy-bg-deep)] p-1">
          <AssetChart data={assetHistory} />
        </div>
      </div>

      {/* Weight trend */}
      <div>
        <p className="text-[10px] text-[var(--cozy-border)] pixel-body mb-1">⚖ 体重趋势</p>
        <div className="bg-[var(--cozy-bg-deep)] border border-[var(--cozy-bg-deep)] p-1">
          <WeightChart
            data={(dashboard?.weight_history ?? weightRecords.map(r => ({ date: r.recorded_date, weight_kg: r.weight_kg })))}
            goalWeight={dashboard?.weight_goal}
          />
        </div>
      </div>

      {/* Weight stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="border border-[var(--cozy-border)] bg-[var(--cozy-bg-panel)] p-2 text-center">
          <p className="text-[9px] text-[var(--cozy-muted)] pixel-body">当前</p>
          <p className="text-sm pixel-body text-[var(--cozy-border)]">
            {dashboard?.weight_current ? `${dashboard.weight_current}kg` : "–"}
          </p>
        </div>
        <div className="border border-[var(--cozy-border)] bg-[var(--cozy-bg-panel)] p-2 text-center">
          <p className="text-[9px] text-[var(--cozy-muted)] pixel-body">目标</p>
          <p className="text-sm pixel-body text-[var(--cozy-positive)]">
            {dashboard?.weight_goal ? `${dashboard.weight_goal}kg` : "–"}
          </p>
        </div>
        <div className="border border-[var(--cozy-border)] bg-[var(--cozy-bg-panel)] p-2 text-center">
          <p className="text-[9px] text-[var(--cozy-muted)] pixel-body">打卡</p>
          <p className="text-sm pixel-body text-[var(--cozy-border)]">
            {dashboard?.streak_days ?? 0}天
          </p>
        </div>
      </div>

      {/* Growth rules */}
      <div className="border-t border-[var(--cozy-bg-deep)] pt-2 space-y-1.5">
        <p className="text-[10px] text-[var(--cozy-border)] pixel-body">💡 资产增长规则</p>
        <div className="grid grid-cols-1 gap-1 text-[9px] pixel-body text-[var(--cozy-muted)]">
          <p><span className="text-[var(--cozy-positive)]">体重下降</span> 每减0.1kg → 资产+0.5%</p>
          <p><span className="text-[var(--cozy-border)]">记录饮食</span> 每次记录 → 资产+0.1%</p>
          <p><span className="text-[var(--cozy-border)]">热量达标</span> 在目标范围内 → +0.2%</p>
          <p><span className="text-[var(--cozy-warm-orange)]">连续打卡</span> 3天+1%，7天+3%</p>
        </div>
      </div>
    </div>
  );
}

// ─── Recipe Panel ──────────────────────────────────────────────────

function RecipePanel({
  menu, foodSummary, dashboard, onAddRecipe,
}: {
  menu?: import("./menu-system").MenuState;
  foodSummary: DailyFoodSummary | null;
  dashboard: DashboardData | null;
  onAddRecipe: () => void;
}) {
  return (
    <div className="space-y-4">
      {/* Today's food summary */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] text-[var(--cozy-muted)] pixel-body">今日菜谱记录</p>
          <p className="pixel-body text-sm text-[var(--cozy-warm-orange)]">
            🔥 {dashboard?.today_calories ?? 0} / {dashboard?.calorie_target ?? 2000} kcal
          </p>
        </div>
        <button
          onClick={onAddRecipe}
          className="px-3 py-1.5 text-[10px] pixel-body border-2 border-[var(--cozy-border)] text-[var(--cozy-border)] bg-[var(--cozy-border)]/20 hover:bg-[var(--cozy-border)]/30 transition-colors"
        >
          🍳 添加菜谱
        </button>
      </div>

      {/* Today's records */}
      {foodSummary && foodSummary.records.length > 0 && (
        <div>
          <p className="text-[10px] text-[var(--cozy-border)] pixel-body mb-1">📋 今日记录</p>
          <div className="space-y-1.5">
            {foodSummary.records.map((rec) => (
              <div key={rec.id} className="border border-[var(--cozy-border)] bg-[var(--cozy-bg-panel)] p-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] pixel-body text-[var(--cozy-border)]">
                    {MEAL_LABELS[rec.meal_type as MealType] ?? rec.meal_type}
                  </span>
                  <span className="text-[10px] pixel-body text-[var(--cozy-warm-orange)]">{rec.total_calories} kcal</span>
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {rec.items.map((item) => (
                    <span key={item.id} className="text-[9px] pixel-body text-[var(--cozy-foreground)] px-1 py-0.5 bg-[var(--cozy-bg-deep)] border border-[var(--cozy-bg-deep)]">
                      {FOOD_ICONS[item.pixel_icon_type as PixelIconType] ?? "🍽️"} {item.name}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Game menu */}
      {menu && menu.items.length > 0 ? (
        <div>
          <p className="text-[10px] text-[var(--cozy-border)] pixel-body mb-1">
            🍽 餐厅菜单 · {menu.items.length}种 · 招牌{menu.signatureCount}道
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {menu.items.map((item) => (
              <div key={item.name} className={`border-2 p-2 text-center ${
                item.isSignature ? "border-[var(--cozy-border)] bg-[var(--cozy-bg-panel)]" : "border-[var(--cozy-border)] bg-[var(--cozy-bg-panel)]"
              }`}>
                <p className="text-[11px] pixel-body text-[var(--cozy-foreground)] truncate">{item.name}</p>
                <p className="text-[9px] text-[var(--cozy-muted)] pixel-body mt-0.5">{item.calories} kcal</p>
                <p className={`text-[9px] pixel-body mt-0.5 ${item.isSignature ? "text-[var(--cozy-border)]" : "text-[var(--cozy-positive)]"}`}>
                  利润 ×{item.isSignature ? item.profit * 2 : item.profit}{item.isSignature && " ★招牌"}
                </p>
                <p className="text-[8px] text-[var(--cozy-muted)] pixel-body">点了 {item.timesOrdered} 次</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-4">
          <p className="text-2xl">🍽</p>
          <p className="text-xs text-[var(--cozy-muted)] pixel-body mt-2">菜单还是空的！添加菜谱来丰富菜单吧</p>
          <p className="text-[10px] text-[var(--cozy-muted)] pixel-body mt-1">记录的食物会自动加入餐厅菜单</p>
        </div>
      )}
    </div>
  );
}

// ─── Weight Form Overlay ──────────────────────────────────────────

function WeightFormOverlay({ onClose, onSubmit }: { onClose: () => void; onSubmit: () => void }) {
  const [weightKg, setWeightKg] = useState("");
  const [recordedDate, setRecordedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!weightKg) return;
    setSubmitting(true);
    try {
      await weightApi.create({
        weight_kg: parseFloat(weightKg),
        recorded_date: recordedDate,
        note: note || undefined,
      });
      sonnerToast.success("体重记录成功！资产已更新");
      onSubmit();
      onClose();
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      sonnerToast.error(detail || "记录失败，请重试");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4">
      <div className="pixel-border bg-[var(--cozy-bg-elevated)] p-5 max-w-sm w-full space-y-4">
        <div className="flex items-center justify-between">
          <p className="pixel-font text-xs text-[var(--cozy-border)]">⚖ 记录体重</p>
          <button onClick={onClose} className="text-[var(--cozy-muted)] hover:text-[var(--cozy-border)] pixel-body text-sm">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-[10px] text-[var(--cozy-muted)] pixel-body block mb-1">体重 (kg)</label>
            <input
              type="number" step="0.01" placeholder="例如 65.5" value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)} required autoFocus
              className="w-full h-9 px-3 bg-[var(--cozy-bg-panel)] border-2 border-[var(--cozy-border)] text-[var(--cozy-foreground)] text-sm pixel-body focus:border-[var(--cozy-border)] focus:outline-none"
            />
          </div>
          <div>
            <label className="text-[10px] text-[var(--cozy-muted)] pixel-body block mb-1">日期</label>
            <input
              type="date" value={recordedDate}
              onChange={(e) => setRecordedDate(e.target.value)} required
              className="w-full h-9 px-3 bg-[var(--cozy-bg-panel)] border-2 border-[var(--cozy-border)] text-[var(--cozy-foreground)] text-sm pixel-body focus:border-[var(--cozy-border)] focus:outline-none"
            />
          </div>
          <div>
            <label className="text-[10px] text-[var(--cozy-muted)] pixel-body block mb-1">备注（可选）</label>
            <input
              placeholder="心情、状态…" value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full h-9 px-3 bg-[var(--cozy-bg-panel)] border-2 border-[var(--cozy-border)] text-[var(--cozy-foreground)] text-sm pixel-body focus:border-[var(--cozy-border)] focus:outline-none"
            />
          </div>
          <button type="submit" disabled={submitting}
            className="w-full py-2.5 pixel-body text-sm border-2 border-[var(--cozy-border)] text-[var(--cozy-border)] bg-[var(--cozy-bg-deep)] hover:bg-[var(--cozy-border)] hover:text-[var(--cozy-bg-deep)] transition-colors disabled:opacity-50">
            {submitting ? "保存中…" : "⚖ 保存体重记录"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Recipe Form Overlay ──────────────────────────────────────────

function RecipeFormOverlay({ onClose, onSubmit }: { onClose: () => void; onSubmit: () => void }) {
  const [mealType, setMealType] = useState<MealType>("lunch");
  const [formNote, setFormNote] = useState("");
  const [items, setItems] = useState([
    { name: "", calories: "", amount_g: "", pixel_icon_type: "other" as PixelIconType, image_url: "" },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const addItem = () => setItems((p) => [...p, { name: "", calories: "", amount_g: "", pixel_icon_type: "other", image_url: "" }]);
  const removeItem = (idx: number) => setItems((p) => p.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: string, value: string) =>
    setItems((p) => p.map((itm, i) => (i === idx ? { ...itm, [field]: value } : itm)));

  const handleImageUpload = async (idx: number, file: File) => {
    setUploading(true);
    try {
      const res = await uploadApi.image(file);
      updateItem(idx, "image_url", res.data.url);
      sonnerToast.success("图片上传成功");
    } catch {
      sonnerToast.error("图片上传失败");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = items.filter((it) => it.name.trim());
    if (validItems.length === 0) {
      sonnerToast.error("至少填写一个食物名称");
      return;
    }
    setSubmitting(true);
    try {
      await foodApi.createRecord({
        meal_type: mealType,
        recorded_date: format(new Date(), "yyyy-MM-dd"),
        note: formNote || undefined,
        items: validItems.map((it) => ({
          name: it.name,
          calories: parseInt(it.calories) || 0,
          amount_g: it.amount_g ? parseFloat(it.amount_g) : undefined,
          pixel_icon_type: it.pixel_icon_type,
          image_url: it.image_url || undefined,
        })),
      });
      sonnerToast.success("菜谱记录成功！已加入餐厅菜单");
      onSubmit();
      onClose();
    } catch {
      sonnerToast.error("记录失败，请重试");
    } finally {
      setSubmitting(false);
    }
  };

  const mealTypes: MealType[] = ["breakfast", "lunch", "dinner", "snack"];
  const iconTypes: PixelIconType[] = ["rice", "meat", "vegetable", "fruit", "dairy", "drink", "snack", "other"];

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4 overflow-y-auto">
      <div className="pixel-border bg-[var(--cozy-bg-elevated)] p-5 max-w-md w-full space-y-4 my-4">
        <div className="flex items-center justify-between">
          <p className="pixel-font text-xs text-[var(--cozy-border)]">🍳 添加菜谱</p>
          <button onClick={onClose} className="text-[var(--cozy-muted)] hover:text-[var(--cozy-border)] pixel-body text-sm">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Meal type */}
          <div className="flex gap-1">
            {mealTypes.map((m) => (
              <button key={m} type="button" onClick={() => setMealType(m)}
                className={`flex-1 py-1.5 text-[10px] pixel-body border-2 transition-colors ${
                  mealType === m
                    ? "border-[var(--cozy-border)] text-[var(--cozy-border)] bg-[var(--cozy-border)]/20"
                    : "border-[var(--cozy-border)] text-[var(--cozy-muted)] hover:border-[var(--cozy-muted)]"
                }`}>
                {MEAL_LABELS[m]}
              </button>
            ))}
          </div>

          {/* Food items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] text-[var(--cozy-muted)] pixel-body">食物列表</label>
              <button type="button" onClick={addItem}
                className="text-[9px] pixel-body px-2 py-0.5 border border-[var(--cozy-border)] text-[var(--cozy-muted)] hover:text-[var(--cozy-border)] hover:border-[var(--cozy-border)]">
                + 添加
              </button>
            </div>
            {items.map((itm, idx) => (
              <div key={idx} className="border border-[var(--cozy-border)] bg-[var(--cozy-bg-panel)] p-2.5 space-y-2">
                <div className="flex gap-2">
                  <input placeholder="食物名称" value={itm.name}
                    onChange={(e) => updateItem(idx, "name", e.target.value)}
                    className="flex-1 h-8 px-2 bg-[var(--cozy-bg-deep)] border border-[var(--cozy-border)] text-[var(--cozy-foreground)] text-xs pixel-body focus:border-[var(--cozy-border)] focus:outline-none" />
                  {items.length > 1 && (
                    <button type="button" onClick={() => removeItem(idx)}
                      className="text-[var(--cozy-muted)] hover:text-[var(--cozy-negative)] text-xs px-1">✕</button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[8px] text-[var(--cozy-muted)] pixel-body">热量(kcal)</label>
                    <input type="number" placeholder="0" value={itm.calories}
                      onChange={(e) => updateItem(idx, "calories", e.target.value)}
                      className="w-full h-7 px-2 bg-[var(--cozy-bg-deep)] border border-[var(--cozy-border)] text-[var(--cozy-foreground)] text-[10px] pixel-body focus:border-[var(--cozy-border)] focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-[8px] text-[var(--cozy-muted)] pixel-body">克重(g)</label>
                    <input type="number" placeholder="选填" value={itm.amount_g}
                      onChange={(e) => updateItem(idx, "amount_g", e.target.value)}
                      className="w-full h-7 px-2 bg-[var(--cozy-bg-deep)] border border-[var(--cozy-border)] text-[var(--cozy-foreground)] text-[10px] pixel-body focus:border-[var(--cozy-border)] focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-[8px] text-[var(--cozy-muted)] pixel-body">分类</label>
                    <select value={itm.pixel_icon_type}
                      onChange={(e) => updateItem(idx, "pixel_icon_type", e.target.value)}
                      className="w-full h-7 px-1 bg-[var(--cozy-bg-deep)] border border-[var(--cozy-border)] text-[var(--cozy-foreground)] text-[10px] pixel-body focus:border-[var(--cozy-border)] focus:outline-none">
                      {iconTypes.map((t) => (
                        <option key={t} value={t}>{FOOD_ICONS[t]} {t}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <button type="button" disabled={uploading}
                  onClick={() => {
                    const el = document.createElement("input"); el.type = "file"; el.accept = "image/*";
                    el.onchange = async (ev) => { const f = (ev.target as HTMLInputElement).files?.[0]; if (f) await handleImageUpload(idx, f); };
                    el.click();
                  }}
                  className="text-[9px] pixel-body px-2 py-0.5 border border-[var(--cozy-border)] text-[var(--cozy-muted)] hover:text-[var(--cozy-border)] hover:border-[var(--cozy-border)]">
                  📷 {uploading ? "上传中…" : itm.image_url ? "✓ 已上传" : "拍照/上传"}
                </button>
              </div>
            ))}
          </div>

          <div>
            <label className="text-[10px] text-[var(--cozy-muted)] pixel-body block mb-1">备注（可选）</label>
            <input placeholder="感受、餐厅名…" value={formNote}
              onChange={(e) => setFormNote(e.target.value)}
              className="w-full h-8 px-3 bg-[var(--cozy-bg-panel)] border-2 border-[var(--cozy-border)] text-[var(--cozy-foreground)] text-xs pixel-body focus:border-[var(--cozy-border)] focus:outline-none" />
          </div>

          <button type="submit" disabled={submitting}
            className="w-full py-2.5 pixel-body text-sm border-2 border-[var(--cozy-border)] text-[var(--cozy-border)] bg-[var(--cozy-bg-deep)] hover:bg-[var(--cozy-border)] hover:text-[var(--cozy-bg-deep)] transition-colors disabled:opacity-50">
            {submitting ? "保存中…" : "🍳 保存菜谱"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Daily Setup Overlay ──────────────────────────────────────────

function DailySetupOverlay({
  modifiers, cardsRevealed, onReveal, onStart, dayCount,
}: {
  modifiers: DailyModifier[];
  cardsRevealed: boolean[];
  onReveal: (i: number) => void;
  onStart: () => void;
  dayCount: number;
}) {
  const allRevealed = cardsRevealed.every(Boolean);
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4">
      <div className="pixel-border bg-[var(--cozy-bg-elevated)] p-6 max-w-md w-full space-y-4">
        <div className="text-center">
          <p className="pixel-font text-sm text-[var(--cozy-border)]">🌅 第 {dayCount} 天</p>
          <p className="text-xs text-[var(--cozy-muted)] pixel-body mt-1">翻开今日的命运卡牌...</p>
        </div>
        <div className="flex gap-3 justify-center">
          {modifiers.map((mod, i) => (
            <button key={mod.id} onClick={() => onReveal(i)}
              className="relative w-28 h-36 border-2 transition-all duration-300"
              style={{
                borderColor: cardsRevealed[i] ? COZY_POLARITY_COLORS[mod.polarity] : "var(--cozy-border)",
                backgroundColor: cardsRevealed[i] ? "var(--cozy-bg-panel)" : "var(--cozy-bg-deep)",
              }}>
              {cardsRevealed[i] ? (
                <div className="p-2 text-center">
                  <p className="text-xl">{mod.icon}</p>
                  <p className="pixel-body text-[10px] mt-1" style={{ color: COZY_POLARITY_COLORS[mod.polarity] }}>{mod.name}</p>
                  <p className="text-[8px] text-[var(--cozy-muted)] pixel-body mt-1">{mod.description}</p>
                  <p className="text-[8px] mt-1 pixel-body" style={{ color: COZY_RARITY_COLORS[mod.rarity] }}>
                    {mod.rarity === "legendary" ? "★传说" : mod.rarity === "rare" ? "◆稀有" : "○普通"}
                  </p>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-2xl">🎴</p>
                  <p className="text-[9px] text-[var(--cozy-muted)] pixel-body absolute bottom-2">点击翻牌</p>
                </div>
              )}
            </button>
          ))}
        </div>
        {allRevealed && (
          <button onClick={onStart}
            className="w-full py-3 pixel-body text-sm border-2 border-[var(--cozy-border)] text-[var(--cozy-border)] bg-[var(--cozy-bg-deep)] hover:bg-[var(--cozy-border)] hover:text-[var(--cozy-bg-deep)] transition-colors">
            🐱 开始营业！
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Choice Event Overlay ─────────────────────────────────────────

function ChoiceEventOverlay({
  event, result, hasCat, onChoice, onDismiss,
}: {
  event: ChoiceEvent;
  result: ChoiceResult | null;
  hasCat: boolean;
  onChoice: (i: number) => void;
  onDismiss: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4">
      <div className="pixel-border bg-[var(--cozy-bg-elevated)] p-5 max-w-md w-full space-y-4">
        <div className="text-center">
          <p className="text-2xl">{event.icon}</p>
          <p className="pixel-font text-xs text-[var(--cozy-border)] mt-2">{event.title}</p>
          <p className="text-[10px] pixel-body mt-1" style={{ color: COZY_RARITY_COLORS[event.rarity] }}>
            {event.rarity === "legendary" ? "★传说事件" : event.rarity === "rare" ? "◆稀有事件" : ""}
          </p>
        </div>
        <p className="text-xs text-[var(--cozy-foreground)] pixel-body leading-relaxed">{event.description}</p>
        {!result ? (
          <div className="space-y-2">
            {event.options.map((opt, i) => {
              const locked = opt.requiresCat && !hasCat;
              return (
                <button key={i} onClick={() => !locked && onChoice(i)} disabled={locked}
                  className={`w-full p-3 text-left border-2 transition-colors ${
                    locked ? "border-[var(--cozy-bg-deep)] bg-[var(--cozy-bg-deep)] opacity-40 cursor-not-allowed"
                    : "border-[var(--cozy-border)] bg-[var(--cozy-bg-panel)] hover:border-[var(--cozy-border)]"
                  }`}>
                  <p className="text-[11px] pixel-body text-[var(--cozy-foreground)]">{opt.label}</p>
                  <p className="text-[9px] text-[var(--cozy-muted)] pixel-body">{opt.description}</p>
                  {locked && <p className="text-[9px] text-[var(--cozy-negative)] pixel-body">需要解锁吉祥猫</p>}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="p-3 border-2 border-[var(--cozy-border)] bg-[var(--cozy-bg-panel)]">
              <p className="text-xs text-[var(--cozy-foreground)] pixel-body">{result.outcome.description}</p>
              <div className="flex gap-3 mt-2 text-[10px] pixel-body">
                {result.outcome.goldDelta !== 0 && (
                  <span className={result.outcome.goldDelta > 0 ? "text-[var(--cozy-border)]" : "text-[var(--cozy-negative)]"}>
                    {result.outcome.goldDelta > 0 ? "+" : ""}{result.outcome.goldDelta} 💰
                  </span>
                )}
                {result.outcome.reputationDelta !== 0 && (
                  <span className={result.outcome.reputationDelta > 0 ? "text-[var(--cozy-positive)]" : "text-[var(--cozy-negative)]"}>
                    {result.outcome.reputationDelta > 0 ? "+" : ""}{result.outcome.reputationDelta} 声望
                  </span>
                )}
                {result.outcome.satisfactionDelta !== 0 && (
                  <span className={result.outcome.satisfactionDelta > 0 ? "text-[var(--cozy-border)]" : "text-[var(--cozy-negative)]"}>
                    {result.outcome.satisfactionDelta > 0 ? "+" : ""}{result.outcome.satisfactionDelta} 满意度
                  </span>
                )}
              </div>
            </div>
            <button onClick={onDismiss}
              className="w-full py-2 pixel-body text-[11px] border-2 border-[var(--cozy-border)] text-[var(--cozy-muted)] hover:border-[var(--cozy-border)] hover:text-[var(--cozy-border)] transition-colors">
              继续营业
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-panels ───────────────────────────────────────────────────

function EventsPanel({ events }: { events: GameEvent[] }) {
  if (events.length === 0) {
    return <p className="text-xs text-[var(--cozy-muted)] pixel-body animate-pixel-blink">等待事件发生中...</p>;
  }
  return (
    <div className="space-y-1.5">
      {events.map((event) => {
        const icon = CATEGORY_ICONS[event.category] ?? "📢";
        const color = CATEGORY_COLORS[event.category] ?? "var(--cozy-muted)";
        const time = new Date(event.timestamp).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
        return (
          <div key={event.id} className="flex gap-2 text-[11px] pixel-body">
            <span className="text-[var(--cozy-positive)] shrink-0">[{time}]</span>
            <span className="shrink-0">{icon}</span>
            <span style={{ color }}>{event.text}</span>
            {event.goldReward && <span className="text-[var(--cozy-border)] shrink-0">+{event.goldReward}💰</span>}
          </div>
        );
      })}
    </div>
  );
}

function ShopPanel({
  upgrades, gold, onUpgrade,
}: {
  upgrades?: import("./upgrade-system").UpgradeState;
  gold: number;
  onUpgrade: (id: string) => void;
}) {
  if (!upgrades) return null;
  const categories = ["kitchen", "hall", "decor", "special"] as const;
  return (
    <div className="space-y-3">
      {categories.map((cat) => {
        const items = UPGRADES.filter((u) => u.category === cat);
        if (items.length === 0) return null;
        return (
          <div key={cat}>
            <p className="text-[10px] text-[var(--cozy-border)] pixel-body mb-1.5">{CATEGORY_LABELS[cat]}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {items.map((item) => {
                const currentLvl = getLevel(upgrades, item.id);
                const isMax = currentLvl >= item.maxLevel;
                const cost = isMax ? 0 : getUpgradeCost(item, currentLvl);
                const affordable = gold >= cost;
                return (
                  <div key={item.id} className={`border-2 p-2 ${
                    isMax ? "border-[var(--cozy-positive)] bg-[var(--cozy-bg-panel)]"
                    : affordable ? "border-[var(--cozy-border)] bg-[var(--cozy-bg-panel)] hover:border-[var(--cozy-border)]"
                    : "border-[var(--cozy-bg-deep)] bg-[var(--cozy-bg-deep)] opacity-60"
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs">{item.icon} <span className="pixel-body text-[var(--cozy-foreground)]">{item.name}</span></span>
                      <span className="text-[10px] text-[var(--cozy-muted)] pixel-body">Lv.{currentLvl}/{item.maxLevel}</span>
                    </div>
                    <p className="text-[9px] text-[var(--cozy-muted)] pixel-body mt-0.5">{item.description}</p>
                    <p className="text-[9px] text-[var(--cozy-positive)] pixel-body">{item.effect}</p>
                    {!isMax ? (
                      <button onClick={() => onUpgrade(item.id)} disabled={!affordable}
                        className={`mt-1.5 w-full py-1 text-[10px] pixel-body border-2 transition-colors ${
                          affordable
                            ? "border-[var(--cozy-border)] text-[var(--cozy-border)] bg-[var(--cozy-bg-deep)] hover:bg-[var(--cozy-border)] hover:text-[var(--cozy-bg-deep)]"
                            : "border-[var(--cozy-border)] text-[var(--cozy-muted)] bg-[var(--cozy-bg-deep)] cursor-not-allowed"
                        }`}>
                        升级 ({cost} 💰)
                      </button>
                    ) : (
                      <p className="mt-1 text-[10px] text-[var(--cozy-positive)] pixel-body text-center">✓ 已满级</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AchievementsPanel({ achievements }: { achievements?: import("./achievements").AchievementState }) {
  if (!achievements) return null;
  const unlocked = getUnlockedCount(achievements);
  return (
    <div>
      <p className="text-[10px] text-[var(--cozy-muted)] pixel-body mb-2">已解锁 {unlocked}/{ACHIEVEMENTS.length}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {ACHIEVEMENTS.map((ach) => {
          const isUnlocked = !!achievements.unlocked[ach.id];
          return (
            <div key={ach.id} className={`border-2 p-2 ${
              isUnlocked ? "border-[var(--cozy-border)] bg-[var(--cozy-bg-deep)]" : "border-[var(--cozy-bg-deep)] bg-[var(--cozy-bg-deep)] opacity-50"
            }`}>
              <div className="flex items-center gap-2">
                <span className="text-sm">{isUnlocked ? ach.icon : "🔒"}</span>
                <div>
                  <p className={`text-[11px] pixel-body ${isUnlocked ? "text-[var(--cozy-border)]" : "text-[var(--cozy-muted)]"}`}>{ach.name}</p>
                  <p className="text-[9px] text-[var(--cozy-muted)] pixel-body">{ach.description}</p>
                </div>
              </div>
              {isUnlocked && (
                <p className="text-[8px] text-[var(--cozy-positive)] pixel-body mt-1">
                  ✓ {new Date(achievements.unlocked[ach.id]).toLocaleDateString("zh-CN")}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CodexPanel({ state }: { state: GameState | null }) {
  if (!state) return null;
  const allChoiceEvents = getAllChoiceEvents();
  const seenChoices = state.choiceEvents.encountered;
  const allModifiers = getAllModifiers();
  const seenModifiers = state.roguelike.modifierHistory;

  const specialCustomerTypes = [
    { id: "critic", name: "美食评论家猫", icon: "📝", desc: "戴贝雷帽，评价极其苛刻" },
    { id: "royal", name: "皇室猫", icon: "👑", desc: "戴王冠，只吃最贵的" },
    { id: "influencer", name: "网红猫", icon: "📱", desc: "到哪都要拍照" },
    { id: "stray", name: "流浪猫", icon: "💕", desc: "付不起钱但可能带来好运" },
  ];

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] text-[var(--cozy-border)] pixel-body mb-1">声望等级</p>
        <div className="flex gap-1">
          {TIERS.map((tier) => {
            const active = state.reputation.value >= tier.minValue;
            return (
              <div key={tier.id} className={`flex-1 text-center p-1.5 border ${
                active ? "border-[var(--cozy-border)] bg-[var(--cozy-bg-panel)]" : "border-[var(--cozy-bg-deep)] bg-[var(--cozy-bg-deep)] opacity-40"
              }`}>
                <p className="text-sm">{tier.icon}</p>
                <p className="text-[8px] pixel-body" style={{ color: active ? "var(--cozy-border)" : "var(--cozy-muted)" }}>{tier.name}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <p className="text-[10px] text-[var(--cozy-border)] pixel-body mb-1">特殊顾客 {state.specialCustomersSeen.length}/4</p>
        <div className="grid grid-cols-2 gap-2">
          {specialCustomerTypes.map((sc) => {
            const seen = state.specialCustomersSeen.includes(sc.id);
            return (
              <div key={sc.id} className={`border p-2 ${
                seen ? "border-[var(--cozy-positive)] bg-[var(--cozy-bg-panel)]" : "border-[var(--cozy-bg-deep)] bg-[var(--cozy-bg-deep)] opacity-50"
              }`}>
                <p className="text-sm">{seen ? sc.icon : "❓"}</p>
                <p className="text-[10px] pixel-body" style={{ color: seen ? "var(--cozy-foreground)" : "var(--cozy-muted)" }}>
                  {seen ? sc.name : "???"}
                </p>
                {seen && <p className="text-[8px] text-[var(--cozy-muted)] pixel-body">{sc.desc}</p>}
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <p className="text-[10px] text-[var(--cozy-border)] pixel-body mb-1">抉择事件 {seenChoices.length}/{allChoiceEvents.length}</p>
        <div className="grid grid-cols-3 gap-1.5">
          {allChoiceEvents.map((ce) => {
            const seen = seenChoices.includes(ce.id);
            return (
              <div key={ce.id} className={`border p-1.5 text-center ${
                seen ? "border-[var(--cozy-border)] bg-[var(--cozy-bg-panel)]" : "border-[var(--cozy-bg-deep)] bg-[var(--cozy-bg-deep)] opacity-40"
              }`}>
                <p className="text-sm">{seen ? ce.icon : "❓"}</p>
                <p className="text-[8px] pixel-body" style={{ color: seen ? "var(--cozy-foreground)" : "var(--cozy-muted)" }}>
                  {seen ? ce.title : "???"}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <p className="text-[10px] text-[var(--cozy-border)] pixel-body mb-1">改造器 {seenModifiers.length}/{allModifiers.length}</p>
        <div className="grid grid-cols-4 gap-1">
          {allModifiers.map((mod: DailyModifier) => {
            const seen = seenModifiers.includes(mod.id);
            return (
              <div key={mod.id} className={`border p-1 text-center ${
                seen ? "border-[var(--cozy-border)] bg-[var(--cozy-bg-panel)]" : "border-[var(--cozy-bg-deep)] bg-[var(--cozy-bg-deep)] opacity-30"
              }`} title={seen ? `${mod.name}: ${mod.description}` : "???"}>
                <p className="text-xs">{seen ? mod.icon : "?"}</p>
                <p className="text-[7px] pixel-body truncate" style={{ color: seen ? COZY_POLARITY_COLORS[mod.polarity] : "var(--cozy-muted)" }}>
                  {seen ? mod.name : "???"}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="border-t border-[var(--cozy-bg-deep)] pt-2">
        <p className="text-[10px] text-[var(--cozy-border)] pixel-body mb-1">统计数据</p>
        <div className="grid grid-cols-2 gap-1 text-[9px] pixel-body text-[var(--cozy-muted)]">
          <span>总营业天数: {state.roguelike.dayCount}</span>
          <span>总金币: {state.totalGoldEarned}</span>
          <span>总顾客: {state.totalCustomers}</span>
          <span>特殊顾客: {state.totalSpecialCustomers}</span>
          <span>抉择次数: {state.choiceEvents.totalChoicesMade}</span>
          <span>声望峰值: {state.reputation.peakValue.toFixed(0)}</span>
        </div>
      </div>
    </div>
  );
}
