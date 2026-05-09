import { Shield, Target, TrendingUp, Trophy, Zap } from "lucide-react";
import { getMinBetForBalance } from "@/lib/economy/min-bet";
import { SeasonBadge } from "@/components/shared/SeasonBadge";
import type { SeasonArchiveRow } from "@/types/database";

type Props = {
  winRate: number;
  totalBets: number;
  totalEarned: number;
  bestStreak: number;
  totalMatchesPronoed: number;
  scoreAccuracy: number | null;
  headerBalance?: number;
  isModerateur: boolean;
  refillContent: React.ReactNode;
  currentSeason?: { label: string; endsAt: string } | null;
  seasonArchives: SeasonArchiveRow[];
};

export function ProfileOverview({
  winRate,
  totalBets,
  totalEarned,
  bestStreak,
  totalMatchesPronoed,
  scoreAccuracy,
  headerBalance,
  isModerateur,
  refillContent,
  currentSeason,
  seasonArchives,
}: Props) {
  const winRateColor =
    winRate >= 60
      ? "text-green-400"
      : winRate >= 40
        ? "text-amber-400"
        : "text-red-400";
  const winRateGrad =
    winRate >= 60
      ? "from-green-500/15 to-green-500/5 border-green-500/20"
      : winRate >= 40
        ? "from-amber-500/15 to-amber-500/5 border-amber-500/20"
        : "from-red-500/15 to-red-500/5 border-red-500/20";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-3">
        <div
          className={`flex-1 rounded-2xl border bg-gradient-to-br p-4 ${winRateGrad}`}
        >
          <p className={`text-4xl font-black tabular-nums ${winRateColor}`}>
            {winRate}%
          </p>
          <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-green-500/60">
            Win Rate
          </p>
        </div>
        <div className="flex-1 rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/15 to-amber-500/5 p-4">
          <p className="text-4xl font-black tabular-nums text-amber-400">
            {totalEarned.toLocaleString("fr-FR")}
          </p>
          <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-amber-500/60">
            Points Gagnés
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/8 bg-zinc-900">
        <div className="flex divide-x divide-white/8">
          <div className="flex flex-1 flex-col items-center gap-1 px-3 py-4">
            <Trophy className="h-4 w-4 text-zinc-500" />
            <p className="text-base font-black text-white">{totalBets}</p>
            <p className="text-center text-[10px] font-semibold text-zinc-500">
              Paris
            </p>
          </div>
          <div className="flex flex-1 flex-col items-center gap-1 px-3 py-4">
            <Zap className="h-4 w-4 text-zinc-500" />
            <p className="text-base font-black text-white">{bestStreak}</p>
            <p className="text-center text-[10px] font-semibold text-zinc-500">
              Série max
            </p>
          </div>
          <div className="flex flex-1 flex-col items-center gap-1 px-3 py-4">
            <Target className="h-4 w-4 text-zinc-500" />
            <p className="text-base font-black text-white">
              {totalMatchesPronoed}
            </p>
            <p className="text-center text-[10px] font-semibold text-zinc-500">
              Matchs
            </p>
          </div>
        </div>
      </div>

      {scoreAccuracy !== null && (
        <div className="overflow-hidden rounded-2xl border border-white/8 bg-zinc-900">
          <div className="border-b border-white/5 px-5 py-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
              Mon arbitrage
            </p>
          </div>
          <div className="flex divide-x divide-white/5">
            <div className="flex flex-1 flex-col items-center gap-1 px-3 py-4">
              <Target className="h-4 w-4 text-zinc-500" />
              <p className="text-base font-black text-white">
                {scoreAccuracy}%
              </p>
              <p className="text-center text-[10px] font-semibold text-zinc-500">
                Scores exacts
              </p>
            </div>
            <div className="flex flex-1 flex-col items-center gap-1 px-3 py-4">
              <TrendingUp className="h-4 w-4 text-zinc-500" />
              <p className="text-base font-black text-white">{bestStreak}</p>
              <p className="text-center text-[10px] font-semibold text-zinc-500">
                Meilleure série
              </p>
            </div>
          </div>
        </div>
      )}

      {headerBalance !== undefined && (
        <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-zinc-900 px-5 py-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
              Mise minimum
            </p>
            <p className="mt-1 text-base font-black text-amber-400">
              {getMinBetForBalance(headerBalance).toLocaleString("fr-FR")} 🪙
            </p>
          </div>
          <span className="text-2xl" aria-hidden>
            🎚️
          </span>
        </div>
      )}

      {refillContent}

      {currentSeason && (
        <SeasonBadge
          label={currentSeason.label}
          endsAt={currentSeason.endsAt}
        />
      )}

      {seasonArchives.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-white/8 bg-zinc-900">
          <div className="border-b border-white/5 px-5 py-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
              🏅 Mes saisons
            </p>
          </div>
          <div className="flex flex-col divide-y divide-white/5">
            {seasonArchives.slice(0, 3).map((sa) => {
              const trophy =
                sa.final_rank === 1
                  ? "🥇"
                  : sa.final_rank_label === "Top 3"
                    ? "🥈"
                    : sa.final_rank_label === "Top 10"
                      ? "🥉"
                      : "🎖️";
              return (
                <div
                  key={sa.season_id}
                  className="flex items-center gap-3 px-5 py-3"
                >
                  <span className="text-xl">{trophy}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black text-white">
                      {sa.final_rank_label}
                    </p>
                    <p className="text-[10px] text-zinc-500">
                      #{sa.final_rank} ·{" "}
                      {sa.final_points.toLocaleString("fr-FR")} Points
                    </p>
                  </div>
                  <p className="text-[10px] text-zinc-600">
                    {new Date(sa.archived_at).toLocaleDateString("fr-FR", {
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isModerateur && (
        <div className="flex items-center gap-2 rounded-xl border border-yellow-500/20 bg-yellow-500/5 px-4 py-2.5">
          <Shield className="h-4 w-4 shrink-0 text-yellow-400" />
          <p className="text-xs font-bold text-yellow-400">
            Accès Modérateur activé — tu peux forcer les résultats VAR
          </p>
        </div>
      )}
    </div>
  );
}
