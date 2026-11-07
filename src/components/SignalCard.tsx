"use client";

import { actionTone, formatPct, formatPrice, TONE_CLASSES } from "@/lib/format";
import type { Signal } from "@/lib/types";
import { TimeAgo } from "./TimeAgo";

interface SignalCardProps {
  signal: Signal;
  selected: boolean;
  onSelect: () => void;
}

const pctFrom = (from: number, to: number) => ((to - from) / from) * 100;

export function SignalCard({ signal, selected, onSelect }: SignalCardProps) {
  const tone = TONE_CLASSES[actionTone(signal.action)];
  const { levels } = signal;
  const entryMid = levels ? (levels.entryLow + levels.entryHigh) / 2 : signal.price;
  const directionLabel = signal.direction === "long" ? "Buy" : signal.direction === "short" ? "Sell" : "No trade";

  return (
    <button
      onClick={onSelect}
      aria-pressed={selected}
      className={`group flex w-full flex-col gap-4 rounded-2xl border border-white/5 bg-white/[0.03] p-4 text-left transition hover:border-white/15 hover:bg-white/[0.05] ${
        selected ? `ring-2 ${tone.ring}` : ""
      }`}
    >
      {/* Ticker + price */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-semibold text-white">{signal.base}</span>
            <span className="text-xs text-zinc-500">/{signal.quote}</span>
          </div>
          <span className="text-xs text-zinc-500">{signal.name}</span>
        </div>
        <div className="text-right">
          <div className="font-mono text-lg tabular-nums text-white">${formatPrice(signal.price)}</div>
          <div className={`font-mono text-xs tabular-nums ${signal.change24h >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {formatPct(signal.change24h)} 24h
          </div>
        </div>
      </div>

      {/* Signal badge */}
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-md px-2.5 py-1 text-sm font-semibold ring-1 ${tone.badge}`}>{signal.action}</span>
        <span className="rounded-md bg-white/5 px-2 py-1 text-[11px] uppercase tracking-wide text-zinc-400">
          {signal.mode} · {signal.interval}
        </span>
        <span className={`text-xs font-medium ${tone.text}`}>{directionLabel}</span>
        {!signal.fresh && signal.direction !== "flat" && (
          <span className="rounded bg-zinc-500/15 px-1.5 py-0.5 text-[10px] text-zinc-400" title="Trigger is older than the freshness window">
            mature
          </span>
        )}
      </div>

      {/* Levels */}
      {levels ? (
        <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
          <div className="col-span-2 rounded-lg bg-sky-500/10 px-2.5 py-1.5 ring-1 ring-sky-500/20">
            <dt className="text-sky-300/80">Entry zone</dt>
            <dd className="font-mono tabular-nums text-sky-200">
              {formatPrice(levels.entryLow)} – {formatPrice(levels.entryHigh)}
            </dd>
          </div>
          {levels.takeProfits.map((tp) => (
            <div key={tp.label} className="rounded-lg bg-emerald-500/10 px-2.5 py-1.5 ring-1 ring-emerald-500/20">
              <dt className="text-emerald-300/80">
                {tp.label} <span className="text-emerald-300/50">1:{tp.rr}</span>
              </dt>
              <dd className="font-mono tabular-nums text-emerald-200">
                {formatPrice(tp.price)} <span className="text-emerald-300/50">{formatPct(pctFrom(entryMid, tp.price))}</span>
              </dd>
            </div>
          ))}
          <div className="col-span-2 rounded-lg bg-rose-500/10 px-2.5 py-1.5 ring-1 ring-rose-500/20">
            <dt className="text-rose-300/80">Stop loss</dt>
            <dd className="font-mono tabular-nums text-rose-200">
              {formatPrice(levels.stopLoss)}{" "}
              <span className="text-rose-300/50">{formatPct(pctFrom(entryMid, levels.stopLoss))}</span>
            </dd>
          </div>
        </dl>
      ) : (
        <div className="rounded-lg border border-dashed border-white/10 px-3 py-6 text-center text-xs text-zinc-500">
          Waiting for confluence — no active setup.
        </div>
      )}

      {/* Checks */}
      <ul className="space-y-1 text-[11px]">
        {signal.checks.map((c) => (
          <li key={c.label} className={`flex items-center gap-1.5 ${c.passed ? "text-zinc-300" : "text-zinc-600"}`}>
            <span className={c.passed ? "text-emerald-400" : "text-zinc-600"}>{c.passed ? "✓" : "○"}</span>
            {c.label}
          </li>
        ))}
      </ul>

      <div className="mt-auto flex items-center justify-between border-t border-white/5 pt-3 text-[11px] text-zinc-500">
        <span>
          Signal <TimeAgo timestamp={signal.generatedAt} />
        </span>
        <span className="text-zinc-600 transition group-hover:text-zinc-300">View chart →</span>
      </div>
    </button>
  );
}
