function SkeletonBlock({ h, w }: { h: string; w: string }) {
  return <div className={`${h} ${w} rounded-full bg-zinc-800`} />;
}

export default function MatchLoading() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 animate-pulse px-4 py-6">
      {/* ← Terrain */}
      <SkeletonBlock h="h-4" w="w-20" />

      {/* Scoreboard */}
      <div className="mt-4 overflow-hidden rounded-2xl border border-white/8 bg-zinc-900 px-6 py-8">
        <div className="flex items-center justify-between gap-4">
          <SkeletonBlock h="h-5" w="w-24" />
          <div className="h-12 w-20 rounded-xl bg-zinc-800" />
          <SkeletonBlock h="h-5" w="w-24" />
        </div>
        <div className="mt-4 flex justify-center gap-2">
          <SkeletonBlock h="h-3" w="w-16" />
        </div>
      </div>

      {/* Onglets */}
      <div className="mt-4 flex gap-6 border-b border-white/8 pb-3">
        {[0, 1, 2].map((i) => (
          <SkeletonBlock key={i} h="h-3" w="w-20" />
        ))}
      </div>

      {/* Contenu timeline */}
      <div className="relative mt-6">
        <div className="absolute bottom-0 left-1/2 top-0 w-px -translate-x-1/2 bg-zinc-800" />
        <div className="flex flex-col gap-6">
          {[
            { side: "home", w: "w-28" },
            { side: "away", w: "w-32" },
            { side: "home", w: "w-24" },
          ].map((item, i) => (
            <div key={i} className="relative flex items-start">
              <div className="flex flex-1 justify-end pr-4">
                {item.side === "home" && (
                  <div className={`h-12 ${item.w} rounded-xl bg-zinc-800/80`} />
                )}
              </div>
              <div className="z-10 mt-4 h-3 w-3 shrink-0 rounded-full bg-zinc-700 ring-2 ring-zinc-950" />
              <div className="flex flex-1 justify-start pl-4">
                {item.side === "away" && (
                  <div className={`h-12 ${item.w} rounded-xl bg-zinc-800/80`} />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
