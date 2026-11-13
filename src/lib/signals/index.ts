/**
 * Signal engine entry point: fetch candles → price action → strategy → trade levels.
 *
 * Everything except the live price is computed from CLOSED candles, so a signal
 * (and its entry / SL / TP) can only change when a new candle closes.
 *
 * To add a new strategy, add a Mode, write an evaluate function, and register it in STRATEGIES.
 */
import type { TradingPair } from "@/config/pairs";
import { DAILY_CONFIG, SWING_CONFIG, type RiskConfig } from "@/config/strategy";
import { closedCandles, fetchKlines, INTERVAL_MS } from "@/lib/binance";
import { atr } from "@/lib/indicators";
import type { Candle, Interval, Mode, PriceAction, Signal, StrategyResult } from "@/lib/types";
import { evaluateDaily } from "./daily";
import { computeLevels, tradeStatus } from "./levels";
import { analyzePriceAction } from "./priceAction";
import { evaluateSwing } from "./swing";

interface StrategyDef {
  interval: Interval;
  limit: number;
  atrPeriod: number;
  risk: RiskConfig;
  evaluate: (candles: Candle[], pa: PriceAction) => StrategyResult;
}

export const STRATEGIES: Record<Mode, StrategyDef> = {
  daily: { ...DAILY_CONFIG, evaluate: (c, pa) => evaluateDaily(c, pa) },
  swing: { ...SWING_CONFIG, evaluate: (c, pa) => evaluateSwing(c, pa) },
};

export const isMode = (v: string): v is Mode => v in STRATEGIES;

export async function generateSignal(pair: TradingPair, mode: Mode): Promise<Signal> {
  const strategy = STRATEGIES[mode];
  const all = await fetchKlines(pair.symbol, strategy.interval, strategy.limit);
  const closed = closedCandles(all);
  if (closed.length < 100) throw new Error(`Not enough candles for ${pair.symbol}`);

  const last = closed.length - 1;
  const atrLine = atr(closed, strategy.atrPeriod);
  const priceAction = analyzePriceAction(closed, atrLine);
  const result = strategy.evaluate(closed, priceAction);

  // Levels are anchored to the trigger candle so they stay fixed while the signal lives.
  // A mature signal (trigger outside the freshness window) re-anchors to the last closed candle.
  const anchor = result.fresh ? result.triggerIndex : last;
  const levels = computeLevels(
    closed.slice(0, anchor + 1),
    closed[anchor].close,
    atrLine[anchor],
    result.direction,
    strategy.risk,
  );

  const price = all[all.length - 1].close; // live price from the forming candle
  const barMs = INTERVAL_MS[strategy.interval];
  const barsPerDay = Math.max(1, Math.round(86_400_000 / barMs));
  const dayAgo = all[Math.max(0, all.length - 1 - barsPerDay)].close;
  const triggerBar = closed[result.triggerIndex];
  const passed = result.checks.filter((c) => c.passed).length;

  return {
    symbol: pair.symbol,
    base: pair.base,
    quote: pair.quote,
    name: pair.name,
    mode,
    interval: strategy.interval,
    action: result.action,
    direction: result.direction,
    price,
    change24h: ((price - dayAgo) / dayAgo) * 100,
    generatedAt: triggerBar.time * 1000 + barMs,
    triggerTime: triggerBar.time,
    fresh: result.fresh,
    checks: result.checks,
    confidence: Math.round((passed / result.checks.length) * 100),
    indicators: result.indicators,
    levels,
    levelsPrice: levels ? closed[anchor].close : null,
    status: levels ? tradeStatus(closed, anchor, levels, result.direction) : null,
    priceAction,
    nextUpdateAt: all[all.length - 1].time * 1000 + barMs,
  };
}
