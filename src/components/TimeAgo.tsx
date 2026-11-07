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
