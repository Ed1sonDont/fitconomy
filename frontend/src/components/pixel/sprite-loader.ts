/**
 * Cat-themed pixel sprite system with PNG loading support.
 * Procedural 16x16 cat sprites (rendered at scale 2 = 32px on screen).
 * All characters are cats with distinct fur colors, outfits, and accessories.
 */

type Palette = Record<string, string>;
type SpriteGrid = string[];

interface CachedSprite {
  canvas: OffscreenCanvas;
  w: number;
  h: number;
}

// ─── Cat Fur Palettes ───────────────────────────────────────────────

export interface CatColors {
  fur: string;
  furShade: string;
  belly: string;
  earInner: string;
  eyeColor: string;
  nose: string;
}

export const CAT_VARIANTS: CatColors[] = [
  { fur: "#f5a623", furShade: "#d4891a", belly: "#fff3d4", earInner: "#f5c882", eyeColor: "#4ade80", nose: "#f472b6" }, // orange tabby
  { fur: "#8b9da5", furShade: "#6b7d85", belly: "#d0dce0", earInner: "#a0b8c0", eyeColor: "#60a5fa", nose: "#e8a0b0" }, // gray
  { fur: "#2a2a3c", furShade: "#1a1a2c", belly: "#4a4a5c", earInner: "#3a3a5c", eyeColor: "#ffcc02", nose: "#c07080" }, // black
  { fur: "#f0ece4", furShade: "#d4d0c8", belly: "#ffffff", earInner: "#f5d4d8", eyeColor: "#60a5fa", nose: "#f5a0b0" }, // white
  { fur: "#c87830", furShade: "#a05820", belly: "#f0d8b0", earInner: "#d8a060", eyeColor: "#4ade80", nose: "#e89098" }, // calico
  { fur: "#e8dcc8", furShade: "#c0b0a0", belly: "#f5efe5", earInner: "#d8c8b4", eyeColor: "#87ceeb", nose: "#d4a0b0" }, // siamese
  { fur: "#8b5e3c", furShade: "#6b3e1c", belly: "#d4a870", earInner: "#a07040", eyeColor: "#4ade80", nose: "#d0908a" }, // brown tabby
  { fur: "#1a1a2e", furShade: "#0a0a1e", belly: "#f0f0f0", earInner: "#2a2a4e", eyeColor: "#f5a623", nose: "#c08080" }, // tuxedo
];

// ─── Cat Sprite Grids (16x16) ─────────────────────────────────────

// Palette: O=outline F=fur f=shade B=belly I=earInner E=eyeWhite e=eyeColor P=pupil N=nose W=whisker

const CAT_FRONT_IDLE: SpriteGrid = [
  "....OF..FO......",
  "...OFIOIFFO.....",
  "..OFFFFFFFFO....",
  "..OFFFFFFFFO....",
  ".OFEeFFFEeFO....",
  ".OFFFFNFFFFO....",
  ".OFFWFBFWFfO....",
  "..OFBBBBFFO.....",
  "...OFFFFFFO.....",
  "...OAAAAAO......",
  "..OAAAAAAO......",
  ".fOAAAAAAOf.....",
  "..OAAAAAAO......",
  "...OFFFO........",
  "..OfO..OfO......",
  "..OO....OO.FfF..",
];

const CAT_FRONT_WALK: SpriteGrid = [
  "....OF..FO......",
  "...OFIOIFFO.....",
  "..OFFFFFFFFO....",
  "..OFFFFFFFFO....",
  ".OFEeFFFEeFO....",
  ".OFFFFNFFFFO....",
  ".OFFWFBFWFfO....",
  "..OFBBBBFFO.....",
  "...OFFFFFFO.....",
  "...OAAAAAO......",
  "..OAAAAAAO......",
  ".fOAAAAAAOf.....",
  "..OAAAAAAO......",
  "...OFFFO........",
  "..OfO...OfO.....",
  ".OO......OO.FfF.",
];

const CAT_SIDE_IDLE: SpriteGrid = [
  ".....OFFO.......",
  "....OFFFFO......",
  "...OFFFFFFO.....",
  "...OFEeFFFO.....",
  "...OFFFFNFO.....",
  "...OFFWBFFO.....",
  "....OFFFFO......",
  "....OAAAAO......",
  "...OAAAAAO......",
  "..OAAAAAAO......",
  "..OAAAAAAO......",
  "...OAAAAO.......",
  "...OFFFO........",
  "..OfO.OfO.......",
  "..OO...OO.......",
  "FfFO............",
];

const CAT_SIDE_WALK: SpriteGrid = [
  ".....OFFO.......",
  "....OFFFFO......",
  "...OFFFFFFO.....",
  "...OFEeFFFO.....",
  "...OFFFFNFO.....",
  "...OFFWBFFO.....",
  "....OFFFFO......",
  "....OAAAAO......",
  "...OAAAAAO......",
  "..OAAAAAAO......",
  "..OAAAAAAO......",
  "...OAAAAO.......",
  "...OFFFO........",
  "..OfO...OfO.....",
  ".OO......OO.....",
  "FfFO............",
];

const CAT_SIT: SpriteGrid = [
  "................",
  "....OF..FO......",
  "...OFIOIFFO.....",
  "..OFFFFFFFFO....",
  ".OFEeFFFEeFO....",
  ".OFFFFNFFFFO....",
  ".OFFWFBFWFfO....",
  "..OFBBBBFFO.....",
  "...OFFFFFFO.....",
  "..OAAAAAAO......",
  ".OAAAAAAAAO.....",
  ".fOAAAAAAAAf....",
  "..OAAFAFAFAO....",
  "..OFFFFFFF.O....",
  "...OOOOOOO..FfF.",
  "................",
];

const CAT_SLEEP: SpriteGrid = [
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "....OOOOOOOO....",
  "...OFFFFFFFF0...",
  "..OFFeeFFeeFFO..",
  "..OFFFFnFFFFFO..",
  "..OBBBBBBBBFFO..",
  ".OFFFFFFFFFFF0..",
  ".OfFFFFFFFFFfO..",
  ".OOOOOOOOOOOO...",
  "..............z.",
  ".............zz.",
];

const CAT_COOK: SpriteGrid = [
  "....OF..FO......",
  "...OFIOIFFO.....",
  "..OFFFFFFFFO....",
  "..OFFFFFFFFO....",
  ".OFEeFFFEeFO....",
  ".OFFFFNFFFFO....",
  ".OFFWFBFWFfO....",
  "..OFBBBBFFO.....",
  "..fOFFFFFFOf....",
  "...OAAAAAO......",
  "..OAAAAAAO.f....",
  "..OAAAAAAO.f....",
  "..OAAAAAAO......",
  "...OFFFO........",
  "..OfO..OfO......",
  "..OO....OO......",
];

// ─── Chef Hat Overlay ─────────────────────────────────────────────

const CHEF_HAT: SpriteGrid = [
  "....HHHH........",
  "...HHHHHH.......",
  "...HHHHHH.......",
  "..HHHhHhHH......",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
];

const WAITER_BOW: SpriteGrid = [
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "...ORRRO........",
  "..OARRRAO.......",
  "................",
  "................",
  "................",
  "................",
  "................",
];

// ─── Special Customer Accessories ─────────────────────────────────

const CROWN_OVERLAY: SpriteGrid = [
  "...G.G.G........",
  "..GGGGGGG.......",
  "..GGGGGGG.......",
  "................",
];

const BERET_OVERLAY: SpriteGrid = [
  "....LLLLL.......",
  "...LLLLLLL......",
  "..LLLLLLLL......",
  "................",
];

const GLASSES_OVERLAY: SpriteGrid = [
  "................",
  "................",
  "................",
  "................",
  ".OMMMOMMMO......",
  "................",
];

// ─── Furniture ────────────────────────────────────────────────────

const TABLE_PAL: Palette = { O: "#3e2723", T: "#6d4c41", t: "#8d6e63", H: "#5d4037", g: "#a1887f" };
const TABLE_GRID: SpriteGrid = [
  "..OOOOOOOOOO....",
  "..OttttttttO....",
  "..OtgTTTTgtO....",
  "..OTTTTTTTTO....",
  "..OTTTTTTTTO....",
  "..OOOOOOOOOO....",
  "....OH..HO......",
  "....OH..HO......",
  "....OH..HO......",
  "....OH..HO......",
  "....OH..HO......",
  "...OHHOOHHO.....",
  "................",
  "................",
  "................",
  "................",
];

const CHAIR_PAL: Palette = { O: "#3e2723", C: "#a1887f", c: "#8d6e63", L: "#5d4037", B: "#6d4c41" };
const CHAIR_GRID: SpriteGrid = [
  "................",
  "..OcccO.........",
  "..OcccO.........",
  "..OcccO.........",
  "..OCCCCCO.......",
  "..OCCCCCO.......",
  "..OOOOOOO.......",
  "..OL...LO.......",
  "..OL...LO.......",
  "..OL...LO.......",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
];

const STOVE_PAL: Palette = { O: "#1a1a2e", S: "#3a3a4c", s: "#2a2a3c", R: "#ef4444", r: "#c0392b", G: "#4a4a5c", g: "#5a5a6c" };
const STOVE_GRID: SpriteGrid = [
  "OOOOOOOOOOOOOOOO",
  "OgGGGGGGGGGGGgO",
  "OG..RR..RR..RGO",
  "OG..rr..rr..rGO",
  "OGGGGGGGGGGGGGO",
  "OSSSSSSSSSSSSSSO",
  "OSsSSsSSsSSsSSsO",
  "OSSSSSSSSSSSSSSO",
  "OSsSSsSSsSSsSSsO",
  "OSSSSSSSSSSSSSSO",
  "OSSSSSSSSSSSSSSO",
  "OSSSSSSSSSSSSSSO",
  "OSSSSSSSSSSSSSSO",
  "OSSSSSSSSSSSSSSO",
  "OSSSSSSSSSSSSSSO",
  "OOOOOOOOOOOOOOOO",
];

// ─── Effect Sprites ───────────────────────────────────────────────

const COIN_PAL: Palette = { O: "#b8960f", G: "#ffcc02", g: "#e6b800", D: "#d4a800", $: "#b8960f" };
const COIN_GRID: SpriteGrid = [
  "........",
  "..OOOO..",
  ".OGGGGO.",
  "OGgDDgGO",
  "OGD$$DGO",
  "OGgDDgGO",
  ".OGGGGO.",
  "..OOOO..",
];

const HEART_PAL: Palette = { O: "#8b0000", R: "#ef4444", r: "#ff7777" };
const HEART_GRID: SpriteGrid = [
  "........",
  ".OO..OO.",
  "OrRrrRrO",
  "ORRRRRRO",
  ".ORRRRO.",
  "..ORRO..",
  "...OO...",
  "........",
];

const ANGRY_PAL: Palette = { R: "#ef4444", r: "#ff7777" };
const ANGRY_GRID: SpriteGrid = [
  "........",
  "..R..R..",
  ".Rr..rR.",
  "..RRRR..",
  ".RRRRRR.",
  "..RRRR..",
  ".Rr..rR.",
  "..R..R..",
];

const STAR_PAL: Palette = { Y: "#ffcc02", y: "#ffe066" };
const STAR_GRID: SpriteGrid = [
  "........",
  "...YY...",
  "...yY...",
  ".YyYYYY.",
  "..yYYy..",
  "..YYYY..",
  ".YY..YY.",
  "........",
];

const FISH_PAL: Palette = { O: "#1a1a2e", F: "#60a5fa", f: "#3b82f6", T: "#93c5fd", E: "#1a1a2e" };
const FISH_GRID: SpriteGrid = [
  "........",
  "...OFFO.",
  "..OFFFFO",
  ".OFEFTFO",
  "OFFFFFFO",
  ".OFFFFO.",
  "..OFFO..",
  "........",
];

// ─── Rendering Engine ─────────────────────────────────────────────

const spriteCache = new Map<string, CachedSprite>();

function renderGrid(grid: SpriteGrid, palette: Palette, scale: number): CachedSprite {
  const h = grid.length;
  const w = Math.max(...grid.map((r) => r.length));
  const canvas = new OffscreenCanvas(w * scale, h * scale);
  const ctx = canvas.getContext("2d")!;

  for (let row = 0; row < h; row++) {
    for (let col = 0; col < grid[row].length; col++) {
      const ch = grid[row][col];
      if (ch === "." || ch === " ") continue;
      const color = palette[ch];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(col * scale, row * scale, scale, scale);
    }
  }
  return { canvas, w: w * scale, h: h * scale };
}

function buildCatPalette(colors: CatColors, outfitColor: string, outfitShade: string): Palette {
  return {
    O: "#1a1a2e",
    F: colors.fur,
    f: colors.furShade,
    B: colors.belly,
    I: colors.earInner,
    E: "#ffffff",
    e: colors.eyeColor,
    P: "#1a1a2e",
    N: colors.nose,
    W: "#c0c0c0",
    A: outfitColor,
    a: outfitShade,
    T: colors.fur,
    z: "#8b8b9e",
    "0": colors.furShade,
  };
}

function overlayGrid(base: CachedSprite, overlay: SpriteGrid, palette: Palette, scale: number): CachedSprite {
  const canvas = new OffscreenCanvas(base.w, base.h);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(base.canvas, 0, 0);

  for (let row = 0; row < overlay.length; row++) {
    for (let col = 0; col < overlay[row].length; col++) {
      const ch = overlay[row][col];
      if (ch === "." || ch === " ") continue;
      const color = palette[ch];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(col * scale, row * scale, scale, scale);
    }
  }
  return { canvas, w: base.w, h: base.h };
}

function getCached(key: string): CachedSprite | undefined {
  return spriteCache.get(key);
}

function cache(key: string, sprite: CachedSprite): CachedSprite {
  spriteCache.set(key, sprite);
  return sprite;
}

// ─── Build Cat Sprites ────────────────────────────────────────────

const SCALE = 2;

function buildCatSprite(
  key: string,
  grid: SpriteGrid,
  colors: CatColors,
  outfitColor: string,
  outfitShade: string,
  overlays: { grid: SpriteGrid; palette: Palette }[] = [],
): CachedSprite {
  const existing = getCached(key);
  if (existing) return existing;

  const pal = buildCatPalette(colors, outfitColor, outfitShade);
  let sprite = renderGrid(grid, pal, SCALE);

  for (const ol of overlays) {
    sprite = overlayGrid(sprite, ol.grid, ol.palette, SCALE);
  }

  return cache(key, sprite);
}

const HAT_PAL: Palette = { H: "#f0f0f0", h: "#d4d4d4" };
const BOW_PAL: Palette = { R: "#ef4444", O: "#1a1a2e", A: "transparent" };
const CROWN_PAL: Palette = { G: "#ffcc02", g: "#d4a800" };
const BERET_PAL: Palette = { L: "#9b59b6", l: "#7d3c98" };
const GLASSES_PAL: Palette = { M: "#8b8b9e", O: "#1a1a2e" };

// ─── Preload ──────────────────────────────────────────────────────

const CHEF_COLORS: CatColors = CAT_VARIANTS[0]; // orange tabby
const WAITER_COLORS: CatColors = CAT_VARIANTS[1]; // gray
const MASCOT_COLORS: CatColors = CAT_VARIANTS[0]; // orange
const BOSS_COLORS: CatColors = CAT_VARIANTS[2]; // black

export function preloadAllSprites(): void {
  // Chef cat (orange tabby with hat)
  buildCatSprite("chef_0_0", CAT_FRONT_IDLE, CHEF_COLORS, "#f0f0f0", "#d4d4d4", [{ grid: CHEF_HAT, palette: HAT_PAL }]);
  buildCatSprite("chef_0_1", CAT_COOK, CHEF_COLORS, "#f0f0f0", "#d4d4d4", [{ grid: CHEF_HAT, palette: HAT_PAL }]);
  buildCatSprite("chef_walk_0", CAT_FRONT_WALK, CHEF_COLORS, "#f0f0f0", "#d4d4d4", [{ grid: CHEF_HAT, palette: HAT_PAL }]);
  buildCatSprite("chef_side_0", CAT_SIDE_IDLE, CHEF_COLORS, "#f0f0f0", "#d4d4d4");
  buildCatSprite("chef_side_1", CAT_SIDE_WALK, CHEF_COLORS, "#f0f0f0", "#d4d4d4");

  // Waiter cat (gray with bow)
  buildCatSprite("waiter_0_0", CAT_FRONT_IDLE, WAITER_COLORS, "#1a1a2e", "#111122", [{ grid: WAITER_BOW, palette: BOW_PAL }]);
  buildCatSprite("waiter_0_1", CAT_FRONT_WALK, WAITER_COLORS, "#1a1a2e", "#111122", [{ grid: WAITER_BOW, palette: BOW_PAL }]);
  buildCatSprite("waiter_side_0", CAT_SIDE_IDLE, WAITER_COLORS, "#1a1a2e", "#111122");
  buildCatSprite("waiter_side_1", CAT_SIDE_WALK, WAITER_COLORS, "#1a1a2e", "#111122");

  // Customer cats (8 variants)
  for (let v = 0; v < CAT_VARIANTS.length; v++) {
    const c = CAT_VARIANTS[v];
    const outfit = CUSTOMER_OUTFITS[v % CUSTOMER_OUTFITS.length];
    buildCatSprite(`customer_${v}_0`, CAT_FRONT_IDLE, c, outfit.color, outfit.shade);
    buildCatSprite(`customer_${v}_1`, CAT_FRONT_WALK, c, outfit.color, outfit.shade);
    buildCatSprite(`customer_sit_${v}_0`, CAT_SIT, c, outfit.color, outfit.shade);
  }

  // Special customer overlays
  buildCatSprite("critic_0", CAT_FRONT_IDLE, CAT_VARIANTS[4], "#6b4226", "#4a2810", [{ grid: BERET_OVERLAY, palette: BERET_PAL }]);
  buildCatSprite("critic_sit", CAT_SIT, CAT_VARIANTS[4], "#6b4226", "#4a2810", [{ grid: BERET_OVERLAY, palette: BERET_PAL }]);
  buildCatSprite("royal_0", CAT_FRONT_IDLE, CAT_VARIANTS[3], "#9b59b6", "#7d3c98", [{ grid: CROWN_OVERLAY, palette: CROWN_PAL }]);
  buildCatSprite("royal_sit", CAT_SIT, CAT_VARIANTS[3], "#9b59b6", "#7d3c98", [{ grid: CROWN_OVERLAY, palette: CROWN_PAL }]);
  buildCatSprite("influencer_0", CAT_FRONT_IDLE, CAT_VARIANTS[5], "#ff69b4", "#e0508a");
  buildCatSprite("influencer_sit", CAT_SIT, CAT_VARIANTS[5], "#ff69b4", "#e0508a", [{ grid: GLASSES_OVERLAY, palette: GLASSES_PAL }]);
  buildCatSprite("stray_0", CAT_FRONT_IDLE, CAT_VARIANTS[6], "#8b6914", "#6b4910");
  buildCatSprite("stray_sit", CAT_SIT, CAT_VARIANTS[6], "#8b6914", "#6b4910");

  // Mascot cat
  buildCatSprite("mascot_sit", CAT_SIT, MASCOT_COLORS, MASCOT_COLORS.fur, MASCOT_COLORS.furShade);
  buildCatSprite("mascot_sleep", CAT_SLEEP, MASCOT_COLORS, MASCOT_COLORS.fur, MASCOT_COLORS.furShade);
  buildCatSprite("mascot_walk_0", CAT_SIDE_IDLE, MASCOT_COLORS, MASCOT_COLORS.fur, MASCOT_COLORS.furShade);
  buildCatSprite("mascot_walk_1", CAT_SIDE_WALK, MASCOT_COLORS, MASCOT_COLORS.fur, MASCOT_COLORS.furShade);

  // Boss cat (black with top hat)
  buildCatSprite("boss_0", CAT_FRONT_IDLE, BOSS_COLORS, "#1a1a2e", "#111122", [{ grid: CROWN_OVERLAY, palette: { G: "#1a1a2e", g: "#2a2a3c" } }]);

  // Furniture
  cache("table_0_0", renderGrid(TABLE_GRID, TABLE_PAL, SCALE));
  cache("chair_0_0", renderGrid(CHAIR_GRID, CHAIR_PAL, SCALE));
  cache("stove_0_0", renderGrid(STOVE_GRID, STOVE_PAL, SCALE));

  // Effects
  cache("coin_0_0", renderGrid(COIN_GRID, COIN_PAL, SCALE));
  cache("heart_0_0", renderGrid(HEART_GRID, HEART_PAL, SCALE));
  cache("angry_0_0", renderGrid(ANGRY_GRID, ANGRY_PAL, SCALE));
  cache("star_0_0", renderGrid(STAR_GRID, STAR_PAL, SCALE));
  cache("fish_0_0", renderGrid(FISH_GRID, FISH_PAL, SCALE));
}

const CUSTOMER_OUTFITS = [
  { color: "#3498db", shade: "#2980b9" },
  { color: "#e74c3c", shade: "#c0392b" },
  { color: "#2ecc71", shade: "#27ae60" },
  { color: "#9b59b6", shade: "#8e44ad" },
  { color: "#1abc9c", shade: "#16a085" },
  { color: "#f39c12", shade: "#e67e22" },
  { color: "#e74c3c", shade: "#c0392b" },
  { color: "#3498db", shade: "#2980b9" },
];

// ─── Public Draw API ──────────────────────────────────────────────

export function drawSprite(
  ctx: CanvasRenderingContext2D,
  name: string,
  x: number,
  y: number,
  frame: number = 0,
  variant: number = 0,
  flipH: boolean = false,
): void {
  const key = resolveSpriteKey(name, frame, variant);
  const sprite = getCached(key);
  if (!sprite) return;

  if (flipH) {
    ctx.save();
    ctx.translate(x + sprite.w, y);
    ctx.scale(-1, 1);
    ctx.drawImage(sprite.canvas, 0, 0);
    ctx.restore();
  } else {
    ctx.drawImage(sprite.canvas, x, y);
  }
}

function resolveSpriteKey(name: string, frame: number, variant: number): string {
  switch (name) {
    case "chef": return `chef_0_${frame % 2}`;
    case "chef_walk": return `chef_walk_0`;
    case "chef_side": return `chef_side_${frame % 2}`;
    case "waiter": return `waiter_0_${frame % 2}`;
    case "waiter_side": return `waiter_side_${frame % 2}`;
    case "customer": return `customer_${variant % CAT_VARIANTS.length}_${frame % 2}`;
    case "customer_sit": return `customer_sit_${variant % CAT_VARIANTS.length}_0`;
    case "critic": return frame === 0 ? "critic_0" : "critic_sit";
    case "critic_sit": return "critic_sit";
    case "royal": return frame === 0 ? "royal_0" : "royal_sit";
    case "royal_sit": return "royal_sit";
    case "influencer": return frame === 0 ? "influencer_0" : "influencer_sit";
    case "influencer_sit": return "influencer_sit";
    case "stray": return frame === 0 ? "stray_0" : "stray_sit";
    case "stray_sit": return "stray_sit";
    case "mascot_sit": return "mascot_sit";
    case "mascot_sleep": return "mascot_sleep";
    case "mascot_walk": return `mascot_walk_${frame % 2}`;
    case "boss": return "boss_0";
    case "table": return "table_0_0";
    case "chair": return "chair_0_0";
    case "stove": return "stove_0_0";
    case "coin": return "coin_0_0";
    case "heart": return "heart_0_0";
    case "angry": return "angry_0_0";
    case "star": return "star_0_0";
    case "fish": return "fish_0_0";
    default: return `${name}_${variant}_${frame}`;
  }
}

export function getSpriteSize(name: string): { w: number; h: number } {
  if (["coin", "heart", "angry", "star", "fish"].includes(name)) {
    return { w: 8 * SCALE, h: 8 * SCALE };
  }
  return { w: 16 * SCALE, h: 16 * SCALE };
}

// ─── Shadow Rendering ─────────────────────────────────────────────

export function drawShadow(ctx: CanvasRenderingContext2D, x: number, y: number, w: number = 24, h: number = 8): void {
  ctx.save();
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = "#000000";
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y, w / 2, h / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ─── Tile Rendering ───────────────────────────────────────────────

const FLOOR_PALETTES = [
  ["#2a2233", "#251f2e"],
  ["#4a3728", "#3e2f24"],
  ["#6d5040", "#5d4538"],
  ["#8d7055", "#7d6048"],
];

export function drawFloorTiles(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  tileSize: number, level: number,
): void {
  const pal = FLOOR_PALETTES[Math.min(level, FLOOR_PALETTES.length - 1)];
  for (let row = 0; row < Math.ceil(h / tileSize); row++) {
    for (let col = 0; col < Math.ceil(w / tileSize); col++) {
      ctx.fillStyle = pal[(row + col) % 2];
      ctx.fillRect(x + col * tileSize, y + row * tileSize, tileSize, tileSize);
      // Subtle grain
      if ((row + col) % 3 === 0) {
        ctx.fillStyle = "rgba(255,255,255,0.03)";
        ctx.fillRect(x + col * tileSize + 2, y + row * tileSize + 2, tileSize - 4, 1);
      }
    }
  }
}

const WALL_PALETTES = [
  { base: "#1a1a2e", brick: "#222244", accent: "#2a2a4e" },
  { base: "#2a1a1a", brick: "#3a2222", accent: "#4a2828" },
  { base: "#1a2a1a", brick: "#224422", accent: "#2a5a2a" },
  { base: "#2a2a1a", brick: "#3a3a22", accent: "#4a4a2a" },
];

export function drawWallTiles(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, level: number,
): void {
  const pal = WALL_PALETTES[Math.min(level, WALL_PALETTES.length - 1)];
  ctx.fillStyle = pal.base;
  ctx.fillRect(x, y, w, h);

  ctx.strokeStyle = pal.brick;
  ctx.lineWidth = 1;
  const bH = 10, bW = 24;
  for (let row = 0; row < Math.ceil(h / bH); row++) {
    const off = row % 2 === 0 ? 0 : bW / 2;
    for (let col = -1; col < Math.ceil(w / bW) + 1; col++) {
      ctx.strokeRect(x + off + col * bW, y + row * bH, bW, bH);
    }
  }

  // Baseboard
  ctx.fillStyle = pal.accent;
  ctx.fillRect(x, y + h - 4, w, 4);
}

export function drawWallDecoration(ctx: CanvasRenderingContext2D, x: number, y: number, level: number): void {
  if (level <= 0) return;
  const frames = [
    { color: "#8b4513", frame: "#d4a040" },
    { color: "#2e7d32", frame: "#a5d6a7" },
    { color: "#1565c0", frame: "#90caf9" },
    { color: "#6a1b9a", frame: "#ce93d8" },
    { color: "#e65100", frame: "#ffcc80" },
  ];
  for (let i = 0; i < Math.min(level, frames.length); i++) {
    const d = frames[i];
    const dx = x + 60 + i * 100;
    const dy = y + 8;
    ctx.fillStyle = d.frame;
    ctx.fillRect(dx - 2, dy - 2, 30, 24);
    ctx.fillStyle = d.color;
    ctx.fillRect(dx, dy, 26, 20);
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.fillRect(dx + 2, dy + 2, 8, 6);
  }
}

export function drawWindow(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, timeOfDay: string, weather: string,
): void {
  ctx.fillStyle = "#5d4037";
  ctx.fillRect(x, y, 42, 38);
  ctx.fillStyle = "#3e2723";
  ctx.fillRect(x + 2, y + 2, 38, 34);

  const skyColors: Record<string, string> = {
    dawn: "#ff9a76", day: "#87ceeb", dusk: "#ff6b35", night: "#0a0a2a",
  };
  ctx.fillStyle = skyColors[timeOfDay] ?? "#87ceeb";
  ctx.fillRect(x + 4, y + 4, 34, 30);

  if (weather === "cloudy" || weather === "rainy") {
    ctx.fillStyle = "rgba(200,200,200,0.5)";
    ctx.fillRect(x + 10, y + 10, 14, 7);
    ctx.fillRect(x + 22, y + 14, 12, 6);
  }
  if (weather === "rainy") {
    ctx.fillStyle = "rgba(100,150,255,0.6)";
    for (let i = 0; i < 6; i++) {
      ctx.fillRect(x + 6 + Math.random() * 28, y + 18 + Math.random() * 14, 1, 4);
    }
  }
  if (weather === "snowy") {
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    for (let i = 0; i < 8; i++) {
      ctx.fillRect(x + 6 + Math.random() * 28, y + 6 + Math.random() * 26, 2, 2);
    }
  }
  if (timeOfDay === "night") {
    ctx.fillStyle = "#ffcc02";
    ctx.fillRect(x + 12, y + 8, 2, 2);
    ctx.fillRect(x + 26, y + 10, 2, 2);
    ctx.fillRect(x + 20, y + 7, 1, 1);
  }

  ctx.fillStyle = "#5d4037";
  ctx.fillRect(x + 20, y + 4, 2, 30);
  ctx.fillRect(x + 4, y + 18, 34, 2);
}

export function drawKitchenCounter(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
): void {
  ctx.fillStyle = "#4e342e";
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = "#8d6e63";
  ctx.fillRect(x, y, w, 4);
  ctx.fillStyle = "#a1887f";
  ctx.fillRect(x + 2, y + 1, w - 4, 2);
}

export function drawDoor(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.fillStyle = "#5d4037";
  ctx.fillRect(x, y, 30, 50);
  ctx.fillStyle = "#795548";
  ctx.fillRect(x + 3, y + 3, 24, 44);
  ctx.fillStyle = "#8d6e63";
  ctx.fillRect(x + 5, y + 5, 20, 18);
  ctx.fillRect(x + 5, y + 26, 20, 18);
  ctx.fillStyle = "#ffcc02";
  ctx.fillRect(x + 22, y + 24, 3, 5);
  // Cat door flap at bottom
  ctx.fillStyle = "#6d4c41";
  ctx.fillRect(x + 8, y + 38, 14, 8);
  ctx.fillStyle = "#5d4037";
  ctx.fillRect(x + 10, y + 40, 10, 4);
}

export function drawCashRegister(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.fillStyle = "#4a4a4a";
  ctx.fillRect(x, y + 8, 26, 18);
  ctx.fillStyle = "#333333";
  ctx.fillRect(x + 2, y + 10, 22, 7);
  ctx.fillStyle = "#4ade80";
  ctx.fillRect(x + 4, y + 11, 18, 5);
  ctx.fillStyle = "#1a1a2e";
  ctx.font = "6px monospace";
  ctx.fillText("$$$", x + 6, y + 15);
  ctx.fillStyle = "#333333";
  ctx.fillRect(x - 2, y + 20, 30, 6);
}

export function drawFoodPlate(ctx: CanvasRenderingContext2D, x: number, y: number, foodColor: string): void {
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(x, y, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#e8e8e8";
  ctx.beginPath();
  ctx.arc(x, y, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = foodColor;
  ctx.beginPath();
  ctx.arc(x, y, 4, 0, Math.PI * 2);
  ctx.fill();
}

export function drawSteam(ctx: CanvasRenderingContext2D, x: number, y: number, frame: number): void {
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  for (let i = 0; i < 4; i++) {
    const ox = Math.sin((frame + i * 18) * 0.2) * 5;
    const oy = -((frame * 0.5 + i * 7) % 22);
    const size = 1 + (i % 2);
    ctx.fillRect(x + ox + i * 4, y + oy, size, size);
  }
}

// ─── PNG Sprite Sheet Support ─────────────────────────────────────

export class SpriteSheet {
  image: HTMLImageElement | null = null;
  frameW: number;
  frameH: number;
  cols: number = 1;
  rows: number = 1;
  loaded = false;

  constructor(frameW: number, frameH: number) {
    this.frameW = frameW;
    this.frameH = frameH;
  }

  async load(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.image = img;
        this.cols = Math.floor(img.width / this.frameW);
        this.rows = Math.floor(img.height / this.frameH);
        this.loaded = true;
        resolve();
      };
      img.onerror = reject;
      img.src = src;
    });
  }

  draw(
    ctx: CanvasRenderingContext2D,
    frameIndex: number,
    x: number, y: number,
    scale: number = 1,
    flipH: boolean = false,
  ): void {
    if (!this.image || !this.loaded) return;
    const col = frameIndex % this.cols;
    const row = Math.floor(frameIndex / this.cols);
    const sx = col * this.frameW;
    const sy = row * this.frameH;
    const dw = this.frameW * scale;
    const dh = this.frameH * scale;

    if (flipH) {
      ctx.save();
      ctx.translate(x + dw, y);
      ctx.scale(-1, 1);
      ctx.drawImage(this.image, sx, sy, this.frameW, this.frameH, 0, 0, dw, dh);
      ctx.restore();
    } else {
      ctx.drawImage(this.image, sx, sy, this.frameW, this.frameH, x, y, dw, dh);
    }
  }
}

export class SpriteManager {
  sheets = new Map<string, SpriteSheet>();
  loadProgress = 0;
  totalToLoad = 0;

  register(name: string, src: string, frameW: number, frameH: number): void {
    const sheet = new SpriteSheet(frameW, frameH);
    this.sheets.set(name, sheet);
    this.totalToLoad++;
  }

  async preloadAll(onProgress?: (pct: number) => void): Promise<void> {
    let loaded = 0;
    const promises: Promise<void>[] = [];

    for (const [, sheet] of this.sheets) {
      promises.push(
        sheet.load("").catch(() => {/* ignore missing PNGs, use procedural */}).then(() => {
          loaded++;
          this.loadProgress = loaded / this.totalToLoad;
          onProgress?.(this.loadProgress);
        }),
      );
    }

    await Promise.allSettled(promises);
  }

  get(name: string): SpriteSheet | undefined {
    return this.sheets.get(name);
  }
}
