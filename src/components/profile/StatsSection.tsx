"use client";

import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Stats = {
  pronos_total: number;
  pronos_correct: number;
  pronos_exact: number;
  var_bets_total: number;
  var_bets_won: number;
  points_total: number;
  best_win: number;
};

type SeasonItem = { id: string; label: string; is_current: boolean };

type Props = {
  favoriteTeamId?: string | null;
  favoriteTeamName?: string | null;
};

function WinRateBar({ rate }: { rate: number }) {
  const color =
    rate >= 60 ? "bg-green-500" : rate >= 40 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
      <div
        className={`h-full rounded-full transition-all duration-700 ${color}`}
        style={{ width: `${rate}%` }}
      />
    </div>
  );
}

export function StatsSection({ favoriteTeamId, favoriteTeamName }: Props) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [seasons, setSeasons] = useState<SeasonItem[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<string | null>(null);
  const [clubFilter, setClubFilter] = useState(false);

  // Fetch seasons list once
  useEffect(() => {
    const supabase = createClient();
    void supabase
      .from("seasons")
      .select("id, label, is_current")
      .order("starts_at", { ascending: false })
      .limit(6)
      .then(({ data }) => {
        if (data) setTimeout(() => setSeasons(data), 0);
      });
  }, []);

  // Fetch stats on filter change
  useEffect(() => {
    let cancelled = false;
    setTimeout(() => setLoading(true), 0);

    const supabase = createClient();
    void supabase
      .rpc("get_my_stats", {
        p_season_id: selectedSeason ?? null,
        p_team_id: clubFilter && favoriteTeamId ? favoriteTeamId : null,
        p_competition_id: null,
      })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (!error && data?.[0]) {
          const row = data[0];
          setTimeout(
            () =>
              setStats({
                pronos_total: Number(row.pronos_total),
                pronos_correct: Number(row.pronos_correct),
                pronos_exact: Number(row.pronos_exact),
                var_bets_total: Number(row.var_bets_total),
                var_bets_won: Number(row.var_bets_won),
                points_total: Math.round(Number(row.points_total)),
                best_win: Math.round(Number(row.best_win)),
              }),
            0,
          );
        }
        setTimeout(() => setLoading(false), 0);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedSeason, clubFilter, favoriteTeamId]);

  const pronoWinRate =
    stats && stats.pronos_total > 0
      ? Math.round((stats.pronos_correct / stats.pronos_total) * 100)
      : 0;
  const varWinRate =
    stats && stats.var_bets_total > 0
      ? Math.round((stats.var_bets_won / stats.var_bets_total) * 100)
      : 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Filters */}
      <div className="space-y-2">
        {/* Season chips */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSelectedSeason(null)}
            className={`rounded-xl px-3 py-1.5 text-[11px] font-black transition ${
              selectedSeason === null
                ? "bg-whistle text-zinc-950"
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
            }`}
          >
            Tout temps
          </button>
          {seasons.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSelectedSeason(s.id)}
              className={`rounded-xl px-3 py-1.5 text-[11px] font-black transition ${
                selectedSeason === s.id
                  ? "bg-whistle text-zinc-950"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              }`}
            >
              {s.label}
              {s.is_current && (
                <span className="ml-1 rounded-full bg-green-500/30 px-1 text-[9px] text-green-400">
                  EN COURS
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Club toggle */}
        {favoriteTeamId && favoriteTeamName && (
          <button
            type="button"
            onClick={() => setClubFilter((v) => !v)}
            className={`rounded-xl px-3 py-1.5 text-[11px] font-black transition ${
              clubFilter
                ? "bg-amber-500/20 border border-amber-500/40 text-amber-400"
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
            }`}
          >
            ⚽ Mon club : {favoriteTeamName}
          </button>
        )}
      </div>

      {/* Stats display */}
      {loading ? (
        <div className="flex justify-center py-8">
          <LoaderCircle className="h-6 w-6 animate-spin text-zinc-600" />
        </div>
      ) : !stats ? (
        <p className="py-8 text-center text-sm text-zinc-500">
          Aucune donnée pour ces filtres.
        </p>
      ) : (
        <div className="space-y-4">
          {/* Points hero */}
          <div className="rounded-2xl border border-green-500/20 bg-green-500/8 p-4 text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-green-500/60">
              Points gagnés
            </p>
            <p className="mt-1 text-4xl font-black tabular-nums text-green-400">
              +{stats.points_total.toLocaleString("fr-FR")}
            </p>
            {stats.best_win > 0 && (
              <p className="mt-1 text-xs text-zinc-500">
                Plus gros gain : +{stats.best_win.toLocaleString("fr-FR")} Points
              </p>
            )}
          </div>

          {/* Pronos section */}
          <div className="rounded-2xl border border-white/8 bg-zinc-900 p-4">
            <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-zinc-500">
              🎯 Pronos
            </p>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-2xl font-black tabular-nums text-white">
                  {stats.pronos_total}
                </p>
                <p className="text-[9px] uppercase text-zinc-500">Total</p>
              </div>
              <div>
                <p className="text-2xl font-black tabular-nums text-green-400">
                  {stats.pronos_correct}
                </p>
                <p className="text-[9px] uppercase text-zinc-500">Corrects</p>
              </div>
              <div>
                <p className="text-2xl font-black tabular-nums text-amber-400">
                  {stats.pronos_exact}
                </p>
                <p className="text-[9px] uppercase text-zinc-500">Exacts</p>
              </div>
            </div>
            {stats.pronos_total > 0 && (
              <div className="mt-3">
                <div className="flex justify-between text-[10px] text-zinc-500">
                  <span>Win rate</span>
                  <span
                    className={
                      pronoWinRate >= 60
                        ? "text-green-400"
                        : pronoWinRate >= 40
                          ? "text-amber-400"
                          : "text-red-400"
                    }
                  >
                    {pronoWinRate}%
                  </span>
                </div>
                <WinRateBar rate={pronoWinRate} />
              </div>
            )}
          </div>

          {/* VAR bets section */}
          <div className="rounded-2xl border border-white/8 bg-zinc-900 p-4">
            <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-zinc-500">
              ⚡ Paris VAR
            </p>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div>
                <p className="text-2xl font-black tabular-nums text-white">
                  {stats.var_bets_total}
                </p>
                <p className="text-[9px] uppercase text-zinc-500">Total</p>
              </div>
              <div>
                <p className="text-2xl font-black tabular-nums text-blue-400">
                  {stats.var_bets_won}
                </p>
                <p className="text-[9px] uppercase text-zinc-500">Gagnés</p>
              </div>
            </div>
            {stats.var_bets_total > 0 && (
              <div className="mt-3">
                <div className="flex justify-between text-[10px] text-zinc-500">
                  <span>Win rate VAR</span>
                  <span
                    className={
                      varWinRate >= 60
                        ? "text-green-400"
                        : varWinRate >= 40
                          ? "text-amber-400"
                          : "text-red-400"
                    }
                  >
                    {varWinRate}%
                  </span>
                </div>
                <WinRateBar rate={varWinRate} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
