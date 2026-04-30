import type { MatchRow } from "@/types/database";

export function Scoreboard({ match }: { match: MatchRow }) {
  const isLive = match.status === "live";
  const showScore = isLive || match.status === "finished";

  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 px-6 py-5 shadow-xl">
      <div className="mb-4 flex items-center justify-center gap-2">
        {isLive && (
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
          </span>
        )}
        <span
          className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${
            isLive
              ? "bg-red-600/90 text-white"
              : match.status === "upcoming"
                ? "bg-white/15 text-white/70"
                : "bg-white/10 text-white/50"
          }`}
        >
          {isLive
            ? match.match_minute !== null
              ? `${match.match_minute}'`
              : "En direct"
            : match.status === "upcoming"
              ? "À venir"
              : "Terminé"}
        </span>
      </div>

      <div className="flex items-center justify-between gap-3">
        <span className="flex-1 text-left text-base font-black leading-tight text-white sm:text-lg">
          {match.team_home}
        </span>
        {showScore ? (
          <span className="shrink-0 text-3xl font-black tabular-nums text-white">
            {match.home_score} — {match.away_score}
          </span>
        ) : (
          <span className="shrink-0 text-sm font-bold uppercase tracking-widest text-white/40">
            VS
          </span>
        )}
        <span className="flex-1 text-right text-base font-black leading-tight text-white sm:text-lg">
          {match.team_away}
        </span>
      </div>
    </div>
  );
}
