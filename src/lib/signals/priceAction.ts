/**
 * Price action analysis: swing points, market structure, support/resistance,
 * breakouts and candlestick patterns.
 *
 * Swing points need `pivotRight` candles after them to be confirmed, so they
 * never repaint — a swing high found now stays a swing high.
 */
import { PRICE_ACTION_CONFIG, type PriceActionConfig } from "@/config/strategy";
import type { Candle, MarketStructure, PriceAction } from "@/lib/types";
import { detectPatterns, netBias } from "./patterns";

export interface Pivot {
  index: number;
  price: number;
  type: "high" | "low";
}

export function findPivots(candles: Candle[], left = 3, right = 3): Pivot[] {
  const out: Pivot[] = [];
  for (let i = left; i < candles.length - right; i++) {
    let isHigh = true;
    let isLow = true;
    for (let j = i - left; j <= i + right && (isHigh || isLow); j++) {
      if (j === i) continue;
      // strict on the left, non-strict on the right so equal highs mark the first one
      if (j < i ? candles[j].high >= candles[i].high : candles[j].high > candles[i].high) isHigh = false;
      if (j < i ? candles[j].low <= candles[i].low : candles[j].low < candles[i].low) isLow = false;
    }
    if (isHigh) out.push({ index: i, price: candles[i].high, type: "high" });
    if (isLow) out.push({ index: i, price: candles[i].low, type: "low" });
  }
  return out;
}

export function marketStructure(pivots: Pivot[]): { structure: MarketStructure; label: string } {
  const highs = pivots.filter((p) => p.type === "high");
  const lows = pivots.filter((p) => p.type === "low");
  if (highs.length < 2 || lows.length < 2) return { structure: "range", label: "Not enough swings yet" };

  const [h1, h2] = highs.slice(-2);
  const [l1, l2] = lows.slice(-2);
  const hh = h2.price > h1.price;
  const hl = l2.price > l1.price;

  if (hh && hl) return { structure: "uptrend", label: "Higher highs & higher lows" };
  if (!hh && !hl) return { structure: "downtrend", label: "Lower highs & lower lows" };
  return { structure: "range", label: hh ? "Range (higher high, lower low)" : "Range (lower high, higher low)" };
}

export function analyzePriceAction(
  candles: Candle[],
  atrLine: number[],
  cfg: PriceActionConfig = PRICE_ACTION_CONFIG,
): PriceAction {
  const last = candles.length - 1;
  const price = candles[last].close;
  const pivots = findPivots(candles, cfg.pivotLeft, cfg.pivotRight);
  const { structure, label } = marketStructure(pivots);

  const recent = pivots.filter((p) => p.index >= last - cfg.srLookback);
  const supports = recent.filter((p) => p.type === "low" && p.price < price).map((p) => p.price);
  const resistances = recent.filter((p) => p.type === "high" && p.price > price).map((p) => p.price);

  const lastHigh = pivots.filter((p) => p.type === "high").at(-1);
  const lastLow = pivots.filter((p) => p.type === "low").at(-1);
  const breakout = lastHigh && price > lastHigh.price ? "bullish" : lastLow && price < lastLow.price ? "bearish" : null;

  const patterns = detectPatterns(candles, atrLine, cfg.patternLookback, cfg.minPatternRangeAtr);

  return {
    structure,
    structureLabel: label,
    support: supports.length ? Math.max(...supports) : null,
    resistance: resistances.length ? Math.min(...resistances) : null,
    breakout,
    patterns,
    patternBias: netBias(patterns),
  };
}
