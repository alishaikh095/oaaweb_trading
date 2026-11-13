import type { Interval } from "@/lib/types";

/** How entry, stop loss and take profit levels are derived. */
export interface RiskConfig {
  /** Entry zone width, in ATRs, on the "better price" side of current price. */
  entryZoneAtr: number;
  /** Bars to look back for the recent swing low / high used for the stop. */
  swingLookback: number;
  /** Extra ATR buffer placed beyond the swing low / high. */
  stopBufferAtr: number;
  /** Stop distance is clamped between these ATR multiples. */
  minStopAtr: number;
  maxStopAtr: number;
  /** Take-profit targets as reward multiples of risk (2 = 1:2 R/R). */
  rewardMultiples: number[];
}

export interface DailyConfig {
  interval: Interval;
  limit: number;
  rsiPeriod: number;
  rsiMidline: number;
  macdFast: number;
  macdSlow: number;
  macdSignal: number;
  atrPeriod: number;
  /** A signal older than this many bars is flagged as stale. */
  freshBars: number;
  /** All 3 conditions must hold for this many closed candles in a row before a signal fires. */
  confirmBars: number;
  /** Once active, the signal only drops to Neutral when this many conditions (or fewer) still pass. */
  exitMaxPassing: number;
  /** Block Buy in a lower-highs/lower-lows structure (and Sell in a higher-highs/higher-lows one). */
  requireStructure: boolean;
  risk: RiskConfig;
}

export interface SwingConfig {
  interval: Interval;
  limit: number;
  emaFast: number;
  emaSlow: number;
  rsiPeriod: number;
  oversold: number;
  overbought: number;
  atrPeriod: number;
  /** A golden / death cross within this many bars counts as fresh. */
  crossLookback: number;
  /** An RSI bounce / rejection within this many bars counts as fresh. */
  rsiLookback: number;
  /** An EMA cross only counts once the fast EMA has stayed on the new side for this many candles. */
  confirmBars: number;
  /** Downgrade Strong Buy to Accumulate when price structure is still making lower highs/lows. */
  requireStructure: boolean;
  risk: RiskConfig;
}

/** Price action (market structure, support/resistance, candlestick patterns). */
export interface PriceActionConfig {
  /** A swing high/low needs this many candles on each side that are lower/higher. */
  pivotLeft: number;
  pivotRight: number;
  /** Look for candlestick patterns in the last N closed candles. */
  patternLookback: number;
  /** Ignore patterns on candles smaller than this many ATRs (filters out noise). */
  minPatternRangeAtr: number;
  /** Support/resistance comes from swing points in the last N candles. */
  srLookback: number;
}

export const PRICE_ACTION_CONFIG: PriceActionConfig = {
  pivotLeft: 3,
  pivotRight: 3,
  patternLookback: 3,
  minPatternRangeAtr: 0.5,
  srLookback: 150,
};

export const DAILY_CONFIG: DailyConfig = {
  interval: "1h",
  limit: 500,
  rsiPeriod: 14,
  rsiMidline: 50,
  macdFast: 12,
  macdSlow: 26,
  macdSignal: 9,
  atrPeriod: 14,
  freshBars: 12,
  confirmBars: 2,
  exitMaxPassing: 1,
  requireStructure: true,
  risk: {
    entryZoneAtr: 0.3,
    swingLookback: 12,
    stopBufferAtr: 0.2,
    minStopAtr: 1,
    maxStopAtr: 2.5,
    rewardMultiples: [2, 3],
  },
};

export const SWING_CONFIG: SwingConfig = {
  interval: "4h",
  limit: 500,
  emaFast: 20,
  emaSlow: 50,
  rsiPeriod: 14,
  oversold: 30,
  overbought: 70,
  atrPeriod: 14,
  crossLookback: 12,
  rsiLookback: 6,
  confirmBars: 2,
  requireStructure: true,
  risk: {
    entryZoneAtr: 0.5,
    swingLookback: 20,
    stopBufferAtr: 0.3,
    minStopAtr: 1.5,
    maxStopAtr: 3.5,
    rewardMultiples: [2, 3],
  },
};

/** How often the dashboard re-fetches signals (ms). */
export const REFRESH_MS = 60_000;
