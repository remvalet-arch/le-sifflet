function MatchCardSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-white/8 bg-zinc-900 p-4">
      <div className="h-2.5 w-24 rounded-full bg-zinc-800" />
      <div className="mt-3 flex items-center justify-between gap-4">
        <div className="h-4 w-28 rounded-full bg-zinc-800" />
        <div className="h-8 w-16 rounded-lg bg-zinc-800" />
        <div className="h-4 w-28 rounded-full bg-zinc-800" />
      </div>
      <div className="mt-3 h-2.5 w-32 rounded-full bg-zinc-800" />
    </div>
  );
}

export default function LobbyLoading() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
      <div className="animate-pulse">
        {/* Section "En Direct" */}
        <div className="mb-5 flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
          <div className="h-2.5 w-16 rounded-full bg-zinc-700" />
        </div>
        <ul className="flex flex-col gap-3">
          <li><MatchCardSkeleton /></li>
          <li><MatchCardSkeleton /></li>
        </ul>

        {/* Section "À venir" */}
        <div className="mb-5 mt-8">
          <div className="h-2.5 w-12 rounded-full bg-zinc-700" />
        </div>
        <ul className="flex flex-col gap-3">
          <li><MatchCardSkeleton /></li>
          <li><MatchCardSkeleton /></li>
          <li><MatchCardSkeleton /></li>
        </ul>
      </div>
    </main>
  );
}
