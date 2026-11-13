"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import { REFRESH_MS } from "@/config/strategy";
import { actionTone, formatNumber, formatPrice, TONE_CLASSES, type Tone } from "@/lib/format";
import type { Mode, Signal, SignalsResponse } from "@/lib/types";
import { Header } from "./Header";
import { SignalCard } from "./SignalCard";
import { Countdown, TimeAgo } from "./TimeAgo";

// lightweight-charts needs the DOM — load it on the client only.
const PriceChart = dynamic(() => import("./PriceChart"), {
  ssr: false,
  loading: () => <div className="h-[420px] animate-pulse rounded-xl bg-white/[0.03]" />,
});

const fetcher = async (url: string): Promise<SignalsResponse> => {
  const res = await fetch(url);
  const body = await res.json();
  if (!res.ok && !body.signals?.length) throw new Error(body.errors?.[0]?.message ?? body.error ?? "Request failed");
  return body;
};

type Filter = "all" | "bull" | "bear" | "neutral";
type Sort = "signal" | "rank" | "change";

/** Bullish first, then neutral, trim, bearish. */
const TONE_ORDER: Record<Tone, number> = { bull: 0, neutral: 1, warn: 2, bear: 3 };
const passedCount = (s: Signal) => s.checks.filter((c) => c.passed).length;
const filterTone = (s: Signal): Exclude<Filter, "all"> => {
  const t = actionTone(s.action);
  return t === "bull" ? "bull" : t === "neutral" ? "neutral" : "bear";
};

export function Dashboard() {
  const [mode, setMode] = useState<Mode>("daily");
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("signal");
  const [query, setQuery] = useState("");
  const chartRef = useRef<HTMLElement>(null);

  const { data, error, isLoading, isValidating, mutate } = useSWR(`/api/signals?mode=${mode}`, fetcher, {
    refreshInterval: REFRESH_MS,
    revalidateOnFocus: true,
  });

  const signals = useMemo(() => data?.signals ?? [], [data]);
  const nextUpdateAt = signals[0]?.nextUpdateAt;

  // Signals only change when a candle closes, so refresh right after each close.
  useEffect(() => {
    if (!nextUpdateAt) return;
    const wait = nextUpdateAt - Date.now() + 5_000;
    if (wait <= 0) return;
    const id = setTimeout(() => mutate(), wait);
    return () => clearTimeout(id);
  }, [nextUpdateAt, mutate]);
  const counts = signals.reduce(
    (acc, s) => {
      acc[filterTone(s)]++;
      return acc;
    },
    { bull: 0, bear: 0, neutral: 0 },
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    // signals arrive in market-cap order, so the index doubles as rank
    const ranked = signals.map((s, rank) => ({ s, rank }));
    return ranked
      .filter(({ s }) => filter === "all" || filterTone(s) === filter)
      .filter(({ s }) => !q || s.base.toLowerCase().includes(q) || s.name.toLowerCase().includes(q))
      .sort((a, b) => {
        if (sort === "change") return b.s.change24h - a.s.change24h;
        if (sort === "signal") {
          const tone = TONE_ORDER[actionTone(a.s.action)] - TONE_ORDER[actionTone(b.s.action)];
          if (tone !== 0) return tone;
          const checks = passedCount(b.s) - passedCount(a.s);
          if (checks !== 0) return checks;
        }
        return a.rank - b.rank;
      })
      .map(({ s }) => s);
  }, [signals, filter, sort, query]);

  const active = signals.find((s) => s.symbol === selected) ?? visible[0] ?? signals[0];

  const select = (symbol: string) => {
    setSelected(symbol);
    chartRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const FILTERS: { value: Filter; label: string; count: number; cls: string }[] = [
    { value: "all", label: "All", count: signals.length, cls: "text-zinc-200" },
    { value: "bull", label: "Bullish", count: counts.bull, cls: "text-emerald-400" },
    { value: "neutral", label: "Neutral", count: counts.neutral, cls: "text-zinc-400" },
    { value: "bear", label: "Bearish", count: counts.bear, cls: "text-rose-400" },
  ];

  return (
    <div className="min-h-screen bg-[#07090d] text-zinc-200">
      <Header
        mode={mode}
        onModeChange={setMode}
        updatedAt={data?.updatedAt}
        refreshing={isValidating}
        onRefresh={() => mutate()}
      />

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        {error && !data && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
            Could not load signals: {(error as Error).message}
          </div>
        )}
        {data?.errors.length ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
            Some pairs failed: {data.errors.map((e) => e.symbol).join(", ")}
          </div>
        ) : null}

        {/* Chart */}
        {active && (
          <section ref={chartRef} className="grid scroll-mt-24 gap-4 lg:grid-cols-[1fr_280px]">
            <div className="space-y-3">
              <div className="flex flex-wrap items-baseline gap-3">
                <h3 className="text-lg font-semibold text-white">
                  {active.base}/{active.quote}
                </h3>
                <span className="text-sm text-zinc-500">
                  {active.name} · {active.interval} candles · {active.mode === "daily" ? "VWAP overlay" : "EMA 20/50 overlay"}
                </span>
              </div>
              <PriceChart key={`${active.mode}-${active.symbol}`} signal={active} />
            </div>

            <aside className="space-y-3 rounded-2xl border border-white/5 bg-white/[0.03] p-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Signal</span>
                <span className={`rounded-md px-2 py-0.5 font-semibold ring-1 ${TONE_CLASSES[actionTone(active.action)].badge}`}>
                  {active.action}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Price</span>
                <span className="font-mono tabular-nums">${formatPrice(active.price)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Triggered</span>
                <TimeAgo timestamp={active.generatedAt} />
              </div>
              <div className="border-t border-white/5 pt-3">
                <p className="mb-2 text-xs uppercase tracking-wide text-zinc-500">Indicators (last closed bar)</p>
                <dl className="space-y-1.5">
                  {Object.entries(active.indicators).map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <dt className="text-zinc-400">{k}</dt>
                      <dd className="font-mono tabular-nums">
                        {k.startsWith("RSI") ? formatNumber(v, 1) : k.startsWith("MACD") ? formatNumber(v, 6) : formatPrice(v)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </aside>
          </section>
        )}

        {/* Toolbar */}
        <section className="flex flex-wrap items-center gap-3">
          <h2 className="mr-2 text-lg font-semibold text-white">
            {mode === "daily" ? "Intraday momentum" : "Swing trend"} signals
          </h2>
          {nextUpdateAt && (
            <span className="text-xs text-zinc-500" title="Signals and levels only change when a candle closes">
              Next {data?.interval} candle close in <Countdown to={nextUpdateAt} />
            </span>
          )}
          <div className="flex rounded-lg bg-white/5 p-0.5 ring-1 ring-white/10">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`rounded-md px-3 py-1 text-xs transition ${
                  filter === f.value ? "bg-white/10 ring-1 ring-white/15" : "hover:bg-white/5"
                } ${f.cls}`}
              >
                {f.label} <span className="opacity-60">{f.count}</span>
              </button>
            ))}
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search coin…"
              className="w-40 rounded-lg bg-white/5 px-3 py-1.5 text-xs text-zinc-200 ring-1 ring-white/10 outline-none placeholder:text-zinc-600 focus:ring-sky-500/50"
            />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              className="rounded-lg bg-white/5 px-2 py-1.5 text-xs text-zinc-200 ring-1 ring-white/10 outline-none"
            >
              <option value="signal">Sort: Signal (bullish first)</option>
              <option value="rank">Sort: Market cap</option>
              <option value="change">Sort: 24h change</option>
            </select>
          </div>
        </section>

        {/* Cards */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {isLoading && !data
            ? Array.from({ length: 8 }, (_, i) => (
                <div key={i} className="h-[420px] animate-pulse rounded-2xl bg-white/[0.03]" />
              ))
            : visible.map((s) => (
                <SignalCard
                  key={`${s.mode}-${s.symbol}`}
                  signal={s}
                  selected={active?.symbol === s.symbol}
                  onSelect={() => select(s.symbol)}
                />
              ))}
          {data && visible.length === 0 && (
            <p className="col-span-full py-10 text-center text-sm text-zinc-500">No coins match this filter.</p>
          )}
        </section>

        <footer className="pt-4 text-center text-xs text-zinc-600">
          Data: Binance public API. Signals are algorithmic and for educational purposes only — not financial advice.
        </footer>
      </main>
    </div>
  );
}
