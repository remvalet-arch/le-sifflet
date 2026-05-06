import { Suspense } from "react";
import { CalendarX } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { MatchListSkeleton } from "@/components/lobby/MatchCardSkeleton";
import { MatchLobby } from "@/components/lobby/MatchLobby";
import { OnboardingTour } from "@/components/onboarding/OnboardingTour";
import {
  fetchLobbyMatchesByRound,
  fetchLobbyMatchesForParisDayWithFallback,
  parseLobbyRoundParams,
} from "@/lib/lobby-queries";
import { formatParisYmdLongFr } from "@/lib/paris-day";
// OnboardingTour gère son propre état via localStorage — pas besoin de requête DB ici.

export const metadata = { title: "Stade" };

type Search = Record<string, string | string[] | undefined>;

async function MatchListFetcher({
  viewMode,
  roundContext,
}: {
  viewMode: "day" | "round";
  roundContext: { leagueApiId: number; roundShort: string } | null;
}) {
  const supabase = await createClient();

  const roundFetch =
    viewMode === "round" && roundContext != null
      ? await fetchLobbyMatchesByRound(
          supabase,
          roundContext.leagueApiId,
          roundContext.roundShort,
        )
      : null;
  const dayFetch =
    viewMode === "round" && roundContext != null
      ? null
      : await fetchLobbyMatchesForParisDayWithFallback(supabase);

  const data = roundFetch?.data ?? dayFetch?.data ?? [];
  const error = roundFetch?.error ?? dayFetch?.error ?? null;
  const dayMeta = dayFetch?.meta;

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-6 text-center text-sm text-red-400">
        Impossible de charger les matchs ({error.message}).
      </div>
    );
  }

  if (data.length === 0 && viewMode === "round" && roundContext != null) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/8 bg-zinc-900 px-6 py-12">
        <CalendarX className="h-10 w-10 text-zinc-600" />
        <p className="text-center text-sm font-semibold text-zinc-400">
          Aucun match pour la journée{" "}
          <span className="font-mono text-chalk">
            {roundContext.roundShort}
          </span>{" "}
          (ligue {roundContext.leagueApiId}).
        </p>
      </div>
    );
  }

  const dayFallbackBanner =
    viewMode === "day" && dayMeta?.isFallback === true && data.length > 0
      ? { shownDayLabelFr: formatParisYmdLongFr(dayMeta.shownParisDayYmd) }
      : null;

  return (
    <MatchLobby
      key={
        viewMode === "round" && roundContext != null
          ? `round-${roundContext.leagueApiId}-${roundContext.roundShort}`
          : "day"
      }
      initialMatches={data}
      viewMode={viewMode}
      roundContext={roundContext}
      dayFallbackBanner={dayFallbackBanner}
    />
  );
}

type PageProps = { searchParams: Promise<Search> };

export default async function LobbyPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const roundContext = parseLobbyRoundParams(sp);
  const viewMode = roundContext != null ? "round" : "day";

  return (
    <>
      <main className="mx-auto w-full max-w-2xl flex-1 bg-zinc-950 px-4 py-6">
        <Suspense
          key={
            viewMode === "round" && roundContext
              ? `${roundContext.leagueApiId}-${roundContext.roundShort}`
              : "day"
          }
          fallback={<MatchListSkeleton />}
        >
          <MatchListFetcher viewMode={viewMode} roundContext={roundContext} />
        </Suspense>
      </main>

      <OnboardingTour />
    </>
  );
}
