import { createClient } from "@/lib/supabase/server";
import { MatchCard } from "@/components/lobby/MatchCard";
import { sortMatchesForLobby, type MatchRow } from "@/lib/matches";

export const metadata = { title: "Stade" };

export default async function LobbyPage() {
  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("matches")
    .select("*")
    .order("start_time", { ascending: true });

  if (error) {
    return (
      <div className="px-4 py-8 text-sm text-red-400">
        Impossible de charger les matchs ({error.message}).
      </div>
    );
  }

  const matches = sortMatchesForLobby((rows ?? []) as MatchRow[]);
  const live = matches.filter((m) => m.status === "live");
  const upcoming = matches.filter((m) => m.status === "upcoming");
  const finished = matches.filter((m) => m.status === "finished");

  if (matches.length === 0) {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
        <p className="rounded-2xl border border-white/8 bg-zinc-900 p-6 text-center text-sm text-zinc-500">
          Aucun match pour l&apos;instant.{" "}
          <code className="text-green-500">supabase/seed.sql</code> → SQL Editor.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
      {live.length > 0 && (
        <Section title="🔴 En Direct" matches={live} />
      )}
      {upcoming.length > 0 && (
        <Section title="📅 À venir" matches={upcoming} className={live.length > 0 ? "mt-8" : ""} />
      )}
      {finished.length > 0 && (
        <Section title="Terminés" matches={finished} className="mt-8 opacity-60" />
      )}
    </main>
  );
}

function Section({
  title,
  matches,
  className = "",
}: {
  title: string;
  matches: MatchRow[];
  className?: string;
}) {
  return (
    <section className={className}>
      <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500">
        {title}
      </h2>
      <ul className="mt-3 flex flex-col gap-3">
        {matches.map((m) => (
          <li key={m.id}>
            <MatchCard match={m} />
          </li>
        ))}
      </ul>
    </section>
  );
}
