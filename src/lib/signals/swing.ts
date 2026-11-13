/**
 * Swing strategy — trend following on 4H candles, filtered by price action.
 *
 * Rules, checked in priority order (first match wins):
 *  1. Fresh death cross (fast EMA below slow EMA)        → Take Profit
 *  2. Fresh golden cross (fast EMA above slow EMA)       → Strong Buy
 *  3. RSI rejected from overbought (falls back below 70) → Trim (uptrend) / Take Profit (downtrend)
 *  4. RSI bounced from oversold (climbs back above 30)   → Strong Buy (uptrend) / Accumulate (downtrend)
 *  5. Established uptrend                                → Accumulate (or Trim if RSI is overbought)
 *  6. Established downtrend                              → Take Profit
 *
 * A cross only counts once the fast EMA has stayed on the new side for `confirmBars`
 * candles (filters whipsaws). Strong Buy is downgraded to Accumulate while price
 * structure is still lower highs / lower lows.
 */
import { SWING_CONFIG, type SwingConfig } from "@/config/strategy";
import { atr, crossedAbove, crossedBelow, ema, findLastIndex, rsi } from "@/lib/indicators";
import type { Candle, PriceAction, StrategyResult, SwingAction } from "@/lib/types";
import { priceActionChecks } from "./checks";

export function evaluateSwing(candles: Candle[], pa: PriceAction, cfg: SwingConfig = SWING_CONFIG): StrategyResult {
  const closes = candles.map((c) => c.close);
  const fast = ema(closes, cfg.emaFast);
  const slow = ema(closes, cfg.emaSlow);
  const rsiLine = rsi(closes, cfg.rsiPeriod);
  const atrLine = atr(candles, cfg.atrPeriod);

  const last = candles.length - 1;
  const uptrend = fast[last] > slow[last];
  const crossFrom = last - cfg.crossLookback + 1;
  const rsiFrom = last - cfg.rsiLookback + 1;

  /** True when the side set at bar i held for confirmBars candles. */
  const held = (i: number, above: boolean) => {
    if (i + cfg.confirmBars - 1 > last) return false;
    for (let j = i; j < i + cfg.confirmBars; j++) if (above ? fast[j] <= slow[j] : fast[j] >= slow[j]) return false;
    return true;
  };
  const isGolden = (i: number) => crossedAbove(fast, slow, i) && held(i, true);
  const isDeath = (i: number) => crossedBelow(fast, slow, i) && held(i, false);

  const golden = findLastIndex(crossFrom, last, isGolden);
  const death = findLastIndex(crossFrom, last, isDeath);
  const obReject = findLastIndex(rsiFrom, last, (i) => rsiLine[i - 1] >= cfg.overbought && rsiLine[i] < cfg.overbought);
  const osBounce = findLastIndex(rsiFrom, last, (i) => rsiLine[i - 1] <= cfg.oversold && rsiLine[i] > cfg.oversold);
  // Start of the current trend (most recent confirmed cross, anywhere in history).
  const trendStart = Math.max(0, findLastIndex(1, last, (i) => isGolden(i) || isDeath(i)));

  let action: SwingAction;
  let trigger: number;
  let fresh = true;

  if (death > golden) {
    action = "Take Profit";
    trigger = death;
  } else if (golden >= 0) {
    action = "Strong Buy";
    trigger = golden;
  } else if (obReject >= 0) {
    action = uptrend ? "Trim" : "Take Profit";
    trigger = obReject;
  } else if (osBounce >= 0) {
    action = uptrend ? "Strong Buy" : "Accumulate";
    trigger = osBounce;
  } else if (uptrend) {
    action = rsiLine[last] >= cfg.overbought ? "Trim" : "Accumulate";
    trigger = trendStart;
    fresh = false;
  } else {
    action = "Take Profit";
    trigger = trendStart;
    fresh = false;
  }

  // Price action filter.
  if (cfg.requireStructure && action === "Strong Buy" && pa.structure === "downtrend") action = "Accumulate";

  const bullishAction = action === "Strong Buy" || action === "Accumulate";
  const r = rsiLine[last];

  return {
    action,
    direction: bullishAction ? "long" : "short",
    triggerIndex: trigger,
    fresh,
    checks: [
      { label: `EMA${cfg.emaFast} ${uptrend ? ">" : "<"} EMA${cfg.emaSlow} (${uptrend ? "uptrend" : "downtrend"})`, passed: uptrend === bullishAction },
      {
        label: bullishAction ? `Golden cross in last ${cfg.crossLookback} candles` : `Death cross in last ${cfg.crossLookback} candles`,
        passed: bullishAction ? golden >= 0 : death >= 0,
      },
      {
        label: bullishAction ? `RSI bounce from < ${cfg.oversold}` : `RSI rejection from > ${cfg.overbought}`,
        passed: bullishAction ? osBounce >= 0 : obReject >= 0,
      },
      {
        label: bullishAction ? `RSI not overbought (< ${cfg.overbought})` : `RSI not oversold (> ${cfg.oversold})`,
        passed: bullishAction ? r < cfg.overbought : r > cfg.oversold,
      },
      ...priceActionChecks(pa, bullishAction),
    ],
    indicators: {
      [`EMA${cfg.emaFast}`]: fast[last],
      [`EMA${cfg.emaSlow}`]: slow[last],
      RSI: r,
      ATR: atrLine[last],
    },
  };
}
