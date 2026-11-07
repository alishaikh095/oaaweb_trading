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
  risk: RiskConfig;
}

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
