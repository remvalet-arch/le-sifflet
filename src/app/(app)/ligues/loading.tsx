function Skel({ h = "h-3", w = "w-full" }: { h?: string; w?: string }) {
  return <div className={`${h} ${w} rounded-full bg-zinc-800`} />;
}

export default function LiguesLoading() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 animate-pulse px-4 py-6">
      {/* CTA row — 2 buttons */}
      <div className="grid grid-cols-2 gap-3">
        <div className="h-12 rounded-2xl bg-zinc-800" />
        <div className="h-12 rounded-2xl bg-zinc-800" />
      </div>

      {/* Squad cards */}
      <div className="mt-4 flex flex-col gap-3">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-white/8 bg-zinc-900 px-5 py-4"
          >
            {/* Name + meta */}
            <div className="flex items-start gap-3">
              <div className="flex-1 space-y-2">
                <Skel h="h-2.5" w="w-16" />
                <Skel h="h-5" w="w-40" />
                <div className="flex gap-4 pt-1">
                  <Skel h="h-3" w="w-20" />
                  <Skel h="h-3" w="w-24" />
                </div>
              </div>
              <div className="h-5 w-5 rounded-full bg-zinc-800" />
            </div>
            {/* Sub-actions */}
            <div className="mt-3 flex items-center gap-2 border-t border-white/5 pt-3">
              <div className="h-7 w-24 rounded-lg bg-zinc-800" />
              <div className="ml-auto h-8 w-8 rounded-lg bg-zinc-800" />
            </div>
          </div>
        ))}
      </div>

      {/* Braquage info box */}
      <div className="mt-3 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
        <Skel h="h-3" w="w-32" />
        <Skel h="h-3 mt-2" w="w-full" />
        <Skel h="h-3 mt-1.5" w="w-3/4" />
      </div>
    </main>
  );
}
