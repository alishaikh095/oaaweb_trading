/**
 * Entry zone, stop loss and take-profit targets.
 *
 * Stop: just beyond the recent swing low (long) / swing high (short), clamped
 * to a sensible ATR range so it is never too tight or too wide.
 * Targets: multiples of the risk (entry → stop distance), e.g. 1:2 and 1:3.
 */
import type { RiskConfig } from "@/config/strategy";
import { highest, lowest } from "@/lib/indicators";
import type { Candle, Direction, TradeLevels, TradeStatus } from "@/lib/types";

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

export function computeLevels(
  candles: Candle[],
  price: number,
  atrValue: number,
  direction: Direction,
  risk: RiskConfig,
): TradeLevels | null {
  if (direction === "flat" || !Number.isFinite(atrValue) || atrValue <= 0) return null;

  const last = candles.length - 1;
  const from = last - risk.swingLookback + 1;
  const zone = risk.entryZoneAtr * atrValue;
  const long = direction === "long";

  // Entry zone sits on the "better price" side: below price for longs, above for shorts.
  const entryLow = long ? price - zone : price;
  const entryHigh = long ? price : price + zone;
  const entry = (entryLow + entryHigh) / 2;

  const structureStop = long
    ? lowest(candles, from, last) - risk.stopBufferAtr * atrValue
    : highest(candles, from, last) + risk.stopBufferAtr * atrValue;

  const distance = clamp(
    Math.abs(entry - structureStop),
    risk.minStopAtr * atrValue,
    risk.maxStopAtr * atrValue,
  );
  const sign = long ? 1 : -1;

  return {
    entryLow,
    entryHigh,
    stopLoss: entry - sign * distance,
    takeProfits: risk.rewardMultiples.map((rr, i) => ({
      label: `TP${i + 1}`,
      price: entry + sign * distance * rr,
      rr,
    })),
  };
}

/**
 * How a trade has played out on the closed candles after `fromIndex`.
 * If a candle touches both the stop and a target, the stop is assumed to hit first.
 */
export function tradeStatus(
  candles: Candle[],
  fromIndex: number,
  levels: TradeLevels,
  direction: Direction,
): TradeStatus {
  const long = direction === "long";
  const [tp1, tp2] = levels.takeProfits.map((t) => t.price);
  let tp1Hit = false;
  for (let i = fromIndex + 1; i < candles.length; i++) {
    const c = candles[i];
    const stopped = long ? c.low <= levels.stopLoss : c.high >= levels.stopLoss;
    if (stopped) return tp1Hit ? "TP1 hit" : "Stopped out";
    if (tp2 !== undefined && (long ? c.high >= tp2 : c.low <= tp2)) return "TP2 hit";
    if (tp1 !== undefined && (long ? c.high >= tp1 : c.low <= tp1)) tp1Hit = true;
  }
  return tp1Hit ? "TP1 hit" : "Active";
}
