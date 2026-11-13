/**
 * Daily (intraday) strategy — momentum + breakout on 1H candles, filtered by price action.
 *
 * Bullish conditions: close > VWAP, RSI > 50, MACD histogram > 0 (bearish = the mirror).
 *
 * Stability rules (so the signal does not flicker candle to candle):
 *  - Entry: all 3 conditions must hold for `confirmBars` closed candles in a row.
 *  - Exit:  an active signal only drops to Neutral once `exitMaxPassing` or fewer
 *           conditions still pass, or flips when the opposite side confirms.
 *
 * Price action filter: no Buy while structure is lower highs/lower lows, no Sell
 * while it is higher highs/higher lows. Candle patterns add confirmation checks.
 */
import { DAILY_CONFIG, type DailyConfig } from "@/config/strategy";
import { atr, macd, rsi, vwap } from "@/lib/indicators";
import type { Candle, PriceAction, StrategyResult } from "@/lib/types";
import { priceActionChecks } from "./checks";

type State = "bull" | "bear" | "none";

export function evaluateDaily(candles: Candle[], pa: PriceAction, cfg: DailyConfig = DAILY_CONFIG): StrategyResult {
  const closes = candles.map((c) => c.close);
  const vwapLine = vwap(candles);
  const rsiLine = rsi(closes, cfg.rsiPeriod);
  const { histogram } = macd(closes, cfg.macdFast, cfg.macdSlow, cfg.macdSignal);
  const atrLine = atr(candles, cfg.atrPeriod);

  const valid = (i: number) => [closes[i], rsiLine[i], histogram[i], vwapLine[i]].every(Number.isFinite);
  const bullCount = (i: number) =>
    Number(closes[i] > vwapLine[i]) + Number(rsiLine[i] > cfg.rsiMidline) + Number(histogram[i] > 0);
  const bearCount = (i: number) =>
    Number(closes[i] < vwapLine[i]) + Number(rsiLine[i] < cfg.rsiMidline) + Number(histogram[i] < 0);

  // Replay history through the state machine so the trigger time is exact.
  let state: State = "none";
  let since = 0;
  let bullRun = 0;
  let bearRun = 0;
  for (let i = 0; i < candles.length; i++) {
    if (!valid(i)) continue;
    const bc = bullCount(i);
    const sc = bearCount(i);
    bullRun = bc === 3 ? bullRun + 1 : 0;
    bearRun = sc === 3 ? bearRun + 1 : 0;

    let next: State = state;
    if (state === "bull") {
      if (bearRun >= cfg.confirmBars) next = "bear";
      else if (bc <= cfg.exitMaxPassing) next = "none";
    } else if (state === "bear") {
      if (bullRun >= cfg.confirmBars) next = "bull";
      else if (sc <= cfg.exitMaxPassing) next = "none";
    } else if (bullRun >= cfg.confirmBars) next = "bull";
    else if (bearRun >= cfg.confirmBars) next = "bear";

    if (next !== state) {
      state = next;
      since = i;
    }
  }

  const last = candles.length - 1;
  const price = closes[last];
  const r = rsiLine[last];
  const h = histogram[last];
  const v = vwapLine[last];

  // Price action filter.
  const blocked =
    cfg.requireStructure &&
    ((state === "bull" && pa.structure === "downtrend") || (state === "bear" && pa.structure === "uptrend"));
  const effective: State = blocked ? "none" : state;
  const bullish = state !== "bear";

  return {
    action: effective === "bull" ? "Buy" : effective === "bear" ? "Sell" : "Neutral",
    direction: effective === "bull" ? "long" : effective === "bear" ? "short" : "flat",
    triggerIndex: since,
    fresh: last - since < cfg.freshBars,
    checks: [
      { label: bullish ? "Price above VWAP" : "Price below VWAP", passed: bullish ? price > v : price < v },
      {
        label: `RSI(${cfg.rsiPeriod}) ${bullish ? "above" : "below"} ${cfg.rsiMidline}`,
        passed: bullish ? r > cfg.rsiMidline : r < cfg.rsiMidline,
      },
      { label: `MACD histogram ${bullish ? "positive" : "negative"}`, passed: bullish ? h > 0 : h < 0 },
      { label: `Confirmed for ${cfg.confirmBars}+ closed candles`, passed: state !== "none" },
      ...priceActionChecks(pa, bullish),
    ],
    indicators: { VWAP: v, RSI: r, "MACD Hist": h, ATR: atrLine[last] },
  };
}
