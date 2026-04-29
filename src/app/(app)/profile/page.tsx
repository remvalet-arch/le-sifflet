import { Target, TrendingUp, Trophy, Shield } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { RefillButton } from "@/components/profile/RefillButton";
import type { BetRow, MarketEventRow, MatchRow } from "@/types/database";

export const metadata = { title: "Mon Profil" };

// ── Helpers ──────────────────────────────────────────────────────────────────

const EVENT_LABELS: Record<string, { label: string; emoji: string }> = {
  penalty_check: { label: "Péno ?", emoji: "📢" },
  penalty_outcome: { label: "Résultat péno", emoji: "🥅" },
  var_goal: { label: "Hors-jeu / But", emoji: "🚩" },
  red_card: { label: "Carton rouge", emoji: "🟥" },
  injury_sub: { label: "Blessure ?", emoji: "🚑" },
};

const BET_STATUS = {
  won: { label: "Gagné", cls: "bg-green-500/20 text-green-400 border-green-500/30" },
  lost: { label: "Perdu", cls: "bg-red-500/20 text-red-400 border-red-500/30" },
  pending: { label: "En attente", cls: "bg-zinc-800 text-zinc-400 border-white/10" },
} as const;

function getTrustGrade(score: number) {
  if (score >= 200)
    return { label: "Arbitre Élite", icon: "🏅", color: "text-yellow-400", bar: "bg-yellow-400" };
  if (score >= 100)
    return { label: "Arbitre Officiel", icon: "✅", color: "text-green-400", bar: "bg-green-500" };
  if (score >= 50)
    return { label: "Lanceur d'Alerte", icon: "⚡", color: "text-blue-400", bar: "bg-blue-400" };
  return { label: "Carton Jaune", icon: "⚠️", color: "text-orange-400", bar: "bg-orange-400" };
}

function getRank(balance: number) {
  if (balance >= 5000) return { label: "Légende du Kop", emoji: "👑" };
  if (balance >= 1000) return { label: "Titulaire", emoji: "⚽" };
  return { label: "Remplaçant", emoji: "🪑" };
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, { data: rawBets }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase
      .from("bets")
      .select("*")
      .eq("user_id", user.id)
      .order("placed_at", { ascending: false })
      .limit(20),
  ]);

  const bets: BetRow[] = rawBets ?? [];
  const balance = profile?.sifflets_balance ?? 0;
  const trustScore = profile?.trust_score ?? 100;

  // Stats
  const wonBets = bets.filter((b) => b.status === "won");
  const resolvedBets = bets.filter((b) => b.status !== "pending");
  const winRate = resolvedBets.length > 0
    ? Math.round((wonBets.length / resolvedBets.length) * 100)
    : 0;
  const totalEarned = wonBets.reduce((s, b) => s + Math.round(Number(b.potential_reward)), 0);

  // Refill eligibility
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

  const grade = getTrustGrade(trustScore);
  const rank = getRank(balance);

  // Bet history enrichment
  const eventIds = [...new Set(bets.map((b) => b.event_id))];
  const eventMap = new Map<string, MarketEventRow>();
  const matchMap = new Map<string, Pick<MatchRow, "team_home" | "team_away">>();

  if (eventIds.length > 0) {
    const { data: events } = await supabase
      .from("market_events")
      .select("*")
      .in("id", eventIds);
    (events ?? []).forEach((e) => eventMap.set(e.id, e));

    const matchIds = [...new Set((events ?? []).map((e) => e.match_id))];
    if (matchIds.length > 0) {
      const { data: matches } = await supabase
        .from("matches")
        .select("id, team_home, team_away")
        .in("id", matchIds);
      (matches ?? []).forEach((m) => matchMap.set(m.id, m));
    }
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
      {/* Hero */}
      <div className="overflow-hidden rounded-2xl border border-white/8 bg-zinc-900">
        <div className="flex flex-col items-center gap-2 px-6 pb-5 pt-7">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800 text-3xl">
            🎽
          </div>
          <p className="text-lg font-black text-white">
            {profile?.username ?? "Joueur"}
          </p>
          <span className="text-sm font-bold text-zinc-400">
            {rank.emoji} {rank.label}
          </span>
        </div>
        <div className="border-t border-white/8 bg-green-500/5 px-6 py-5 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">
            Solde actuel
          </p>
          <p className="mt-1 text-5xl font-black text-white">
            {balance.toLocaleString("fr-FR")}
          </p>
          <p className="text-sm font-semibold text-zinc-500">Sifflets</p>
        </div>
      </div>

      {/* Refill */}
      {balance < REFILL_THRESHOLD && (
        <RefillButton isEligible={isRefillEligible} nextRefillAt={nextRefillAt} />
      )}

      {/* Stats */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        <StatCard Icon={Target} label="Réussite" value={`${winRate}%`} />
        <StatCard Icon={TrendingUp} label="Gagné" value={totalEarned.toLocaleString("fr-FR")} />
        <StatCard Icon={Trophy} label="Paris" value={String(bets.length)} />
      </div>

      {/* Trust score */}
      <div className="mt-4 rounded-2xl border border-white/8 bg-zinc-900 px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">
              Score de confiance
            </p>
            <p className={`mt-1 text-3xl font-black tabular-nums ${grade.color}`}>
              {trustScore}
            </p>
            <p className="mt-0.5 flex items-center gap-1.5 text-sm font-bold text-white">
              <span>{grade.icon}</span>
              {grade.label}
            </p>
          </div>
          <Shield className={`mt-1 h-8 w-8 shrink-0 ${grade.color}`} />
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-800">
          <div
            className={`h-full rounded-full transition-[width] duration-500 ${grade.bar}`}
            style={{ width: `${Math.min(100, (trustScore / 1000) * 100)}%` }}
          />
        </div>
        <p className="mt-1.5 text-right text-[10px] text-zinc-600">/ 1000</p>
      </div>

      {/* Bet history */}
      <h2 className="mt-6 text-xs font-bold uppercase tracking-widest text-zinc-500">
        Historique des paris
      </h2>

      {bets.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-white/8 bg-zinc-900 p-6 text-center text-sm text-zinc-600">
          Aucun pari encore — fonce sur un match !
        </p>
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          {bets.map((bet) => {
            const event = eventMap.get(bet.event_id);
            const match = event ? matchMap.get(event.match_id) : undefined;
            const eCfg = event
              ? (EVENT_LABELS[event.type] ?? { label: event.type, emoji: "⚡" })
              : { label: "—", emoji: "⚡" };
            const sCfg = BET_STATUS[bet.status as keyof typeof BET_STATUS] ?? BET_STATUS.pending;
            const reward = Math.round(Number(bet.potential_reward));
            const date = new Date(bet.placed_at).toLocaleString("fr-FR", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <div
                key={bet.id}
                className="rounded-xl border border-white/6 bg-zinc-900 px-4 py-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] text-zinc-600">{date}</p>
                    {match && (
                      <p className="truncate text-sm font-bold text-white">
                        {match.team_home} — {match.team_away}
                      </p>
                    )}
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {eCfg.emoji} {eCfg.label}
                    </p>
                  </div>
                  <span
                    className={`mt-0.5 shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-black ${sCfg.cls}`}
                  >
                    {sCfg.label}
                    {bet.status === "won" && ` +${reward.toLocaleString("fr-FR")}`}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-zinc-600">
                  <span>
                    Choix{" "}
                    <strong className="font-black uppercase text-white">
                      {bet.chosen_option}
                    </strong>
                  </span>
                  <span>·</span>
                  <span>
                    Mise{" "}
                    <strong className="text-zinc-300">{bet.amount_staked}</strong> pts
                  </span>
                  <span>·</span>
                  <span>
                    Gain pot.{" "}
                    <strong className="text-zinc-300">{reward}</strong> pts
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
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
    <div className="flex flex-col items-center gap-1.5 rounded-2xl border border-white/8 bg-zinc-900 px-3 py-4">
      <Icon className="h-5 w-5 text-zinc-500" />
      <p className="text-lg font-black text-white">{value}</p>
      <p className="text-center text-xs font-semibold text-zinc-500">{label}</p>
    </div>
  );
}
