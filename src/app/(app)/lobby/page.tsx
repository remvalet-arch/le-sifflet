import { Suspense } from "react";
import { CalendarX } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { MatchListSkeleton } from "@/components/lobby/MatchCardSkeleton";
import { MatchLobby } from "@/components/lobby/MatchLobby";
import { Onboarding } from "@/components/onboarding/Onboarding";
import { fetchLobbyMatchesForParisDay } from "@/lib/lobby-queries";
import { getLobbyCalendarDayYmd } from "@/lib/paris-day";

export const metadata = { title: "Stade" };

async function MatchListFetcher() {
  const supabase = await createClient();
  const { data, error } = await fetchLobbyMatchesForParisDay(supabase);

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-6 text-center text-sm text-red-400">
        Impossible de charger les matchs ({error.message}).
      </div>
    );
  }

  if (data.length === 0) {
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

  return <MatchLobby initialMatches={data} />;
}

export default async function LobbyPage() {
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
        <Suspense fallback={<MatchListSkeleton />}>
          <MatchListFetcher />
        </Suspense>
      </main>

      {needsOnboarding && <Onboarding />}
    </>
  );
}
