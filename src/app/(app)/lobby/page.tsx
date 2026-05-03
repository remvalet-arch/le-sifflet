import { Suspense } from "react";
import { CalendarX } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { MatchListSkeleton } from "@/components/lobby/MatchCardSkeleton";
import { MatchLobby } from "@/components/lobby/MatchLobby";
import { Onboarding } from "@/components/onboarding/Onboarding";
import {
  fetchLobbyMatchesByRound,
  fetchLobbyMatchesForParisDay,
  parseLobbyRoundParams,
} from "@/lib/lobby-queries";
import { getLobbyCalendarDayYmd } from "@/lib/paris-day";

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

  const { data, error } =
    viewMode === "round" && roundContext != null
      ? await fetchLobbyMatchesByRound(supabase, roundContext.leagueApiId, roundContext.roundShort)
      : await fetchLobbyMatchesForParisDay(supabase);

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-6 text-center text-sm text-red-400">
        Impossible de charger les matchs ({error.message}).
      </div>
    );
  }

  if (data.length === 0) {
    if (viewMode === "round" && roundContext != null) {
      return (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/8 bg-zinc-900 px-6 py-12">
          <CalendarX className="h-10 w-10 text-zinc-600" />
          <p className="text-center text-sm font-semibold text-zinc-400">
            Aucun match pour la journée{" "}
            <span className="font-mono text-chalk">{roundContext.roundShort}</span> (ligue{" "}
            {roundContext.leagueApiId}).
          </p>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/8 bg-zinc-900 px-6 py-12">
        <CalendarX className="h-10 w-10 text-zinc-600" />
        <p className="text-center text-sm font-semibold text-zinc-400">
          Aucun match le <span className="font-mono text-chalk">{getLobbyCalendarDayYmd()}</span> (Paris).
          Lance un import admin (Top 5) pour cette date si besoin.
        </p>
      </div>
    );
  }

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
    />
  );
}

type PageProps = { searchParams: Promise<Search> };

export default async function LobbyPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const roundContext = parseLobbyRoundParams(sp);
  const viewMode = roundContext != null ? "round" : "day";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
        <Suspense
          key={viewMode === "round" && roundContext ? `${roundContext.leagueApiId}-${roundContext.roundShort}` : "day"}
          fallback={<MatchListSkeleton />}
        >
          <MatchListFetcher viewMode={viewMode} roundContext={roundContext} />
        </Suspense>
      </main>

      {needsOnboarding && <Onboarding />}
    </>
  );
}
