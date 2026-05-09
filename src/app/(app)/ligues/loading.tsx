function SkeletonBox({ h = "h-3", w = "w-full" }: { h?: string; w?: string }) {
  return <div className={`${h} ${w} rounded-full bg-zinc-800`} />;
}

export default function LiguesLoading() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 animate-pulse px-4 py-6">
      <SkeletonBox h="h-6" w="w-24" />
      <SkeletonBox h="h-3" w="w-48 mt-2" />

      {/* Tab bar */}
      <div className="mt-6 flex gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-9 w-24 rounded-full bg-zinc-800" />
        ))}
      </div>

      {/* Cards */}
      <div className="mt-4 flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-white/8 bg-zinc-900 px-4 py-4"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-zinc-800" />
              <div className="flex flex-1 flex-col gap-2">
                <SkeletonBox h="h-4" w="w-40" />
                <SkeletonBox h="h-3" w="w-24" />
              </div>
              <div className="h-8 w-20 rounded-xl bg-zinc-800" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
