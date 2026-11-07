/**
 * Signal engine entry point: fetch candles → run strategy → attach trade levels.
 * To add a new strategy, add a Mode, write an evaluate function, and register it in STRATEGIES.
 */
import type { TradingPair } from "@/config/pairs";
import { DAILY_CONFIG, SWING_CONFIG, type RiskConfig } from "@/config/strategy";
import { closedCandles, fetchKlines, INTERVAL_MS } from "@/lib/binance";
import type { Candle, Interval, Mode, Signal, StrategyResult } from "@/lib/types";
import { evaluateDaily } from "./daily";
import { computeLevels } from "./levels";
import { evaluateSwing } from "./swing";

interface StrategyDef {
  interval: Interval;
  limit: number;
  risk: RiskConfig;
  evaluate: (candles: Candle[]) => StrategyResult;
}

export const STRATEGIES: Record<Mode, StrategyDef> = {
  daily: { ...DAILY_CONFIG, evaluate: (c) => evaluateDaily(c) },
  swing: { ...SWING_CONFIG, evaluate: (c) => evaluateSwing(c) },
};

export const isMode = (v: string): v is Mode => v in STRATEGIES;

export async function generateSignal(pair: TradingPair, mode: Mode): Promise<Signal> {
  const strategy = STRATEGIES[mode];
  const all = await fetchKlines(pair.symbol, strategy.interval, strategy.limit);
  const closed = closedCandles(all, strategy.interval);
  if (closed.length < 100) throw new Error(`Not enough candles for ${pair.symbol}`);

  const result = strategy.evaluate(closed);
  const price = all[all.length - 1].close; // live price from the forming candle
  const barMs = INTERVAL_MS[strategy.interval];
  const barsPerDay = Math.max(1, Math.round(86_400_000 / barMs));
  const dayAgo = all[Math.max(0, all.length - 1 - barsPerDay)].close;
  const triggerBar = closed[result.triggerIndex];

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
    indicators: result.indicators,
    levels: computeLevels(closed, price, result.atr, result.direction, strategy.risk),
  };
}
