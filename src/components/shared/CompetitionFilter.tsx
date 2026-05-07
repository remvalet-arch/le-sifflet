"use client";

type CompetitionItem = {
  id: string;
  name: string;
  badge_url?: string | null;
  api_football_league_id?: number | null;
};

const COMPETITION_FLAGS: Record<number, string> = {
  61: "🇫🇷", // Ligue 1
  39: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", // Premier League
  140: "🇪🇸", // La Liga
  135: "🇮🇹", // Serie A
  78: "🇩🇪", // Bundesliga
  2: "🏆", // UCL
  3: "🥈", // Europa League
};

const COMPETITION_SHORT: Record<number, string> = {
  61: "L1",
  39: "PL",
  140: "Liga",
  135: "SerieA",
  78: "BL",
  2: "UCL",
  3: "UEL",
};

export function CompetitionFilter({
  competitions,
  selectedIds,
  onChange,
  showCounts,
}: {
  competitions: CompetitionItem[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  showCounts?: Record<string, number>;
}) {
  const allSelected = selectedIds.length === 0;

  function toggleAll() {
    onChange([]);
  }

  function toggleCompetition(id: string) {
    if (allSelected) {
      // Deselect all others, select only this one
      onChange([id]);
      return;
    }
    const next = selectedIds.includes(id)
      ? selectedIds.filter((s) => s !== id)
      : [...selectedIds, id];
    onChange(next.length === competitions.length ? [] : next);
  }

  return (
    <div className="relative">
      {/* Right gradient fade */}
      <div
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-pitch-900 to-transparent"
        aria-hidden
      />
      <div className="flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden snap-x snap-mandatory">
        {/* TOUTES chip */}
        <button
          type="button"
          onClick={toggleAll}
          className={`flex-none snap-start rounded-full border px-3 py-1.5 text-[11px] font-black uppercase tracking-wide transition ${
            allSelected
              ? "border-whistle bg-whistle/20 text-whistle"
              : "border-white/10 bg-zinc-800/90 text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Toutes
        </button>

        {competitions.map((comp) => {
          const isActive = !allSelected && selectedIds.includes(comp.id);
          const apiId = comp.api_football_league_id;
          const flag = apiId ? (COMPETITION_FLAGS[apiId] ?? "⚽") : "⚽";
          const short = apiId
            ? (COMPETITION_SHORT[apiId] ?? comp.name)
            : comp.name;
          const count = showCounts?.[comp.id];

          return (
            <button
              key={comp.id}
              type="button"
              onClick={() => toggleCompetition(comp.id)}
              className={`flex-none snap-start rounded-full border px-3 py-1.5 text-[11px] font-black uppercase tracking-wide transition whitespace-nowrap ${
                isActive
                  ? "border-whistle bg-whistle/20 text-whistle"
                  : "border-white/10 bg-zinc-800/90 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {flag} {short}
              {count != null && count > 0 && (
                <span className="ml-1 opacity-70">({count})</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
