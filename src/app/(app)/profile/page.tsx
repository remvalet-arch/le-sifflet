import { Target, TrendingUp, Trophy, Shield } from "lucide-react";
import { AmisContent } from "@/components/profile/AmisContent";
import { createClient } from "@/lib/supabase/server";
import { RefillButton } from "@/components/profile/RefillButton";
import { BadgeUnlockListener } from "@/components/profile/BadgeUnlockListener";
import { ProfileClient } from "@/components/profile/ProfileClient";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
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
} from "@/types/database";

export const metadata = { title: "Mon Profil" };

// ── Helpers ──────────────────────────────────────────────────────────────────

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

/** Emoji d'accroche — le libellé officiel vient de `profiles.rank` (XP en base). */
function rankDisplayFromDb(rankLabel: string): {
  emoji: string;
  label: string;
} {
  const t = rankLabel.toLowerCase();
  if (t.includes("boss")) return { emoji: "👑", label: rankLabel };
  if (t.includes("argent")) return { emoji: "🥈", label: rankLabel };
  if (t.includes("bronze")) return { emoji: "🥉", label: rankLabel };
  return { emoji: "🪑", label: rankLabel };
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Profil en premier pour obtenir favorite_team_id
  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, username, avatar_url, sifflets_balance, trust_score, rank, xp, favorite_team_id, last_refill_date",
    )
    .eq("id", user.id)
    .single();

  const [
    { data: rawShortBets },
    { data: rawPronos },
    { data: allBadges },
    { data: userBadgesData },
    { data: favoriteTeamData },
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
    supabase.from("badges").select("*").order("created_at"),
    supabase.from("user_badges").select("badge_id").eq("user_id", user.id),
    profile?.favorite_team_id
      ? supabase
          .from("teams")
          .select("id, name, logo_url")
          .eq("id", profile.favorite_team_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const favoriteTeam: {
    id: string;
    name: string;
    logo_url: string | null;
  } | null = favoriteTeamData ?? null;

  void checkAndUnlockBadges(user.id);

  const shortBets: BetRow[] = rawShortBets ?? [];
  const pronos: PronoRow[] = rawPronos ?? [];
  const balance = profile?.sifflets_balance ?? 0;
  const trustScore = profile?.trust_score ?? 100;

  const eventIds = [...new Set(shortBets.map((b) => b.event_id))];
  const eventMap = new Map<string, MarketEventRow>();
  const matchMap = new Map<
    string,
    Pick<MatchRow, "id" | "team_home" | "team_away">
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
        .select("id, team_home, team_away")
        .in("id", allMatchIds);
      (matches ?? []).forEach((m) => matchMap.set(m.id, m));
    }
  } else if (pronoMatchIds.length > 0) {
    const { data: matches } = await supabase
      .from("matches")
      .select("id, team_home, team_away")
      .in("id", pronoMatchIds);
    (matches ?? []).forEach((m) => matchMap.set(m.id, m));
  }

  const shortEntries: ShortBetEntry[] = shortBets.map((b) => {
    const event = eventMap.get(b.event_id);
    const match = event ? matchMap.get(event.match_id) : undefined;
    return {
      id: b.id,
      status: b.status,
      chosen_option: b.chosen_option,
      amount_staked: b.amount_staked,
      potential_reward: Number(b.potential_reward),
      placed_at: b.placed_at,
      eventType: event?.type,
      teamHome: match?.team_home,
      teamAway: match?.team_away,
    };
  });

  const pronoEntries: PronoEntry[] = pronos.map((p) => {
    const match = matchMap.get(p.match_id);
    return {
      id: p.id,
      status: p.status,
      prono_type: p.prono_type,
      prono_value: p.prono_value,
      reward_amount: p.reward_amount,
      points_earned: p.points_earned,
      contre_pied_bonus: p.contre_pied_bonus,
      placed_at: p.placed_at,
      teamHome: match?.team_home,
      teamAway: match?.team_away,
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

  const grade = getTrustGrade(trustScore);
  const karma = getKarmaBadge(trustScore);
  const rank = rankDisplayFromDb(profile?.rank ?? "Arbitre de District");
  const xpTotal = profile?.xp ?? 0;
  const unlockedBadgeIds = (userBadgesData ?? []).map((ub) => ub.badge_id);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-5">
      <BadgeUnlockListener userId={user.id} />

      <ProfileClient
        shortBets={shortEntries}
        pronos={pronoEntries}
        allBadges={allBadges ?? []}
        unlockedBadgeIds={unlockedBadgeIds}
        amisContent={<AmisContent currentUserId={user.id} />}
        vestiaireContent={
          <div className="flex flex-col gap-3">
            <ProfileHeader
              username={profile?.username ?? "Joueur"}
              avatarUrl={profile?.avatar_url ?? null}
              favoriteTeam={favoriteTeam}
              karma={karma}
              rank={rank}
              xpTotal={xpTotal}
              balance={balance}
            />

            <div className="overflow-hidden rounded-2xl border border-white/8 bg-zinc-900 px-5 py-3">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">
                  Confiance
                </span>
                <span className={`text-[10px] font-black ${grade.color}`}>
                  {grade.icon} {grade.label} · {trustScore}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className={`h-full rounded-full transition-[width] duration-500 ${grade.bar}`}
                  style={{
                    width: `${Math.min(100, (trustScore / 1000) * 100)}%`,
                  }}
                />
              </div>
            </div>

            {balance < REFILL_THRESHOLD && (
              <RefillButton
                isEligible={isRefillEligible}
                nextRefillAt={nextRefillAt}
              />
            )}

            <div className="overflow-hidden rounded-2xl border border-white/8 bg-zinc-900/60">
              <div className="flex items-center divide-x divide-white/8">
                <StatItem
                  Icon={Target}
                  label="Réussite"
                  value={`${winRate}%`}
                />
                <StatItem
                  Icon={TrendingUp}
                  label="Gagnés"
                  value={totalEarned.toLocaleString("fr-FR")}
                />
                <StatItem
                  Icon={Trophy}
                  label="Paris"
                  value={String(totalBets)}
                />
              </div>
            </div>

            {trustScore >= MODERATOR_THRESHOLD && (
              <div className="flex items-center gap-2 rounded-xl border border-yellow-500/20 bg-yellow-500/5 px-4 py-2.5">
                <Shield className="h-4 w-4 shrink-0 text-yellow-400" />
                <p className="text-xs font-bold text-yellow-400">
                  Accès Modérateur activé — tu peux forcer les résultats VAR
                </p>
              </div>
            )}
          </div>
        }
      />
    </main>
  );
}

function StatItem({
  Icon,
  label,
  value,
}: {
  Icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-1 flex-col items-center gap-1 px-3 py-4">
      <Icon className="h-4 w-4 text-zinc-500" />
      <p className="text-base font-black text-white">{value}</p>
      <p className="text-center text-[10px] font-semibold text-zinc-500">
        {label}
      </p>
    </div>
  );
}
