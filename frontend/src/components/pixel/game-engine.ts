/**
 * Main game engine: integrates all subsystems including roguelike, reputation, and choice events.
 * Manages the game loop, entity lifecycle, gold economy, depth-sorted rendering, and persistence.
 */

import { preloadAllSprites } from "./sprite-loader";
import { Chef, Waiter, Customer, MascotCat, BossCat, Particle, updateParticle, renderParticle, spawnCoinParticle, spawnEmojiParticle } from "./entities";
import type { SpecialCustomerType } from "./entities";
import { createLayout, renderScene, renderDayNightOverlay, renderDepthSorted, CANVAS_W, CANVAS_H } from "./restaurant";
import type { SceneLayout, Renderable } from "./restaurant";
import { createDayNightState, updateDayNight } from "./day-night";
import type { DayNightState } from "./day-night";
import { createUpgradeState, loadUpgradeState, saveUpgradeState, getTableCount, getChefCount, getWaiterCount, getCookSpeedMultiplier, hasCat, hasTakeout } from "./upgrade-system";
import type { UpgradeState } from "./upgrade-system";
import { calculateSatisfaction, SatisfactionTracker } from "./satisfaction";
import { buildMenu, getRandomMenuItem, getFoodColor } from "./menu-system";
import type { MenuState } from "./menu-system";
import { createAchievementState, loadAchievementState, saveAchievementState, checkAchievements } from "./achievements";
import type { AchievementState } from "./achievements";
import { generateEvent, generateAchievementEvent, generateSystemEvent } from "./events";
import type { GameEvent } from "./events";
import { createReputationState, loadReputationState, saveReputationState, addReputation, getReputationFromSatisfaction, getSpecialCustomerChance, getTrafficMultiplier as getRepTrafficMult } from "./reputation";
import type { ReputationState } from "./reputation";
import { createRoguelikeState, loadRoguelikeState, saveRoguelikeState, isNewDay, startNewDay, rollDailyModifiers, getAggregatedEffects } from "./roguelike";
import type { RoguelikeState, DailyModifier } from "./roguelike";
import { createChoiceEventState, loadChoiceEventState, saveChoiceEventState } from "./choice-events";
import type { ChoiceEventState } from "./choice-events";
import type { FoodItem } from "@/types";

// ─── Game State ────────────────────────────────────────────────────

export interface GameState {
  gold: number;
  totalGoldEarned: number;
  totalCustomers: number;
  level: number;
  frame: number;

  chefs: Chef[];
  waiters: Waiter[];
  customers: Customer[];
  mascot: MascotCat | null;
  bossCat: BossCat;
  particles: Particle[];

  layout: SceneLayout;
  upgrades: UpgradeState;
  dayNight: DayNightState;
  menu: MenuState;
  achievements: AchievementState;
  satisfaction: SatisfactionTracker;
  reputation: ReputationState;
  roguelike: RoguelikeState;
  choiceEvents: ChoiceEventState;

  events: GameEvent[];
  maxEvents: number;

  customerSpawnTimer: number;
  customerSpawnInterval: number;
  takeoutTimer: number;
  nextCustomerId: number;

  initialized: boolean;
  pendingOrders: number;
  pendingDeliveries: PendingDelivery[];
  needsDailySetup: boolean;

  // Collection data (for codex tab)
  specialCustomersSeen: string[];
  totalSpecialCustomers: number;
}

interface PendingDelivery {
  waiter: Waiter;
  customer: Customer;
  phase: "waiting_delivery" | "waiting_payment";
  goldEarned: number;
}

const BASE_SPAWN_INTERVAL = 70;
const STORAGE_KEY_PREFIX = "fitconomy_game";
const STARTING_GOLD = 10;

// ─── Initialization ────────────────────────────────────────────────

export function createGameState(foodItems: FoodItem[], userId?: string): GameState {
  preloadAllSprites();

  const upgrades = loadUpgradeState(userId);
  const achievements = loadAchievementState(userId);
  const layout = createLayout(upgrades);
  const menu = buildMenu(foodItems);
  const dayNight = createDayNightState();
  const reputation = loadReputationState(userId);
  const roguelike = loadRoguelikeState(userId);
  const choiceEvents = loadChoiceEventState(userId);
  const savedGold = loadGold(userId);

  const chefs = createChefs(layout, upgrades);
  const waiters = createWaiters(layout, upgrades);
  const mascot = hasCat(upgrades) ? createMascot(layout) : null;
  const bossCat = new BossCat(250, 200);

  const needsDailySetup = isNewDay(roguelike);

  return {
    gold: savedGold.gold,
    totalGoldEarned: savedGold.totalGoldEarned,
    totalCustomers: savedGold.totalCustomers,
    level: Math.floor(savedGold.totalGoldEarned / 50) + 1,
    frame: 0,

    chefs,
    waiters,
    customers: [],
    mascot,
    bossCat,
    particles: [],

    layout,
    upgrades,
    dayNight,
    menu,
    achievements,
    satisfaction: new SatisfactionTracker(),
    reputation,
    roguelike,
    choiceEvents,

    events: [generateSystemEvent("欢迎回到猫咪餐厅！喵～ 🐱")],
    maxEvents: 50,

    customerSpawnTimer: 10,
    customerSpawnInterval: BASE_SPAWN_INTERVAL,
    takeoutTimer: 0,
    nextCustomerId: 1,

    initialized: true,
    pendingOrders: 0,
    pendingDeliveries: [],
    needsDailySetup,

    specialCustomersSeen: savedGold.specialCustomersSeen ?? [],
    totalSpecialCustomers: savedGold.totalSpecialCustomers ?? 0,
  };
}

function createChefs(layout: SceneLayout, upgrades: UpgradeState): Chef[] {
  const count = getChefCount(upgrades);
  return Array.from({ length: count }, (_, i) => {
    const stove = layout.stovePositions[i % layout.stovePositions.length];
    const idle = layout.kitchenIdlePositions[i % layout.kitchenIdlePositions.length];
    return new Chef(i, stove.x, stove.y, idle.x, idle.y);
  });
}

function createWaiters(layout: SceneLayout, upgrades: UpgradeState): Waiter[] {
  const count = getWaiterCount(upgrades);
  return Array.from({ length: count }, (_, i) => {
    const idle = layout.waiterIdlePositions[i % layout.waiterIdlePositions.length];
    return new Waiter(i, layout.pickupX, layout.pickupY, idle.x, idle.y);
  });
}

function createMascot(layout: SceneLayout): MascotCat {
  return new MascotCat(200, layout.catBounds.top + 60, layout.catBounds);
}

// ─── Engine Callbacks ──────────────────────────────────────────────

export interface EngineCallbacks {
  onGoldChange: (gold: number) => void;
  onEvent: (event: GameEvent) => void;
  onAchievement: (name: string) => void;
  onReputationChange: (value: number, tier: string) => void;
  onChoiceEvent?: () => void;
}

// ─── Main Update Loop ──────────────────────────────────────────────

export function updateGame(state: GameState, callbacks: EngineCallbacks): void {
  if (state.needsDailySetup) return; // Paused until daily setup

  state.frame++;

  // Day/night
  if (state.frame % 60 === 0) {
    updateDayNight(state.dayNight);
  }

  // Roguelike modifier effects
  const modEffects = getAggregatedEffects(state.roguelike.activeModifiers);

  // Customer spawning
  state.customerSpawnTimer--;
  if (state.customerSpawnTimer <= 0) {
    trySpawnCustomer(state, modEffects);
    const satMult = state.satisfaction.getTrafficMultiplier();
    const repMult = getRepTrafficMult(state.reputation);
    const combinedMult = satMult * repMult * modEffects.trafficMult;
    state.customerSpawnInterval = Math.max(30, BASE_SPAWN_INTERVAL / combinedMult);
    state.customerSpawnTimer = state.customerSpawnInterval + Math.random() * 40;
  }

  // Takeout passive income
  if (hasTakeout(state.upgrades)) {
    state.takeoutTimer++;
    if (state.takeoutTimer >= 480) {
      state.takeoutTimer = 0;
      addGold(state, 1, callbacks);
      pushEvent(state, generateSystemEvent("📦 外卖订单！+1 金币", 1), callbacks);
    }
  }

  // Update entities
  for (const chef of state.chefs) chef.update();
  for (const waiter of state.waiters) waiter.update();
  for (const customer of state.customers) customer.update();
  if (state.mascot) state.mascot.update();
  state.bossCat.update();

  // Particles
  state.particles = state.particles.filter(updateParticle);

  // Process lifecycle
  processCustomers(state, callbacks);
  processCookingPipeline(state, callbacks);
  processPendingDeliveries(state, callbacks, modEffects);

  // Level
  state.level = Math.floor(state.totalGoldEarned / 50) + 1;

  // Achievement check
  if (state.frame % 120 === 0) {
    updateAchievementStats(state);
    const newAch = checkAchievements(state.achievements);
    for (const ach of newAch) {
      callbacks.onAchievement(ach.name);
      const evt = generateAchievementEvent(ach.id);
      if (evt) pushEvent(state, evt, callbacks);
    }
  }

  // Auto-save
  if (state.frame % 600 === 0) {
    saveGameState(state);
  }
}

function trySpawnCustomer(
  state: GameState,
  modEffects: ReturnType<typeof getAggregatedEffects>,
): void {
  const maxCustomers = getTableCount(state.upgrades) + 3;
  if (state.customers.length >= maxCustomers) return;

  const layout = state.layout;
  const queueOffset = state.customers.filter((c) => c.isQueuing()).length * 22;

  // Determine if special customer
  let specialType: SpecialCustomerType = null;
  const specialChance = getSpecialCustomerChance(state.reputation) * modEffects.specialCustomerMult;

  if (Math.random() < specialChance) {
    const types: SpecialCustomerType[] = ["critic", "royal", "influencer", "stray"];
    specialType = types[Math.floor(Math.random() * types.length)];
    state.totalSpecialCustomers++;
    if (specialType && !state.specialCustomersSeen.includes(specialType)) {
      state.specialCustomersSeen.push(specialType);
    }
  }

  const customer = new Customer(
    state.nextCustomerId++,
    layout.doorX - 10,
    layout.doorY + 20,
    layout.queueX + queueOffset,
    layout.queueY + queueOffset * 0.3,
    layout.exitX,
    specialType,
  );

  const menuItem = getRandomMenuItem(state.menu);
  if (menuItem) {
    customer.foodName = menuItem.name;
    customer.foodColor = getFoodColor(menuItem.iconType);
  } else {
    customer.foodName = "特制猫粮";
    customer.foodColor = "#ffcc02";
  }

  state.customers.push(customer);
  state.totalCustomers++;

  if (state.dayNight.timeOfDay === "night") {
    state.achievements.stats.nightCustomers++;
  }

  // Special customer entry event
  if (specialType) {
    const names: Record<string, string> = {
      critic: "📝 美食评论家猫来了！压力山大...",
      royal: "👑 皇室猫驾到！准备最好的服务！",
      influencer: "📱 网红猫来了！拍照模式启动！",
      stray: "💕 一只流浪猫怯生生地进来了...",
    };
    pushEvent(state, generateSystemEvent(names[specialType] ?? "特殊顾客来了！"), {} as EngineCallbacks);
  }
}

function processCustomers(state: GameState, callbacks: EngineCallbacks): void {
  const layout = state.layout;

  for (const customer of state.customers) {
    if (!customer.needsTable()) continue;
    const freeTable = layout.tables.find((t) => !t.occupied);
    if (freeTable) {
      freeTable.occupied = true;
      customer.assignTable(freeTable.seatX, freeTable.seatY, layout.tables.indexOf(freeTable));
      const idleChef = state.chefs.find((c) => c.state === "idle");
      if (idleChef) {
        const cookDuration = Math.floor(40 * getCookSpeedMultiplier(state.upgrades));
        idleChef.startCooking(cookDuration);
        state.pendingOrders++;
      }
    }
  }

  const tableCount = getTableCount(state.upgrades);
  const occupiedCount = layout.tables.filter((t) => t.occupied).length;
  if (occupiedCount >= tableCount && tableCount > 0) {
    state.achievements.stats.allTablesFull = true;
  }
  state.achievements.stats.maxConcurrentCustomers = Math.max(
    state.achievements.stats.maxConcurrentCustomers,
    state.customers.length,
  );

  state.customers = state.customers.filter((c) => {
    if (c.isLeaving()) {
      if (c.tableIndex >= 0 && c.tableIndex < layout.tables.length) {
        layout.tables[c.tableIndex].occupied = false;
      }
      return false;
    }
    return true;
  });
}

function processCookingPipeline(state: GameState, _callbacks: EngineCallbacks): void {
  for (const chef of state.chefs) {
    if (!chef.dishReady) continue;
    const waitingCustomer = state.customers.find((c) => c.isWaiting());
    if (!waitingCustomer) continue;
    const availableWaiter = state.waiters.find((w) => w.isAvailable());
    if (!availableWaiter) continue;

    chef.dishReady = false;
    availableWaiter.startDelivery(
      waitingCustomer.seatX + 16,
      waitingCustomer.seatY + 8,
      waitingCustomer.foodColor,
    );

    state.pendingDeliveries.push({
      waiter: availableWaiter,
      customer: waitingCustomer,
      phase: "waiting_delivery",
      goldEarned: 0,
    });
  }
}

function processPendingDeliveries(
  state: GameState,
  callbacks: EngineCallbacks,
  modEffects: ReturnType<typeof getAggregatedEffects>,
): void {
  state.pendingDeliveries = state.pendingDeliveries.filter((pd) => {
    if (pd.phase === "waiting_delivery") {
      if (pd.waiter.state === "returning") {
        pd.customer.receiveFood();
        state.pendingOrders = Math.max(0, state.pendingOrders - 1);

        const sat = calculateSatisfaction(
          pd.customer.waitFrames,
          state.upgrades,
          state.menu.items.length,
          modEffects.satisfactionBonus,
        );
        pd.customer.satisfaction = sat.level;

        const menuItem = state.menu.items.find((m) => m.name === pd.customer.foodName);
        let baseProfit = menuItem ? menuItem.profit * (menuItem.isSignature ? 2 : 1) : 1;

        // Special customer bonuses
        if (pd.customer.specialType === "royal") baseProfit *= 5;
        if (pd.customer.specialType === "critic" && sat.level === "happy") baseProfit *= 3;
        if (pd.customer.specialType === "stray") baseProfit = 0; // Free meal

        pd.goldEarned = Math.max(pd.customer.specialType === "stray" ? 0 : 1,
          Math.round(baseProfit * sat.goldMultiplier * modEffects.profitMult));
        pd.customer.goldPaid = pd.goldEarned;

        state.satisfaction.record(sat.score);

        // Reputation effect
        const repDelta = getReputationFromSatisfaction(sat.level);
        const oldTier = state.reputation.tier;
        addReputation(state.reputation, repDelta);
        if (state.reputation.tier !== oldTier) {
          callbacks.onReputationChange(state.reputation.value, state.reputation.tier);
        }

        // Special customer reputation effects
        if (pd.customer.specialType === "critic") {
          addReputation(state.reputation, sat.level === "happy" ? 5 : -3);
        }
        if (pd.customer.specialType === "stray" && sat.level === "happy") {
          addReputation(state.reputation, 3);
        }
        if (pd.customer.specialType === "influencer" && sat.level === "happy") {
          addReputation(state.reputation, 4);
          pushEvent(state, generateSystemEvent("📱 网红猫发了一条好评！粉丝们蜂拥而至！"), callbacks);
        }

        const emojiP = spawnEmojiParticle(pd.customer.x + 12, pd.customer.y - 8, sat.level);
        if (emojiP) state.particles.push(emojiP);

        pd.phase = "waiting_payment";
      }
      return true;
    }

    if (pd.customer.state === "paying" || pd.customer.state === "leaving") {
      if (pd.goldEarned > 0) {
        const coinParticles = spawnCoinParticle(pd.customer.x + 8, pd.customer.y - 4, pd.goldEarned);
        state.particles.push(...coinParticles);
        addGold(state, pd.goldEarned, callbacks);
      }
      if (pd.goldEarned >= 5) {
        state.achievements.stats.maxGoldOnce = Math.max(
          state.achievements.stats.maxGoldOnce, pd.goldEarned,
        );
      }
      return false;
    }
    return true;
  });
}

function addGold(state: GameState, amount: number, callbacks: EngineCallbacks): void {
  state.gold += amount;
  state.totalGoldEarned += amount;
  callbacks.onGoldChange(state.gold);
}

function pushEvent(state: GameState, event: GameEvent, callbacks: EngineCallbacks): void {
  state.events.unshift(event);
  if (state.events.length > state.maxEvents) state.events.pop();
  if (callbacks.onEvent) callbacks.onEvent(event);
  state.achievements.stats.totalEventsGenerated++;
  if (event.isRare) state.achievements.stats.rareEventsSeen++;
}

function updateAchievementStats(state: GameState): void {
  state.achievements.stats.totalGold = state.totalGoldEarned;
  state.achievements.stats.totalCustomers = state.totalCustomers;
  state.achievements.stats.hasCat = hasCat(state.upgrades);
  state.achievements.stats.satisfactionAvg = state.satisfaction.getAverage();
  state.achievements.stats.signatureDishes = state.menu.items.filter((i) => i.isSignature).length;

  let totalUpgrades = 0;
  for (const lvl of Object.values(state.upgrades.levels)) totalUpgrades += lvl;
  state.achievements.stats.totalUpgrades = totalUpgrades;
}

// ─── Rendering (depth-sorted) ──────────────────────────────────────

export function renderGame(ctx: CanvasRenderingContext2D, state: GameState): void {
  renderScene(ctx, state.layout, state.upgrades, state.dayNight.timeOfDay, state.dayNight.weather);

  // Collect all entities as renderables for depth sorting
  const renderables: Renderable[] = [];

  if (state.mascot) renderables.push(state.mascot.toRenderable());
  if (state.bossCat.visible) renderables.push(state.bossCat.toRenderable());
  for (const c of state.customers) renderables.push(c.toRenderable());
  for (const w of state.waiters) renderables.push(w.toRenderable());
  for (const ch of state.chefs) renderables.push(ch.toRenderable());

  renderDepthSorted(ctx, renderables);

  // Global particles (always on top)
  for (const p of state.particles) renderParticle(ctx, p);

  // Day/night overlay
  renderDayNightOverlay(ctx, state.layout.canvasW, state.layout.canvasH, state.dayNight.timeOfDay);
}

// ─── Daily Setup ───────────────────────────────────────────────────

export function setupNewDay(state: GameState): DailyModifier[] {
  const modifiers = rollDailyModifiers(state.reputation);
  startNewDay(state.roguelike, modifiers);
  state.needsDailySetup = false;

  // Apply flat gold from modifiers
  const effects = getAggregatedEffects(modifiers);
  if (effects.goldFlat !== 0) {
    state.gold += effects.goldFlat;
    if (state.gold < 0) state.gold = 0;
    state.totalGoldEarned += Math.max(0, effects.goldFlat);
  }

  state.achievements.stats.daysPlayed = state.roguelike.dayCount;

  return modifiers;
}

export function continuePreviousDay(state: GameState): void {
  state.needsDailySetup = false;
}

// ─── Upgrade Application ───────────────────────────────────────────

export function applyUpgradeToGame(state: GameState, upgradeId: string): void {
  const layout = createLayout(state.upgrades);
  state.layout = layout;

  if (upgradeId === "chef_count") state.chefs = createChefs(layout, state.upgrades);
  if (upgradeId === "waiter_count") state.waiters = createWaiters(layout, state.upgrades);
  if (upgradeId === "table_count") {
    for (const table of layout.tables) table.occupied = false;
  }
  if (upgradeId === "cat_mascot") {
    if (!state.mascot && hasCat(state.upgrades)) {
      state.mascot = createMascot(layout);
    }
  }
}

// ─── Persistence ───────────────────────────────────────────────────

interface SavedGold {
  gold: number;
  totalGoldEarned: number;
  totalCustomers: number;
  daysPlayed: number;
  specialCustomersSeen: string[];
  totalSpecialCustomers: number;
}

function loadGold(userId?: string): SavedGold {
  const key = userId ? `${STORAGE_KEY_PREFIX}_${userId}` : STORAGE_KEY_PREFIX;
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SavedGold>;
      return {
        gold: parsed.gold ?? 0,
        totalGoldEarned: parsed.totalGoldEarned ?? 0,
        totalCustomers: parsed.totalCustomers ?? 0,
        daysPlayed: parsed.daysPlayed ?? 0,
        specialCustomersSeen: parsed.specialCustomersSeen ?? [],
        totalSpecialCustomers: parsed.totalSpecialCustomers ?? 0,
      };
    }
  } catch { /* noop */ }
  return { gold: STARTING_GOLD, totalGoldEarned: 0, totalCustomers: 0, daysPlayed: 0, specialCustomersSeen: [], totalSpecialCustomers: 0 };
}

export function saveGameState(state: GameState, userId?: string): void {
  const key = userId ? `${STORAGE_KEY_PREFIX}_${userId}` : STORAGE_KEY_PREFIX;
  try {
    const data: SavedGold = {
      gold: state.gold,
      totalGoldEarned: state.totalGoldEarned,
      totalCustomers: state.totalCustomers,
      daysPlayed: state.roguelike.dayCount,
      specialCustomersSeen: state.specialCustomersSeen,
      totalSpecialCustomers: state.totalSpecialCustomers,
    };
    localStorage.setItem(key, JSON.stringify(data));
  } catch { /* noop */ }

  saveUpgradeState(state.upgrades, userId);
  saveAchievementState(state.achievements, userId);
  saveReputationState(state.reputation, userId);
  saveRoguelikeState(state.roguelike, userId);
  saveChoiceEventState(state.choiceEvents, userId);
}

// ─── Event / Menu API ──────────────────────────────────────────────

export function generateRandomEvent(state: GameState): GameEvent {
  return generateEvent(
    state.dayNight.weather,
    state.dayNight.timeOfDay,
    hasCat(state.upgrades),
  );
}

export function updateMenu(state: GameState, foodItems: FoodItem[]): void {
  state.menu = buildMenu(foodItems);
}

export { CANVAS_W, CANVAS_H };
