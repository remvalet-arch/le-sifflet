/**
 * Pure CSS animation — no client JS required.
 * Cycle 5s : sirène pulse → drawer slide-up → timer drain → flash OUI → reset.
 * prefers-reduced-motion : animations stoppées, état intermédiaire statique affiché.
 */
export function VarMechanicLoop() {
  return (
    <figure
      role="img"
      aria-label="Animation illustrant la mécanique VAR : une alerte déclenche un marché de paris en temps réel avec un compte à rebours, puis le résultat est affiché."
      className="relative mx-auto select-none"
      style={{ width: 220, height: 390 }}
    >
      {/* ── Keyframes ─────────────────────────────────────────────────── */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        /* 5 s loop */
        @keyframes vm-siren {
          0%          { opacity: 0; transform: scale(.9); }
          4%          { opacity: 1; transform: scale(1); }
          10%         { transform: scale(1.1); box-shadow: 0 0 0 14px rgba(251,191,36,.08); }
          18%         { opacity: 1; transform: scale(1); box-shadow: none; }
          24%, 100%   { opacity: 0; transform: scale(.9); }
        }
        @keyframes vm-ring {
          0%, 4%      { transform: scale(1); opacity: 0; }
          8%          { transform: scale(1.5); opacity: .35; }
          18%, 100%   { transform: scale(2.2); opacity: 0; }
        }
        @keyframes vm-drawer {
          0%, 16%     { transform: translateY(105%); }
          26%, 82%    { transform: translateY(0%); }
          92%, 100%   { transform: translateY(105%); }
        }
        @keyframes vm-timer {
          0%, 26%     { width: 100%; background: #f59e0b; }
          74%         { width: 6%;  background: #ef4444; }
          76%, 100%   { width: 0%;  background: #ef4444; }
        }
        @keyframes vm-oui {
          0%, 72%     { background: rgba(255,255,255,.04); color: #a1a1aa; border-color: rgba(255,255,255,.08); }
          78%, 88%    { background: rgba(34,197,94,.18);  color: #4ade80;  border-color: rgba(34,197,94,.45); }
          94%, 100%   { background: rgba(255,255,255,.04); color: #a1a1aa; border-color: rgba(255,255,255,.08); }
        }
        @keyframes vm-result {
          0%, 74%     { opacity: 0; transform: translateY(6px) scale(.92); }
          80%, 88%    { opacity: 1; transform: translateY(0)  scale(1); }
          95%, 100%   { opacity: 0; transform: translateY(0)  scale(1); }
        }
        @keyframes vm-dot {
          0%, 60%   { background: #f59e0b; }
          70%, 100% { background: #ef4444; }
        }
        /* Reduced-motion : freeze mid-state, show drawer open */
        @media (prefers-reduced-motion: reduce) {
          .vm-siren   { opacity: 0 !important; animation: none !important; }
          .vm-ring    { opacity: 0 !important; animation: none !important; }
          .vm-drawer  { transform: translateY(0) !important; animation: none !important; }
          .vm-timer   { width: 50% !important; animation: none !important; }
          .vm-oui     { animation: none !important; }
          .vm-result  { opacity: 0 !important; animation: none !important; }
          .vm-dot     { animation: none !important; }
        }
      `,
        }}
      />

      {/* ── Phone shell ───────────────────────────────────────────────── */}
      <div className="absolute inset-0 overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-950 shadow-[0_24px_60px_rgba(0,0,0,.6)]">
        {/* Status bar */}
        <div className="flex items-center justify-between px-5 pt-3 pb-1">
          <span className="text-[8px] font-black text-zinc-600">9:41</span>
          <div className="mx-auto mt-1 h-1 w-10 rounded-full bg-zinc-800" />
          <div className="flex gap-1">
            {[3, 2, 1].map((i) => (
              <div
                key={i}
                className={`rounded-sm bg-zinc-${i === 1 ? "500" : i === 2 ? "600" : "700"}`}
                style={{ width: 3, height: 4 + i * 1.5 }}
              />
            ))}
          </div>
        </div>

        {/* Scoreboard */}
        <div className="mx-3 mt-1 rounded-2xl border border-white/8 bg-zinc-900 px-3 py-2">
          <div className="flex items-center justify-between">
            <div className="flex flex-col items-center gap-0.5">
              <div className="h-5 w-5 rounded-full bg-blue-800/60" />
              <span className="text-[8px] font-black text-zinc-400">ENG</span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-black tabular-nums text-white">
                  1
                </span>
                <span className="text-[8px] text-zinc-600">–</span>
                <span className="text-lg font-black tabular-nums text-white">
                  1
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span
                  className="vm-dot h-1.5 w-1.5 rounded-full"
                  style={{
                    animation: "vm-dot 5s linear infinite",
                    background: "#f59e0b",
                  }}
                  aria-hidden
                />
                <span className="text-[7px] font-black uppercase tracking-widest text-zinc-500">
                  67&apos;
                </span>
              </div>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <div className="h-5 w-5 rounded-full bg-blue-600/60" />
              <span className="text-[8px] font-black text-zinc-400">FRA</span>
            </div>
          </div>
        </div>

        {/* KOP timeline (static placeholder) */}
        <div className="mx-3 mt-2.5 space-y-1.5" aria-hidden>
          {[
            ["w-full", "zinc-800/60"],
            ["w-4/5", "zinc-800/40"],
            ["w-3/5", "zinc-800/30"],
          ].map(([w, bg], i) => (
            <div key={i} className={`h-6 rounded-xl ${w} bg-${bg}`} />
          ))}
        </div>

        {/* VAR siren button (pulsing) */}
        <div className="absolute bottom-16 right-3" aria-hidden>
          {/* Ripple ring */}
          <div
            className="vm-ring absolute inset-0 rounded-full border-2 border-amber-400"
            style={{ animation: "vm-ring 5s ease-out infinite", opacity: 0 }}
          />
          <button
            type="button"
            tabIndex={-1}
            aria-hidden
            className="vm-siren relative flex h-11 w-11 items-center justify-center rounded-full bg-amber-500 text-lg shadow-[0_0_20px_rgba(251,191,36,.5)] transition-none"
            style={{
              animation: "vm-siren 5s ease-in-out infinite",
              opacity: 0,
            }}
          >
            🚨
          </button>
        </div>

        {/* ── Betting drawer ─────────────────────────────────────────── */}
        <div
          className="vm-drawer absolute bottom-0 left-0 right-0 rounded-t-3xl border-t border-white/8 bg-zinc-900 px-4 pb-5 pt-3.5 shadow-[0_-8px_40px_rgba(0,0,0,.6)]"
          style={{
            animation: "vm-drawer 5s cubic-bezier(.32,.72,0,1) infinite",
            transform: "translateY(105%)",
          }}
          aria-hidden
        >
          {/* Handle */}
          <div className="mx-auto mb-3 h-1 w-8 rounded-full bg-zinc-700" />

          {/* Header row */}
          <div className="mb-1 flex items-center gap-1.5">
            <span className="rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-wider text-amber-400">
              ⚡ VAR
            </span>
            <span className="text-[9px] font-black text-zinc-300">
              Marché en cours
            </span>
            <span className="ml-auto text-[8px] text-zinc-600">90 s</span>
          </div>

          {/* Question */}
          <p className="mb-2.5 text-[11px] font-black text-white">
            📢 Penalty confirmé ?
          </p>

          {/* OUI / NON */}
          <div className="mb-3 grid grid-cols-2 gap-2">
            <div
              className="vm-oui rounded-xl border py-2.5 text-center text-[10px] font-black transition-none"
              style={{
                animation: "vm-oui 5s ease-in-out infinite",
                background: "rgba(255,255,255,.04)",
                color: "#a1a1aa",
                borderColor: "rgba(255,255,255,.08)",
              }}
            >
              OUI ✅
            </div>
            <div className="rounded-xl border border-white/8 bg-white/4 py-2.5 text-center text-[10px] font-black text-zinc-600">
              NON ❌
            </div>
          </div>

          {/* Timer bar */}
          <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className="vm-timer h-full rounded-full"
              style={{
                animation: "vm-timer 5s linear infinite",
                width: "100%",
                background: "#f59e0b",
              }}
            />
          </div>
          <p className="mt-1 text-[7px] text-zinc-700">
            Cote · ×2.00 — Gain potentiel +400 🪙
          </p>
        </div>

        {/* ── Result flash ──────────────────────────────────────────── */}
        <div
          className="vm-result pointer-events-none absolute inset-x-3 bottom-[7.5rem] rounded-2xl border border-green-500/40 bg-green-500/12 px-3 py-2 text-center"
          style={{ animation: "vm-result 5s ease-out infinite", opacity: 0 }}
          aria-hidden
        >
          <p className="text-[11px] font-black text-green-400">
            ✅ Penalty confirmé !
          </p>
          <p className="mt-0.5 text-[9px] font-bold text-green-500/70">
            Tu avais raison · +400 🪙
          </p>
        </div>
      </div>
    </figure>
  );
}
