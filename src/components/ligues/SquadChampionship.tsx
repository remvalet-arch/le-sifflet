"use client";

import { Swords, CalendarDays } from "lucide-react";
import { useTranslations } from "next-intl";

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

export type ChampionshipData = {
  season_id: string;
  status: string;
  current_round: number;
  total_rounds: number;
  standings: ChampionshipStanding[];
  current_fixtures: ChampionshipFixture[];
};

type Props = {
  championship: ChampionshipData;
  currentUserId: string;
};

export function SquadChampionship({ championship, currentUserId }: Props) {
  const t = useTranslations("Ligues");
  const tCommon = useTranslations("Common");
  return (
    <div className="space-y-6">
      {/* Podium de fin de saison */}
      {championship.status === "finished" &&
        championship.standings.length >= 1 && (
          <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/5 p-5 text-center space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-yellow-400">
              {t("championshipSeasonFinished")}
            </p>
            <div className="flex items-end justify-center gap-4">
              {championship.standings[1] && (
                <div className="flex flex-col items-center gap-1">
                  <div className="h-12 w-12 flex items-center justify-center rounded-full bg-zinc-300 text-zinc-800 text-lg font-black">
                    2
                  </div>
                  <p className="text-xs font-bold text-zinc-300 max-w-[60px] truncate">
                    {championship.standings[1].user_id === currentUserId
                      ? tCommon("you")
                      : championship.standings[1].username}
                  </p>
                  <p className="text-[10px] text-zinc-500">
                    {championship.standings[1].points} Points
                  </p>
                </div>
              )}
              <div className="flex flex-col items-center gap-1 -mb-2">
                <div className="h-16 w-16 flex items-center justify-center rounded-full bg-yellow-500 text-yellow-900 text-2xl font-black shadow-[0_0_20px_rgba(234,179,8,0.4)]">
                  1
                </div>
                <p className="text-sm font-black text-yellow-300 max-w-[80px] truncate">
                  {championship.standings[0].user_id === currentUserId
                    ? tCommon("youCelebration")
                    : championship.standings[0].username}
                </p>
                <p className="text-[10px] text-yellow-500">
                  {championship.standings[0].points} Points
                </p>
              </div>
              {championship.standings[2] && (
                <div className="flex flex-col items-center gap-1">
                  <div className="h-10 w-10 flex items-center justify-center rounded-full bg-amber-700 text-amber-100 text-base font-black">
                    3
                  </div>
                  <p className="text-xs font-bold text-zinc-300 max-w-[60px] truncate">
                    {championship.standings[2].user_id === currentUserId
                      ? tCommon("you")
                      : championship.standings[2].username}
                  </p>
                  <p className="text-[10px] text-zinc-500">
                    {championship.standings[2].points} Points
                  </p>
                </div>
              )}
            </div>
            {championship.standings[0].user_id === currentUserId && (
              <p className="text-xs font-bold text-yellow-400">
                {t("championshipCongrats")}
              </p>
            )}
          </div>
        )}

      {/* Tableau de championnat */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <Swords className="h-4 w-4 text-amber-400" aria-hidden />
          <h2 className="text-sm font-black uppercase tracking-wide text-white">
            {t("championshipTitle", {
              round: championship.current_round,
              total: championship.total_rounds,
            })}
          </h2>
          {championship.status === "finished" && (
            <span className="ml-auto rounded-lg bg-zinc-700 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-zinc-300">
              {t("championshipFinished")}
            </span>
          )}
        </div>
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-900">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8 text-[10px] font-black uppercase tracking-wide text-zinc-500">
                <th className="px-3 py-2 text-left">#</th>
                <th className="px-3 py-2 text-left">
                  {t("championshipTablePlayer")}
                </th>
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
                    className={`border-b border-white/5 last:border-0 ${isMe ? "bg-amber-500/10" : ""}`}
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
                        {isMe ? tCommon("you") : s.username}
                      </p>
                      <p className="text-[10px] text-zinc-500">
                        {t("championshipCumulatedPoints", {
                          count: s.pronos_pts.toLocaleString("fr-FR"),
                        })}
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

      {/* Journée en cours */}
      {championship.current_fixtures.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-blue-400" aria-hidden />
            <h2 className="text-sm font-black uppercase tracking-wide text-white">
              {t("championshipMatchWeek", {
                round: championship.current_round,
              })}
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
                      {t("championshipMyMatch")}
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
                          ? tCommon("you")
                          : f.home_username}
                      </p>
                      {isFinished && (
                        <p className="text-xl font-black tabular-nums text-white">
                          {f.home_points ?? 0}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 px-2 text-xs font-black text-zinc-500">
                      {isFinished ? t("championshipEnd") : t("championshipVS")}
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
                          ? tCommon("you")
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
                      {t("championshipVictory")}{" "}
                      {f.winner_id === currentUserId
                        ? tCommon("you")
                        : f.winner_id === f.home_member_id
                          ? f.home_username
                          : f.away_username}
                    </p>
                  )}
                  {isFinished && !f.winner_id && (
                    <p className="mt-1.5 text-center text-[10px] font-bold text-zinc-400">
                      {t("championshipDraw")}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
