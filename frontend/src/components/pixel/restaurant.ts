/**
 * 3/4 view restaurant scene.
 * Layout: back wall (top) -> kitchen -> serving counter -> dining area -> entrance (bottom).
 * Entities are depth-sorted by Y position for a natural 2.5D look.
 */

import {
  drawFloorTiles, drawWallTiles, drawWallDecoration, drawWindow,
  drawSprite, drawKitchenCounter, drawDoor, drawCashRegister, drawShadow,
} from "./sprite-loader";
import type { UpgradeState } from "./upgrade-system";
import { getTableCount, getLevel } from "./upgrade-system";
import type { TimeOfDay, Weather } from "./day-night";

export interface TableSlot {
  x: number;
  y: number;
  seatX: number;
  seatY: number;
  occupied: boolean;
}

export interface SceneLayout {
  canvasW: number;
  canvasH: number;
  wallY: number;
  wallH: number;
  kitchenY: number;
  kitchenH: number;
  counterY: number;
  floorY: number;
  floorH: number;
  doorX: number;
  doorY: number;
  queueX: number;
  queueY: number;
  exitX: number;
  stovePositions: { x: number; y: number }[];
  kitchenIdlePositions: { x: number; y: number }[];
  waiterIdlePositions: { x: number; y: number }[];
  pickupX: number;
  pickupY: number;
  tables: TableSlot[];
  windowPositions: { x: number; y: number }[];
  cashRegisterPos: { x: number; y: number };
  catBounds: { left: number; right: number; top: number; bottom: number };
}

export const CANVAS_W = 560;
export const CANVAS_H = 400;

export function createLayout(upgrades: UpgradeState): SceneLayout {
  // 3/4 view: top = back (kitchen), bottom = front (entrance)
  const wallY = 0;
  const wallH = 60;
  const kitchenY = 60;
  const kitchenH = 70;
  const counterY = 130;
  const floorY = 138;
  const floorH = 220;

  const tableCount = getTableCount(upgrades);
  const tables: TableSlot[] = [];

  // Tables arranged in grid on dining floor
  const cols = Math.min(4, Math.ceil(tableCount / 2));
  const startX = 80;
  const gapX = 115;
  const row1Y = floorY + 30;
  const row2Y = floorY + 110;

  for (let i = 0; i < tableCount; i++) {
    const row = i < cols ? 0 : 1;
    const col = row === 0 ? i : i - cols;
    const tx = startX + col * gapX;
    const ty = row === 0 ? row1Y : row2Y;
    tables.push({
      x: tx,
      y: ty,
      seatX: tx + 8,
      seatY: ty - 6,
      occupied: false,
    });
  }

  const stovePositions = [
    { x: 160, y: kitchenY + 10 },
    { x: 260, y: kitchenY + 10 },
    { x: 360, y: kitchenY + 10 },
  ];

  const kitchenIdlePositions = [
    { x: 180, y: kitchenY + 38 },
    { x: 280, y: kitchenY + 38 },
    { x: 380, y: kitchenY + 38 },
  ];

  const waiterIdlePositions = [
    { x: 120, y: counterY + 16 },
    { x: 155, y: counterY + 16 },
    { x: 190, y: counterY + 16 },
  ];

  return {
    canvasW: CANVAS_W,
    canvasH: CANVAS_H,
    wallY,
    wallH,
    kitchenY,
    kitchenH,
    counterY,
    floorY,
    floorH,
    doorX: 15,
    doorY: floorY + floorH - 55,
    queueX: 55,
    queueY: floorY + floorH - 40,
    exitX: -40,
    stovePositions,
    kitchenIdlePositions,
    waiterIdlePositions,
    pickupX: 140,
    pickupY: counterY + 4,
    tables,
    windowPositions: [
      { x: 80, y: wallY + 14 },
      { x: 240, y: wallY + 14 },
      { x: 400, y: wallY + 14 },
    ],
    cashRegisterPos: { x: CANVAS_W - 80, y: floorY + floorH - 40 },
    catBounds: {
      left: 70,
      right: CANVAS_W - 70,
      top: floorY + 20,
      bottom: floorY + floorH - 50,
    },
  };
}

export function renderScene(
  ctx: CanvasRenderingContext2D,
  layout: SceneLayout,
  upgrades: UpgradeState,
  timeOfDay: TimeOfDay,
  weather: Weather,
): void {
  ctx.fillStyle = "#0a0a1a";
  ctx.fillRect(0, 0, layout.canvasW, layout.canvasH);

  const wallDecorLevel = getLevel(upgrades, "wall_decor");
  const floorLevel = getLevel(upgrades, "floor_level");

  // Back wall
  drawWallTiles(ctx, 0, layout.wallY, layout.canvasW, layout.wallH, wallDecorLevel);
  for (const wp of layout.windowPositions) {
    drawWindow(ctx, wp.x, wp.y, timeOfDay, weather);
  }
  drawWallDecoration(ctx, 0, layout.wallY, wallDecorLevel);

  // Restaurant sign
  ctx.fillStyle = "#5d4037";
  ctx.fillRect(155, layout.wallY + 3, 110, 22);
  ctx.fillStyle = "#3e2723";
  ctx.fillRect(157, layout.wallY + 5, 106, 18);
  ctx.fillStyle = "#ffcc02";
  ctx.font = "bold 11px monospace";
  ctx.textAlign = "center";
  ctx.fillText("🐱 猫咪餐厅", 210, layout.wallY + 18);
  ctx.textAlign = "left";

  // Kitchen floor (darker tiles)
  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(0, layout.kitchenY, layout.canvasW, layout.kitchenH);

  // Stoves at back wall
  for (const sp of layout.stovePositions) {
    drawSprite(ctx, "stove", sp.x, sp.y);
  }

  // Kitchen counter (dividing line between kitchen and dining)
  drawKitchenCounter(ctx, 0, layout.counterY, layout.canvasW, 8);

  // Pickup window indicator
  ctx.fillStyle = "#4ade80";
  ctx.fillRect(layout.pickupX - 2, layout.counterY + 2, 28, 4);
  ctx.fillStyle = "#e0d8c0";
  ctx.font = "7px monospace";
  ctx.fillText("出菜口", layout.pickupX - 2, layout.counterY - 2);

  // Dining floor
  drawFloorTiles(ctx, 0, layout.floorY, layout.canvasW, layout.floorH, 18, floorLevel);

  // Door (at bottom-left of dining area)
  drawDoor(ctx, layout.doorX, layout.doorY);

  // Tables and chairs (sorted by Y for depth)
  const sortedTables = [...layout.tables].sort((a, b) => a.y - b.y);
  for (const table of sortedTables) {
    // Shadow under table
    drawShadow(ctx, table.x + 4, table.y + 28, 28, 6);
    // Chair behind table (lower Y = further back)
    drawSprite(ctx, "chair", table.x - 20, table.y - 4);
    // Table
    drawSprite(ctx, "table", table.x, table.y);
  }

  // Cash register
  drawCashRegister(ctx, layout.cashRegisterPos.x, layout.cashRegisterPos.y);

  // Takeout window
  if (getLevel(upgrades, "takeout_window") >= 1) {
    const twx = layout.canvasW - 50;
    const twy = layout.wallY + 25;
    ctx.fillStyle = "#5d4037";
    ctx.fillRect(twx, twy, 38, 32);
    ctx.fillStyle = "#87ceeb";
    ctx.fillRect(twx + 3, twy + 3, 32, 26);
    ctx.fillStyle = "#ffcc02";
    ctx.font = "8px monospace";
    ctx.fillText("外卖", twx + 8, twy + 18);
  }

  // Floor edge / entrance mat
  ctx.fillStyle = "#6d4c41";
  ctx.fillRect(layout.doorX, layout.doorY + 48, 32, 6);
  ctx.fillStyle = "#8b5e3c";
  ctx.fillRect(layout.doorX + 2, layout.doorY + 49, 28, 4);
}

export function renderDayNightOverlay(
  ctx: CanvasRenderingContext2D,
  w: number, h: number,
  timeOfDay: TimeOfDay,
): void {
  if (timeOfDay === "day") return;

  const tints: Record<string, string> = {
    dawn: "rgba(255,200,120,0.1)",
    dusk: "rgba(255,130,60,0.12)",
    night: "rgba(20,20,60,0.22)",
  };

  ctx.globalCompositeOperation = "multiply";
  ctx.fillStyle = tints[timeOfDay] ?? "rgba(0,0,0,0)";
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = "source-over";

  if (timeOfDay === "night") {
    // Warm interior glow
    ctx.globalCompositeOperation = "screen";
    ctx.fillStyle = "rgba(255,200,100,0.06)";
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = "source-over";

    // Light sources around stoves and tables
    const gradient = ctx.createRadialGradient(280, 200, 10, 280, 200, 200);
    gradient.addColorStop(0, "rgba(255,200,100,0.08)");
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
  }
}

// Depth-sorted render helper: collects all renderable objects and sorts by Y
export interface Renderable {
  y: number;
  render: (ctx: CanvasRenderingContext2D) => void;
}

export function renderDepthSorted(ctx: CanvasRenderingContext2D, objects: Renderable[]): void {
  objects.sort((a, b) => a.y - b.y);
  for (const obj of objects) {
    obj.render(ctx);
  }
}
