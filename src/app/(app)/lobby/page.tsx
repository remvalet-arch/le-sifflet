import { createClient } from "@/lib/supabase/server";
import { MatchCard } from "@/components/lobby/MatchCard";
import { sortMatchesForLobby, type MatchRow } from "@/lib/matches";

export const metadata = { title: "Lobby" };

export default async function LobbyPage() {
  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("matches")
    .select("*")
    .order("start_time", { ascending: true });

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 text-red-200">
        Impossible de charger les matchs ({error.message}).
      </div>
    );
  }

  const matches = sortMatchesForLobby((rows ?? []) as MatchRow[]);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
      <h1 className="text-2xl font-black uppercase tracking-tight text-white">
        Terrain
      </h1>
      <p className="mt-1 text-sm text-green-100/85">
        Choisis un match pour entrer en live.
      </p>
      <ul className="mt-6 flex flex-col gap-3">
        {matches.length === 0 ? (
          <li className="rounded-2xl border border-white/10 bg-black/20 p-6 text-center text-green-100/80">
            Aucun match pour l’instant. Exécute{" "}
            <code className="text-whistle">supabase/seed.sql</code> dans le SQL
            Editor Supabase.
          </li>
        ) : (
          matches.map((m) => (
            <li key={m.id}>
              <MatchCard match={m} />
            </li>
          ))
        )}
      </ul>
    </main>
  );
}
