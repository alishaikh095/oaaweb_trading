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

/** How the trade has played out since the levels were set (closed candles only). */
export type TradeStatus = "Active" | "TP1 hit" | "TP2 hit" | "Stopped out";

export interface SignalCheck {
  label: string;
  passed: boolean;
}

export type Bias = "bullish" | "bearish" | "neutral";

export interface PriceActionPattern {
  name: string;
  bias: Bias;
  description: string;
  /** 0 = the last closed candle. */
  barsAgo: number;
  /** Open time (seconds) of the candle that completed the pattern. */
  time: number;
}

/** uptrend = higher highs + higher lows, downtrend = lower highs + lower lows. */
export type MarketStructure = "uptrend" | "downtrend" | "range";

export interface PriceAction {
  structure: MarketStructure;
  structureLabel: string;
  /** Nearest swing low below price / swing high above price. */
  support: number | null;
  resistance: number | null;
  /** Close beyond the most recent swing high (bullish) or swing low (bearish). */
  breakout: "bullish" | "bearish" | null;
  patterns: PriceActionPattern[];
  /** Net bias of the recent candlestick patterns. */
  patternBias: Bias;
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
  /** Live price (from the still-forming candle). */
  price: number;
  change24h: number;
  /** When the triggering candle closed (ms). */
  generatedAt: number;
  /** Open time of the triggering candle (seconds) — used for chart markers. */
  triggerTime: number;
  fresh: boolean;
  checks: SignalCheck[];
  /** Share of checks passing, 0–100. */
  confidence: number;
  indicators: Record<string, number>;
  levels: TradeLevels | null;
  /** Close price of the candle the levels were calculated from. */
  levelsPrice: number | null;
  status: TradeStatus | null;
  priceAction: PriceAction;
  /** When the current candle closes and the signal can next change (ms). */
  nextUpdateAt: number;
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
