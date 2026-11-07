"use client";

import type { Mode } from "@/lib/types";
import { TimeAgo } from "./TimeAgo";

interface HeaderProps {
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  updatedAt?: number;
  refreshing: boolean;
  onRefresh: () => void;
}

const MODES: { value: Mode; label: string; hint: string }[] = [
  { value: "daily", label: "Daily Signals", hint: "1H · VWAP / RSI / MACD" },
  { value: "swing", label: "Swing Signals", hint: "4H · EMA 20/50 / RSI" },
];

export function Header({ mode, onModeChange, updatedAt, refreshing, onRefresh }: HeaderProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-white/5 bg-[#07090d]/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-emerald-400 to-sky-500 font-bold text-black">
            ⟁
          </div>
          <div>
            <h1 className="text-base font-semibold tracking-tight text-white">SignalDesk</h1>
            <p className="text-xs text-zinc-500">Algorithmic crypto signals</p>
          </div>
        </div>

        <div role="tablist" aria-label="Signal type" className="flex rounded-xl bg-white/5 p-1 ring-1 ring-white/10">
          {MODES.map((m) => {
            const active = m.value === mode;
            return (
              <button
                key={m.value}
                role="tab"
                aria-selected={active}
                onClick={() => onModeChange(m.value)}
                className={`rounded-lg px-4 py-1.5 text-left transition ${
                  active ? "bg-white/10 text-white shadow ring-1 ring-white/15" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <span className="block text-sm font-medium">{m.label}</span>
                <span className="block text-[10px] text-zinc-500">{m.hint}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3 text-xs text-zinc-500">
          <span className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${refreshing ? "animate-pulse bg-amber-400" : "bg-emerald-400"}`} />
            {updatedAt ? <>Updated <TimeAgo timestamp={updatedAt} /></> : "Loading…"}
          </span>
          <button
            onClick={onRefresh}
            className="rounded-md px-2.5 py-1 text-zinc-300 ring-1 ring-white/10 transition hover:bg-white/5"
          >
            Refresh
          </button>
        </div>
      </div>
    </header>
  );
}
