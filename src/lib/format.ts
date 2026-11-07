import type { SignalAction } from "./types";

export function formatPrice(value: number): string {
  if (!Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  const digits = abs >= 1000 ? 2 : abs >= 1 ? 3 : 6;
  return value.toLocaleString("en-US", { minimumFractionDigits: digits > 3 ? 4 : 2, maximumFractionDigits: digits });
}

export function formatNumber(value: number, digits = 2): string {
  return Number.isFinite(value) ? value.toLocaleString("en-US", { maximumFractionDigits: digits }) : "—";
}

export function formatPct(value: number, signed = true): string {
  if (!Number.isFinite(value)) return "—";
  return `${signed && value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

export function formatAgo(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ${m % 60}m ago`;
  return `${Math.floor(h / 24)}d ${h % 24}h ago`;
}

export type Tone = "bull" | "bear" | "warn" | "neutral";

export function actionTone(action: SignalAction): Tone {
  switch (action) {
    case "Buy":
    case "Strong Buy":
    case "Accumulate":
      return "bull";
    case "Sell":
    case "Take Profit":
      return "bear";
    case "Trim":
      return "warn";
    default:
      return "neutral";
  }
}

export const TONE_CLASSES: Record<Tone, { text: string; badge: string; ring: string }> = {
  bull: { text: "text-emerald-400", badge: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30", ring: "ring-emerald-500/50" },
  bear: { text: "text-rose-400", badge: "bg-rose-500/15 text-rose-300 ring-rose-500/30", ring: "ring-rose-500/50" },
  warn: { text: "text-amber-400", badge: "bg-amber-500/15 text-amber-300 ring-amber-500/30", ring: "ring-amber-500/50" },
  neutral: { text: "text-zinc-400", badge: "bg-zinc-500/15 text-zinc-300 ring-zinc-500/30", ring: "ring-zinc-500/50" },
};

export const CHART_COLORS = {
  bull: "#10b981",
  bear: "#f43f5e",
  warn: "#f59e0b",
  entry: "#38bdf8",
  grid: "#1f2430",
  text: "#9ca3af",
  background: "#0b0e14",
  vwap: "#a78bfa",
  emaFast: "#38bdf8",
  emaSlow: "#f59e0b",
};
