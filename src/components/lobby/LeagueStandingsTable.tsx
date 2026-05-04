"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { LeagueStandingRow } from "@/types/database";

const FORM_COLOR: Record<string, string> = {
  W: "bg-green-500 text-white",
  D: "bg-zinc-600 text-white",
  L: "bg-red-500 text-white",
};

function FormPill({ char }: { char: string }) {
  return (
    <span
      className={`inline-flex h-[18px] w-[18px] items-center justify-center rounded-full text-[9px] font-black ${FORM_COLOR[char] ?? "bg-zinc-700 text-zinc-400"}`}
      aria-label={char}
    >
      {char}
    </span>
  );
}

export function LeagueStandingsTable({ leagueApiId }: { leagueApiId: number }) {
  const [standings, setStandings] = useState<LeagueStandingRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function load() {
      setLoading(true);
      const { data } = await supabase
        .from("league_standings")
        .select("*")
        .eq("league_id", leagueApiId)
        .order("season", { ascending: false })
        .order("rank", { ascending: true });

      if (cancelled) return;

      const maxSeason = data?.[0]?.season ?? 0;
      setStandings((data ?? []).filter((s) => s.season === maxSeason));
      setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [leagueApiId]);

  if (loading) {
    return (
      <div className="py-10 text-center text-sm text-zinc-500">
        Chargement du classement…
      </div>
    );
  }

  if (standings.length === 0) {
    return (
      <div className="rounded-2xl border border-white/8 bg-zinc-900/50 px-4 py-10 text-center">
        <p className="text-sm font-bold text-zinc-400">Classement non disponible</p>
        <p className="mt-1 text-xs text-zinc-600">
          Lance{" "}
          <code className="rounded bg-zinc-800 px-1 py-0.5 font-mono text-zinc-400">
            npx tsx scripts/import-league-history.ts {leagueApiId}
          </code>
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/8 bg-zinc-900/50">
      {/* En-tête */}
      <div className="grid grid-cols-[1.75rem_1fr_2.5rem_2.5rem_2.5rem_auto] items-center gap-x-1 border-b border-white/8 px-3 py-2.5">
        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">#</span>
        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Équipe</span>
        <span className="text-center text-[10px] font-black uppercase tracking-widest text-zinc-600">J</span>
        <span className="text-center text-[10px] font-black uppercase tracking-widest text-zinc-600">+/-</span>
        <span className="text-center text-[10px] font-black uppercase tracking-widest text-whistle">Pts</span>
        <span className="hidden text-center text-[10px] font-black uppercase tracking-widest text-zinc-600 sm:block">
          Forme
        </span>
      </div>

      {/* Lignes */}
      {standings.map((s, idx) => {
        const formChars = (s.form ?? "").split("").slice(-5);
        return (
          <div
            key={s.id}
            className={`grid grid-cols-[1.75rem_1fr_2.5rem_2.5rem_2.5rem_auto] items-center gap-x-1 px-3 py-2.5 transition-colors hover:bg-white/[0.03] ${
              idx < standings.length - 1 ? "border-b border-white/[0.06]" : ""
            }`}
          >
            <span className="text-xs font-bold text-zinc-500">{s.rank}</span>
            <div className="flex min-w-0 items-center gap-2">
              {s.team_logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={s.team_logo}
                  alt={s.team_name}
                  className="h-5 w-5 shrink-0 object-contain"
                />
              ) : (
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-zinc-800 text-[8px] text-zinc-600">
                  ⚽
                </span>
              )}
              <span className="truncate text-xs font-bold text-white">{s.team_name}</span>
            </div>
            <span className="text-center text-xs text-zinc-400">{s.played}</span>
            <span
              className={`text-center text-xs font-semibold tabular-nums ${
                s.goals_diff > 0
                  ? "text-green-400"
                  : s.goals_diff < 0
                    ? "text-red-400"
                    : "text-zinc-500"
              }`}
            >
              {s.goals_diff > 0 ? `+${s.goals_diff}` : String(s.goals_diff)}
            </span>
            <span className="text-center text-sm font-black tabular-nums text-whistle">
              {s.points}
            </span>
            <div className="hidden items-center justify-end gap-0.5 sm:flex">
              {formChars.map((c, i) => (
                <FormPill key={i} char={c} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
