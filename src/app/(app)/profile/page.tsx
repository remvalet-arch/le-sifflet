import { AmisContent } from "@/components/profile/AmisContent";
import { createClient } from "@/lib/supabase/server";
import { RefillButton } from "@/components/profile/RefillButton";
import { BadgeUnlockListener } from "@/components/profile/BadgeUnlockListener";
import { ProfileClient } from "@/components/profile/ProfileClient";
import type {
  ShortBetEntry,
  PronoEntry,
} from "@/components/profile/ProfileClient";
import { checkAndUnlockBadges } from "@/app/actions/badges";
import { MODERATOR_THRESHOLD } from "@/lib/constants/permissions";
import type {
  BetRow,
  MarketEventRow,
  MatchRow,
  PronoRow,
  SeasonArchiveRow,
} from "@/types/database";
import { getTranslations } from "next-intl/server";
import { getCachedBadges, getCachedCurrentSeason } from "@/lib/cached-queries";

export async function generateMetadata() {
  const t = await getTranslations("Meta");
  return { title: t("profile") };
}

function getKarmaBadge(
  score: number,
  t: Awaited<ReturnType<typeof getTranslations<"Profile">>>,
) {
  if (score >= MODERATOR_THRESHOLD)
    return {
      emoji: "🛡️",
      label: t("karmaModerator"),
      cls: "border border-yellow-500/50 text-yellow-400 bg-yellow-500/10",
    };
  if (score >= 50)
    return {
      emoji: "📢",
      label: t("karmaSupporteur"),
      cls: "border border-white/10 text-zinc-400 bg-zinc-800",
    };
  return {
    emoji: "🟨",
    label: t("karmaYellow"),
    cls: "border border-orange-500/30 text-orange-400 bg-orange-500/10",
  };
}

function rankDisplayFromDb(
  rankLabel: string,
  t: Awaited<ReturnType<typeof getTranslations<"Profile">>>,
): { emoji: string; label: string } {
  const l = rankLabel.toLowerCase();
  if (l.includes("boss")) return { emoji: "👑", label: t("rankBoss") };
  if (l.includes("argent") || l.includes("silver"))
    return { emoji: "🥈", label: t("rankArgent") };
  if (l.includes("bronze")) return { emoji: "🥉", label: t("rankBronze") };
  return { emoji: "🪑", label: t("rankDistrict") };
}

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, username, avatar_url, sifflets_balance, trust_score, rank, xp, favorite_team_id, last_refill_date, login_streak, last_login_date, preferred_competitions, streak_freezes_owned, equipped_avatar_id, equipped_border_id",
    )
    .eq("id", user.id)
    .single();

  const equippedItemIds = [
    profile?.equipped_avatar_id,
    profile?.equipped_border_id,
  ].filter(Boolean) as string[];

  const [
    { data: rawShortBets },
    { data: rawPronos },
    allBadges,
    { data: userBadgesData },
    { data: favoriteTeamData },
    { data: rawSeasonArchives },
    currentSeason,
    { data: equippedItemsData },
  ] = await Promise.all([
    supabase
      .from("bets")
      .select("*")
      .eq("user_id", user.id)
      .order("placed_at", { ascending: false })
      .limit(30),
    supabase
      .from("pronos")
      .select("*")
      .eq("user_id", user.id)
      .order("placed_at", { ascending: false })
      .limit(30),
    getCachedBadges(),
    supabase.from("user_badges").select("badge_id").eq("user_id", user.id),
    profile?.favorite_team_id
      ? supabase
          .from("teams")
          .select("id, name, logo_url")
          .eq("id", profile.favorite_team_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("season_archives")
      .select(
        "user_id, season_id, final_rank, final_points, final_rank_label, archived_at",
      )
      .eq("user_id", user.id)
      .order("archived_at", { ascending: false })
      .limit(10),
    getCachedCurrentSeason(),
    equippedItemIds.length > 0
      ? supabase
          .from("shop_items")
          .select("id, asset_url, category")
          .in("id", equippedItemIds)
      : Promise.resolve({ data: [] }),
  ]);

  const favoriteTeam: {
    id: string;
    name: string;
    logo_url: string | null;
  } | null = favoriteTeamData ?? null;
  const seasonArchives: SeasonArchiveRow[] = rawSeasonArchives ?? [];

  const equippedItemsMap = new Map(
    (equippedItemsData ?? []).map((i) => [i.id, i]),
  );
  const equippedAvatarAsset = profile?.equipped_avatar_id
    ? (equippedItemsMap.get(profile.equipped_avatar_id)?.asset_url ?? null)
    : null;
  const equippedBorderAsset = profile?.equipped_border_id
    ? (equippedItemsMap.get(profile.equipped_border_id)?.asset_url ?? null)
    : null;

  void checkAndUnlockBadges(user.id);

  const shortBets: BetRow[] = rawShortBets ?? [];
  const pronos: PronoRow[] = rawPronos ?? [];
  const balance = profile?.sifflets_balance ?? 0;
  const trustScore = profile?.trust_score ?? 100;

  const eventIds = [...new Set(shortBets.map((b) => b.event_id))];
  const eventMap = new Map<string, MarketEventRow>();
  const matchMap = new Map<
    string,
    Pick<
      MatchRow,
      | "id"
      | "team_home"
      | "team_away"
      | "home_score"
      | "away_score"
      | "status"
      | "start_time"
    >
  >();

  const pronoMatchIds = [...new Set(pronos.map((p) => p.match_id))];

  // Parallelize: events + prono matches can be fetched simultaneously
  const [eventsResult, pronoMatchesResult] = await Promise.all([
    eventIds.length > 0
      ? supabase.from("market_events").select("*").in("id", eventIds)
      : Promise.resolve({ data: [] as MarketEventRow[] }),
    pronoMatchIds.length > 0
      ? supabase
          .from("matches")
          .select(
            "id, team_home, team_away, home_score, away_score, status, start_time",
          )
          .in("id", pronoMatchIds)
      : Promise.resolve({
          data: [] as Pick<
            MatchRow,
            | "id"
            | "team_home"
            | "team_away"
            | "home_score"
            | "away_score"
            | "status"
            | "start_time"
          >[],
        }),
  ]);

  (eventsResult.data ?? []).forEach((e) => eventMap.set(e.id, e));
  (pronoMatchesResult.data ?? []).forEach((m) => matchMap.set(m.id, m));

  // Fetch match IDs from events not yet covered by prono matches
  const eventMatchIds = [
    ...new Set((eventsResult.data ?? []).map((e) => e.match_id)),
  ];
  const missingMatchIds = eventMatchIds.filter((id) => !matchMap.has(id));
  if (missingMatchIds.length > 0) {
    const { data: matches } = await supabase
      .from("matches")
      .select(
        "id, team_home, team_away, home_score, away_score, status, start_time",
      )
      .in("id", missingMatchIds);
    (matches ?? []).forEach((m) => matchMap.set(m.id, m));
  }

  const shortEntries: ShortBetEntry[] = shortBets.map((b) => {
    const event = eventMap.get(b.event_id);
    const match = event ? matchMap.get(event.match_id) : undefined;
    return {
      id: b.id,
      matchId: event?.match_id ?? "",
      status: b.status,
      chosen_option: b.chosen_option,
      amount_staked: b.amount_staked,
      potential_reward: Number(b.potential_reward),
      placed_at: b.placed_at,
      eventType: event?.type,
      teamHome: match?.team_home,
      teamAway: match?.team_away,
      homeScore: match?.home_score ?? undefined,
      awayScore: match?.away_score ?? undefined,
      matchStatus: match?.status ?? undefined,
      startTime: match?.start_time ?? undefined,
    };
  });

  const pronoEntries: PronoEntry[] = pronos.map((p) => {
    const match = matchMap.get(p.match_id);
    return {
      id: p.id,
      matchId: p.match_id,
      status: p.status,
      prono_type: p.prono_type,
      prono_value: p.prono_value,
      reward_amount: p.reward_amount,
      points_earned: p.points_earned,
      contre_pied_bonus: p.contre_pied_bonus,
      placed_at: p.placed_at,
      teamHome: match?.team_home,
      teamAway: match?.team_away,
      homeScore: match?.home_score ?? undefined,
      awayScore: match?.away_score ?? undefined,
      matchStatus: match?.status ?? undefined,
      startTime: match?.start_time ?? undefined,
    };
  });

  const allStatuses = [
    ...shortBets.map((b) => b.status),
    ...pronos.map((p) => p.status),
  ];
  const totalBets = allStatuses.length;
  const wonCount = allStatuses.filter((s) => s === "won").length;
  const resolvedCount = allStatuses.filter((s) => s !== "pending").length;
  const winRate =
    resolvedCount > 0 ? Math.round((wonCount / resolvedCount) * 100) : 0;
  const totalEarned =
    shortBets
      .filter((b) => b.status === "won")
      .reduce((s, b) => s + Math.round(Number(b.potential_reward)), 0) +
    pronos
      .filter((p) => p.status === "won")
      .reduce(
        (s, p) => s + (p.points_earned > 0 ? p.points_earned : p.reward_amount),
        0,
      );

  const exactScorePronos = pronos.filter((p) => p.prono_type === "exact_score");
  const exactResolved = exactScorePronos.filter(
    (p) => p.status === "won" || p.status === "lost",
  );
  const exactWon = exactResolved.filter((p) => p.status === "won").length;
  const scoreAccuracy =
    exactResolved.length > 0
      ? Math.round((exactWon / exactResolved.length) * 100)
      : null;

  const sortedPronos = [...pronos].sort(
    (a, b) => new Date(a.placed_at).getTime() - new Date(b.placed_at).getTime(),
  );
  let bestStreak = 0;
  let curStreak = 0;
  for (const p of sortedPronos) {
    if (p.status === "won") {
      curStreak++;
      bestStreak = Math.max(bestStreak, curStreak);
    } else if (p.status === "lost") {
      curStreak = 0;
    }
  }

  const totalMatchesPronoed = new Set(
    pronos.filter((p) => p.prono_type === "exact_score").map((p) => p.match_id),
  ).size;

  const REFILL_THRESHOLD = 500;
  // eslint-disable-next-line react-hooks/purity
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const isRefillEligible =
    balance < REFILL_THRESHOLD &&
    (!profile?.last_refill_date || new Date(profile.last_refill_date) < cutoff);
  const nextRefillAt =
    !isRefillEligible && balance < REFILL_THRESHOLD && profile?.last_refill_date
      ? new Date(
          new Date(profile.last_refill_date).getTime() + 24 * 60 * 60 * 1000,
        ).toISOString()
      : null;

  const tp = await getTranslations("Profile");
  const karma = getKarmaBadge(trustScore, tp);
  const rank = rankDisplayFromDb(profile?.rank ?? "", tp);
  const xpTotal = profile?.xp ?? 0;
  const unlockedBadgeIds = (userBadgesData ?? []).map((ub) => ub.badge_id);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-5">
      <BadgeUnlockListener userId={user.id} />

      <ProfileClient
        shortBets={shortEntries}
        pronos={pronoEntries}
        allBadges={allBadges}
        unlockedBadgeIds={unlockedBadgeIds}
        amisContent={<AmisContent currentUserId={user.id} />}
        refillContent={
          balance < REFILL_THRESHOLD ? (
            <RefillButton
              isEligible={isRefillEligible}
              nextRefillAt={nextRefillAt}
            />
          ) : null
        }
        winRate={winRate}
        totalBets={totalBets}
        totalEarned={totalEarned}
        xpTotal={xpTotal}
        bestStreak={bestStreak}
        trustScore={trustScore}
        isModerateur={trustScore >= MODERATOR_THRESHOLD}
        scoreAccuracy={scoreAccuracy}
        totalMatchesPronoed={totalMatchesPronoed}
        headerUsername={profile?.username ?? "Joueur"}
        headerAvatarUrl={profile?.avatar_url ?? null}
        headerFavoriteTeam={favoriteTeam}
        headerKarma={karma}
        headerRank={rank}
        headerBalance={balance}
        headerLoginStreak={profile?.login_streak ?? 0}
        headerLastLoginDate={profile?.last_login_date ?? null}
        headerPreferredCompetitions={profile?.preferred_competitions ?? []}
        headerStreakFreezesOwned={profile?.streak_freezes_owned ?? 0}
        headerEquippedAvatarAsset={equippedAvatarAsset}
        headerEquippedBorderAsset={equippedBorderAsset}
        seasonArchives={seasonArchives}
        currentSeason={
          currentSeason
            ? { label: currentSeason.label, endsAt: currentSeason.ends_at }
            : null
        }
      />
    </main>
  );
}
