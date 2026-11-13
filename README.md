# SignalDesk — Daily & Swing Crypto Signals

Next.js 15 (App Router) + TypeScript (strict) + Tailwind CSS v4 + SWR + TradingView lightweight-charts.
Market data comes from the free Binance public API — no API keys needed.

## 1. Bootstrap (already done — for reference)

```bash
npx create-next-app@15 crypto-signals --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
cd crypto-signals
npm i swr lightweight-charts@4.2.3
```

## 2. Folder structure

```
src/
├── app/
│   ├── api/
│   │   ├── crypto/data/route.ts   GET OHLCV candles  (?symbol=BTCUSDT&interval=1h&limit=300)
│   │   └── signals/route.ts       GET signals for every pair (?mode=daily|swing)
│   ├── layout.tsx
│   ├── page.tsx                   renders <Dashboard />
│   └── globals.css
├── components/
│   ├── Dashboard.tsx              data fetching (SWR), grid, chart section
│   ├── Header.tsx                 Daily / Swing toggle, refresh
│   ├── SignalCard.tsx             ticker, price, signal, entry/TP/SL, checks, age
│   ├── PriceChart.tsx             candlesticks + VWAP/EMA overlays + level lines
│   └── TimeAgo.tsx
├── config/
│   ├── pairs.ts                   ← add trading pairs here
│   └── strategy.ts                ← tweak indicator / risk parameters here
└── lib/
    ├── binance.ts                 kline fetcher (with region fallback hosts)
    ├── indicators.ts              EMA, SMA, RSI, MACD, ATR, VWAP (no dependencies)
    ├── format.ts                  number formatting + colour tokens
    ├── types.ts
    └── signals/
        ├── index.ts               fetch → strategy → levels (strategy registry)
        ├── daily.ts               1H momentum/breakout strategy
        ├── swing.ts               4H trend-following strategy
        └── levels.ts              entry zone, ATR/structure stop, R-multiple targets
```

## 3. Strategy logic

**Daily (1H)** — Buy when, on the last closed candle, price > session VWAP (UTC day),
RSI(14) > 50 and MACD(12,26,9) histogram > 0. Sell is the mirror image. Otherwise Neutral.
The signal time is the bar where all three conditions first lined up. After 12 bars it is marked "mature".

**Swing (4H)** — first matching rule wins:
1. Death cross (EMA20 below EMA50) in the last 12 bars → **Take Profit**
2. Golden cross in the last 12 bars → **Strong Buy**
3. RSI falls back below 70 (last 6 bars) → **Trim** in an uptrend, **Take Profit** in a downtrend
4. RSI climbs back above 30 (last 6 bars) → **Strong Buy** in an uptrend, **Accumulate** in a downtrend
5. Established uptrend → **Accumulate** (or **Trim** if RSI ≥ 70)
6. Established downtrend → **Take Profit**

**Price action** (both modes, `lib/signals/priceAction.ts` + `patterns.ts`):
- *Market structure* from confirmed swing points (3 candles each side): higher highs + higher lows = uptrend, lower highs + lower lows = downtrend, else range.
- *Support / resistance*: nearest swing low below price and swing high above it (last 150 candles).
- *Breakout*: close beyond the most recent swing high / low.
- *Candlestick patterns* in the last 3 closed candles: hammer, shooting star, engulfing, harami, morning/evening star, marubozu, outside/inside bar, doji, three soldiers/crows. Candles smaller than 0.5 ATR are ignored, and reversal patterns need a prior move the other way.
- Filters: Daily Buy is blocked in a downtrend structure (Sell in an uptrend); Swing Strong Buy is downgraded to Accumulate in a downtrend structure. Structure and pattern also count toward the confidence %.

**Stability** — signals only change when a candle closes:
- Daily needs all 3 conditions for 2 closed candles in a row, and only exits when 2 of 3 fail.
- Swing EMA crosses must hold for 2 candles.
- Entry / SL / TP are calculated once from the trigger candle and stay fixed; the card tracks whether TP1, TP2 or the stop has been hit since.
- Binance data is cached in memory for 20 s at most (never served stale).

**Levels** — Entry zone extends a fraction of ATR on the favourable side of price.
Stop loss goes just beyond the recent swing low/high, clamped between a min and max number of ATRs.
TP1 = 1:2 and TP2 = 1:3 risk/reward. All in `config/strategy.ts`.

Signals use **closed candles only**; the price shown is live (from the forming candle).

## 4. Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. Signals refresh every 60 s (`REFRESH_MS`).

Test the API directly:

```bash
curl "http://localhost:3000/api/signals?mode=daily"
curl "http://localhost:3000/api/signals?mode=swing"
curl "http://localhost:3000/api/crypto/data?symbol=SOLUSDT&interval=4h&limit=5"
```

Checks: `npx tsc --noEmit`, `npm run lint`, `npm run build`.

## 5. Customising

- **New pair:** add `{ symbol: "XRPUSDT", base: "XRP", quote: "USDT", name: "XRP" }` to `src/config/pairs.ts`.
- **Parameters:** edit `DAILY_CONFIG` / `SWING_CONFIG` (periods, thresholds, timeframe, R/R multiples).
  Switching daily to 15m is just `interval: "15m"`.
- **New strategy:** add a `Mode` in `lib/types.ts`, write `evaluateX(candles): StrategyResult`,
  register it in `STRATEGIES` in `lib/signals/index.ts`, and add a tab in `Header.tsx`.

## Notes

- `api.binance.com` returns HTTP 451 in some regions (e.g. the US); the fetcher falls back to
  `data-api.binance.vision` automatically.
- Educational tool only — not financial advice.
