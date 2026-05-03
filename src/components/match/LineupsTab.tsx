"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { LineupRow } from "@/types/database";

const POSITION_ORDER: Record<string, number> = { G: 0, D: 1, M: 2, A: 3 };

type Props = { matchId: string; teamHome: string; teamAway: string };

export function LineupsTab({ matchId, teamHome, teamAway }: Props) {
  const [lineups, setLineups] = useState<LineupRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    void supabase
      .from("lineups")
      .select("*")
      .eq("match_id", matchId)
      .then(({ data }) => {
        setLineups(data ?? []);
        setLoading(false);
      });
  }, [matchId]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-green-500 border-t-transparent" />
      </div>
    );
  }

  const homeStarters = lineups
    .filter((p) => p.team_side === "home" && p.status === "starter")
    .sort(
      (a, b) =>
        (POSITION_ORDER[a.position] ?? 9) - (POSITION_ORDER[b.position] ?? 9),
    );
  const awayStarters = lineups
    .filter((p) => p.team_side === "away" && p.status === "starter")
    .sort(
      (a, b) =>
        (POSITION_ORDER[a.position] ?? 9) - (POSITION_ORDER[b.position] ?? 9),
    );
  const bench = lineups.filter((p) => p.status === "bench");

  if (lineups.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-zinc-500">
        Compositions non disponibles pour ce match.
      </p>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-white/10 bg-zinc-900 p-4">
          <p className="mb-3 text-xs font-black uppercase tracking-widest text-green-400">
            {teamHome}
          </p>
          <ul className="space-y-2">
            {homeStarters.map((p) => (
              <li key={p.id} className="flex items-center gap-2">
                <span
                  className="max-w-[38%] shrink-0 truncate text-left text-[10px] font-bold uppercase text-zinc-500"
                  title={p.position}
                >
                  {p.position}
                </span>
                <span className="text-sm font-semibold text-white">
                  {p.player_name}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-white/10 bg-zinc-900 p-4">
          <p className="mb-3 text-xs font-black uppercase tracking-widest text-green-400">
            {teamAway}
          </p>
          <ul className="space-y-2">
            {awayStarters.map((p) => (
              <li key={p.id} className="flex items-center gap-2">
                <span
                  className="max-w-[38%] shrink-0 truncate text-left text-[10px] font-bold uppercase text-zinc-500"
                  title={p.position}
                >
                  {p.position}
                </span>
                <span className="text-sm font-semibold text-white">
                  {p.player_name}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {bench.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-zinc-900 p-4">
          <p className="mb-3 text-xs font-black uppercase tracking-widest text-zinc-500">
            Remplaçants
          </p>
          <div className="flex flex-wrap gap-2">
            {bench.map((p) => (
              <span
                key={p.id}
                className="rounded-lg bg-zinc-800 px-2.5 py-1 text-xs font-semibold text-zinc-400"
              >
                {p.player_name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
