/** Price action checks shared by both strategies. */
import type { PriceAction, SignalCheck } from "@/lib/types";

export function priceActionChecks(pa: PriceAction, bullish: boolean): SignalCheck[] {
  const wanted = bullish ? "bullish" : "bearish";
  const pattern = pa.patterns.find((p) => p.bias === wanted);
  const against = pa.patterns.find((p) => p.bias === (bullish ? "bearish" : "bullish"));

  return [
    {
      label: `Structure: ${pa.structureLabel}`,
      passed: bullish ? pa.structure !== "downtrend" : pa.structure !== "uptrend",
    },
    {
      label: pattern
        ? `${pattern.name} ${pattern.barsAgo === 0 ? "on last candle" : `${pattern.barsAgo} candle${pattern.barsAgo > 1 ? "s" : ""} ago`}`
        : against
          ? `Opposing pattern: ${against.name}`
          : `No ${wanted} candle pattern`,
      passed: Boolean(pattern) && pa.patternBias !== (bullish ? "bearish" : "bullish"),
    },
  ];
}
