/**
 * Daily (intraday) strategy — momentum + breakout on 1H candles.
 *
 * Bullish confluence: close > VWAP, RSI > 50, MACD histogram > 0.
 * Bearish confluence: close < VWAP, RSI < 50, MACD histogram < 0.
 *
 * The signal fires on the bar where confluence flips on (i.e. the last of the
 * three conditions crosses over). It stays active while confluence holds.
 */
import { DAILY_CONFIG, type DailyConfig } from "@/config/strategy";
import { atr, macd, rsi, vwap } from "@/lib/indicators";
import type { Candle, StrategyResult } from "@/lib/types";

type State = "bull" | "bear" | "none";

export function evaluateDaily(candles: Candle[], cfg: DailyConfig = DAILY_CONFIG): StrategyResult {
  const closes = candles.map((c) => c.close);
  const vwapLine = vwap(candles);
  const rsiLine = rsi(closes, cfg.rsiPeriod);
  const { histogram } = macd(closes, cfg.macdFast, cfg.macdSlow, cfg.macdSignal);
  const atrLine = atr(candles, cfg.atrPeriod);

  const stateAt = (i: number): State => {
    const c = closes[i];
    const r = rsiLine[i];
    const h = histogram[i];
    if (![c, r, h, vwapLine[i]].every(Number.isFinite)) return "none";
    if (c > vwapLine[i] && r > cfg.rsiMidline && h > 0) return "bull";
    if (c < vwapLine[i] && r < cfg.rsiMidline && h < 0) return "bear";
    return "none";
  };

  const last = candles.length - 1;
  const current = stateAt(last);

  // Walk back to the bar where the current state started.
  let trigger = last;
  while (trigger > 0 && stateAt(trigger - 1) === current) trigger--;

  const price = closes[last];
  const r = rsiLine[last];
  const h = histogram[last];
  const v = vwapLine[last];
  const bullish = current !== "bear";

  return {
    action: current === "bull" ? "Buy" : current === "bear" ? "Sell" : "Neutral",
    direction: current === "bull" ? "long" : current === "bear" ? "short" : "flat",
    triggerIndex: trigger,
    fresh: last - trigger < cfg.freshBars,
    checks: [
      { label: bullish ? "Price above VWAP" : "Price below VWAP", passed: bullish ? price > v : price < v },
      {
        label: bullish ? `RSI(${cfg.rsiPeriod}) above ${cfg.rsiMidline}` : `RSI(${cfg.rsiPeriod}) below ${cfg.rsiMidline}`,
        passed: bullish ? r > cfg.rsiMidline : r < cfg.rsiMidline,
      },
      { label: bullish ? "MACD histogram positive" : "MACD histogram negative", passed: bullish ? h > 0 : h < 0 },
    ],
    indicators: { VWAP: v, RSI: r, "MACD Hist": h, ATR: atrLine[last] },
    atr: atrLine[last],
  };
}
