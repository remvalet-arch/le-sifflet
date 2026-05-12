"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";

type Outcome = "1" | "N" | "2";

type Distribution = {
  home_win_pct: number;
  draw_pct: number;
  away_win_pct: number;
  avg_home_score: number | null;
  avg_away_score: number | null;
  total_predictions: number;
  user_vote: Outcome | null;
};

type Scope = "my-leagues" | "global";

export function PredictionDistribution({
  matchId,
  teamHome,
  teamAway,
}: {
  matchId: string;
  teamHome: string;
  teamAway: string;
}) {
  const t = useTranslations("PredictionDistribution");
  const [scope, setScope] = useState<Scope>("my-leagues");
  const [data, setData] = useState<Distribution | null>(null);
  const [loading, setLoading] = useState(true);
  const [animated, setAnimated] = useState(false);

  const fetchDistribution = useCallback(
    async (s: Scope) => {
      setLoading(true);
      setAnimated(false);
      try {
        const res = await fetch(
          `/api/matches/${matchId}/predictions/distribution?scope=${s}`,
        );
        const json = (await res.json()) as {
          ok: boolean;
          data?: Distribution;
        };
        if (json.ok && json.data) {
          setData(json.data);
        }
      } finally {
        setLoading(false);
        setTimeout(() => setAnimated(true), 0);
      }
    },
    [matchId],
  );

  useEffect(() => {
    const id = setTimeout(() => {
      void fetchDistribution(scope);
    }, 0);
    return () => clearTimeout(id);
  }, [scope, fetchDistribution]);

  // Realtime: refetch on new prono
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`pronos-dist-${matchId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "pronos",
          filter: `match_id=eq.${matchId}`,
        },
        () => {
          void fetchDistribution(scope);
        },
      )
      .subscribe();
    return () => {
      void channel.unsubscribe();
    };
  }, [matchId, scope, fetchDistribution]);

  const isEmpty = !loading && (!data || data.total_predictions === 0);

  return (
    <div className="rounded-2xl border border-white/8 bg-zinc-900/60 p-4">
      {/* Header + scope toggle */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
          {t("title")}
        </h3>
        <div className="flex items-center gap-1 rounded-xl border border-white/8 bg-zinc-800 p-0.5">
          <button
            type="button"
            onClick={() => setScope("my-leagues")}
            className={`rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-wide transition-colors ${
              scope === "my-leagues"
                ? "bg-yellow-400 text-zinc-900"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            {t("scopeLeagues")}
          </button>
          <button
            type="button"
            onClick={() => setScope("global")}
            className={`rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-wide transition-colors ${
              scope === "global"
                ? "bg-yellow-400 text-zinc-900"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            {t("scopeGlobal")}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse">
          <div className="h-8 rounded-xl bg-zinc-800" />
          <div className="mt-3 flex justify-between">
            <div className="h-3 w-16 rounded bg-zinc-800" />
            <div className="h-3 w-10 rounded bg-zinc-800" />
            <div className="h-3 w-16 rounded bg-zinc-800" />
          </div>
        </div>
      ) : isEmpty ? (
        <p className="py-4 text-center text-xs text-zinc-500">{t("empty")}</p>
      ) : (
        <>
          {/* Labels */}
          <div className="mb-1.5 flex items-end justify-between text-[10px] font-bold">
            <span className="text-emerald-400">
              {teamHome} {data!.home_win_pct}%
              {data!.user_vote === "1" && (
                <span className="ml-1 text-yellow-400">⚡</span>
              )}
            </span>
            <span className="text-zinc-400">
              N {data!.draw_pct}%
              {data!.user_vote === "N" && (
                <span className="ml-1 text-yellow-400">⚡</span>
              )}
            </span>
            <span className="text-rose-400">
              {data!.away_win_pct}% {teamAway}
              {data!.user_vote === "2" && (
                <span className="ml-1 text-yellow-400">⚡</span>
              )}
            </span>
          </div>

          {/* Segmented bar */}
          <div className="flex h-8 overflow-hidden rounded-xl">
            <div
              className="flex items-center justify-center bg-emerald-600 transition-all duration-700 ease-out"
              style={{
                width: animated ? `${data!.home_win_pct}%` : "0%",
              }}
            >
              {data!.home_win_pct >= 15 && (
                <span className="text-[10px] font-black text-white">
                  {data!.home_win_pct}%
                </span>
              )}
            </div>
            <div
              className="flex items-center justify-center bg-zinc-600 transition-all duration-700 ease-out"
              style={{
                width: animated ? `${data!.draw_pct}%` : "0%",
              }}
            >
              {data!.draw_pct >= 15 && (
                <span className="text-[10px] font-black text-zinc-200">N</span>
              )}
            </div>
            <div
              className="flex items-center justify-center bg-rose-600 transition-all duration-700 ease-out"
              style={{
                width: animated ? `${data!.away_win_pct}%` : "0%",
              }}
            >
              {data!.away_win_pct >= 15 && (
                <span className="text-[10px] font-black text-white">
                  {data!.away_win_pct}%
                </span>
              )}
            </div>
          </div>

          {/* Average score + total */}
          <div className="mt-2.5 flex items-center justify-between">
            {data!.avg_home_score !== null && data!.avg_away_score !== null ? (
              <p className="text-[10px] text-zinc-500">
                {t("avgScore")}{" "}
                <span className="font-bold text-zinc-300">
                  {data!.avg_home_score} – {data!.avg_away_score}
                </span>
              </p>
            ) : (
              <span />
            )}
            <p className="text-[10px] text-zinc-600">
              {data!.total_predictions}{" "}
              {data!.total_predictions > 1 ? t("pronos") : t("prono")}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
