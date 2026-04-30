import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { MatchRow } from "@/types/database";
import { AdminEventCard } from "./AdminEventCard";
import { MODERATOR_THRESHOLD } from "@/lib/constants/permissions";

export const metadata = { title: "Admin — Résolution des events" };

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

  const matchIds = [...new Set((events ?? []).map((e) => e.match_id))];
  const matchMap = new Map<string, Pick<MatchRow, "team_home" | "team_away">>();

  if (matchIds.length > 0) {
    const { data: matches } = await supabase
      .from("matches")
      .select("id, team_home, team_away")
      .in("id", matchIds);
    (matches ?? []).forEach((m) => matchMap.set(m.id, m));
  }

  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const eventsWithMeta = (events ?? []).map((event) => ({
    event,
    matchName:
      matchMap.get(event.match_id) != null
        ? `${matchMap.get(event.match_id)!.team_home} — ${matchMap.get(event.match_id)!.team_away}`
        : event.match_id.slice(0, 8),
    ageMin: Math.floor((now - new Date(event.created_at).getTime()) / 60_000),
  }));

  return (
    <main className="min-h-screen bg-gray-950 px-4 py-8 text-white">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-black uppercase tracking-widest text-yellow-400">
          Admin — Résolution
        </h1>
        <p className="mt-1 text-sm text-white/50">
          {eventsWithMeta.length} event(s) en attente de résolution
        </p>

        {eventsWithMeta.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-white/50">
            Aucun event ouvert en ce moment.
          </div>
        ) : (
          <div className="mt-6 flex flex-col gap-4">
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
      </div>
    </main>
  );
}
