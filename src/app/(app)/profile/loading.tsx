function SkeletonLine({ w, h = "h-3" }: { w: string; h?: string }) {
  return <div className={`${h} ${w} rounded-full bg-zinc-800`} />;
}

export default function ProfileLoading() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 animate-pulse px-4 py-6">
      {/* Hero */}
      <div className="overflow-hidden rounded-2xl border border-white/8 bg-zinc-900">
        <div className="flex flex-col items-center gap-3 px-6 pb-5 pt-7">
          <div className="h-16 w-16 rounded-full bg-zinc-800" />
          <SkeletonLine w="w-32" h="h-5" />
          <SkeletonLine w="w-20" />
          <SkeletonLine w="w-24" />
        </div>
        <div className="flex flex-col items-center gap-2 border-t border-white/8 px-6 py-5">
          <SkeletonLine w="w-20" />
          <SkeletonLine w="w-28" h="h-12" />
          <SkeletonLine w="w-14" />
        </div>
      </div>

      {/* Stats */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="flex flex-col items-center gap-2 rounded-2xl border border-white/8 bg-zinc-900 px-3 py-4"
          >
            <div className="h-5 w-5 rounded-full bg-zinc-800" />
            <SkeletonLine w="w-10" h="h-5" />
            <SkeletonLine w="w-14" />
          </div>
        ))}
      </div>

      {/* Trust score */}
      <div className="mt-4 rounded-2xl border border-white/8 bg-zinc-900 px-5 py-4">
        <SkeletonLine w="w-32" />
        <SkeletonLine w="w-16" h="h-8 mt-2" />
        <div className="mt-4 h-2 w-full rounded-full bg-zinc-800" />
      </div>

      {/* Bet history */}
      <SkeletonLine w="w-28 mt-6" />
      <div className="mt-3 flex flex-col gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-white/6 bg-zinc-900 px-4 py-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-col gap-2">
                <SkeletonLine w="w-20" />
                <SkeletonLine w="w-44" h="h-4" />
                <SkeletonLine w="w-28" />
              </div>
              <SkeletonLine w="w-16" h="h-6" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
