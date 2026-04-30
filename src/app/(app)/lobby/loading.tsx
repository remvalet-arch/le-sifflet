import { MatchListSkeleton } from "@/components/lobby/MatchCardSkeleton";

export default function LobbyLoading() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
      <MatchListSkeleton />
    </main>
  );
}
