/**
 * Reusable skeleton loader variants for consistent loading states.
 * Replaces text "Chargement…" everywhere in the app.
 */

export function SkeletonList({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex animate-pulse items-center gap-3 rounded-2xl border border-white/8 bg-zinc-900 p-4"
        >
          <div className="size-9 shrink-0 rounded-full bg-zinc-800" />
          <div className="flex flex-1 flex-col gap-1.5">
            <div className="h-3 w-2/3 rounded bg-zinc-800" />
            <div className="h-2.5 w-1/3 rounded bg-zinc-800" />
          </div>
          <div className="h-6 w-12 rounded-lg bg-zinc-800" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="animate-pulse rounded-2xl border border-white/8 bg-zinc-900 overflow-hidden">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? "border-t border-white/8" : ""}`}
        >
          <div className="h-3 w-5 rounded bg-zinc-800" />
          <div className="size-6 shrink-0 rounded-full bg-zinc-800" />
          <div className="h-3 flex-1 rounded bg-zinc-800" />
          <div className="h-3 w-8 rounded bg-zinc-800" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonMatchCard() {
  return (
    <div className="animate-pulse rounded-2xl border border-white/8 bg-zinc-900 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-full bg-zinc-800" />
          <div className="h-3.5 w-20 rounded bg-zinc-800" />
        </div>
        <div className="h-5 w-14 rounded-lg bg-zinc-800" />
        <div className="flex items-center gap-2">
          <div className="h-3.5 w-20 rounded bg-zinc-800" />
          <div className="size-8 rounded-full bg-zinc-800" />
        </div>
      </div>
      <div className="mt-3 h-2 w-full rounded-full bg-zinc-800" />
    </div>
  );
}
