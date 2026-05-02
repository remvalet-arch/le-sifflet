import { Suspense } from "react";
import { CalendarX } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { MatchCard } from "@/components/lobby/MatchCard";
import { MatchListSkeleton } from "@/components/lobby/MatchCardSkeleton";
import { Onboarding } from "@/components/onboarding/Onboarding";
import { sortMatchesForLobby, isLobbyLiveStatus, type MatchRow } from "@/lib/matches";

export const metadata = { title: "Stade" };

// ── Sous-composant async — isolé dans un Suspense pour le streaming ───────────

async function MatchListFetcher() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("matches")
    .select("*")
    .order("start_time", { ascending: true });

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-6 text-center text-sm text-red-400">
        Impossible de charger les matchs ({error.message}).
      </div>
    );
  }

  const matches = sortMatchesForLobby((data ?? []) as MatchRow[]);

  const liveMatches = matches.filter((m) => isLobbyLiveStatus(m.status));
  const upcomingMatches = matches.filter((m) => m.status === "upcoming");
  const finishedMatches = matches.filter((m) => m.status === "finished");

  if (matches.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/8 bg-zinc-900 px-6 py-12">
        <CalendarX className="h-10 w-10 text-zinc-600" />
        <p className="text-center text-sm font-semibold text-zinc-400">
          Aucun match prévu aujourd&apos;hui. Va t&apos;échauffer&nbsp;!
        </p>
      </div>
    );
  }

  return (
    <>
      {liveMatches.length > 0 && (
        <Section title="En Direct" live matches={liveMatches} />
      )}
      {upcomingMatches.length > 0 && (
        <Section
          title="À venir"
          matches={upcomingMatches}
          className={liveMatches.length > 0 ? "mt-8" : ""}
        />
      )}
      {finishedMatches.length > 0 && (
        <Section title="Terminés" matches={finishedMatches} className="mt-8 opacity-50" />
      )}
    </>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function LobbyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Seule vérification rapide ici — le fetch des matchs est délégué à MatchListFetcher
  const { data: profileData } = user
    ? await supabase
        .from("profiles")
        .select("has_onboarded")
        .eq("id", user.id)
        .single()
    : { data: null };

  const needsOnboarding = profileData?.has_onboarded === false;

  return (
    <>
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
        {/* Suspense : affiche le skeleton pendant le fetch des matchs */}
        <Suspense fallback={<MatchListSkeleton />}>
          <MatchListFetcher />
        </Suspense>
      </main>

      {needsOnboarding && <Onboarding />}
    </>
  );
}

// ── Section helper ────────────────────────────────────────────────────────────

function Section({
  title,
  matches,
  live = false,
  className = "",
}: {
  title: string;
  matches: MatchRow[];
  live?: boolean;
  className?: string;
}) {
  return (
    <section className={className}>
      <div className="flex items-center gap-2">
        {live && (
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
          </span>
        )}
        <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500">
          {title}
        </h2>
      </div>
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
