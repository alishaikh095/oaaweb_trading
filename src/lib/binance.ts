/**
 * Binance public market-data client (no API key needed).
 * Hosts are tried in order — api.binance.com is blocked in some regions (e.g. the US),
 * so the public data mirror is used as a fallback.
 */
import type { Candle, Interval } from "./types";

const BASE_URLS = [
  "https://api.binance.com",
  "https://data-api.binance.vision",
  "https://api1.binance.com",
];

export const INTERVAL_MS: Record<Interval, number> = {
  "15m": 15 * 60_000,
  "1h": 60 * 60_000,
  "4h": 4 * 60 * 60_000,
  "1d": 24 * 60 * 60_000,
};

export const isInterval = (v: string): v is Interval => v in INTERVAL_MS;

/** Raw kline row: [openTime, open, high, low, close, volume, closeTime, ...] */
type RawKline = [number, string, string, string, string, string, number, ...unknown[]];

/**
 * Short in-memory cache (per server instance). Unlike Next's fetch cache, it never
 * serves stale data: an entry older than CACHE_TTL_MS is refetched before use.
 */
const CACHE_TTL_MS = 20_000;
const cache = new Map<string, { at: number; data: Promise<Candle[]> }>();

export async function fetchKlines(symbol: string, interval: Interval, limit = 500): Promise<Candle[]> {
  const key = `${symbol}:${interval}:${limit}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data;

  const data = fetchFromBinance(symbol, interval, limit);
  cache.set(key, { at: Date.now(), data });
  data.catch(() => cache.delete(key)); // don't cache failures
  return data;
}

async function fetchFromBinance(symbol: string, interval: Interval, limit: number): Promise<Candle[]> {
  const query = new URLSearchParams({ symbol, interval, limit: String(Math.min(limit, 1000)) });
  let lastError: unknown;

  for (const base of BASE_URLS) {
    try {
      const res = await fetch(`${base}/api/v3/klines?${query}`, {
        cache: "no-store",
        signal: AbortSignal.timeout(8_000),
      });
      if (!res.ok) throw new Error(`${base} responded ${res.status}`);
      const rows = (await res.json()) as RawKline[];
      return rows.map((k) => ({
        time: Math.floor(k[0] / 1000),
        open: Number(k[1]),
        high: Number(k[2]),
        low: Number(k[3]),
        close: Number(k[4]),
        volume: Number(k[5]),
      }));
    } catch (err) {
      lastError = err;
    }
  }
  throw new Error(`Failed to fetch ${symbol} ${interval} klines: ${String(lastError)}`);
}

/**
 * Drops the still-forming candle. Binance always returns the current (open) candle
 * last, so removing it is correct even when the response came from a short cache —
 * a time-based check could mistake a stale "almost closed" candle for a closed one.
 */
export function closedCandles(candles: Candle[]): Candle[] {
  return candles.slice(0, -1);
}
