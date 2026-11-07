import { NextResponse, type NextRequest } from "next/server";
import { PAIRS } from "@/config/pairs";
import { generateSignal, isMode, STRATEGIES } from "@/lib/signals";
import type { SignalsResponse } from "@/lib/types";

/** GET /api/signals?mode=daily|swing → one signal per configured pair */
export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("mode") ?? "daily";
  if (!isMode(mode)) {
    return NextResponse.json({ error: `Unsupported mode: ${mode}` }, { status: 400 });
  }

  const results = await Promise.allSettled(PAIRS.map((pair) => generateSignal(pair, mode)));

  const body: SignalsResponse = {
    mode,
    interval: STRATEGIES[mode].interval,
    updatedAt: Date.now(),
    signals: [],
    errors: [],
  };
  results.forEach((r, i) => {
    if (r.status === "fulfilled") body.signals.push(r.value);
    else body.errors.push({ symbol: PAIRS[i].symbol, message: String(r.reason?.message ?? r.reason) });
  });

  const status = body.signals.length === 0 && body.errors.length > 0 ? 502 : 200;
  return NextResponse.json(body, { status });
}
