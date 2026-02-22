/**
 * Day/night cycle and weather system based on real system clock.
 */

export type Weather = "sunny" | "cloudy" | "rainy" | "snowy";
export type TimeOfDay = "dawn" | "day" | "dusk" | "night";

export interface DayNightState {
  hour: number;
  minute: number;
  timeOfDay: TimeOfDay;
  weather: Weather;
  weatherTimer: number;
}

const WEATHER_DURATION_MIN = 300_000; // 5 min
const WEATHER_DURATION_MAX = 900_000; // 15 min

const WEATHER_WEIGHTS: Record<Weather, number> = {
  sunny: 5,
  cloudy: 3,
  rainy: 1.5,
  snowy: 0.5,
};

export function createDayNightState(): DayNightState {
  const now = new Date();
  return {
    hour: now.getHours(),
    minute: now.getMinutes(),
    timeOfDay: getTimeOfDay(now.getHours()),
    weather: "sunny",
    weatherTimer: Date.now() + WEATHER_DURATION_MIN + Math.random() * (WEATHER_DURATION_MAX - WEATHER_DURATION_MIN),
  };
}

function getTimeOfDay(hour: number): TimeOfDay {
  if (hour >= 6 && hour < 8) return "dawn";
  if (hour >= 8 && hour < 17) return "day";
  if (hour >= 17 && hour < 20) return "dusk";
  return "night";
}

function pickWeather(): Weather {
  const total = Object.values(WEATHER_WEIGHTS).reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (const [w, weight] of Object.entries(WEATHER_WEIGHTS)) {
    r -= weight;
    if (r <= 0) return w as Weather;
  }
  return "sunny";
}

export function updateDayNight(state: DayNightState): void {
  const now = new Date();
  state.hour = now.getHours();
  state.minute = now.getMinutes();
  state.timeOfDay = getTimeOfDay(state.hour);

  if (Date.now() >= state.weatherTimer) {
    state.weather = pickWeather();
    state.weatherTimer = Date.now() + WEATHER_DURATION_MIN + Math.random() * (WEATHER_DURATION_MAX - WEATHER_DURATION_MIN);
  }
}

export function getDayNightTint(timeOfDay: TimeOfDay): string {
  switch (timeOfDay) {
    case "dawn": return "rgba(255, 200, 120, 0.12)";
    case "day": return "rgba(255, 255, 255, 0)";
    case "dusk": return "rgba(255, 130, 60, 0.15)";
    case "night": return "rgba(30, 30, 80, 0.25)";
  }
}

export function getWeatherTrafficMultiplier(weather: Weather): number {
  switch (weather) {
    case "sunny": return 1.0;
    case "cloudy": return 0.9;
    case "rainy": return 0.7;
    case "snowy": return 0.6;
  }
}

export function getWeatherStayMultiplier(weather: Weather): number {
  switch (weather) {
    case "sunny": return 1.0;
    case "cloudy": return 1.1;
    case "rainy": return 1.4;
    case "snowy": return 1.5;
  }
}

export const WEATHER_ICONS: Record<Weather, string> = {
  sunny: "☀",
  cloudy: "☁",
  rainy: "🌧",
  snowy: "❄",
};

export const TIME_LABELS: Record<TimeOfDay, string> = {
  dawn: "清晨",
  day: "白天",
  dusk: "黄昏",
  night: "夜晚",
};
