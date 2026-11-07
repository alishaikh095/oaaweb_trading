import { NextResponse, type NextRequest } from "next/server";
import { findPair } from "@/config/pairs";
import { fetchKlines, isInterval } from "@/lib/binance";
import type { CandlesResponse } from "@/lib/types";

/** GET /api/crypto/data?symbol=BTCUSDT&interval=1h&limit=300 → OHLCV candles */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const symbol = (params.get("symbol") ?? "BTCUSDT").toUpperCase();
  const interval = params.get("interval") ?? "1h";
  const limit = Number(params.get("limit") ?? 300);

  if (!findPair(symbol)) {
    return NextResponse.json({ error: `Unsupported symbol: ${symbol}` }, { status: 400 });
  }
  if (!isInterval(interval)) {
    return NextResponse.json({ error: `Unsupported interval: ${interval}` }, { status: 400 });
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 1000) {
    return NextResponse.json({ error: "limit must be an integer between 1 and 1000" }, { status: 400 });
  }

  try {
    const candles = await fetchKlines(symbol, interval, limit);
    const body: CandlesResponse = { symbol, interval, candles };
    return NextResponse.json(body);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
