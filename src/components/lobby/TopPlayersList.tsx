"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { LeagueTopPlayerRow } from "@/types/database";

export function TopPlayersList({
  leagueApiId,
  type,
}: {
  leagueApiId: number;
  type: "scorer" | "assist";
}) {
  const [players, setPlayers] = useState<LeagueTopPlayerRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function load() {
      setLoading(true);
      const { data } = await supabase
        .from("league_top_players")
        .select("*")
        .eq("league_id", leagueApiId)
        .eq("type", type)
        .order("season", { ascending: false })
        .order("rank", { ascending: true })
        .limit(20);

      if (cancelled) return;

      const maxSeason = data?.[0]?.season ?? 0;
      setPlayers((data ?? []).filter((p) => p.season === maxSeason));
      setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [leagueApiId, type]);

  const statLabel = type === "scorer" ? "but" : "passe";
  const emptyLabel = type === "scorer" ? "buteurs" : "passeurs";

  if (loading) {
    return (
      <div className="py-10 text-center text-sm text-zinc-500">
        Chargement des {emptyLabel}…
      </div>
    );
  }

  if (players.length === 0) {
    return (
      <div className="rounded-2xl border border-white/8 bg-zinc-900/50 px-4 py-10 text-center">
        <p className="text-sm font-bold text-zinc-400">
          Données {emptyLabel} non disponibles
        </p>
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
      {players.map((p, idx) => (
        <div
          key={p.id}
          className={`flex items-center gap-3 px-3 py-3 transition-colors hover:bg-white/[0.03] ${
            idx < players.length - 1 ? "border-b border-white/[0.06]" : ""
          }`}
        >
          {/* Rang */}
          <span className="w-5 shrink-0 text-center text-xs font-bold text-zinc-500">
            {p.rank}
          </span>

          {/* Photo joueur */}
          {p.player_photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={p.player_photo}
              alt={p.player_name}
              className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-white/10"
            />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-lg ring-1 ring-white/10">
              👤
            </div>
          )}

          {/* Nom + matchs joués */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-white">{p.player_name}</p>
            <p className="text-[11px] text-zinc-500">{p.played_matches} matchs</p>
          </div>

          {/* Logo équipe */}
          {p.team_logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={p.team_logo}
              alt=""
              aria-hidden
              className="h-6 w-6 shrink-0 object-contain opacity-80"
            />
          )}

          {/* Compteur */}
          <div className="shrink-0 text-right">
            <p className="text-xl font-black tabular-nums text-whistle">
              {p.goals_or_assists_count}
            </p>
            <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">
              {statLabel}s
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
