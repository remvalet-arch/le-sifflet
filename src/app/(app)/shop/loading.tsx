function SkeletonBox({ h = "h-3", w = "w-full" }: { h?: string; w?: string }) {
  return <div className={`${h} ${w} rounded-full bg-zinc-800`} />;
}

export default function ShopLoading() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 animate-pulse px-4 py-6">
      {/* Balance header */}
      <div className="flex items-center justify-between">
        <SkeletonBox h="h-6" w="w-32" />
        <div className="h-8 w-24 rounded-full bg-zinc-800" />
      </div>

      {/* Tab bar */}
      <div className="mt-5 flex gap-2">
        {[0, 1].map((i) => (
          <div
            key={`skeleton-`}
            className="h-9 w-28 rounded-full bg-zinc-800"
          />
        ))}
      </div>

      {/* Item grid */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={`skeleton-`}
            className="flex flex-col gap-3 rounded-2xl border border-white/8 bg-zinc-900 p-4"
          >
            <div className="mx-auto size-16 rounded-full bg-zinc-800" />
            <SkeletonBox h="h-4" w="w-3/4 mx-auto" />
            <SkeletonBox h="h-3" w="w-1/2 mx-auto" />
            <div className="h-9 w-full rounded-xl bg-zinc-800" />
          </div>
        ))}
      </div>
    </main>
  );
}
