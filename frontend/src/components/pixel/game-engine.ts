/**
 * Pixel restaurant idle game engine.
 * Manages entities, animation loop, and game state via refs (no React re-renders).
 */

import {
  drawFloor,
  drawWall,
  drawKitchenArea,
  drawTable,
  drawChair,
  drawChef,
  drawWaiter,
  drawCustomer,
  drawPlate,
  drawCoin,
  FOOD_COLORS,
} from "./sprites";
import type { FoodItem } from "@/types";

export interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
}

export interface RestaurantState {
  gold: number;
  frame: number;
  floatingTexts: FloatingText[];
  chefX: number;
  chefDir: number;
  waiterX: number;
  waiterY: number;
  waiterTargetTable: number;
  waiterState: "walking" | "serving" | "returning";
  tables: TableState[];
  lastEventTime: number;
}

interface TableState {
  x: number;
  y: number;
  occupied: boolean;
  customerVariant: number;
  eating: boolean;
  eatingTimer: number;
  hasFood: boolean;
  foodColor: string;
  waitingForFood: boolean;
}

const TARGET_FPS = 8;
const FRAME_INTERVAL = 1000 / TARGET_FPS;

export function createInitialState(
  canvasW: number,
  canvasH: number,
  assetValue: number,
  foodItems: FoodItem[]
): RestaurantState {
  const tableCount = getTableCount(assetValue);
  const wallH = canvasH * 0.2;
  const kitchenH = canvasH * 0.18;
  const diningH = canvasH - wallH - kitchenH;

  const tables: TableState[] = [];
  const cols = Math.min(tableCount, 3);
  const rows = Math.ceil(tableCount / 3);

  for (let i = 0; i < tableCount; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const tx = (canvasW / (cols + 1)) * (col + 1) - 20;
    const ty = wallH + 20 + row * (diningH / (rows + 1));

    const shouldOccupy = i < getVisitorCount(assetValue);
    const foodColor = foodItems.length > 0
      ? FOOD_COLORS[foodItems[i % foodItems.length]?.pixel_icon_type ?? "other"] ?? "#9e9e9e"
      : "#9e9e9e";

    tables.push({
      x: tx,
      y: ty,
      occupied: shouldOccupy,
      customerVariant: Math.floor(Math.random() * 20),
      eating: false,
      eatingTimer: 0,
      hasFood: false,
      foodColor,
      waitingForFood: shouldOccupy,
    });
  }

  return {
    gold: 0,
    frame: 0,
    floatingTexts: [],
    chefX: canvasW * 0.3,
    chefDir: 1,
    waiterX: canvasW * 0.5,
    waiterY: canvasH - kitchenH - 10,
    waiterTargetTable: -1,
    waiterState: "returning",
    tables,
    lastEventTime: Date.now(),
  };
}

function getTableCount(assetValue: number): number {
  if (assetValue >= 5000) return 6;
  if (assetValue >= 3000) return 5;
  if (assetValue >= 2000) return 4;
  if (assetValue >= 1200) return 3;
  return 2;
}

function getVisitorCount(assetValue: number): number {
  return Math.min(Math.floor((assetValue / 1000) * 2.5), 6);
}

export function getRestaurantLevel(assetValue: number): {
  level: number;
  name: string;
  stars: number;
} {
  if (assetValue >= 5000) return { level: 5, name: "米其林星级", stars: 5 };
  if (assetValue >= 3000) return { level: 4, name: "人气名店", stars: 4 };
  if (assetValue >= 2000) return { level: 3, name: "街坊口碑店", stars: 3 };
  if (assetValue >= 1200) return { level: 2, name: "小有名气", stars: 2 };
  return { level: 1, name: "初创小店", stars: 1 };
}

export function updateState(state: RestaurantState, canvasW: number, canvasH: number): {
  goldEarned: boolean;
} {
  state.frame++;
  let goldEarned = false;

  const kitchenH = canvasH * 0.18;
  const kitchenY = canvasH - kitchenH;

  // Chef walks back and forth in kitchen area
  state.chefX += state.chefDir * 2;
  if (state.chefX > canvasW * 0.6) state.chefDir = -1;
  if (state.chefX < canvasW * 0.15) state.chefDir = 1;

  // Waiter logic
  if (state.waiterState === "returning") {
    const homeX = canvasW * 0.5;
    const homeY = kitchenY - 10;
    state.waiterX += (homeX - state.waiterX) * 0.1;
    state.waiterY += (homeY - state.waiterY) * 0.1;

    // Find next hungry table
    const hungry = state.tables.findIndex((t) => t.occupied && t.waitingForFood && !t.hasFood);
    if (hungry >= 0 && Math.abs(state.waiterX - homeX) < 5) {
      state.waiterTargetTable = hungry;
      state.waiterState = "walking";
    }
  } else if (state.waiterState === "walking") {
    const target = state.tables[state.waiterTargetTable];
    if (target) {
      const tx = target.x + 20;
      const ty = target.y;
      state.waiterX += (tx - state.waiterX) * 0.08;
      state.waiterY += (ty - state.waiterY) * 0.08;

      if (Math.abs(state.waiterX - tx) < 4 && Math.abs(state.waiterY - ty) < 4) {
        state.waiterState = "serving";
      }
    }
  } else if (state.waiterState === "serving") {
    const target = state.tables[state.waiterTargetTable];
    if (target) {
      target.waitingForFood = false;
      target.hasFood = true;
      target.eating = true;
      target.eatingTimer = 60 + Math.floor(Math.random() * 40);
    }
    state.waiterState = "returning";
  }

  // Update eating customers
  for (const table of state.tables) {
    if (table.eating && table.eatingTimer > 0) {
      table.eatingTimer--;
      if (table.eatingTimer <= 0) {
        table.eating = false;
        table.hasFood = false;
        state.gold++;
        goldEarned = true;

        state.floatingTexts.push({
          x: table.x + 20,
          y: table.y - 10,
          text: "+1",
          color: "#ffcc02",
          life: 30,
          maxLife: 30,
        });

        // Customer leaves and new one may arrive
        table.occupied = false;
        setTimeout(() => {
          table.occupied = true;
          table.customerVariant = Math.floor(Math.random() * 20);
          table.waitingForFood = true;
        }, 3000 + Math.random() * 5000);
      }
    }
  }

  // Update floating texts
  state.floatingTexts = state.floatingTexts.filter((ft) => {
    ft.y -= 0.8;
    ft.life--;
    return ft.life > 0;
  });

  return { goldEarned };
}

export function render(
  ctx: CanvasRenderingContext2D,
  state: RestaurantState,
  canvasW: number,
  canvasH: number,
  assetValue: number
) {
  const wallH = canvasH * 0.2;
  const kitchenH = canvasH * 0.18;
  const diningStartY = wallH;

  ctx.clearRect(0, 0, canvasW, canvasH);

  // Wall
  drawWall(ctx, canvasW, wallH);

  // Restaurant sign on wall
  const { name, stars } = getRestaurantLevel(assetValue);
  ctx.fillStyle = "#5d4037";
  const signW = Math.min(200, canvasW * 0.45);
  const signX = (canvasW - signW) / 2;
  ctx.fillRect(signX, 4, signW, wallH - 8);
  ctx.fillStyle = "#3e2723";
  ctx.fillRect(signX + 3, 7, signW - 6, wallH - 14);

  ctx.fillStyle = "#ffcc02";
  ctx.font = "bold 11px monospace";
  ctx.textAlign = "center";
  ctx.fillText("FITCONOMY 食堂", canvasW / 2, wallH * 0.45);

  ctx.fillStyle = "#ffcc02";
  ctx.font = "9px monospace";
  ctx.fillText("★".repeat(stars) + " " + name, canvasW / 2, wallH * 0.75);

  // Floor
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, diningStartY, canvasW, canvasH - wallH - kitchenH);
  ctx.clip();
  drawFloor(ctx, canvasW, canvasH - wallH - kitchenH, 16);
  ctx.translate(0, diningStartY);
  ctx.translate(0, -diningStartY);
  ctx.restore();

  // Draw floor properly in dining area
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, diningStartY, canvasW, canvasH - wallH - kitchenH);
  ctx.clip();
  for (let row = 0; row < Math.ceil((canvasH - wallH - kitchenH) / 16); row++) {
    for (let col = 0; col < Math.ceil(canvasW / 16); col++) {
      ctx.fillStyle = (row + col) % 2 === 0 ? "#2a2233" : "#231e2e";
      ctx.fillRect(col * 16, diningStartY + row * 16, 16, 16);
    }
  }
  ctx.restore();

  // Tables, chairs, customers
  for (const table of state.tables) {
    // Chairs on both sides
    drawChair(ctx, table.x - 12, table.y + 8, 14, 28);
    drawChair(ctx, table.x + 48, table.y + 8, 14, 28);

    // Table
    drawTable(ctx, table.x, table.y + 12, 50, 24);

    // Food on table
    if (table.hasFood) {
      drawPlate(ctx, table.x + 25, table.y + 18, 6, table.foodColor);
    }

    // Customer
    if (table.occupied) {
      drawCustomer(ctx, table.x - 6, table.y - 8, 28, state.frame, table.customerVariant);

      // Eating animation — small particles
      if (table.eating && state.frame % 3 === 0) {
        ctx.fillStyle = table.foodColor;
        const px = table.x + 20 + Math.random() * 10;
        const py = table.y + 5 + Math.random() * 5;
        ctx.fillRect(px, py, 2, 2);
      }

      // Waiting indicator
      if (table.waitingForFood && !table.hasFood) {
        ctx.fillStyle = "#ffcc02";
        ctx.font = "10px monospace";
        ctx.textAlign = "center";
        const dotCount = (state.frame % 3) + 1;
        ctx.fillText("?".repeat(dotCount), table.x + 25, table.y - 2);
      }
    }
  }

  // Kitchen area
  drawKitchenArea(ctx, 0, canvasH - kitchenH, canvasW, kitchenH);

  // Chef
  drawChef(ctx, state.chefX, canvasH - kitchenH + 4, 32, state.frame);

  // Cooking steam effect
  if (state.frame % 4 < 2) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    for (let i = 0; i < 3; i++) {
      const sx = state.chefX + 10 + i * 8;
      const sy = canvasH - kitchenH - 5 - Math.random() * 10;
      ctx.fillRect(sx, sy, 3, 3);
    }
  }

  // Waiter
  drawWaiter(ctx, state.waiterX, state.waiterY - 16, 28, state.frame);

  // Floating texts (+1 gold)
  for (const ft of state.floatingTexts) {
    const alpha = ft.life / ft.maxLife;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = ft.color;
    ctx.font = "bold 12px monospace";
    ctx.textAlign = "center";
    ctx.fillText(ft.text, ft.x, ft.y);

    // Draw a tiny coin next to it
    drawCoin(ctx, ft.x + 18, ft.y - 3, 5, state.frame);
    ctx.globalAlpha = 1;
  }

  // Gold counter (top right)
  ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
  ctx.fillRect(canvasW - 90, 4, 86, 22);
  ctx.strokeStyle = "#ffcc02";
  ctx.lineWidth = 1;
  ctx.strokeRect(canvasW - 90, 4, 86, 22);
  drawCoin(ctx, canvasW - 78, 15, 7, state.frame);
  ctx.fillStyle = "#ffcc02";
  ctx.font = "bold 11px monospace";
  ctx.textAlign = "left";
  ctx.fillText(`${state.gold}`, canvasW - 68, 19);
}

export { FRAME_INTERVAL };
