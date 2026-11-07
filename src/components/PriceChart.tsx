"use client";

import { useEffect, useRef } from "react";
import useSWR from "swr";
import {
  ColorType,
  CrosshairMode,
  createChart,
  LineStyle,
  type AutoscaleInfo,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";
import { REFRESH_MS, SWING_CONFIG } from "@/config/strategy";
import { ema, vwap } from "@/lib/indicators";
import { actionTone, CHART_COLORS } from "@/lib/format";
import type { Candle, CandlesResponse, Signal } from "@/lib/types";

const fetcher = async (url: string): Promise<CandlesResponse> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error((await res.json()).error ?? "Failed to load candles");
  return res.json();
};

const toLine = (candles: Candle[], values: number[]) =>
  candles
    .map((c, i) => ({ time: c.time as UTCTimestamp, value: values[i] }))
    .filter((p) => Number.isFinite(p.value));

export default function PriceChart({ signal }: { signal: Signal }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const { data, error, isLoading } = useSWR(
    `/api/crypto/data?symbol=${signal.symbol}&interval=${signal.interval}&limit=300`,
    fetcher,
    { refreshInterval: REFRESH_MS },
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !data) return;

    const chart = createChart(el, {
      autoSize: true,
      layout: { background: { type: ColorType.Solid, color: CHART_COLORS.background }, textColor: CHART_COLORS.text },
      grid: { vertLines: { color: CHART_COLORS.grid }, horzLines: { color: CHART_COLORS.grid } },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: CHART_COLORS.grid },
      timeScale: { borderColor: CHART_COLORS.grid, timeVisible: true, secondsVisible: false },
    });
    chartRef.current = chart;

    const { candles } = data;

    // Volume (bottom 20%)
    const volume = chart.addHistogramSeries({ priceScaleId: "", priceFormat: { type: "volume" } });
    volume.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
    volume.setData(
      candles.map((c) => ({
        time: c.time as UTCTimestamp,
        value: c.volume,
        color: c.close >= c.open ? "rgba(16,185,129,0.25)" : "rgba(244,63,94,0.25)",
      })),
    );

    const series: ISeriesApi<"Candlestick"> = chart.addCandlestickSeries({
      upColor: CHART_COLORS.bull,
      downColor: CHART_COLORS.bear,
      borderVisible: false,
      wickUpColor: CHART_COLORS.bull,
      wickDownColor: CHART_COLORS.bear,
      // Stretch the price scale so stop loss and every take-profit line stay on screen.
      autoscaleInfoProvider: (original: () => AutoscaleInfo | null) => {
        const res = original();
        const lv = signal.levels;
        if (!res?.priceRange || !lv) return res;
        const prices = [lv.stopLoss, lv.entryLow, lv.entryHigh, ...lv.takeProfits.map((t) => t.price)];
        return {
          ...res,
          priceRange: {
            minValue: Math.min(res.priceRange.minValue, ...prices),
            maxValue: Math.max(res.priceRange.maxValue, ...prices),
          },
        };
      },
    });
    series.priceScale().applyOptions({ scaleMargins: { top: 0.08, bottom: 0.25 } });
    series.setData(
      candles.map((c) => ({ time: c.time as UTCTimestamp, open: c.open, high: c.high, low: c.low, close: c.close })),
    );

    // Strategy overlays
    const closes = candles.map((c) => c.close);
    const line = (color: string, title: string) =>
      chart.addLineSeries({ color, lineWidth: 2, title, priceLineVisible: false, lastValueVisible: false });
    if (signal.mode === "daily") {
      line(CHART_COLORS.vwap, "VWAP").setData(toLine(candles, vwap(candles)));
    } else {
      line(CHART_COLORS.emaFast, `EMA${SWING_CONFIG.emaFast}`).setData(toLine(candles, ema(closes, SWING_CONFIG.emaFast)));
      line(CHART_COLORS.emaSlow, `EMA${SWING_CONFIG.emaSlow}`).setData(toLine(candles, ema(closes, SWING_CONFIG.emaSlow)));
    }

    // Trade levels
    const { levels } = signal;
    if (levels) {
      const priceLine = (price: number, color: string, title: string, style = LineStyle.Dashed) =>
        series.createPriceLine({ price, color, title, lineStyle: style, lineWidth: 1, axisLabelVisible: true });
      priceLine(levels.entryHigh, CHART_COLORS.entry, "Entry");
      priceLine(levels.entryLow, CHART_COLORS.entry, "Entry", LineStyle.Dotted);
      priceLine(levels.stopLoss, CHART_COLORS.bear, "SL");
      levels.takeProfits.forEach((tp) => priceLine(tp.price, CHART_COLORS.bull, tp.label));
    }

    // Marker on the trigger bar
    const tone = actionTone(signal.action);
    const isLong = signal.direction === "long";
    if (candles.some((c) => c.time === signal.triggerTime)) {
      series.setMarkers([
        {
          time: signal.triggerTime as UTCTimestamp,
          position: isLong ? "belowBar" : "aboveBar",
          shape: signal.direction === "flat" ? "circle" : isLong ? "arrowUp" : "arrowDown",
          color: tone === "bull" ? CHART_COLORS.bull : tone === "bear" ? CHART_COLORS.bear : CHART_COLORS.warn,
          text: signal.action,
        },
      ]);
    }

    chart.timeScale().setVisibleLogicalRange({ from: candles.length - 120, to: candles.length + 5 });

    return () => {
      chart.remove();
      chartRef.current = null;
    };
  }, [data, signal]);

  return (
    <div className="relative h-[420px] w-full overflow-hidden rounded-xl bg-[#0b0e14] ring-1 ring-white/5">
      <div ref={containerRef} className="absolute inset-0" />
      {(isLoading || error) && (
        <div className="absolute inset-0 grid place-items-center text-sm text-zinc-500">
          {error ? `Chart error: ${(error as Error).message}` : "Loading chart…"}
        </div>
      )}
    </div>
  );
}
