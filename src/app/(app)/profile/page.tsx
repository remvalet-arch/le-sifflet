import { Target, TrendingUp, Trophy, Shield } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { RefillButton } from "@/components/profile/RefillButton";
import { BadgeUnlockListener } from "@/components/profile/BadgeUnlockListener";
import { ProfileClient } from "@/components/profile/ProfileClient";
import type { ShortBetEntry, LongBetEntry } from "@/components/profile/ProfileClient";
import { checkAndUnlockBadges } from "@/app/actions/badges";
import { MODERATOR_THRESHOLD } from "@/lib/constants/permissions";
import type { BetRow, LongTermBetRow, MarketEventRow, MatchRow } from "@/types/database";

export const metadata = { title: "Mon Profil" };

// ── Helpers ──────────────────────────────────────────────────────────────────

function getTrustGrade(score: number) {
  if (score >= 200) return { label: "Arbitre Élite",    icon: "🏅", color: "text-yellow-400", bar: "bg-yellow-400" };
  if (score >= 100) return { label: "Arbitre Officiel", icon: "✅", color: "text-green-400",  bar: "bg-green-500"  };
  if (score >= 50)  return { label: "Lanceur d'Alerte", icon: "⚡", color: "text-blue-400",   bar: "bg-blue-400"   };
  return             { label: "Carton Jaune",     icon: "⚠️", color: "text-orange-400", bar: "bg-orange-400" };
}

function getKarmaBadge(score: number) {
  if (score >= MODERATOR_THRESHOLD)
    return { emoji: "🛡️", label: "Modérateur",  cls: "border border-yellow-500/50 text-yellow-400 bg-yellow-500/10" };
  if (score >= 50)
    return { emoji: "📢", label: "Supporteur",   cls: "border border-white/10 text-zinc-400 bg-zinc-800" };
  return   { emoji: "🟨", label: "Carton Jaune", cls: "border border-orange-500/30 text-orange-400 bg-orange-500/10" };
}

function getRank(balance: number) {
  if (balance >= 5000) return { label: "Légende du Kop", emoji: "👑" };
  if (balance >= 1000) return { label: "Titulaire",       emoji: "⚽" };
  return                      { label: "Remplaçant",      emoji: "🪑" };
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [
    { data: profile },
    { data: rawShortBets },
    { data: rawLongBets },
    { data: allBadges },
    { data: userBadgesData },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("bets").select("*").eq("user_id", user.id).order("placed_at", { ascending: false }).limit(30),
    supabase.from("long_term_bets").select("*").eq("user_id", user.id).order("placed_at", { ascending: false }).limit(30),
    supabase.from("badges").select("*").order("created_at"),
    supabase.from("user_badges").select("badge_id").eq("user_id", user.id),
  ]);

  void checkAndUnlockBadges(user.id);

  const shortBets: BetRow[]         = rawShortBets ?? [];
  const longBets:  LongTermBetRow[] = rawLongBets  ?? [];
  const balance    = profile?.sifflets_balance ?? 0;
  const trustScore = profile?.trust_score      ?? 100;

  // Enrich short bets
  const eventIds = [...new Set(shortBets.map((b) => b.event_id))];
  const eventMap = new Map<string, MarketEventRow>();
  const matchMap = new Map<string, Pick<MatchRow, "id" | "team_home" | "team_away">>();

  if (eventIds.length > 0) {
    const { data: events } = await supabase.from("market_events").select("*").in("id", eventIds);
    (events ?? []).forEach((e) => eventMap.set(e.id, e));

    const fromShortMatchIds = [...new Set((events ?? []).map((e) => e.match_id))];
    const fromLongMatchIds  = [...new Set(longBets.map((b) => b.match_id))];
    const allMatchIds = [...new Set([...fromShortMatchIds, ...fromLongMatchIds])];
    if (allMatchIds.length > 0) {
      const { data: matches } = await supabase.from("matches").select("id, team_home, team_away").in("id", allMatchIds);
      (matches ?? []).forEach((m) => matchMap.set(m.id, m));
    }
  } else if (longBets.length > 0) {
    const longMatchIds = [...new Set(longBets.map((b) => b.match_id))];
    const { data: matches } = await supabase.from("matches").select("id, team_home, team_away").in("id", longMatchIds);
    (matches ?? []).forEach((m) => matchMap.set(m.id, m));
  }

  // Build flat serializable entries for ProfileClient
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

  const longEntries: LongBetEntry[] = longBets.map((b) => {
    const match = matchMap.get(b.match_id);
    return {
      id: b.id,
      status: b.status,
      bet_type: b.bet_type,
      bet_value: b.bet_value,
      amount_staked: b.amount_staked,
      potential_reward: Number(b.potential_reward),
      placed_at: b.placed_at,
      teamHome: match?.team_home,
      teamAway: match?.team_away,
    };
  });

  // Stats (all bets)
  const allStatuses  = [...shortBets.map((b) => b.status), ...longBets.map((b) => b.status)];
  const totalBets    = allStatuses.length;
  const wonCount     = allStatuses.filter((s) => s === "won").length;
  const resolvedCount = allStatuses.filter((s) => s !== "pending").length;
  const winRate      = resolvedCount > 0 ? Math.round((wonCount / resolvedCount) * 100) : 0;
  const totalEarned  =
    shortBets.filter((b) => b.status === "won").reduce((s, b) => s + Math.round(Number(b.potential_reward)), 0) +
    longBets.filter((b)  => b.status === "won").reduce((s, b) => s + Math.round(Number(b.potential_reward)), 0);

  const REFILL_THRESHOLD = 500;
  // eslint-disable-next-line react-hooks/purity
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const isRefillEligible =
    balance < REFILL_THRESHOLD &&
    (!profile?.last_refill_date || new Date(profile.last_refill_date) < cutoff);
  const nextRefillAt =
    !isRefillEligible && balance < REFILL_THRESHOLD && profile?.last_refill_date
      ? new Date(new Date(profile.last_refill_date).getTime() + 24 * 60 * 60 * 1000).toISOString()
      : null;

  const grade  = getTrustGrade(trustScore);
  const karma  = getKarmaBadge(trustScore);
  const rank   = getRank(balance);
  const unlockedBadgeIds = (userBadgesData ?? []).map((ub) => ub.badge_id);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-5">
      <BadgeUnlockListener userId={user.id} />

      {/* ── Hero compact ── */}
      <div className="overflow-hidden rounded-2xl border border-white/8 bg-zinc-900">
        <div className="flex items-center gap-4 px-5 py-4">
          {/* Avatar */}
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-2xl">
            🎽
          </div>
          {/* Info */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-black text-white">{profile?.username ?? "Joueur"}</p>
              <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-black ${karma.cls}`}>
                {karma.emoji} {karma.label}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-zinc-500">
              {rank.emoji} {rank.label}
            </p>
          </div>
          {/* Balance */}
          <div className="text-right">
            <p className="text-2xl font-black tabular-nums text-white">
              {balance.toLocaleString("fr-FR")}
            </p>
            <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">
              Sifflets
            </p>
          </div>
        </div>

        {/* Trust bar (compact) */}
        <div className="border-t border-white/8 px-5 py-3">
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
              style={{ width: `${Math.min(100, (trustScore / 1000) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Refill */}
      {balance < REFILL_THRESHOLD && (
        <RefillButton isEligible={isRefillEligible} nextRefillAt={nextRefillAt} />
      )}

      {/* Stats */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        <StatCard Icon={Target}    label="Réussite" value={`${winRate}%`}                           />
        <StatCard Icon={TrendingUp} label="Gagnés"  value={totalEarned.toLocaleString("fr-FR")}      />
        <StatCard Icon={Trophy}    label="Paris"    value={String(totalBets)}                        />
      </div>

      {/* Trust score bouton modérateur */}
      {trustScore >= MODERATOR_THRESHOLD && (
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-yellow-500/20 bg-yellow-500/5 px-4 py-2.5">
          <Shield className="h-4 w-4 shrink-0 text-yellow-400" />
          <p className="text-xs font-bold text-yellow-400">
            Accès Modérateur activé — tu peux forcer les résultats VAR
          </p>
        </div>
      )}

      {/* Tabs : Paris VAR / Prédictions / Trophées */}
      <ProfileClient
        shortBets={shortEntries}
        longBets={longEntries}
        allBadges={allBadges ?? []}
        unlockedBadgeIds={unlockedBadgeIds}
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
      <p className="text-center text-[10px] font-semibold text-zinc-500">{label}</p>
    </div>
  );
}
