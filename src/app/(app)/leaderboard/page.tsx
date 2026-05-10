import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { MODERATOR_THRESHOLD } from "@/lib/constants/permissions";
import { SeasonBadge } from "@/components/shared/SeasonBadge";
import { BCP47_MAP } from "@/lib/use-bcp47";

export async function generateMetadata() {
  const { getTranslations } = await import("next-intl/server");
  const t = await getTranslations("Meta");
  return { title: t("leaderboard") };
}

export const revalidate = 86400;

const MEDALS = ["🥇", "🥈", "🥉"];

type Props = { searchParams: Promise<{ mode?: string }> };

export default async function LeaderboardPage({ searchParams }: Props) {
  const { mode } = await searchParams;
  const isHallOfFame = mode === "alltime";
  const [t, locale] = await Promise.all([
    getTranslations("Leaderboard"),
    getLocale(),
  ]);
  const bcp47 = BCP47_MAP[locale] ?? "fr-FR";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const scoreCol = isHallOfFame ? "lifetime_points_earned" : "season_points";

  const [{ data: rows }, { data: currentSeason }] = await Promise.all([
    supabase
      .from("profiles")
      .select(`id, username, ${scoreCol}, trust_score`)
      .order(scoreCol, { ascending: false })
      .limit(50),
    supabase
      .from("seasons")
      .select("label, ends_at")
      .eq("is_current", true)
      .maybeSingle(),
  ]);

  const players = (rows ?? []).map((p) => ({
    ...p,
    score: isHallOfFame
      ? (((p as Record<string, unknown>).lifetime_points_earned as number) ?? 0)
      : (((p as Record<string, unknown>).season_points as number) ?? 0),
  }));

  const top3 = players.slice(0, 3);
  const rest = players.slice(3);
  const myRank = user ? players.findIndex((p) => p.id === user.id) : -1;
  const me = myRank >= 0 ? players[myRank] : null;

  // Podium order: 2nd, 1st, 3rd
  const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean);
  const podiumLabelPos = [1, 0, 2];

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6 pb-8">
      {/* Season badge */}
      {currentSeason && !isHallOfFame && (
        <div className="mb-4">
          <SeasonBadge endsAt={currentSeason.ends_at} />
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">
          {isHallOfFame ? t("allTimeDesc") : t("currentSeasonDesc")}
        </p>

        {/* Filter tabs */}
        <div className="flex gap-1 rounded-xl bg-zinc-800 p-1">
          <Link
            href="/leaderboard"
            className={`rounded-lg px-3 py-1.5 text-[11px] font-black transition ${
              !isHallOfFame
                ? "bg-amber-500 text-black"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            {t("tabSeason")}
          </Link>
          <Link
            href="/leaderboard?mode=alltime"
            className={`rounded-lg px-3 py-1.5 text-[11px] font-black transition ${
              isHallOfFame
                ? "bg-amber-500 text-black"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            {t("tabHallOfFame")}
          </Link>
        </div>
      </div>

      {/* Podium */}
      {top3.length >= 3 && (
        <div className="mt-6 flex items-end justify-center gap-3">
          {podiumOrder.map((player, i) => {
            if (!player) return null;
            const rank = podiumLabelPos[i];
            const isMe = player.id === user?.id;
            const heights = ["h-24", "h-32", "h-20"];
            return (
              <div key={player.id} className="flex flex-col items-center gap-2">
                <div
                  className={`relative flex flex-col items-center gap-1 rounded-t-2xl px-4 ${
                    rank === 0
                      ? "bg-yellow-500/20 border border-yellow-500/30"
                      : "bg-zinc-800"
                  } ${heights[i]} w-28 justify-end pb-3`}
                >
                  <span className="text-2xl">{MEDALS[rank]}</span>
                  <p
                    className={`max-w-full truncate text-center text-xs font-black ${
                      isMe ? "text-green-400" : "text-white"
                    }`}
                  >
                    {player.username}
                    {player.trust_score >= MODERATOR_THRESHOLD && " 🛡️"}
                  </p>
                  <p className="text-[10px] font-bold text-zinc-400">
                    {player.score.toLocaleString(bcp47)} Points
                  </p>
                </div>
                <span className="text-sm font-black text-zinc-500">
                  #{rank + 1}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* List */}
      {rest.length > 0 && (
        <div className="mt-4 flex flex-col gap-1.5">
          {rest.map((player, i) => {
            const rank = i + 4;
            const isMe = player.id === user?.id;
            return (
              <div
                key={player.id}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 ${
                  isMe
                    ? "border border-green-500/40 bg-green-500/10"
                    : "border border-white/6 bg-zinc-900"
                }`}
              >
                <span className="w-7 text-center text-sm font-black text-zinc-500">
                  #{rank}
                </span>
                <p
                  className={`flex-1 truncate text-sm font-bold ${
                    isMe ? "text-green-400" : "text-white"
                  }`}
                >
                  {player.username}
                  {player.trust_score >= MODERATOR_THRESHOLD && (
                    <span className="ml-1">🛡️</span>
                  )}
                  {isMe && (
                    <span className="ml-2 text-[10px] font-black uppercase text-green-500">
                      {t("youLabel")}
                    </span>
                  )}
                </p>
                <span className="shrink-0 text-sm font-black text-zinc-400">
                  {player.score.toLocaleString(bcp47)} Points
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Sticky self */}
      {me && myRank >= 3 && (
        <div className="mt-4 rounded-2xl border border-green-500/40 bg-green-500/10 px-4 py-3">
          <p className="text-center text-xs font-bold uppercase tracking-widest text-green-500/70">
            {t("yourPosition")}
          </p>
          <div className="mt-2 flex items-center gap-3">
            <span className="text-lg font-black text-green-400">
              #{myRank + 1}
            </span>
            <p className="flex-1 truncate font-bold text-white">
              {me.username}
            </p>
            <span className="font-black text-green-400">
              {me.score.toLocaleString(bcp47)} Points
            </span>
          </div>
        </div>
      )}

      {players.length === 0 && (
        <p className="mt-8 text-center text-sm text-zinc-600">
          {t("noPlayers")}
        </p>
      )}
    </main>
  );
}
