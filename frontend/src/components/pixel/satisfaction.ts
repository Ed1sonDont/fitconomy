/**
 * Customer satisfaction system.
 * Calculates satisfaction based on wait time, furniture, decor, and menu variety.
 */

import type { UpgradeState } from "./upgrade-system";
import { getSatisfactionBonus } from "./upgrade-system";

export type SatisfactionLevel = "happy" | "neutral" | "angry";

export interface SatisfactionResult {
  level: SatisfactionLevel;
  score: number; // 0-100
  goldMultiplier: number;
  emoji: string;
}

const WAIT_THRESHOLDS = {
  happy: 40,    // frames (~5 seconds at 8fps)
  neutral: 120, // frames (~15 seconds)
};

export function calculateSatisfaction(
  waitFrames: number,
  upgradeState: UpgradeState,
  menuSize: number,
  modifierBonus: number = 0,
): SatisfactionResult {
  let score = 50;

  if (waitFrames <= WAIT_THRESHOLDS.happy) {
    score += 30;
  } else if (waitFrames <= WAIT_THRESHOLDS.neutral) {
    score += 10;
  } else {
    score -= 20;
  }

  const upgradeBonus = getSatisfactionBonus(upgradeState);
  score += upgradeBonus * 100;

  score += Math.min(menuSize * 2, 15);

  // Roguelike modifier bonus
  score += modifierBonus;

  score += (Math.random() - 0.5) * 10;

  score = Math.max(0, Math.min(100, score));

  if (score >= 70) {
    return {
      level: "happy",
      score,
      goldMultiplier: 1.5,
      emoji: "♥",
    };
  } else if (score >= 40) {
    return {
      level: "neutral",
      score,
      goldMultiplier: 1.0,
      emoji: "",
    };
  } else {
    return {
      level: "angry",
      score,
      goldMultiplier: 0.5,
      emoji: "💢",
    };
  }
}

export class SatisfactionTracker {
  private recentScores: number[] = [];
  private maxHistory = 20;

  record(score: number): void {
    this.recentScores.push(score);
    if (this.recentScores.length > this.maxHistory) {
      this.recentScores.shift();
    }
  }

  getAverage(): number {
    if (this.recentScores.length === 0) return 50;
    return this.recentScores.reduce((a, b) => a + b, 0) / this.recentScores.length;
  }

  getTrafficMultiplier(): number {
    const avg = this.getAverage();
    if (avg >= 80) return 1.3;
    if (avg >= 60) return 1.1;
    if (avg >= 40) return 1.0;
    return 0.8;
  }

  getRating(): number {
    return Math.min(5, Math.max(1, Math.round(this.getAverage() / 20)));
  }

  serialize(): number[] {
    return [...this.recentScores];
  }

  restore(scores: number[]): void {
    this.recentScores = scores.slice(-this.maxHistory);
  }
}
