import { Target, TrendingUp, Trophy, MessageCircle } from "lucide-react";
import { AmisContent } from "@/components/profile/AmisContent";
import { createClient } from "@/lib/supabase/server";
import { ProfileClient } from "@/components/profile/ProfileClient";
import type {
  ShortBetEntry,
  PronoEntry,
} from "@/components/profile/ProfileClient";
import { notFound } from "next/navigation";
import Link from "next/link";
import type {
  BetRow,
  MarketEventRow,
  MatchRow,
  PronoRow,
} from "@/types/database";
import { FriendButton } from "@/components/profile/FriendButton";
import { MODERATOR_THRESHOLD } from "@/lib/constants/permissions";

function getTrustGrade(score: number) {
  if (score >= 200)
    return {
      label: "Arbitre Élite",
      icon: "🏅",
      color: "text-yellow-400",
      bar: "bg-yellow-400",
    };
  if (score >= 100)
    return {
      label: "Arbitre Officiel",
      icon: "✅",
      color: "text-green-400",
      bar: "bg-green-500",
    };
  if (score >= 50)
    return {
      label: "Lanceur d'Alerte",
      icon: "⚡",
      color: "text-blue-400",
      bar: "bg-blue-400",
    };
  return {
    label: "Carton Jaune",
    icon: "⚠️",
    color: "text-orange-400",
    bar: "bg-orange-400",
  };
}

function getKarmaBadge(score: number) {
  if (score >= MODERATOR_THRESHOLD)
    return {
      emoji: "🛡️",
      label: "Modérateur",
      cls: "border border-yellow-500/50 text-yellow-400 bg-yellow-500/10",
    };
  if (score >= 50)
    return {
      emoji: "📢",
      label: "Supporteur",
      cls: "border border-white/10 text-zinc-400 bg-zinc-800",
    };
  return {
    emoji: "🟨",
    label: "Carton Jaune",
    cls: "border border-orange-500/30 text-orange-400 bg-orange-500/10",
  };
}

function rankDisplayFromDb(rankLabel: string) {
  const t = rankLabel.toLowerCase();
  if (t.includes("boss")) return { emoji: "👑", label: rankLabel };
  if (t.includes("argent")) return { emoji: "🥈", label: rankLabel };
  if (t.includes("bronze")) return { emoji: "🥉", label: rankLabel };
  return { emoji: "🪑", label: rankLabel };
}

export const metadata = { title: "Profil joueur" };

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  if (id === user.id) {
    const { redirect } = await import("next/navigation");
    redirect("/profile");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, username, avatar_url, xp, sifflets_balance, rank, trust_score, favorite_team_id",
    )
    .eq("id", id)
    .maybeSingle();

  if (!profile) notFound();

  const [
    { data: rawShortBets },
    { data: rawPronos },
    { data: allBadges },
    { data: userBadgesData },
    { data: friendship },
  ] = await Promise.all([
    supabase
      .from("bets")
      .select("*")
      .eq("user_id", id)
      .order("placed_at", { ascending: false })
      .limit(30),
    supabase
      .from("pronos")
      .select("*")
      .eq("user_id", id)
      .order("placed_at", { ascending: false })
      .limit(30),
    supabase.from("badges").select("*").order("created_at"),
    supabase.from("user_badges").select("badge_id").eq("user_id", id),
    supabase
      .from("friend_requests")
      .select("id")
      .or(
        `and(sender_id.eq.${user.id},receiver_id.eq.${id}),and(sender_id.eq.${id},receiver_id.eq.${user.id})`,
      )
      .eq("status", "accepted")
      .maybeSingle(),
  ]);

  let favoriteTeam: {
    id: string;
    name: string;
    logo_url: string | null;
  } | null = null;
  if (profile.favorite_team_id) {
    const { data: team } = await supabase
      .from("teams")
      .select("id, name, logo_url")
      .eq("id", profile.favorite_team_id)
      .maybeSingle();
    favoriteTeam = team ?? null;
  }

  const shortBets: BetRow[] = rawShortBets ?? [];
  const pronos: PronoRow[] = rawPronos ?? [];

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

  if (eventIds.length > 0) {
    const { data: events } = await supabase
      .from("market_events")
      .select("*")
      .in("id", eventIds);
    (events ?? []).forEach((e) => eventMap.set(e.id, e));
    const fromShortMatchIds = [
      ...new Set((events ?? []).map((e) => e.match_id)),
    ];
    const allMatchIds = [...new Set([...fromShortMatchIds, ...pronoMatchIds])];
    if (allMatchIds.length > 0) {
      const { data: matches } = await supabase
        .from("matches")
        .select(
          "id, team_home, team_away, home_score, away_score, status, start_time",
        )
        .in("id", allMatchIds);
      (matches ?? []).forEach((m) => matchMap.set(m.id, m));
    }
  } else if (pronoMatchIds.length > 0) {
    const { data: matches } = await supabase
      .from("matches")
      .select(
        "id, team_home, team_away, home_score, away_score, status, start_time",
      )
      .in("id", pronoMatchIds);
    (matches ?? []).forEach((m) => matchMap.set(m.id, m));
  }

  const shortEntries: ShortBetEntry[] = shortBets.map((b) => {
    const event = eventMap.get(b.event_id);
    const match = event ? matchMap.get(event.match_id) : undefined;
    const isPending = b.status === "pending";
    return {
      id: b.id,
      matchId: event?.match_id ?? "",
      status: b.status,
      chosen_option: isPending ? "🔒" : b.chosen_option,
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
    const isPending = p.status === "pending";
    return {
      id: p.id,
      matchId: p.match_id,
      status: p.status,
      prono_type: p.prono_type,
      prono_value: isPending ? "🔒" : p.prono_value,
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
  const resolvedCount = allStatuses.length;
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

  const trustScore = profile.trust_score ?? 100;
  const grade = getTrustGrade(trustScore);
  const karma = getKarmaBadge(trustScore);
  const rank = rankDisplayFromDb(profile.rank ?? "Arbitre de District");
  const xpTotal = profile.xp ?? 0;
  const balance = profile.sifflets_balance ?? 0;
  const avatar = profile.avatar_url ?? "🎽";
  const unlockedBadgeIds = (userBadgesData ?? []).map((ub) => ub.badge_id);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-5">
      <div
        className="relative mb-4 overflow-hidden rounded-2xl border border-white/8"
        style={{
          background: "linear-gradient(135deg, #064e3b 0%, #18181b 70%)",
        }}
      >
        <div
          className="pointer-events-none absolute -top-10 -left-10 h-40 w-40 rounded-full bg-emerald-500 opacity-20 blur-3xl"
          aria-hidden
        />
        <div className="relative px-5 py-5">
          <div className="flex items-start gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-3xl ring-2 ring-white/20">
              {avatar.startsWith("http") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatar}
                  alt={profile.username}
                  className="h-20 w-20 rounded-full object-cover"
                />
              ) : (
                avatar
              )}
            </div>
            <div className="min-w-0 flex-1 pt-1">
              <p className="text-xl font-black text-white">
                {profile.username}
              </p>
              <span
                className={`mt-1 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[9px] font-black ${karma.cls}`}
              >
                {karma.emoji} {karma.label}
              </span>
              <p className="mt-1 text-xs text-zinc-500">
                {rank.emoji} {rank.label}
              </p>
              <p className="mt-0.5 text-[11px] font-bold tabular-nums text-zinc-600">
                {xpTotal.toLocaleString("fr-FR")} XP
              </p>
              {favoriteTeam && (
                <div className="mt-1.5 flex items-center gap-1.5">
                  {favoriteTeam.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={favoriteTeam.logo_url}
                      alt={favoriteTeam.name}
                      className="h-4 w-4 object-contain"
                    />
                  ) : (
                    <span className="text-xs">⚽</span>
                  )}
                  <span className="text-[11px] font-bold text-zinc-400">
                    {favoriteTeam.name}
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 rounded-2xl border border-green-500/30 bg-green-500/10 px-4 py-2 shadow-[0_0_20px_rgba(34,197,94,0.3)]">
              <span className="text-2xl font-black tabular-nums text-green-400">
                {balance.toLocaleString("fr-FR")}
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest text-green-500/60">
                Sifflets
              </span>
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[9px] font-black uppercase tracking-widest text-white/40">
                Confiance
              </span>
              <span className={`text-[10px] font-black ${grade.color}`}>
                {grade.icon} {grade.label} · {trustScore}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full rounded-full transition-[width] duration-500 ${grade.bar}`}
                style={{
                  width: `${Math.min(100, (trustScore / 1000) * 100)}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-2">
        <StatCard Icon={Target} label="Réussite" value={`${winRate}%`} />
        <StatCard
          Icon={TrendingUp}
          label="Gagnés"
          value={totalEarned.toLocaleString("fr-FR")}
        />
        <StatCard Icon={Trophy} label="Résultats" value={String(totalBets)} />
      </div>

      <div className="mb-4 flex gap-2">
        <div className="flex-1">
          <FriendButton profileId={id} currentUserId={user.id} />
        </div>
        {friendship && (
          <Link
            href={`/messages/${id}`}
            className="flex items-center gap-2 rounded-xl border border-whistle/30 bg-whistle/10 px-4 py-2.5 text-sm font-bold text-whistle transition hover:bg-whistle/20 active:scale-[0.97]"
          >
            <MessageCircle className="h-4 w-4" />
            Message
          </Link>
        )}
      </div>

      <ProfileClient
        shortBets={shortEntries}
        pronos={pronoEntries}
        allBadges={allBadges ?? []}
        unlockedBadgeIds={unlockedBadgeIds}
        amisContent={<AmisContent currentUserId={id} />}
        refillContent={null}
        winRate={winRate}
        totalBets={totalBets}
        totalEarned={totalEarned}
        xpTotal={xpTotal}
        bestStreak={bestStreak}
        trustScore={trustScore}
        isModerateur={trustScore >= MODERATOR_THRESHOLD}
        scoreAccuracy={scoreAccuracy}
        totalMatchesPronoed={totalMatchesPronoed}
      />
    </main>
  );
}

function StatCard({
  Icon,
  label,
  value,
}: {
  Icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-2xl border border-white/8 bg-zinc-900 px-3 py-3.5">
      <Icon className="h-4 w-4 text-zinc-500" />
      <p className="text-base font-black text-white">{value}</p>
      <p className="text-center text-[10px] font-semibold text-zinc-500">
        {label}
      </p>
    </div>
  );
}
