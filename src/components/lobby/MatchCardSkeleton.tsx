/** Squelette d'une MatchCard — utilisé dans lobby/loading.tsx et les Suspense boundaries. */
export function MatchCardSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-white/8 bg-zinc-900 p-4">
      {/* Badge statut */}
      <div className="h-2.5 w-24 rounded-full bg-zinc-800" />
      {/* Équipes + score */}
      <div className="mt-3 flex items-center justify-between gap-4">
        <div className="h-4 w-28 rounded-full bg-zinc-800" />
        <div className="h-8 w-16 rounded-lg bg-zinc-800" />
        <div className="h-4 w-28 rounded-full bg-zinc-800" />
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
