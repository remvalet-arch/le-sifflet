import Link from "next/link";
import { Trophy, TrendingUp, Target, ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { BetRow, MarketEventRow, MatchRow } from "@/types/database";

export const metadata = { title: "Mon profil — Le Sifflet" };

// ── Helpers ──────────────────────────────────────────────────────────────────

const EVENT_LABELS: Record<string, { label: string; emoji: string }> = {
  penalty_check: { label: "Péno ?", emoji: "📢" },
  penalty_outcome: { label: "Résultat péno", emoji: "🥅" },
  var_goal: { label: "Hors-jeu / But", emoji: "🚩" },
  red_card: { label: "Carton rouge", emoji: "🟥" },
  injury_sub: { label: "Blessure ?", emoji: "🚑" },
};

const STATUS_CFG = {
  won: {
    label: "Gagné",
    cls: "bg-green-500/20 text-green-400 border border-green-500/30",
  },
  lost: {
    label: "Perdu",
    cls: "bg-red-500/20 text-red-400 border border-red-500/30",
  },
  pending: {
    label: "En attente",
    cls: "bg-white/5 text-green-100/50 border border-white/10",
  },
} as const;

function getRank(balance: number): {
  label: string;
  emoji: string;
  cls: string;
} {
  if (balance >= 5000)
    return { label: "Légende du Kop", emoji: "👑", cls: "text-yellow-400" };
  if (balance >= 1000)
    return { label: "Titulaire", emoji: "⚽", cls: "text-green-400" };
  return { label: "Remplaçant", emoji: "🪑", cls: "text-white/50" };
}

function getBadges(bets: BetRow[], balance: number) {
  const badges: { emoji: string; name: string; desc: string }[] = [];

  if (bets.length >= 1)
    badges.push({
      emoji: "🟢",
      name: "Premier Sang",
      desc: "Premier pari placé",
    });

  const resolved = bets.filter((b) => b.status !== "pending");
  if (
    resolved.length >= 3 &&
    resolved.slice(0, 3).every((b) => b.status === "won")
  )
    badges.push({
      emoji: "🔥",
      name: "Série de 3",
      desc: "3 victoires consécutives",
    });

  if (balance > 10_000)
    badges.push({
      emoji: "💰",
      name: "Banquier",
      desc: "Solde > 10 000 Sifflets",
    });

  return badges;
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
      .order("placed_at", { ascending: false }),
  ]);

  const bets: BetRow[] = rawBets ?? [];
  const balance = profile?.sifflets_balance ?? 0;

  // Stats
  const wonBets = bets.filter((b) => b.status === "won");
  const totalBets = bets.length;
  const winRate =
    totalBets > 0 ? Math.round((wonBets.length / totalBets) * 100) : 0;
  const totalEarned = wonBets.reduce(
    (sum, b) => sum + Math.round(Number(b.potential_reward)),
    0,
  );

  const rank = getRank(balance);
  const badges = getBadges(bets, balance);

  // Fetch event + match info for history
  const eventMap = new Map<string, MarketEventRow>();
  const matchMap = new Map<string, Pick<MatchRow, "team_home" | "team_away">>();

  const eventIds = [...new Set(bets.map((b) => b.event_id))];
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
      {/* Retour */}
      <Link
        href="/lobby"
        className="inline-flex items-center gap-1 text-sm font-bold text-whistle underline-offset-2 hover:underline"
      >
        <ChevronLeft className="h-4 w-4" />
        Terrain
      </Link>

      {/* Hero : solde + rang */}
      <div className="mt-4 overflow-hidden rounded-3xl border border-white/10 bg-black/40 shadow-2xl">
        <div className="flex flex-col items-center gap-2 px-6 pb-6 pt-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-whistle/15 text-3xl">
            🎽
          </div>
          <p className="text-lg font-black text-white">
            {profile?.username ?? "Joueur"}
          </p>
          <span
            className={`text-sm font-bold ${rank.cls}`}
          >
            {rank.emoji} {rank.label}
          </span>
        </div>

        {/* Solde */}
        <div className="border-t border-white/10 bg-whistle/5 px-6 py-5 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-green-100/50">
            Solde actuel
          </p>
          <p className="mt-1 text-5xl font-black text-whistle">
            {balance.toLocaleString("fr-FR")}
          </p>
          <p className="text-sm font-semibold text-green-100/50">Sifflets</p>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        <StatCard
          Icon={Target}
          label="Réussite"
          value={`${winRate}%`}
        />
        <StatCard
          Icon={TrendingUp}
          label="Total gagné"
          value={totalEarned.toLocaleString("fr-FR")}
        />
        <StatCard
          Icon={Trophy}
          label="Paris"
          value={String(totalBets)}
        />
      </div>

      {/* Badges */}
      {badges.length > 0 && (
        <>
          <h2 className="mt-6 text-xs font-bold uppercase tracking-widest text-green-100/50">
            Badges
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {badges.map((b) => (
              <div
                key={b.name}
                className="flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-4 py-2"
                title={b.desc}
              >
                <span className="text-lg">{b.emoji}</span>
                <span className="text-sm font-bold text-white">{b.name}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Historique */}
      <h2 className="mt-6 text-xs font-bold uppercase tracking-widest text-green-100/50">
        Historique des paris
      </h2>

      {bets.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-6 text-center text-sm text-green-100/50">
          Aucun pari encore — fonce sur un match !
        </p>
      ) : (
        <div className="mt-3 flex flex-col gap-2.5">
          {bets.map((bet) => {
            const event = eventMap.get(bet.event_id);
            const match = event ? matchMap.get(event.match_id) : undefined;
            const eCfg = event
              ? (EVENT_LABELS[event.type] ?? { label: event.type, emoji: "⚡" })
              : { label: "—", emoji: "⚡" };
            const sCfg =
              STATUS_CFG[bet.status as keyof typeof STATUS_CFG] ??
              STATUS_CFG.pending;
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
                className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3"
              >
                {/* Ligne 1 : match + statut */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs text-green-100/50">{date}</p>
                    {match && (
                      <p className="truncate text-sm font-black text-white">
                        {match.team_home} — {match.team_away}
                      </p>
                    )}
                    <p className="mt-0.5 text-xs font-semibold text-whistle/80">
                      {eCfg.emoji} {eCfg.label}
                    </p>
                  </div>
                  <span
                    className={`mt-0.5 shrink-0 rounded-full px-2.5 py-0.5 text-xs font-black ${sCfg.cls}`}
                  >
                    {sCfg.label}
                    {bet.status === "won" &&
                      ` +${reward.toLocaleString("fr-FR")}`}
                  </span>
                </div>

                {/* Ligne 2 : détails du pari */}
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-green-100/50">
                  <span>
                    Choix&nbsp;:{" "}
                    <strong className="font-black uppercase text-white">
                      {bet.chosen_option}
                    </strong>
                  </span>
                  <span>·</span>
                  <span>
                    Mise&nbsp;:{" "}
                    <strong className="text-white">{bet.amount_staked}</strong>{" "}
                    pts
                  </span>
                  <span>·</span>
                  <span>
                    Gain potentiel&nbsp;:{" "}
                    <strong className="text-white">{reward}</strong> pts
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
    <div className="flex flex-col items-center gap-1.5 rounded-2xl border border-white/10 bg-black/30 px-3 py-4">
      <Icon className="h-5 w-5 text-whistle/70" />
      <p className="text-lg font-black text-white">{value}</p>
      <p className="text-center text-xs font-semibold text-green-100/50">
        {label}
      </p>
    </div>
  );
}
