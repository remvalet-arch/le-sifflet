export default function PronosLoading() {
  return (
    <main className="mx-auto w-full max-w-2xl p-4 pb-6">
      {/* Progress bar skeleton */}
      <div className="mb-4 h-2 w-full animate-pulse rounded-full bg-zinc-800" />

      {/* Filter bar skeleton */}
      <div className="mb-4 flex gap-2 overflow-hidden">
        {[80, 64, 72, 68].map((w, i) => (
          <div
            key={`skeleton-`}
            className="h-8 animate-pulse rounded-full bg-zinc-800"
            style={{ width: w }}
          />
        ))}
      </div>

      {/* Match cards skeleton */}
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={`skeleton-`}
          className="mb-3 rounded-2xl border border-white/8 bg-zinc-900 p-4"
        >
          {/* Teams row */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-1 items-center gap-2">
              <div className="size-8 animate-pulse rounded-full bg-zinc-800" />
              <div className="h-4 w-24 animate-pulse rounded bg-zinc-800" />
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="h-5 w-16 animate-pulse rounded bg-zinc-800" />
              <div className="h-3 w-10 animate-pulse rounded bg-zinc-800" />
            </div>
            <div className="flex flex-1 items-center justify-end gap-2">
              <div className="h-4 w-24 animate-pulse rounded bg-zinc-800" />
              <div className="size-8 animate-pulse rounded-full bg-zinc-800" />
            </div>
          </div>
          {/* Score inputs row */}
          <div className="mt-3 flex items-center justify-center gap-3">
            <div className="h-12 w-14 animate-pulse rounded-xl bg-zinc-800" />
            <div className="size-4 animate-pulse rounded bg-zinc-700" />
            <div className="h-12 w-14 animate-pulse rounded-xl bg-zinc-800" />
          </div>
          {/* Cotes */}
          <div className="mt-3 flex justify-center gap-2">
            {[1, 2, 3].map((j) => (
              <div
                key={j}
                className="h-8 w-16 animate-pulse rounded-xl bg-zinc-800"
              />
            ))}
          </div>
        </div>
      ))}
    </main>
  );
}
