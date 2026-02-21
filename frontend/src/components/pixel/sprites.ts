/**
 * Pixel sprite drawing functions — pure Canvas 2D, no external assets.
 * All characters are 16x16 pixel-block compositions.
 */

export type SpriteColor = string;

const SKIN = "#ffd5a0";
const HAIR_BLACK = "#2a1a0a";
const HAIR_BROWN = "#6b3a1a";
const WHITE = "#ffffff";
const CHEF_HAT = "#f0f0f0";
const APRON = "#e8e0d0";

function px(
  ctx: CanvasRenderingContext2D,
  baseX: number,
  baseY: number,
  pxSize: number,
  x: number,
  y: number,
  color: string
) {
  ctx.fillStyle = color;
  ctx.fillRect(baseX + x * pxSize, baseY + y * pxSize, pxSize, pxSize);
}

export function drawChef(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  frame: number
) {
  const s = size / 16;
  const bob = frame % 2 === 0 ? 0 : -s;

  // Chef hat
  for (let i = 5; i <= 10; i++) px(ctx, x, y + bob, s, i, 0, CHEF_HAT);
  for (let i = 4; i <= 11; i++) px(ctx, x, y + bob, s, i, 1, CHEF_HAT);
  for (let i = 5; i <= 10; i++) px(ctx, x, y + bob, s, i, 2, CHEF_HAT);

  // Head
  for (let i = 5; i <= 10; i++) {
    px(ctx, x, y + bob, s, i, 3, SKIN);
    px(ctx, x, y + bob, s, i, 4, SKIN);
    px(ctx, x, y + bob, s, i, 5, SKIN);
  }
  // Eyes
  px(ctx, x, y + bob, s, 6, 4, HAIR_BLACK);
  px(ctx, x, y + bob, s, 9, 4, HAIR_BLACK);

  // Body (white apron)
  for (let i = 5; i <= 10; i++) {
    for (let j = 6; j <= 11; j++) {
      px(ctx, x, y + bob, s, i, j, APRON);
    }
  }

  // Arms
  const armOff = frame % 4 < 2 ? 0 : 1;
  px(ctx, x, y + bob, s, 4, 7 + armOff, SKIN);
  px(ctx, x, y + bob, s, 3, 8 + armOff, SKIN);
  px(ctx, x, y + bob, s, 11, 7 + armOff, SKIN);
  px(ctx, x, y + bob, s, 12, 8 + armOff, SKIN);

  // Legs
  const legOff = frame % 2;
  px(ctx, x, y, s, 6, 12, "#3a3a5c");
  px(ctx, x, y, s, 6, 13 + legOff, "#3a3a5c");
  px(ctx, x, y, s, 9, 12, "#3a3a5c");
  px(ctx, x, y, s, 9, 13 + (1 - legOff), "#3a3a5c");

  // Shoes
  px(ctx, x, y, s, 5, 14 + legOff, "#1a1a2e");
  px(ctx, x, y, s, 6, 14 + legOff, "#1a1a2e");
  px(ctx, x, y, s, 9, 14 + (1 - legOff), "#1a1a2e");
  px(ctx, x, y, s, 10, 14 + (1 - legOff), "#1a1a2e");
}

export function drawWaiter(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  frame: number
) {
  const s = size / 16;
  const bob = frame % 2 === 0 ? 0 : -s;

  // Hair
  for (let i = 5; i <= 10; i++) px(ctx, x, y + bob, s, i, 1, HAIR_BROWN);
  for (let i = 5; i <= 10; i++) px(ctx, x, y + bob, s, i, 2, HAIR_BROWN);

  // Head
  for (let i = 5; i <= 10; i++) {
    px(ctx, x, y + bob, s, i, 3, SKIN);
    px(ctx, x, y + bob, s, i, 4, SKIN);
    px(ctx, x, y + bob, s, i, 5, SKIN);
  }
  px(ctx, x, y + bob, s, 6, 4, HAIR_BLACK);
  px(ctx, x, y + bob, s, 9, 4, HAIR_BLACK);

  // Body (vest)
  for (let i = 5; i <= 10; i++) {
    for (let j = 6; j <= 11; j++) {
      px(ctx, x, y + bob, s, i, j, "#1a1a2e");
    }
  }
  // Bow tie
  px(ctx, x, y + bob, s, 7, 6, "#ef4444");
  px(ctx, x, y + bob, s, 8, 6, "#ef4444");

  // Tray arm (right hand holds tray)
  px(ctx, x, y + bob, s, 11, 6, SKIN);
  px(ctx, x, y + bob, s, 12, 5, SKIN);
  px(ctx, x, y + bob, s, 13, 5, "#8b8b9e");
  px(ctx, x, y + bob, s, 14, 5, "#8b8b9e");
  // Left arm
  px(ctx, x, y + bob, s, 4, 7, SKIN);
  px(ctx, x, y + bob, s, 3, 8, SKIN);

  // Legs
  const legOff = frame % 2;
  px(ctx, x, y, s, 6, 12, "#2a2a4a");
  px(ctx, x, y, s, 6, 13 + legOff, "#2a2a4a");
  px(ctx, x, y, s, 9, 12, "#2a2a4a");
  px(ctx, x, y, s, 9, 13 + (1 - legOff), "#2a2a4a");

  px(ctx, x, y, s, 5, 14 + legOff, "#1a1a2e");
  px(ctx, x, y, s, 6, 14 + legOff, "#1a1a2e");
  px(ctx, x, y, s, 9, 14 + (1 - legOff), "#1a1a2e");
  px(ctx, x, y, s, 10, 14 + (1 - legOff), "#1a1a2e");
}

export function drawCustomer(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  frame: number,
  variant: number
) {
  const s = size / 16;
  const bob = frame % 3 === 0 ? -s : 0;

  const hairColors = ["#2a1a0a", "#d4a040", "#c0392b", "#5d4037", "#f39c12"];
  const shirtColors = ["#3498db", "#e74c3c", "#2ecc71", "#9b59b6", "#f39c12", "#1abc9c"];

  const hairC = hairColors[variant % hairColors.length];
  const shirtC = shirtColors[variant % shirtColors.length];

  // Hair
  for (let i = 5; i <= 10; i++) px(ctx, x, y + bob, s, i, 1, hairC);
  for (let i = 5; i <= 10; i++) px(ctx, x, y + bob, s, i, 2, hairC);

  // Head
  for (let i = 5; i <= 10; i++) {
    px(ctx, x, y + bob, s, i, 3, SKIN);
    px(ctx, x, y + bob, s, i, 4, SKIN);
    px(ctx, x, y + bob, s, i, 5, SKIN);
  }
  px(ctx, x, y + bob, s, 6, 4, HAIR_BLACK);
  px(ctx, x, y + bob, s, 9, 4, HAIR_BLACK);
  // Mouth
  px(ctx, x, y + bob, s, 7, 5, "#c0392b");
  px(ctx, x, y + bob, s, 8, 5, "#c0392b");

  // Body
  for (let i = 5; i <= 10; i++) {
    for (let j = 6; j <= 11; j++) {
      px(ctx, x, y + bob, s, i, j, shirtC);
    }
  }

  // Arms
  px(ctx, x, y + bob, s, 4, 7, SKIN);
  px(ctx, x, y + bob, s, 11, 7, SKIN);

  // Legs (sitting - shorter)
  px(ctx, x, y, s, 6, 12, "#3a3a5c");
  px(ctx, x, y, s, 7, 12, "#3a3a5c");
  px(ctx, x, y, s, 8, 12, "#3a3a5c");
  px(ctx, x, y, s, 9, 12, "#3a3a5c");
}

export function drawTable(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number
) {
  // Table top
  ctx.fillStyle = "#5d4037";
  ctx.fillRect(x, y, w, h * 0.35);

  // Table top highlight
  ctx.fillStyle = "#795548";
  ctx.fillRect(x + 2, y + 2, w - 4, h * 0.15);

  // Legs
  ctx.fillStyle = "#3e2723";
  const legW = Math.max(3, w * 0.08);
  ctx.fillRect(x + legW, y + h * 0.35, legW, h * 0.65);
  ctx.fillRect(x + w - legW * 2, y + h * 0.35, legW, h * 0.65);
}

export function drawChair(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number
) {
  // Seat
  ctx.fillStyle = "#8d6e63";
  ctx.fillRect(x, y + h * 0.4, w, h * 0.25);

  // Back
  ctx.fillStyle = "#6d4c41";
  ctx.fillRect(x + w * 0.15, y, w * 0.7, h * 0.4);

  // Legs
  ctx.fillStyle = "#4e342e";
  const legW = Math.max(2, w * 0.12);
  ctx.fillRect(x + legW, y + h * 0.65, legW, h * 0.35);
  ctx.fillRect(x + w - legW * 2, y + h * 0.65, legW, h * 0.35);
}

export function drawPlate(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  foodColor?: string
) {
  // Plate
  ctx.fillStyle = WHITE;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#e0e0e0";
  ctx.beginPath();
  ctx.arc(x, y, r * 0.85, 0, Math.PI * 2);
  ctx.fill();

  if (foodColor) {
    ctx.fillStyle = foodColor;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.55, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawCoin(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  frame: number
) {
  const squash = 0.5 + 0.5 * Math.abs(Math.sin(frame * 0.15));
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(squash, 1);

  ctx.fillStyle = "#ffcc02";
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#b8960f";
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.7, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ffcc02";
  ctx.font = `bold ${r}px monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("$", 0, 1);

  ctx.restore();
}

export function drawKitchenArea(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number
) {
  // Counter
  ctx.fillStyle = "#4e342e";
  ctx.fillRect(x, y, w, h);

  // Counter top
  ctx.fillStyle = "#6d4c41";
  ctx.fillRect(x, y, w, h * 0.2);

  // Stove details
  const stoveW = w * 0.15;
  for (let i = 0; i < 3; i++) {
    const sx = x + w * 0.15 + i * (stoveW + 8);
    ctx.fillStyle = "#2a2a2a";
    ctx.fillRect(sx, y + h * 0.3, stoveW, stoveW);
    ctx.fillStyle = "#ef4444";
    ctx.fillRect(sx + 2, y + h * 0.3 + 2, stoveW - 4, stoveW - 4);
  }
}

export function drawFloor(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  tileSize: number
) {
  for (let row = 0; row < Math.ceil(h / tileSize); row++) {
    for (let col = 0; col < Math.ceil(w / tileSize); col++) {
      ctx.fillStyle = (row + col) % 2 === 0 ? "#2a2233" : "#231e2e";
      ctx.fillRect(col * tileSize, row * tileSize, tileSize, tileSize);
    }
  }
}

export function drawWall(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number
) {
  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(0, 0, w, h);

  // Brick pattern
  ctx.fillStyle = "#222244";
  const brickH = 8;
  const brickW = 20;
  for (let row = 0; row < Math.ceil(h / brickH); row++) {
    const offset = row % 2 === 0 ? 0 : brickW / 2;
    for (let col = -1; col < Math.ceil(w / brickW) + 1; col++) {
      ctx.strokeStyle = "#2a2a4a";
      ctx.lineWidth = 1;
      ctx.strokeRect(offset + col * brickW, row * brickH, brickW, brickH);
    }
  }
}

export const FOOD_COLORS: Record<string, string> = {
  rice: "#fff8e1",
  meat: "#d32f2f",
  vegetable: "#4caf50",
  fruit: "#ff9800",
  dairy: "#e3f2fd",
  drink: "#81d4fa",
  snack: "#ffcc02",
  other: "#9e9e9e",
};
