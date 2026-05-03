/** Squelette d'une MatchCard — utilisé dans lobby/loading.tsx et les Suspense boundaries. */
export function MatchCardSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-white/8 bg-zinc-900 p-4">
      {/* Badge statut */}
      <div className="h-2.5 w-24 rounded-full bg-zinc-800" />
      {/* Équipes + score */}
      <div className="mt-3 flex items-center justify-between gap-2 sm:gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="h-8 w-8 shrink-0 rounded-md bg-zinc-800" />
          <div className="h-4 min-w-0 flex-1 rounded-full bg-zinc-800" />
        </div>
        <div className="h-8 w-14 shrink-0 rounded-lg bg-zinc-800" />
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
          <div className="h-4 min-w-0 flex-1 rounded-full bg-zinc-800" />
          <div className="h-8 w-8 shrink-0 rounded-md bg-zinc-800" />
        </div>
      </div>
      {/* Footer */}
      <div className="mt-3 h-2.5 w-32 rounded-full bg-zinc-800" />
    </div>
  );
}

/** Bloc de skeleton pour la liste entière (fallback Suspense). */
export function MatchListSkeleton() {
  return (
    <div>
      {/* Section En Direct */}
      <div className="mb-5 flex items-center gap-2">
        <div className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
        <div className="h-2.5 w-16 rounded-full bg-zinc-700" />
      </div>
      <ul className="flex flex-col gap-3">
        <li><MatchCardSkeleton /></li>
        <li><MatchCardSkeleton /></li>
      </ul>
      {/* Section À venir */}
      <div className="mb-5 mt-8">
        <div className="h-2.5 w-12 rounded-full bg-zinc-700" />
      </div>
      <ul className="flex flex-col gap-3">
        <li><MatchCardSkeleton /></li>
        <li><MatchCardSkeleton /></li>
        <li><MatchCardSkeleton /></li>
      </ul>
    </div>
  );
}
