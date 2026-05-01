import type { MatchRow, MatchStatus } from "@/types/database";
import { isMatchInProgress } from "@/lib/matches";

function getStatusLabel(status: MatchStatus, minute: number | null): string {
  switch (status) {
    case "first_half":  return minute !== null ? `1ère mi-temps · ${minute}'` : "1ère mi-temps";
    case "half_time":   return "Mi-temps";
    case "second_half": return minute !== null ? `2ème mi-temps · ${minute}'` : "2ème mi-temps";
    case "paused":      return "Interruption";
    case "finished":    return "Terminé";
    case "upcoming":    return "À venir";
  }
}

function shortTeamName(name: string): string {
  const s = name
    .replace(/\b(F\.C\.|FC|OGC|RC|SC|AC|AS|AFC)\b\.?\s*/gi, "")
    .trim()
    .replace(/\s+/g, " ");
  const words = s.split(" ").filter(Boolean);
  const twoWords = words.slice(0, 2).join(" ");
  return twoWords.length <= 14 ? twoWords : (words[0] ?? name);
}

function TeamCrest({
  logo,
  color,
}: {
  logo?: string | null;
  color?: string | null;
}) {
  const isUrl = logo?.startsWith("http");
  return (
    <div
      className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-white/15 shadow-sm"
      style={{ backgroundColor: isUrl ? "transparent" : (color ?? "#3f3f46") }}
    >
      {isUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logo!} alt="" className="h-10 w-10 object-contain" />
      ) : logo ? (
        <span className="text-lg leading-none">{logo}</span>
      ) : (
        <span className="text-sm leading-none text-white/40">⚽</span>
      )}
    </div>
  );
}

function TeamSide({
  name,
  logo,
  color,
}: {
  name: string;
  logo?: string | null;
  color?: string | null;
}) {
  return (
    <div className="flex flex-1 flex-col items-center gap-1.5">
      <TeamCrest logo={logo} color={color} />
      <span className="line-clamp-2 max-w-[72px] text-center text-[10px] font-bold leading-tight text-white/70">
        {shortTeamName(name)}
      </span>
    </div>
  );
}

export function Scoreboard({ match }: { match: MatchRow }) {
  const inProgress = isMatchInProgress(match.status);
  const showScore  = inProgress || match.status === "finished";

  return (
    <div className="px-6 pt-4 pb-3">
      {/* Crests + score */}
      <div className="flex items-center justify-between gap-3">
        <TeamSide
          name={match.team_home}
          logo={match.home_team_logo}
          color={match.home_team_color}
        />

        <div className="flex flex-col items-center">
          {showScore ? (
            <span className="text-4xl font-black tabular-nums tracking-tight text-white">
              {match.home_score}
              <span className="mx-2 text-2xl font-bold text-white/30">—</span>
              {match.away_score}
            </span>
          ) : (
            <span className="text-xl font-black uppercase tracking-[0.25em] text-white/30">
              VS
            </span>
          )}
        </div>

        <TeamSide
          name={match.team_away}
          logo={match.away_team_logo}
          color={match.away_team_color}
        />
      </div>

      {/* Status */}
      <div className="mt-2.5 flex items-center justify-center gap-1.5">
        {inProgress && match.status !== "half_time" && (
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
          </span>
        )}
        <span
          className={`text-[11px] font-black uppercase tracking-widest ${
            inProgress
              ? match.status === "half_time" || match.status === "paused"
                ? "text-yellow-400"
                : "text-red-400"
              : match.status === "finished"
                ? "text-zinc-500"
                : "text-zinc-400"
          }`}
        >
          {getStatusLabel(match.status, match.match_minute)}
        </span>
      </div>
    </div>
  );
}
