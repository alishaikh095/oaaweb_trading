/**
 * Candlestick pattern detection on closed candles.
 *
 * Noise filter: patterns on candles smaller than `minRangeAtr` × ATR are ignored.
 * Context: reversal patterns (hammer, shooting star, engulfing, stars) only count
 * after a move in the opposite direction — a hammer at the top of a rally is not bullish.
 */
import type { Bias, Candle, PriceActionPattern } from "@/lib/types";

type RawPattern = Omit<PriceActionPattern, "barsAgo" | "time">;

const isBullish = (c: Candle) => c.close > c.open;
const isBearish = (c: Candle) => c.close < c.open;
const body = (c: Candle) => Math.abs(c.close - c.open);
const range = (c: Candle) => c.high - c.low;
const upperWick = (c: Candle) => c.high - Math.max(c.open, c.close);
const lowerWick = (c: Candle) => Math.min(c.open, c.close) - c.low;

/** Patterns completed by the candle at index `i`. */
export function detectPatternsAt(candles: Candle[], i: number, atr: number, minRangeAtr = 0.5): RawPattern[] {
  if (i < 4 || !Number.isFinite(atr) || atr <= 0) return [];

  const c0 = candles[i];
  const c1 = candles[i - 1];
  const c2 = candles[i - 2];
  if (Math.max(range(c0), range(c1)) < minRangeAtr * atr) return [];

  const r0 = range(c0);
  const b0 = body(c0);
  const uw0 = upperWick(c0);
  const lw0 = lowerWick(c0);
  const r1 = range(c1);
  const b1 = body(c1);

  // Short-term context: closes over the 3 candles before this one.
  const fellBefore = c1.close < candles[i - 4].close;
  const roseBefore = c1.close > candles[i - 4].close;

  const out: RawPattern[] = [];

  // ── Single-candle ──────────────────────────────────────────────
  if (r0 > 0 && b0 / r0 <= 0.1) {
    out.push({ name: "Doji", bias: "neutral", description: "Open ≈ close — market indecision" });
  }
  if (fellBefore && r0 > 0 && lw0 >= 2 * b0 && uw0 <= 0.3 * r0 && b0 / r0 < 0.4) {
    out.push({ name: "Hammer", bias: "bullish", description: "Long lower wick after a drop — buyers absorbed selling" });
  }
  if (roseBefore && r0 > 0 && uw0 >= 2 * b0 && lw0 <= 0.3 * r0 && b0 / r0 < 0.4) {
    out.push({ name: "Shooting Star", bias: "bearish", description: "Long upper wick after a rally — sellers rejected higher prices" });
  }
  if (r0 >= atr && b0 / r0 >= 0.9) {
    if (isBullish(c0)) out.push({ name: "Bullish Marubozu", bias: "bullish", description: "Full-body candle closing at the high — dominant buyers" });
    if (isBearish(c0)) out.push({ name: "Bearish Marubozu", bias: "bearish", description: "Full-body candle closing at the low — dominant sellers" });
  }

  // ── Two-candle ─────────────────────────────────────────────────
  if (c0.high < c1.high && c0.low > c1.low) {
    out.push({ name: "Inside Bar", bias: "neutral", description: "Range inside the prior candle — consolidation before a breakout" });
  }
  if (c0.high > c1.high && c0.low < c1.low && b0 / Math.max(r0, 1e-12) >= 0.5) {
    out.push(
      isBullish(c0)
        ? { name: "Bullish Outside Bar", bias: "bullish", description: "Takes out the prior high and low, closes strong" }
        : { name: "Bearish Outside Bar", bias: "bearish", description: "Takes out the prior high and low, closes weak" },
    );
  }
  if (fellBefore && isBearish(c1) && isBullish(c0) && c0.close > c1.open && c0.open <= c1.close && b0 > b1) {
    out.push({ name: "Bullish Engulfing", bias: "bullish", description: "Bull body engulfs the prior bear body — reversal" });
  }
  if (roseBefore && isBullish(c1) && isBearish(c0) && c0.close < c1.open && c0.open >= c1.close && b0 > b1) {
    out.push({ name: "Bearish Engulfing", bias: "bearish", description: "Bear body engulfs the prior bull body — reversal" });
  }
  if (fellBefore && isBearish(c1) && b1 >= 0.5 * atr && isBullish(c0) && b0 < 0.5 * b1 && c0.close < c1.open && c0.open > c1.close) {
    out.push({ name: "Bullish Harami", bias: "bullish", description: "Small bull inside a large bear — selling is fading" });
  }
  if (roseBefore && isBullish(c1) && b1 >= 0.5 * atr && isBearish(c0) && b0 < 0.5 * b1 && c0.open < c1.close && c0.close > c1.open) {
    out.push({ name: "Bearish Harami", bias: "bearish", description: "Small bear inside a large bull — buying is fading" });
  }

  // ── Three-candle ───────────────────────────────────────────────
  const smallMiddle = r1 > 0 && b1 / r1 < 0.4;
  const bigFirst = body(c2) >= 0.5 * atr;
  if (bigFirst && isBearish(c2) && smallMiddle && isBullish(c0) && c0.close > (c2.open + c2.close) / 2) {
    out.push({ name: "Morning Star", bias: "bullish", description: "Bearish → indecision → strong bullish: 3-candle bottom" });
  }
  if (bigFirst && isBullish(c2) && smallMiddle && isBearish(c0) && c0.close < (c2.open + c2.close) / 2) {
    out.push({ name: "Evening Star", bias: "bearish", description: "Bullish → indecision → strong bearish: 3-candle top" });
  }
  if (
    [c2, c1, c0].every(isBullish) && c1.close > c2.close && c0.close > c1.close &&
    c1.open >= c2.open && c0.open >= c1.open && [c2, c1, c0].every((c) => body(c) >= 0.3 * atr)
  ) {
    out.push({ name: "Three White Soldiers", bias: "bullish", description: "3 strong rising candles — bullish momentum" });
  }
  if (
    [c2, c1, c0].every(isBearish) && c1.close < c2.close && c0.close < c1.close &&
    c1.open <= c2.open && c0.open <= c1.open && [c2, c1, c0].every((c) => body(c) >= 0.3 * atr)
  ) {
    out.push({ name: "Three Black Crows", bias: "bearish", description: "3 strong falling candles — bearish momentum" });
  }

  return out;
}

/** Patterns in the last `lookback` closed candles, newest first, one entry per pattern name. */
export function detectPatterns(
  candles: Candle[],
  atrLine: number[],
  lookback = 3,
  minRangeAtr = 0.5,
): PriceActionPattern[] {
  const last = candles.length - 1;
  const seen = new Set<string>();
  const out: PriceActionPattern[] = [];
  for (let i = last; i > last - lookback && i >= 0; i--) {
    for (const p of detectPatternsAt(candles, i, atrLine[i], minRangeAtr)) {
      if (seen.has(p.name)) continue;
      seen.add(p.name);
      out.push({ ...p, barsAgo: last - i, time: candles[i].time });
    }
  }
  return out;
}

export function netBias(patterns: PriceActionPattern[]): Bias {
  const score = patterns.reduce((s, p) => s + (p.bias === "bullish" ? 1 : p.bias === "bearish" ? -1 : 0), 0);
  return score > 0 ? "bullish" : score < 0 ? "bearish" : "neutral";
}
