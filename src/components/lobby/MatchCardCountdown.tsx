"use client";

import { useState, useEffect } from "react";

function formatCountdown(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  if (h > 0) return `Dans ${String(h)}h ${String(m).padStart(2, "0")}`;
  if (m > 0) return `Dans ${String(m)} min`;
  return "Imminent";
}

export function MatchCardCountdown({ startTime }: { startTime: string }) {
  const [msLeft, setMsLeft] = useState(
    () => new Date(startTime).getTime() - Date.now(),
  );

  useEffect(() => {
    const id = setInterval(() => {
      setMsLeft(new Date(startTime).getTime() - Date.now());
    }, 30_000);
    return () => clearInterval(id);
  }, [startTime]);

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="relative flex size-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
      </span>
      <span className="text-[11px] font-black tabular-nums text-emerald-400">
        {formatCountdown(msLeft)}
      </span>
    </div>
  );
}
