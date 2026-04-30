import { redirect } from "next/navigation";
import { Info } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { MatchRow } from "@/types/database";
import { AdminEventCard } from "./AdminEventCard";
import { MODERATOR_THRESHOLD } from "@/lib/constants/permissions";

export const metadata = { title: "Admin — Résolution" };

export default async function AdminResolvePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("trust_score")
    .eq("id", user.id)
    .single();

  if (!profile || profile.trust_score < MODERATOR_THRESHOLD) redirect("/lobby");

  // ── 1. Événements VAR ouverts (market_events) ────────────────────────────
  const { data: events } = await supabase
    .from("market_events")
    .select("*")
    .eq("status", "open")
    .order("created_at", { ascending: false });

  const varMatchIds = [...new Set((events ?? []).map((e) => e.match_id))];
  const varMatchMap = new Map<string, Pick<MatchRow, "team_home" | "team_away">>();

  if (varMatchIds.length > 0) {
    const { data: matches } = await supabase
      .from("matches")
      .select("id, team_home, team_away")
      .in("id", varMatchIds);
    (matches ?? []).forEach((m) => varMatchMap.set(m.id, m));
  }

  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const eventsWithMeta = (events ?? []).map((event) => ({
    event,
    matchName:
      varMatchMap.get(event.match_id) != null
        ? `${varMatchMap.get(event.match_id)!.team_home} — ${varMatchMap.get(event.match_id)!.team_away}`
        : event.match_id.slice(0, 8),
    ageMin: Math.floor((now - new Date(event.created_at).getTime()) / 60_000),
  }));

  // ── 2. Matchs en cours avec paris long terme en attente ───────────────────
  const { data: pendingLtbRows } = await supabase
    .from("long_term_bets")
    .select("match_id")
    .eq("status", "pending");

  // Compter les paris par match
  const betsPerMatch: Record<string, number> = {};
  for (const row of pendingLtbRows ?? []) {
    betsPerMatch[row.match_id] = (betsPerMatch[row.match_id] ?? 0) + 1;
  }

  const matchIdsWithBets = Object.keys(betsPerMatch);
  type LiveMatchRow = { id: string; team_home: string; team_away: string; status: string; betCount: number };
  let liveMatchesWithBets: LiveMatchRow[] = [];

  if (matchIdsWithBets.length > 0) {
    const { data: activeMatches } = await supabase
      .from("matches")
      .select("id, team_home, team_away, status")
      .in("id", matchIdsWithBets)
      .neq("status", "finished");

    liveMatchesWithBets = (activeMatches ?? []).map((m) => ({
      ...m,
      betCount: betsPerMatch[m.id] ?? 0,
    }));
  }

  return (
    <main className="min-h-screen bg-gray-950 px-4 py-8 text-white">
      <div className="mx-auto max-w-2xl space-y-10">
        <h1 className="text-2xl font-black uppercase tracking-widest text-yellow-400">
          Admin — Résolution
        </h1>

        {/* ── Section 1 : Événements VAR ───────────────────────────────────── */}
        <section>
          <h2 className="mb-1 text-sm font-black uppercase tracking-widest text-zinc-400">
            🔎 Événements VAR en attente de résolution
          </h2>
          <p className="mb-4 text-xs text-white/40">
            {eventsWithMeta.length} événement(s) ouvert(s)
          </p>

          {eventsWithMeta.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-sm text-white/40">
              Aucun événement VAR ouvert en ce moment.
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {eventsWithMeta.map(({ event, matchName, ageMin }) => (
                <AdminEventCard
                  key={event.id}
                  event={event}
                  matchName={matchName}
                  ageMin={ageMin}
                />
              ))}
            </div>
          )}
        </section>

        {/* ── Section 2 : Matchs avec paris longs en cours ────────────────── */}
        <section>
          <h2 className="mb-1 text-sm font-black uppercase tracking-widest text-zinc-400">
            🏟️ Matchs en cours (Paris Long Terme)
          </h2>
          <p className="mb-4 text-xs text-white/40">
            {liveMatchesWithBets.length} match(s) avec des paris longs en attente
          </p>

          {liveMatchesWithBets.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-sm text-white/40">
              Aucun match actif avec des paris longs en ce moment.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {liveMatchesWithBets.map((m) => (
                <div
                  key={m.id}
                  className="flex items-start gap-4 rounded-2xl border border-white/10 bg-zinc-900/60 px-5 py-4"
                >
                  <div className="flex-1">
                    <p className="font-black text-white">
                      {m.team_home} — {m.team_away}
                    </p>
                    <p className="mt-0.5 text-xs font-semibold text-zinc-500">
                      Statut :{" "}
                      <span className="font-black text-green-400 uppercase tracking-wide">
                        {m.status.replace("_", " ")}
                      </span>
                    </p>
                    <p className="mt-2 text-sm font-bold text-yellow-400">
                      {m.betCount} pari{m.betCount > 1 ? "s" : ""} long{m.betCount > 1 ? "s" : ""} en attente
                    </p>
                  </div>
                  <div className="mt-0.5 flex shrink-0 items-start gap-1.5 rounded-xl border border-blue-500/20 bg-blue-500/10 px-3 py-2">
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-400" />
                    <p className="text-[11px] leading-snug text-blue-300">
                      Résolution automatique lors du<br />
                      <strong>« Fin du match »</strong> dans la LiveRoom
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
