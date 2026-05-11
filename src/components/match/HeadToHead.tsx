"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import type { H2HResult } from "@/app/api/matches/[id]/h2h/route";

export function HeadToHead({
  matchId,
  teamHome,
}: {
  matchId: string;
  teamHome: string;
  teamAway?: string;
}) {
  const t = useTranslations("HeadToHead");
  const [results, setResults] = useState<H2HResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/matches/${matchId}/h2h`)
      .then((r) => r.json())
      .then((json: { ok: boolean; data?: { results: H2HResult[] } }) => {
        if (json.ok && json.data) setResults(json.data.results);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [matchId]);

  if (loading) {
    return (
      <div className="mt-4 animate-pulse rounded-2xl border border-white/8 bg-zinc-900 p-4">
        <div className="mb-3 h-3 w-24 rounded bg-zinc-800" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="mt-2 flex items-center justify-between gap-2">
            <div className="h-3 w-20 rounded bg-zinc-800" />
            <div className="h-5 w-10 rounded-lg bg-zinc-800" />
            <div className="h-3 w-20 rounded bg-zinc-800" />
          </div>
        ))}
      </div>
    );
  }

  if (results.length === 0) return null;

  return (
    <div className="mt-4 rounded-2xl border border-white/8 bg-zinc-900 p-4">
      <h3 className="mb-3 text-[10px] font-black uppercase tracking-widest text-zinc-500">
        {t("title")}
      </h3>
      <div className="flex flex-col gap-2">
        {results.map((r, i) => {
          const homeIsOur = r.home_team
            .toLowerCase()
            .includes(teamHome.toLowerCase());
          const ourScore = homeIsOur ? r.home_score : r.away_score;
          const theirScore = homeIsOur ? r.away_score : r.home_score;
          const outcome =
            ourScore > theirScore ? "W" : ourScore < theirScore ? "L" : "D";
          const outcomeColor =
            outcome === "W"
              ? "text-emerald-400 bg-emerald-500/15"
              : outcome === "L"
                ? "text-rose-400 bg-rose-500/15"
                : "text-zinc-400 bg-zinc-700/60";

          return (
            <div
              key={i}
              className="flex items-center justify-between gap-2 rounded-xl border border-white/6 bg-zinc-800/50 px-3 py-2"
            >
              <span className="min-w-0 flex-1 truncate text-right text-[11px] text-zinc-300">
                {r.home_team}
              </span>
              <div className="flex shrink-0 items-center gap-1.5">
                <span
                  className={`min-w-[2.5rem] rounded-lg px-2 py-0.5 text-center text-[11px] font-black tabular-nums ${outcomeColor}`}
                >
                  {r.home_score} – {r.away_score}
                </span>
              </div>
              <span className="min-w-0 flex-1 truncate text-[11px] text-zinc-300">
                {r.away_team}
              </span>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-right text-[9px] text-zinc-600">{t("source")}</p>
    </div>
  );
}
