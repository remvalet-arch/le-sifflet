"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  BellRing,
  LoaderCircle,
  Trophy,
  Wallet,
  ChevronLeft,
  Flame,
  Share2,
  Swords,
  CalendarDays,
  PlayCircle,
} from "lucide-react";
import type { SquadRow } from "@/types/database";
import { SquadChat } from "./SquadChat";

type LeaderboardRow = {
  user_id: string;
  username: string;
  xp: number;
  pronos_xp: number;
  var_xp: number;
  sifflets_balance: number;
  rank: string;
};

type Period = "general" | "week" | "month";

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

type ChampionshipStanding = {
  user_id: string;
  username: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  points: number;
  pronos_pts: number;
};

type ChampionshipFixture = {
  id: string;
  round_number: number;
  week_start: string;
  home_member_id: string;
  home_username: string;
  away_member_id: string;
  away_username: string;
  home_points: number | null;
  away_points: number | null;
  winner_id: string | null;
  status: string;
};

type ChampionshipData = {
  season_id: string;
  status: string;
  current_round: number;
  total_rounds: number;
  standings: ChampionshipStanding[];
  current_fixtures: ChampionshipFixture[];
};

type PastSeason = {
  season_id: string;
  ended_at: string | null;
  champion_user_id: string | null;
  champion_username: string | null;
  champion_points: number;
};

type ApiPayload = {
  squad: SquadRow;
  leaderboard: LeaderboardRow[];
  total_xp_earned: number;
  period: Period;
  activity: ActivityItem[];
  championship: ChampionshipData | null;
  past_seasons?: PastSeason[];
};

type ApiResponse<T> = { ok: boolean; data?: T; error?: string };

export function SquadDetailClient({
  squadId,
  currentUserId,
}: {
  squadId: string;
  currentUserId: string;
}) {
  const [data, setData] = useState<ApiPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [nudging, setNudging] = useState(false);
  const [period, setPeriod] = useState<"general" | "week" | "month">("general");
  const [launchingChamp, setLaunchingChamp] = useState(false);
  const [confirmLaunch, setConfirmLaunch] = useState(false);

  useEffect(() => {
    let alive = true;
    void fetch(`/api/squads/${squadId}?period=${period}`)
      .then((r) => r.json())
      .then((json: ApiResponse<ApiPayload>) => {
        if (!alive) return;
        if (!json.ok) {
          toast.error(json.error ?? "Erreur");
          setData(null);
          return;
        }
        setData(json.data ?? null);
      })
      .catch(() => {
        if (!alive) return;
        toast.error("Connexion perdue");
        setData(null);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [squadId, period]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <LoaderCircle className="h-8 w-8 animate-spin text-zinc-600" />
      </div>
    );
  }

  if (!data) {
    return (
      <p className="py-12 text-center text-sm text-zinc-500">
        Impossible de charger cette ligue.{" "}
        <Link href="/ligues" className="font-bold text-amber-400 underline">
          Retour
        </Link>
      </p>
    );
  }

  const {
    squad,
    leaderboard,
    total_xp_earned,
    activity,
    championship,
    past_seasons,
  } = data;

  async function handleNudge() {
    setNudging(true);
    try {
      const res = await fetch("/api/squads/nudge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ squad_id: squadId }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        data?: { sent_count: number };
        error?: string;
      };
      if (!json.ok) {
        toast.error(json.error ?? "Impossible d'envoyer le nudge");
      } else {
        const n = json.data?.sent_count ?? 0;
        toast.success(
          n > 0
            ? `Nudge envoyé à ${n} joueur${n > 1 ? "s" : ""} ! 🎯`
            : "Tout le monde a déjà pronostiqué !",
        );
      }
    } catch {
      toast.error("Connexion perdue");
    } finally {
      setNudging(false);
    }
  }

  function handleShare() {
    if (!squad.invite_code) return;

    const myUsername = leaderboard.find(
      (m) => m.user_id === currentUserId,
    )?.username;
    const from = myUsername ?? "Un pote";
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const message = `Hey ! ⚽ ${from} t'invite à rejoindre sa ligue "${squad.name}" sur VAR TIME.\n\nRentre ce code pour intégrer le vestiaire : ${squad.invite_code}\n\nLien: ${origin}/ligues`;

    if (navigator.share && /Mobi|Android/i.test(navigator.userAgent)) {
      navigator
        .share({
          title: `Rejoins ${squad.name} sur VAR TIME`,
          text: message,
        })
        .catch(() => {
          void navigator.clipboard.writeText(message);
          toast.success("Message copié !");
        });
    } else {
      void navigator.clipboard.writeText(message);
      toast.success("Message copié !");
    }
  }

  const isAdmin = squad.owner_id === currentUserId;

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
        // Reload data
        setLoading(true);
        const r = await fetch(`/api/squads/${squadId}?period=${period}`);
        const updated = (await r.json()) as { ok: boolean; data?: ApiPayload };
        if (updated.ok && updated.data) setData(updated.data);
        setLoading(false);
      }
    } catch {
      toast.error("Connexion perdue");
    } finally {
      setLaunchingChamp(false);
    }
  }

  return (
    <div className="space-y-6 pb-24 relative min-h-screen">
      <Link
        href="/ligues"
        className="inline-flex items-center gap-1 text-xs font-bold text-zinc-500 hover:text-white"
      >
        <ChevronLeft className="h-4 w-4" />
        Mes ligues
      </Link>

      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-zinc-900 p-6 shadow-xl mt-4">
        {/* Premium Blur Effect using standard emojis or avatars */}
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-amber-500/20 blur-3xl" />

        <p className="text-[10px] font-black uppercase tracking-widest text-amber-500/80 relative z-10">
          {squad.is_private ? "Ligue privée" : "Publique"}
        </p>
        <h1 className="text-3xl font-black tracking-tight text-white relative z-10 mt-1 mb-4">
          {squad.name}
        </h1>
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
          <p className="flex flex-wrap items-center gap-3 text-sm font-bold text-green-400/90">
            <span className="inline-flex items-center gap-1.5 bg-green-500/10 px-3 py-1.5 rounded-xl border border-green-500/20">
              <Wallet className="h-4 w-4" aria-hidden />
              XP total :{" "}
              <span className="font-black tabular-nums">
                {total_xp_earned.toLocaleString("fr-FR")} Pts
              </span>
            </span>
          </p>
          <button
            type="button"
            onClick={handleNudge}
            disabled={nudging}
            className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-800/80 px-3 py-2 text-xs font-black text-zinc-300 transition hover:bg-zinc-700 disabled:opacity-50 border border-white/5 backdrop-blur-md"
          >
            {nudging ? (
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <BellRing className="h-3.5 w-3.5 text-whistle" />
            )}
            Nudge pronos
          </button>
        </div>
      </div>

      {/* ── Vue Championnat 1v1 ─────────────────────────────────────────────── */}
      {championship ? (
        <div className="space-y-6">
          {/* Podium de fin de saison */}
          {championship.status === "finished" &&
            championship.standings.length >= 1 && (
              <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/5 p-5 text-center space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-yellow-400">
                  Saison terminée 🏆
                </p>
                <div className="flex items-end justify-center gap-4">
                  {/* 2nd */}
                  {championship.standings[1] && (
                    <div className="flex flex-col items-center gap-1">
                      <div className="h-12 w-12 flex items-center justify-center rounded-full bg-zinc-300 text-zinc-800 text-lg font-black">
                        2
                      </div>
                      <p className="text-xs font-bold text-zinc-300 max-w-[60px] truncate">
                        {championship.standings[1].user_id === currentUserId
                          ? "Toi"
                          : championship.standings[1].username}
                      </p>
                      <p className="text-[10px] text-zinc-500">
                        {championship.standings[1].points} pts
                      </p>
                    </div>
                  )}
                  {/* 1st */}
                  <div className="flex flex-col items-center gap-1 -mb-2">
                    <div className="h-16 w-16 flex items-center justify-center rounded-full bg-yellow-500 text-yellow-900 text-2xl font-black shadow-[0_0_20px_rgba(234,179,8,0.4)]">
                      1
                    </div>
                    <p className="text-sm font-black text-yellow-300 max-w-[80px] truncate">
                      {championship.standings[0].user_id === currentUserId
                        ? "Toi 🎉"
                        : championship.standings[0].username}
                    </p>
                    <p className="text-[10px] text-yellow-500">
                      {championship.standings[0].points} pts
                    </p>
                  </div>
                  {/* 3rd */}
                  {championship.standings[2] && (
                    <div className="flex flex-col items-center gap-1">
                      <div className="h-10 w-10 flex items-center justify-center rounded-full bg-amber-700 text-amber-100 text-base font-black">
                        3
                      </div>
                      <p className="text-xs font-bold text-zinc-300 max-w-[60px] truncate">
                        {championship.standings[2].user_id === currentUserId
                          ? "Toi"
                          : championship.standings[2].username}
                      </p>
                      <p className="text-[10px] text-zinc-500">
                        {championship.standings[2].points} pts
                      </p>
                    </div>
                  )}
                </div>
                {championship.standings[0].user_id === currentUserId && (
                  <p className="text-xs font-bold text-yellow-400">
                    Félicitations, tu es Champion de la ligue ! 🎊
                  </p>
                )}
              </div>
            )}

          {/* Section 1 — Tableau de championnat */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <Swords className="h-4 w-4 text-amber-400" aria-hidden />
              <h2 className="text-sm font-black uppercase tracking-wide text-white">
                Championnat — J{championship.current_round}/
                {championship.total_rounds}
              </h2>
              {championship.status === "finished" && (
                <span className="ml-auto rounded-lg bg-zinc-700 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-zinc-300">
                  Terminé
                </span>
              )}
            </div>
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-900">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/8 text-[10px] font-black uppercase tracking-wide text-zinc-500">
                    <th className="px-3 py-2 text-left">#</th>
                    <th className="px-3 py-2 text-left">Joueur</th>
                    <th className="px-2 py-2 text-center">J</th>
                    <th className="px-2 py-2 text-center">V</th>
                    <th className="px-2 py-2 text-center">N</th>
                    <th className="px-2 py-2 text-center">D</th>
                    <th className="px-2 py-2 text-right font-black text-white">
                      Pts
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {championship.standings.map((s, idx) => {
                    const isMe = s.user_id === currentUserId;
                    return (
                      <tr
                        key={s.user_id}
                        className={`border-b border-white/5 last:border-0 ${
                          isMe ? "bg-amber-500/10" : ""
                        }`}
                      >
                        <td className="px-3 py-2.5">
                          <span
                            className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-black ${
                              idx === 0
                                ? "bg-yellow-500 text-yellow-900"
                                : idx === 1
                                  ? "bg-zinc-300 text-zinc-800"
                                  : idx === 2
                                    ? "bg-amber-700 text-amber-100"
                                    : "bg-zinc-800 text-zinc-400"
                            }`}
                          >
                            {idx + 1}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <p
                            className={`font-bold ${isMe ? "text-amber-300" : "text-white"}`}
                          >
                            {isMe ? "Toi" : s.username}
                          </p>
                          <p className="text-[10px] text-zinc-500">
                            {s.pronos_pts.toLocaleString("fr-FR")} pts cumulés
                          </p>
                        </td>
                        <td className="px-2 py-2.5 text-center text-zinc-400">
                          {s.played}
                        </td>
                        <td className="px-2 py-2.5 text-center text-green-400">
                          {s.won}
                        </td>
                        <td className="px-2 py-2.5 text-center text-zinc-400">
                          {s.drawn}
                        </td>
                        <td className="px-2 py-2.5 text-center text-red-400">
                          {s.lost}
                        </td>
                        <td className="px-2 py-2.5 text-right font-black tabular-nums text-amber-300">
                          {s.points}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2 — Journée en cours */}
          {championship.current_fixtures.length > 0 && (
            <div>
              <div className="mb-3 flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-blue-400" aria-hidden />
                <h2 className="text-sm font-black uppercase tracking-wide text-white">
                  Journée {championship.current_round}
                </h2>
              </div>
              <div className="flex flex-col gap-2">
                {championship.current_fixtures.map((f) => {
                  const isMyMatch =
                    f.home_member_id === currentUserId ||
                    f.away_member_id === currentUserId;
                  const isFinished = f.status === "finished";
                  return (
                    <div
                      key={f.id}
                      className={`rounded-2xl border px-4 py-3 ${
                        isMyMatch
                          ? "border-amber-500/40 bg-amber-500/10"
                          : "border-white/8 bg-zinc-900/60"
                      }`}
                    >
                      {isMyMatch && (
                        <p className="mb-1.5 text-[10px] font-black uppercase tracking-wide text-amber-400">
                          Ton match cette semaine
                        </p>
                      )}
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1 text-center">
                          <p
                            className={`truncate text-sm font-bold ${
                              f.home_member_id === currentUserId
                                ? "text-amber-300"
                                : "text-white"
                            }`}
                          >
                            {f.home_member_id === currentUserId
                              ? "Toi"
                              : f.home_username}
                          </p>
                          {isFinished && (
                            <p className="text-xl font-black tabular-nums text-white">
                              {f.home_points ?? 0}
                            </p>
                          )}
                        </div>
                        <div className="shrink-0 px-2 text-xs font-black text-zinc-500">
                          {isFinished ? "FIN" : "VS"}
                        </div>
                        <div className="min-w-0 flex-1 text-center">
                          <p
                            className={`truncate text-sm font-bold ${
                              f.away_member_id === currentUserId
                                ? "text-amber-300"
                                : "text-white"
                            }`}
                          >
                            {f.away_member_id === currentUserId
                              ? "Toi"
                              : f.away_username}
                          </p>
                          {isFinished && (
                            <p className="text-xl font-black tabular-nums text-white">
                              {f.away_points ?? 0}
                            </p>
                          )}
                        </div>
                      </div>
                      {isFinished && f.winner_id && (
                        <p className="mt-1.5 text-center text-[10px] font-bold text-green-400">
                          Victoire :{" "}
                          {f.winner_id === currentUserId
                            ? "Toi"
                            : f.winner_id === f.home_member_id
                              ? f.home_username
                              : f.away_username}
                        </p>
                      )}
                      {isFinished && !f.winner_id && (
                        <p className="mt-1.5 text-center text-[10px] font-bold text-zinc-400">
                          Match nul
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ── Vue classique XP ─────────────────────────────────────────────────── */
        <div>
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-400" aria-hidden />
              <h2 className="text-sm font-black uppercase tracking-wide text-white">
                Classement
              </h2>
            </div>
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
              ? "XP total (puis pseudo). Solde Pts affiché pour le fun du vestiaire."
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
                      {row.xp.toLocaleString("fr-FR")}{" "}
                      {period === "general" ? "XP" : "pts"}
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

          {/* CTA lancer le championnat (owner, mode braquage, pas de saison active) */}
          {isAdmin && squad.game_mode === "braquage" && !championship && (
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
      )}

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

      {/* ── Palmarès ────────────────────────────────────────────────────────── */}
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

      {/* ── Chat ────────────────────────────────────────────────────────────── */}
      <SquadChat squadId={squadId} currentUserId={currentUserId} />

      {isAdmin && squad.invite_code && (
        <div className="fixed bottom-24 left-0 right-0 z-40 mx-auto max-w-2xl px-4 pointer-events-none">
          <button
            onClick={handleShare}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-4 text-sm font-black uppercase tracking-wide text-zinc-950 shadow-[0_10px_40px_rgba(255,255,255,0.2)] transition active:scale-[0.98] pointer-events-auto"
          >
            <Share2 className="h-5 w-5" />
            Partager l&apos;invitation
          </button>
        </div>
      )}
    </div>
  );
}
