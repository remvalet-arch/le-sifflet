function SkeletonBlock({
  h,
  w,
  cls = "",
}: {
  h: string;
  w: string;
  cls?: string;
}) {
  return <div className={`${h} ${w} rounded-full bg-zinc-800 ${cls}`} />;
}

export default function LeaderboardLoading() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 animate-pulse px-4 py-8">
      {/* Titre */}
      <SkeletonBlock h="h-6" w="w-40" cls="mb-8" />

      {/* Podium */}
      <div className="mb-8 flex items-end justify-center gap-4">
        {[56, 72, 56].map((h, i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <div className="h-12 w-12 rounded-full bg-zinc-800" />
            <SkeletonBlock h="h-3" w="w-16" />
            <div
              className="w-20 rounded-t-xl bg-zinc-800"
              style={{ height: h }}
            />
          </div>
        ))}
      </div>

      {/* Lignes classement */}
      <div className="flex flex-col gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-xl border border-white/6 bg-zinc-900 px-4 py-3"
          >
            <SkeletonBlock h="h-4" w="w-6" />
            <div className="h-8 w-8 rounded-full bg-zinc-800" />
            <div className="flex flex-1 flex-col gap-1.5">
              <SkeletonBlock h="h-3" w="w-32" />
              <SkeletonBlock h="h-2.5" w="w-20" />
            </div>
            <SkeletonBlock h="h-4" w="w-16" />
          </div>
        ))}
      </div>
    </main>
  );
}
