export type Interval = "15m" | "1h" | "4h" | "1d";
export type Mode = "daily" | "swing";

export type DailyAction = "Buy" | "Sell" | "Neutral";
export type SwingAction = "Strong Buy" | "Accumulate" | "Trim" | "Take Profit";
export type SignalAction = DailyAction | SwingAction;

/** long = Buy bias, short = Sell bias, flat = no trade */
export type Direction = "long" | "short" | "flat";

export interface Candle {
  /** Candle open time in UNIX seconds (what lightweight-charts expects). */
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TakeProfit {
  label: string;
  price: number;
  /** Reward multiple of the risk (2 = 1:2 R/R). */
  rr: number;
}

export interface TradeLevels {
  entryLow: number;
  entryHigh: number;
  stopLoss: number;
  takeProfits: TakeProfit[];
}

export interface SignalCheck {
  label: string;
  passed: boolean;
}

/** What a strategy returns before trade levels are attached. */
export interface StrategyResult {
  action: SignalAction;
  direction: Direction;
  /** Index (in the closed-candle array) of the bar that triggered the signal. */
  triggerIndex: number;
  /** True when the trigger happened within the strategy's freshness window. */
  fresh: boolean;
  checks: SignalCheck[];
  indicators: Record<string, number>;
  atr: number;
}

export interface Signal {
  symbol: string;
  base: string;
  quote: string;
  name: string;
  mode: Mode;
  interval: Interval;
  action: SignalAction;
  direction: Direction;
  price: number;
  change24h: number;
  /** When the triggering candle closed (ms). */
  generatedAt: number;
  /** Open time of the triggering candle (seconds) — used for chart markers. */
  triggerTime: number;
  fresh: boolean;
  checks: SignalCheck[];
  indicators: Record<string, number>;
  levels: TradeLevels | null;
}

export interface SignalsResponse {
  mode: Mode;
  interval: Interval;
  updatedAt: number;
  signals: Signal[];
  errors: { symbol: string; message: string }[];
}

export interface CandlesResponse {
  symbol: string;
  interval: Interval;
  candles: Candle[];
}
