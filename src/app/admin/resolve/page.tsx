import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { MatchRow } from "@/types/database";
import { AdminEventCard } from "./AdminEventCard";
import { ForceResolvePastMatchesButton } from "./ForceResolvePastMatchesButton";
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

  const { data: events } = await supabase
    .from("market_events")
    .select("*")
    .eq("status", "open")
    .order("created_at", { ascending: false });

  const varMatchIds = [...new Set((events ?? []).map((e) => e.match_id))];
  const varMatchMap = new Map<
    string,
    Pick<MatchRow, "team_home" | "team_away">
  >();

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

  return (
    <main className="min-h-screen bg-gray-950 px-4 py-8 text-white">
      <div className="mx-auto max-w-2xl space-y-10">
        <h1 className="text-2xl font-black uppercase tracking-widest text-yellow-400">
          Admin — Résolution
        </h1>

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

        <section>
          <h2 className="mb-1 text-sm font-black uppercase tracking-widest text-zinc-400">
            🔁 Rattrapage des matchs terminés
          </h2>
          <p className="mb-4 text-xs text-white/40">
            Résout en lot tous les pronos et paris long terme encore en attente
            sur des matchs déjà terminés.
          </p>
          <ForceResolvePastMatchesButton />
        </section>
      </div>
    </main>
  );
}
