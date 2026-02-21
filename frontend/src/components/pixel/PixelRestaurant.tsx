"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import type { FoodItem } from "@/types";
import {
  createInitialState,
  updateState,
  render,
  getRestaurantLevel,
  FRAME_INTERVAL,
  type RestaurantState,
} from "./game-engine";
import { generateEvent, type GameEvent } from "./events";

interface Props {
  foodItems: FoodItem[];
  assetValue: number;
}

const CANVAS_W = 480;
const CANVAS_H = 320;
const MAX_EVENTS = 20;
const EVENT_INTERVAL_MIN = 15_000;
const EVENT_INTERVAL_MAX = 30_000;

export function PixelRestaurant({ foodItems, assetValue }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<RestaurantState | null>(null);
  const animRef = useRef<number>(0);
  const lastFrameRef = useRef<number>(0);
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [gold, setGold] = useState(0);
  const eventTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleNextEvent = useCallback(() => {
    const delay = EVENT_INTERVAL_MIN + Math.random() * (EVENT_INTERVAL_MAX - EVENT_INTERVAL_MIN);
    eventTimerRef.current = setTimeout(() => {
      setEvents((prev) => {
        const newEvent = generateEvent();
        const updated = [newEvent, ...prev].slice(0, MAX_EVENTS);
        return updated;
      });
      scheduleNextEvent();
    }, delay);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;

    stateRef.current = createInitialState(CANVAS_W, CANVAS_H, assetValue, foodItems);

    // Add a welcome event
    setEvents([{
      id: 0,
      time: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
      text: "餐厅开门营业了！欢迎光临~",
    }]);

    const loop = (timestamp: number) => {
      if (!stateRef.current) return;

      if (timestamp - lastFrameRef.current >= FRAME_INTERVAL) {
        lastFrameRef.current = timestamp;

        const result = updateState(stateRef.current, CANVAS_W, CANVAS_H);
        render(ctx, stateRef.current, CANVAS_W, CANVAS_H, assetValue);

        if (result.goldEarned) {
          setGold(stateRef.current.gold);
        }
      }

      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    scheduleNextEvent();

    return () => {
      cancelAnimationFrame(animRef.current);
      if (eventTimerRef.current) clearTimeout(eventTimerRef.current);
    };
  }, [assetValue, foodItems, scheduleNextEvent]);

  const { name, stars } = getRestaurantLevel(assetValue);

  return (
    <div className="space-y-3">
      {/* Restaurant Header */}
      <div className="pixel-border bg-[#16213e] p-3 text-center">
        <p className="pixel-font text-xs text-[#ffcc02] pixel-glow">
          FITCONOMY 食堂
        </p>
        <p className="text-[10px] text-[#ffcc02] pixel-body mt-1">
          {"★".repeat(stars)} {name}
        </p>
        <div className="flex items-center justify-center gap-3 mt-2 text-xs pixel-body">
          <span className="text-[#4ade80]">
            ◈ 净值 ₣{assetValue.toFixed(0)}
          </span>
          <span className="text-[#ffcc02] animate-coin-spin inline-block">●</span>
          <span className="text-[#ffcc02]">{gold} 金币</span>
        </div>
      </div>

      {/* Canvas Game */}
      <div className="pixel-border-subtle bg-[#1a1a2e] p-1 overflow-hidden">
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="w-full"
          style={{
            imageRendering: "pixelated",
            aspectRatio: `${CANVAS_W}/${CANVAS_H}`,
          }}
        />
      </div>

      {/* Event Log */}
      <div className="pixel-border-subtle bg-[#0f0f23] p-3">
        <p className="pixel-font text-[10px] text-[#ffcc02] mb-2">◈ EVENT LOG</p>
        <div className="space-y-1.5 max-h-40 overflow-y-auto scrollbar-thin">
          {events.length === 0 ? (
            <p className="text-xs text-[#8b8b9e] pixel-body animate-pixel-blink">
              等待事件发生中...
            </p>
          ) : (
            events.map((event) => (
              <div key={event.id} className="flex gap-2 text-xs pixel-body">
                <span className="text-[#4ade80] shrink-0">[{event.time}]</span>
                <span className="text-[#c4b5fd]">{event.text}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
