/**
 * Dependency-free technical indicators.
 * Every function returns an array aligned with its input; values that are not
 * computable yet (warm-up period) are NaN.
 */
import type { Candle } from "./types";

const nanArray = (n: number) => new Array<number>(n).fill(NaN);

export function sma(values: number[], period: number): number[] {
  const out = nanArray(values.length);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

/** EMA seeded with an SMA. Skips leading NaNs so it can be chained (e.g. MACD signal). */
export function ema(values: number[], period: number): number[] {
  const out = nanArray(values.length);
  const k = 2 / (period + 1);
  let prev = NaN;
  let seedSum = 0;
  let seedCount = 0;
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (!Number.isFinite(v)) continue;
    if (Number.isNaN(prev)) {
      seedSum += v;
      seedCount++;
      if (seedCount === period) {
        prev = seedSum / period;
        out[i] = prev;
      }
      continue;
    }
    prev = v * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}

/** Wilder's RSI. */
export function rsi(closes: number[], period = 14): number[] {
  const out = nanArray(closes.length);
  if (closes.length <= period) return out;
  const toRsi = (g: number, l: number) =>
    l === 0 ? (g === 0 ? 50 : 100) : 100 - 100 / (1 + g / l);

  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d > 0) gain += d;
    else loss -= d;
  }
  let avgGain = gain / period;
  let avgLoss = loss / period;
  out[period] = toRsi(avgGain, avgLoss);

  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(d, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-d, 0)) / period;
    out[i] = toRsi(avgGain, avgLoss);
  }
  return out;
}

export interface MacdResult {
  macd: number[];
  signal: number[];
  histogram: number[];
}

export function macd(closes: number[], fast = 12, slow = 26, signalPeriod = 9): MacdResult {
  const fastEma = ema(closes, fast);
  const slowEma = ema(closes, slow);
  const line = closes.map((_, i) => fastEma[i] - slowEma[i]);
  const signal = ema(line, signalPeriod);
  const histogram = line.map((v, i) => v - signal[i]);
  return { macd: line, signal, histogram };
}

/** Wilder's Average True Range. */
export function atr(candles: Candle[], period = 14): number[] {
  const out = nanArray(candles.length);
  if (candles.length < period) return out;
  const tr = candles.map((c, i) => {
    if (i === 0) return c.high - c.low;
    const prevClose = candles[i - 1].close;
    return Math.max(c.high - c.low, Math.abs(c.high - prevClose), Math.abs(c.low - prevClose));
  });
  let value = tr.slice(0, period).reduce((a, b) => a + b, 0) / period;
  out[period - 1] = value;
  for (let i = period; i < candles.length; i++) {
    value = (value * (period - 1) + tr[i]) / period;
    out[i] = value;
  }
  return out;
}

/** Session VWAP, anchored to each UTC day (resets at 00:00 UTC). */
export function vwap(candles: Candle[]): number[] {
  const out = nanArray(candles.length);
  let session = -1;
  let pv = 0;
  let vol = 0;
  candles.forEach((c, i) => {
    const day = Math.floor(c.time / 86_400);
    if (day !== session) {
      session = day;
      pv = 0;
      vol = 0;
    }
    const typical = (c.high + c.low + c.close) / 3;
    pv += typical * c.volume;
    vol += c.volume;
    out[i] = vol > 0 ? pv / vol : typical;
  });
  return out;
}

// ---------- helpers ----------

export const crossedAbove = (a: number[], b: number[], i: number) =>
  i > 0 && a[i - 1] <= b[i - 1] && a[i] > b[i];

export const crossedBelow = (a: number[], b: number[], i: number) =>
  i > 0 && a[i - 1] >= b[i - 1] && a[i] < b[i];

/** Most recent index in [from, to] where predicate holds, or -1. */
export function findLastIndex(from: number, to: number, predicate: (i: number) => boolean): number {
  for (let i = to; i >= Math.max(from, 0); i--) if (predicate(i)) return i;
  return -1;
}

export function lowest(candles: Candle[], from: number, to: number): number {
  let min = Infinity;
  for (let i = Math.max(from, 0); i <= to; i++) min = Math.min(min, candles[i].low);
  return min;
}

export function highest(candles: Candle[], from: number, to: number): number {
  let max = -Infinity;
  for (let i = Math.max(from, 0); i <= to; i++) max = Math.max(max, candles[i].high);
  return max;
}
