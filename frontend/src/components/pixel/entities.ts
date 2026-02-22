/**
 * Cat entity system for the restaurant game.
 * All characters are cats with distinct appearances and behaviors.
 * Supports special customer types (critic, royal, influencer, stray).
 */

import { drawSprite, drawFoodPlate, drawSteam, drawShadow } from "./sprite-loader";
import type { SatisfactionLevel } from "./satisfaction";
import type { Renderable } from "./restaurant";

// ─── Types ─────────────────────────────────────────────────────────

export type Direction = "left" | "right";

export interface Position {
  x: number;
  y: number;
}

export type SpecialCustomerType = "critic" | "royal" | "influencer" | "stray" | null;

// ─── Particles ─────────────────────────────────────────────────────

export interface Particle {
  x: number;
  y: number;
  vy: number;
  vx: number;
  life: number;
  maxLife: number;
  type: "coin" | "heart" | "angry" | "star" | "steam" | "text" | "fish";
  text?: string;
  color?: string;
}

export function updateParticle(p: Particle): boolean {
  p.x += p.vx;
  p.y += p.vy;
  p.life--;
  return p.life > 0;
}

export function renderParticle(ctx: CanvasRenderingContext2D, p: Particle): void {
  const alpha = Math.min(1, p.life / (p.maxLife * 0.3));
  ctx.globalAlpha = alpha;

  if (p.type === "text" && p.text) {
    ctx.fillStyle = p.color ?? "#ffcc02";
    ctx.font = "bold 11px monospace";
    ctx.fillText(p.text, p.x, p.y);
  } else if (p.type === "steam") {
    drawSteam(ctx, p.x, p.y, p.maxLife - p.life);
  } else {
    drawSprite(ctx, p.type, p.x - 8, p.y - 8, 0, 0, false);
  }

  ctx.globalAlpha = 1;
}

export function spawnCoinParticle(x: number, y: number, amount: number): Particle[] {
  return [
    { x, y, vx: 0, vy: -1.2, life: 40, maxLife: 40, type: "coin" },
    { x: x + 14, y: y - 4, vx: 0, vy: -0.8, life: 50, maxLife: 50, type: "text", text: `+${amount}`, color: "#ffcc02" },
  ];
}

export function spawnEmojiParticle(x: number, y: number, level: SatisfactionLevel): Particle | null {
  if (level === "happy") return { x, y, vx: 0, vy: -0.8, life: 45, maxLife: 45, type: "heart" };
  if (level === "angry") return { x, y, vx: 0, vy: -0.6, life: 45, maxLife: 45, type: "angry" };
  return null;
}

// ─── Base Entity ───────────────────────────────────────────────────

export abstract class Entity {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  speed: number;
  direction: Direction = "right";
  frame: number = 0;
  frameTimer: number = 0;
  framesPerAnimation: number = 8;

  constructor(x: number, y: number, speed: number) {
    this.x = x;
    this.y = y;
    this.targetX = x;
    this.targetY = y;
    this.speed = speed;
  }

  protected moveToTarget(): boolean {
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < this.speed) {
      this.x = this.targetX;
      this.y = this.targetY;
      return true;
    }

    this.x += (dx / dist) * this.speed;
    this.y += (dy / dist) * this.speed;

    if (dx > 0) this.direction = "right";
    else if (dx < 0) this.direction = "left";

    this.frameTimer++;
    if (this.frameTimer >= this.framesPerAnimation) {
      this.frameTimer = 0;
      this.frame = (this.frame + 1) % 2;
    }

    return false;
  }

  abstract update(): void;
  abstract render(ctx: CanvasRenderingContext2D): void;

  toRenderable(): Renderable {
    return { y: this.y, render: (ctx) => this.render(ctx) };
  }
}

// ─── Chef Cat ──────────────────────────────────────────────────────

export type ChefState = "idle" | "walking_to_stove" | "cooking" | "returning";

export class Chef extends Entity {
  state: ChefState = "idle";
  cookTimer: number = 0;
  cookDuration: number = 40;
  stoveX: number;
  stoveY: number;
  idleX: number;
  idleY: number;
  id: number;
  particles: Particle[] = [];
  dishReady: boolean = false;

  constructor(id: number, stoveX: number, stoveY: number, idleX: number, idleY: number) {
    super(idleX, idleY, 1.5);
    this.id = id;
    this.stoveX = stoveX;
    this.stoveY = stoveY;
    this.idleX = idleX;
    this.idleY = idleY;
  }

  startCooking(duration: number): void {
    if (this.state !== "idle") return;
    this.state = "walking_to_stove";
    this.targetX = this.stoveX;
    this.targetY = this.stoveY;
    this.cookDuration = duration;
    this.dishReady = false;
  }

  update(): void {
    this.particles = this.particles.filter(updateParticle);

    switch (this.state) {
      case "idle":
        this.frame = 0;
        break;
      case "walking_to_stove":
        if (this.moveToTarget()) {
          this.state = "cooking";
          this.cookTimer = 0;
        }
        break;
      case "cooking":
        this.cookTimer++;
        this.frame = 1;
        if (this.cookTimer % 8 === 0) {
          this.particles.push({
            x: this.stoveX + 12, y: this.stoveY - 10,
            vx: 0, vy: -0.5, life: 20, maxLife: 20, type: "steam",
          });
        }
        if (this.cookTimer >= this.cookDuration) {
          this.state = "returning";
          this.dishReady = true;
          this.targetX = this.idleX;
          this.targetY = this.idleY;
        }
        break;
      case "returning":
        if (this.moveToTarget()) {
          this.state = "idle";
        }
        break;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    drawShadow(ctx, this.x + 4, this.y + 30, 24, 6);
    const flipH = this.direction === "left";
    drawSprite(ctx, "chef", this.x, this.y, this.frame, 0, flipH);
    this.particles.forEach((p) => renderParticle(ctx, p));
  }
}

// ─── Waiter Cat ────────────────────────────────────────────────────

export type WaiterState = "idle" | "walking_to_kitchen" | "picking_up" | "delivering" | "returning";

export class Waiter extends Entity {
  state: WaiterState = "idle";
  carryingFood: boolean = false;
  foodColor: string = "#ffcc02";
  kitchenX: number;
  kitchenY: number;
  idleX: number;
  idleY: number;
  deliverX: number = 0;
  deliverY: number = 0;
  id: number;
  pickupTimer: number = 0;

  constructor(id: number, kitchenX: number, kitchenY: number, idleX: number, idleY: number) {
    super(idleX, idleY, 2.0);
    this.id = id;
    this.kitchenX = kitchenX;
    this.kitchenY = kitchenY;
    this.idleX = idleX;
    this.idleY = idleY;
  }

  startDelivery(tableX: number, tableY: number, foodColor: string): void {
    if (this.state !== "idle") return;
    this.deliverX = tableX;
    this.deliverY = tableY;
    this.foodColor = foodColor;
    this.state = "walking_to_kitchen";
    this.targetX = this.kitchenX;
    this.targetY = this.kitchenY;
  }

  isAvailable(): boolean {
    return this.state === "idle";
  }

  update(): void {
    switch (this.state) {
      case "idle":
        this.frame = 0;
        break;
      case "walking_to_kitchen":
        if (this.moveToTarget()) {
          this.state = "picking_up";
          this.pickupTimer = 12;
        }
        break;
      case "picking_up":
        this.pickupTimer--;
        if (this.pickupTimer <= 0) {
          this.carryingFood = true;
          this.state = "delivering";
          this.targetX = this.deliverX;
          this.targetY = this.deliverY;
        }
        break;
      case "delivering":
        if (this.moveToTarget()) {
          this.carryingFood = false;
          this.state = "returning";
          this.targetX = this.idleX;
          this.targetY = this.idleY;
        }
        break;
      case "returning":
        if (this.moveToTarget()) {
          this.state = "idle";
        }
        break;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    drawShadow(ctx, this.x + 4, this.y + 30, 24, 6);
    const flipH = this.direction === "left";
    drawSprite(ctx, "waiter", this.x, this.y, this.frame, 0, flipH);
    if (this.carryingFood) {
      drawFoodPlate(ctx, this.x + 18, this.y + 6, this.foodColor);
    }
  }
}

// ─── Customer Cat ──────────────────────────────────────────────────

export type CustomerState =
  | "entering"
  | "walking_to_queue"
  | "queuing"
  | "walking_to_table"
  | "sitting"
  | "waiting_for_food"
  | "eating"
  | "paying"
  | "leaving";

export class Customer extends Entity {
  state: CustomerState = "entering";
  variant: number;
  seatX: number = 0;
  seatY: number = 0;
  tableIndex: number = -1;
  waitFrames: number = 0;
  eatTimer: number = 0;
  eatDuration: number = 60;
  satisfaction: SatisfactionLevel = "neutral";
  goldPaid: number = 0;
  doorX: number;
  doorY: number;
  queueX: number;
  queueY: number;
  exitX: number;
  particles: Particle[] = [];
  foodName: string = "";
  foodColor: string = "#ffcc02";
  hasFood: boolean = false;
  id: number;
  specialType: SpecialCustomerType = null;

  constructor(
    id: number,
    doorX: number, doorY: number,
    queueX: number, queueY: number,
    exitX: number,
    specialType: SpecialCustomerType = null,
  ) {
    super(doorX, doorY, 1.8);
    this.id = id;
    this.specialType = specialType;
    this.variant = specialType ? 0 : Math.floor(Math.random() * 8);
    this.doorX = doorX;
    this.doorY = doorY;
    this.queueX = queueX;
    this.queueY = queueY;
    this.exitX = exitX;
    this.targetX = queueX;
    this.targetY = queueY;

    // Special customer traits
    if (specialType === "royal") this.eatDuration = 80;
    if (specialType === "influencer") this.eatDuration = 45;
  }

  assignTable(tableX: number, tableY: number, tableIndex: number): void {
    this.seatX = tableX;
    this.seatY = tableY;
    this.tableIndex = tableIndex;
    this.state = "walking_to_table";
    this.targetX = tableX;
    this.targetY = tableY;
  }

  receiveFood(): void {
    if (this.state === "waiting_for_food") {
      this.state = "eating";
      this.eatTimer = this.eatDuration;
      this.hasFood = true;
    }
  }

  update(): void {
    this.particles = this.particles.filter(updateParticle);

    switch (this.state) {
      case "entering":
        if (this.moveToTarget()) {
          this.state = "walking_to_queue";
          this.targetX = this.queueX;
          this.targetY = this.queueY;
        }
        break;
      case "walking_to_queue":
        if (this.moveToTarget()) {
          this.state = "queuing";
        }
        break;
      case "queuing":
        break;
      case "walking_to_table":
        if (this.moveToTarget()) {
          this.state = "waiting_for_food";
          this.waitFrames = 0;
        }
        break;
      case "sitting":
        break;
      case "waiting_for_food":
        this.waitFrames++;
        if (this.waitFrames === 120) {
          this.particles.push({
            x: this.x + 12, y: this.y - 12,
            vx: 0, vy: -0.5, life: 30, maxLife: 30, type: "angry",
          });
        }
        break;
      case "eating":
        this.eatTimer--;
        if (this.eatTimer <= 0) {
          this.state = "paying";
        }
        break;
      case "paying":
        this.state = "leaving";
        this.targetX = this.exitX;
        this.targetY = this.doorY;
        break;
      case "leaving":
        this.moveToTarget();
        break;
    }
  }

  isLeaving(): boolean {
    return this.state === "leaving" && Math.abs(this.x - this.exitX) < 2;
  }

  isWaiting(): boolean {
    return this.state === "waiting_for_food";
  }

  isQueuing(): boolean {
    return this.state === "queuing";
  }

  needsTable(): boolean {
    return this.state === "queuing";
  }

  private getSpriteName(): string {
    const isSitting = this.state === "sitting" || this.state === "waiting_for_food" || this.state === "eating";

    if (this.specialType) {
      return isSitting ? `${this.specialType}_sit` : this.specialType;
    }
    return isSitting ? "customer_sit" : "customer";
  }

  render(ctx: CanvasRenderingContext2D): void {
    drawShadow(ctx, this.x + 4, this.y + 30, 24, 6);
    const flipH = this.direction === "left";
    drawSprite(ctx, this.getSpriteName(), this.x, this.y, 0, this.variant, flipH);

    // Special customer icon above head
    if (this.specialType) {
      const icons: Record<string, string> = {
        critic: "📝",
        royal: "👑",
        influencer: "📱",
        stray: "💕",
      };
      ctx.font = "10px serif";
      ctx.fillText(icons[this.specialType] ?? "", this.x + 8, this.y - 6);
    }

    // Food plate when eating
    if (this.hasFood) {
      drawFoodPlate(ctx, this.x + 18, this.y + 10, this.foodColor);
    }

    // Food name bubble when waiting
    if (this.state === "waiting_for_food" && this.foodName) {
      ctx.fillStyle = "rgba(0,0,0,0.65)";
      const tw = ctx.measureText(this.foodName).width;
      const bx = this.x - 2;
      const by = this.y - 20;
      ctx.fillRect(bx, by, tw + 10, 16);
      ctx.fillStyle = "#ffffff";
      ctx.font = "9px monospace";
      ctx.fillText(this.foodName, bx + 5, by + 11);

      // Tiny food icon dot
      ctx.fillStyle = this.foodColor;
      ctx.beginPath();
      ctx.arc(bx + tw + 7, by + 7, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    this.particles.forEach((p) => renderParticle(ctx, p));
  }
}

// ─── Mascot Cat ────────────────────────────────────────────────────

export type MascotState = "sitting" | "sleeping" | "wandering" | "washing";

export class MascotCat extends Entity {
  state: MascotState = "sitting";
  stateTimer: number = 0;
  stateDuration: number = 100;
  boundLeft: number;
  boundRight: number;
  boundTop: number;
  boundBottom: number;
  purring: boolean = false;

  constructor(x: number, y: number, bounds: { left: number; right: number; top: number; bottom: number }) {
    super(x, y, 0.6);
    this.boundLeft = bounds.left;
    this.boundRight = bounds.right;
    this.boundTop = bounds.top;
    this.boundBottom = bounds.bottom;
    this.pickNewState();
  }

  pickNewState(): void {
    const r = Math.random();
    if (r < 0.3) {
      this.state = "sitting";
      this.stateDuration = 80 + Math.random() * 120;
      this.purring = Math.random() < 0.3;
    } else if (r < 0.5) {
      this.state = "sleeping";
      this.stateDuration = 120 + Math.random() * 200;
    } else if (r < 0.7) {
      this.state = "washing";
      this.stateDuration = 40 + Math.random() * 60;
    } else {
      this.state = "wandering";
      this.stateDuration = 60 + Math.random() * 100;
      this.targetX = this.boundLeft + Math.random() * (this.boundRight - this.boundLeft);
      this.targetY = this.boundTop + Math.random() * (this.boundBottom - this.boundTop);
    }
    this.stateTimer = 0;
  }

  update(): void {
    this.stateTimer++;
    if (this.stateTimer >= this.stateDuration) {
      this.pickNewState();
    }

    if (this.state === "wandering") {
      this.moveToTarget();
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    drawShadow(ctx, this.x + 4, this.y + 28, 22, 5);
    const flipH = this.direction === "left";

    if (this.state === "sleeping") {
      drawSprite(ctx, "mascot_sleep", this.x, this.y, 0, 0, flipH);
      ctx.fillStyle = "#8b8b9e";
      ctx.font = "9px monospace";
      const zOff = Math.sin(this.stateTimer * 0.1) * 3;
      ctx.fillText("z", this.x + 26 + zOff, this.y - 2);
      ctx.fillText("z", this.x + 30 + zOff, this.y - 7);
    } else if (this.state === "wandering") {
      drawSprite(ctx, "mascot_walk", this.x, this.y, this.frame, 0, flipH);
    } else if (this.state === "washing") {
      drawSprite(ctx, "mascot_sit", this.x, this.y, 0, 0, flipH);
      // Washing animation - paw near face
      const washFrame = Math.floor(this.stateTimer / 6) % 2;
      if (washFrame === 0) {
        ctx.fillStyle = "#f5a623";
        ctx.fillRect(this.x + 20, this.y + 8, 4, 4);
      }
    } else {
      drawSprite(ctx, "mascot_sit", this.x, this.y, 0, 0, flipH);
      if (this.purring && this.stateTimer % 20 < 10) {
        ctx.fillStyle = "#f472b6";
        ctx.font = "7px serif";
        ctx.fillText("♪", this.x + 26, this.y - 2);
      }
    }
  }
}

// ─── Boss Cat (appears in events) ─────────────────────────────────

export class BossCat extends Entity {
  visible: boolean = false;
  timer: number = 0;

  constructor(x: number, y: number) {
    super(x, y, 0);
  }

  show(): void {
    this.visible = true;
    this.timer = 200;
  }

  update(): void {
    if (!this.visible) return;
    this.timer--;
    if (this.timer <= 0) this.visible = false;
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.visible) return;
    drawShadow(ctx, this.x + 4, this.y + 30, 24, 6);
    drawSprite(ctx, "boss", this.x, this.y);
  }
}
