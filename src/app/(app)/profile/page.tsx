import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { BetRow, MarketEventRow, MatchRow } from "@/types/database";

export const metadata = { title: "Mon profil — Le Sifflet" };

const EVENT_LABELS: Record<string, string> = {
  penalty: "Péno",
  offside: "Hors-jeu",
  card: "Carton",
};

const STATUS_CFG = {
  won: { label: "Gagné", cls: "text-green-400" },
  lost: { label: "Perdu", cls: "text-red-400" },
  pending: { label: "En attente…", cls: "text-yellow-300/80" },
} as const;

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

  const wonCount = bets.filter((b) => b.status === "won").length;
  const winrate =
    bets.length > 0 ? Math.round((wonCount / bets.length) * 100) : 0;

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
      <Link
        href="/lobby"
        className="text-sm font-bold text-whistle underline-offset-2 hover:underline"
      >
        ← Terrain
      </Link>

      {/* Solde */}
      <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-6 text-center shadow-xl">
        <p className="text-xs font-bold uppercase tracking-widest text-green-100/60">
          Ton solde
        </p>
        <p className="mt-1 text-5xl font-black text-whistle">
          {(profile?.sifflets_balance ?? 0).toLocaleString("fr-FR")}
        </p>
        <p className="text-sm font-semibold text-green-100/60">Sifflets</p>
        <div className="mt-4 flex justify-center gap-8 text-sm">
          <div className="text-center">
            <p className="font-black text-white">{bets.length}</p>
            <p className="text-xs text-green-100/50">paris joués</p>
          </div>
          <div className="text-center">
            <p className="font-black text-white">{wonCount}</p>
            <p className="text-xs text-green-100/50">gagnés</p>
          </div>
          <div className="text-center">
            <p className="font-black text-white">{winrate}%</p>
            <p className="text-xs text-green-100/50">victoires</p>
          </div>
        </div>
      </div>

      {/* Historique */}
      <h2 className="mt-6 text-xs font-bold uppercase tracking-widest text-green-100/50">
        Historique des paris
      </h2>

      {bets.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-6 text-center text-sm text-green-100/50">
          Aucun pari encore — fonce sur un match !
        </p>
      ) : (
        <div className="mt-3 flex flex-col gap-3">
          {bets.map((bet) => {
            const event = eventMap.get(bet.event_id);
            const match = event ? matchMap.get(event.match_id) : undefined;
            const cfg =
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
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    {event && (
                      <span className="text-xs font-bold uppercase tracking-widest text-whistle/80">
                        {EVENT_LABELS[event.type] ?? event.type}
                      </span>
                    )}
                    {match && (
                      <p className="truncate text-sm font-bold text-white">
                        {match.team_home} — {match.team_away}
                      </p>
                    )}
                    <p className="mt-0.5 text-xs text-green-100/50">{date}</p>
                  </div>
                  <span className={`shrink-0 text-sm font-black ${cfg.cls}`}>
                    {cfg.label}
                    {bet.status === "won" &&
                      ` +${reward.toLocaleString("fr-FR")}`}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-green-100/60">
                  <span>
                    Choix&nbsp;:{" "}
                    <strong className="uppercase text-white">
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
                    Cote potentielle&nbsp;:{" "}
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
