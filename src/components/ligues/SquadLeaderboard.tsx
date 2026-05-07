"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Trophy, Flame, LoaderCircle, PlayCircle } from "lucide-react";

type LeaderboardRow = {
  user_id: string;
  username: string;
  xp: number;
  pronos_xp: number;
  var_xp: number;
  sifflets_balance: number;
  rank: string;
};

type ActivityItem = {
  user_id: string;
  username: string;
  points_earned: number;
  contre_pied_bonus: number;
  match_id: string;
  team_home: string;
  team_away: string;
  placed_at: string;
};

type PastSeason = {
  season_id: string;
  ended_at: string | null;
  champion_user_id: string | null;
  champion_username: string | null;
  champion_points: number;
};

type Period = "general" | "week" | "month";

type Props = {
  leaderboard: LeaderboardRow[];
  currentUserId: string;
  period: Period;
  setPeriod: (p: Period) => void;
  isAdmin: boolean;
  gameMode: string | null;
  activity: ActivityItem[];
  past_seasons?: PastSeason[];
  squadId: string;
  onLaunchSuccess: () => void;
};

export function SquadLeaderboard({
  leaderboard,
  currentUserId,
  period,
  setPeriod,
  isAdmin,
  gameMode,
  activity,
  past_seasons,
  squadId,
  onLaunchSuccess,
}: Props) {
  const [launchingChamp, setLaunchingChamp] = useState(false);
  const [confirmLaunch, setConfirmLaunch] = useState(false);

  async function handleLaunchSeason() {
    setLaunchingChamp(true);
    try {
      const res = await fetch(`/api/squads/${squadId}/start-season`, {
        method: "POST",
      });
      const json = (await res.json()) as {
        ok: boolean;
        data?: {
          season_id: string;
          total_rounds: number;
          fixtures_count: number;
        };
        error?: string;
      };
      if (!json.ok) {
        toast.error(json.error ?? "Impossible de lancer le championnat");
      } else {
        toast.success(
          `Championnat lancé ! ${json.data?.total_rounds} journées générées 🏆`,
        );
        setConfirmLaunch(false);
        onLaunchSuccess();
      }
    } catch {
      toast.error("Connexion perdue");
    } finally {
      setLaunchingChamp(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-3 flex items-center justify-end gap-2">
          <div className="flex gap-1 rounded-xl bg-zinc-800 p-1">
            {(["general", "month", "week"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`rounded-lg px-3 py-1 text-[11px] font-black transition ${
                  period === p
                    ? "bg-amber-500 text-black"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {p === "general"
                  ? "Général"
                  : p === "month"
                    ? "Mois"
                    : "Semaine"}
              </button>
            ))}
          </div>
        </div>
        <p className="mb-3 text-xs text-zinc-500">
          {period === "general"
            ? "Points cumulés depuis le début. Solde affiché pour le fun du vestiaire."
            : `Points gagnés depuis le début ${period === "month" ? "du mois" : "de la semaine"} (Pronos + Paris Live).`}
        </p>
        <ol className="flex flex-col gap-2">
          {leaderboard.map((row, idx) => {
            const isMe = row.user_id === currentUserId;
            const inner = (
              <>
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                      idx === 0
                        ? "bg-yellow-500 text-yellow-900 border-2 border-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.4)]"
                        : idx === 1
                          ? "bg-zinc-300 text-zinc-800 border-2 border-zinc-200 shadow-[0_0_10px_rgba(212,212,216,0.3)]"
                          : idx === 2
                            ? "bg-amber-700 text-amber-100 border-2 border-amber-600 shadow-[0_0_10px_rgba(180,83,9,0.3)]"
                            : "bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-bold text-white">
                      {isMe ? "Toi" : row.username}
                    </p>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                      {row.rank}
                    </p>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-black tabular-nums text-amber-300">
                    {row.xp.toLocaleString("fr-FR")} pts
                  </p>
                  <div className="flex gap-2 justify-end mt-0.5">
                    <span className="text-[10px] font-bold text-green-400">
                      🎯 {row.pronos_xp.toLocaleString("fr-FR")}
                    </span>
                    <span className="text-[10px] font-bold text-blue-400">
                      ⚡ {row.var_xp.toLocaleString("fr-FR")}
                    </span>
                  </div>
                </div>
              </>
            );
            const cls = `flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 transition ${
              isMe
                ? "border-amber-500/40 bg-amber-500/10"
                : "border-white/10 bg-zinc-900/60 hover:border-white/20 hover:bg-zinc-800/60"
            }`;
            return isMe ? (
              <li key={row.user_id} className={cls}>
                {inner}
              </li>
            ) : (
              <li key={row.user_id}>
                <Link
                  href={`/profile/${row.user_id}`}
                  className={`flex ${cls}`}
                >
                  {inner}
                </Link>
              </li>
            );
          })}
        </ol>

        {isAdmin && gameMode === "braquage" && (
          <div className="mt-6">
            {!confirmLaunch ? (
              <button
                type="button"
                onClick={() => setConfirmLaunch(true)}
                className="w-full flex items-center justify-center gap-2 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-6 py-4 text-sm font-black uppercase tracking-wide text-amber-300 transition active:scale-[0.98] hover:bg-amber-500/20"
              >
                <PlayCircle className="h-5 w-5" />
                Lancer le championnat
              </button>
            ) : (
              <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5 space-y-3">
                <p className="text-sm font-black text-white">
                  Lancer le championnat avec {leaderboard.length} joueurs ?
                </p>
                <p className="text-xs text-zinc-400">
                  {leaderboard.length % 2 !== 0
                    ? "⚠️ Nombre de joueurs impair — attends un membre supplémentaire."
                    : leaderboard.length < 2
                      ? "⚠️ Il faut au moins 2 joueurs."
                      : `${(leaderboard.length - 1) * 2} journées générées (aller + retour), à partir du lundi prochain.`}
                </p>
                {leaderboard.length >= 2 && leaderboard.length % 2 === 0 && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleLaunchSeason}
                      disabled={launchingChamp}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-black uppercase text-black transition disabled:opacity-50"
                    >
                      {launchingChamp ? (
                        <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <PlayCircle className="h-3.5 w-3.5" />
                      )}
                      Lancer
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmLaunch(false)}
                      className="flex-1 rounded-xl bg-zinc-800 px-4 py-2.5 text-xs font-black uppercase text-zinc-400 transition hover:bg-zinc-700"
                    >
                      Annuler
                    </button>
                  </div>
                )}
                {(leaderboard.length < 2 || leaderboard.length % 2 !== 0) && (
                  <button
                    type="button"
                    onClick={() => setConfirmLaunch(false)}
                    className="w-full rounded-xl bg-zinc-800 px-4 py-2.5 text-xs font-black uppercase text-zinc-400 transition hover:bg-zinc-700"
                  >
                    Fermer
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {activity.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Flame className="h-4 w-4 text-orange-400" aria-hidden />
            <h2 className="text-sm font-black uppercase tracking-wide text-white">
              Derniers exploits
            </h2>
          </div>
          <div className="flex flex-col gap-2">
            {activity.map((item, idx) => {
              const isBraquage = item.contre_pied_bonus >= 100;
              const isVisionnaire =
                item.contre_pied_bonus >= 60 && item.contre_pied_bonus < 100;
              return (
                <div
                  key={idx}
                  className="flex items-center gap-3 rounded-2xl border border-white/8 bg-zinc-900/60 px-4 py-3"
                >
                  <span className="shrink-0 text-lg" aria-hidden>
                    {isBraquage ? "💎" : isVisionnaire ? "🔮" : "🔥"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-white">
                      <span className="text-amber-300">
                        {item.user_id === currentUserId ? "Toi" : item.username}
                      </span>{" "}
                      a ramassé{" "}
                      <span className="font-black text-green-400">
                        +{item.points_earned} pts
                      </span>
                    </p>
                    <p className="truncate text-[11px] text-zinc-500">
                      {item.team_home} – {item.team_away}
                      {item.contre_pied_bonus > 0 && (
                        <span className="ml-1 text-amber-400">
                          · Contre-Pied +{item.contre_pied_bonus}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {past_seasons && past_seasons.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-yellow-400" aria-hidden />
            <h2 className="text-sm font-black uppercase tracking-wide text-white">
              Palmarès
            </h2>
          </div>
          <div className="flex flex-col gap-2">
            {past_seasons.map((s, idx) => (
              <div
                key={s.season_id}
                className="flex items-center gap-3 rounded-2xl border border-yellow-500/20 bg-yellow-500/5 px-4 py-3"
              >
                <span className="text-2xl" aria-hidden>
                  🏆
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white">
                    Saison {past_seasons.length - idx}
                  </p>
                  <p className="text-xs text-zinc-400">
                    Champion :{" "}
                    <span className="font-black text-yellow-300">
                      {s.champion_username ?? "—"}
                    </span>{" "}
                    · {s.champion_points} pts
                  </p>
                  {s.ended_at && (
                    <p className="text-[10px] text-zinc-600">
                      {new Date(s.ended_at).toLocaleDateString("fr-FR", {
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
