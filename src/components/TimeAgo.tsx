"use client";

import { useEffect, useState } from "react";
import { formatAgo } from "@/lib/format";

/** Live "x minutes ago" label. Renders only on the client to avoid hydration mismatch. */
export function TimeAgo({ timestamp }: { timestamp: number }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(id);
  }, []);

  return (
    <time dateTime={new Date(timestamp).toISOString()} title={new Date(timestamp).toLocaleString()} suppressHydrationWarning>
      {now === null ? "…" : formatAgo(now - timestamp)}
    </time>
  );
}

/** Live countdown to a future timestamp, e.g. "23m 10s". */
export function Countdown({ to }: { to: number }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(id);
  }, []);

  if (now === null) return <span>…</span>;
  const s = Math.max(0, Math.floor((to - now) / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const text = s === 0 ? "now" : h > 0 ? `${h}h ${m}m` : `${m}m ${String(s % 60).padStart(2, "0")}s`;
  return <span className="font-mono tabular-nums">{text}</span>;
}
