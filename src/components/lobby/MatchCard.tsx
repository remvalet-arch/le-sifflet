import Image from "next/image";
import Link from "next/link";
import type { MatchRow } from "@/lib/matches";
import { formatMatchStatus, isLobbyLiveStatus } from "@/lib/matches";
import { LiveBadge } from "@/components/lobby/LiveBadge";
import { formatMatchDateTimeParis, formatMatchTime } from "@/lib/format-match-time";
import { isNextImageRemoteLogoUrl } from "@/lib/remote-logo-hosts";

/** Blason équipe — taille MPG (40px) ou standard (32px). */
function LobbyTeamLogo({
  url,
  mpgLayout = false,
}: {
  url: string | null | undefined;
  mpgLayout?: boolean;
}) {
  const trimmed = (url ?? "").trim();
  const dim = mpgLayout ? 40 : 32;
  const common = mpgLayout
    ? "h-10 w-10 min-h-[40px] min-w-[40px] shrink-0 rounded-lg border border-white/10 bg-zinc-900/80 object-contain p-0.5"
    : "h-8 w-8 shrink-0 rounded-md border border-white/10 bg-zinc-900/80 object-contain p-0.5";

  if (trimmed.startsWith("http") && isNextImageRemoteLogoUrl(trimmed)) {
    return (
      <Image
        src={trimmed}
        alt=""
        width={dim}
        height={dim}
        className={common}
        sizes={mpgLayout ? "40px" : "32px"}
      />
    );
  }
  if (trimmed.startsWith("http")) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- hôte hors remotePatterns
      <img src={trimmed} alt="" className={common} />
    );
  }
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-md border border-white/10 bg-zinc-800/90 text-[10px] text-zinc-500 ${mpgLayout ? "h-10 w-10 min-h-[40px] min-w-[40px]" : "h-8 w-8"}`}
      aria-hidden
    >
      ⚽
    </div>
  );
}

export type MatchGoalLine = {
  minute: number;
  player_name: string;
  team_side: "home" | "away";
};

/** Sous le score : uniquement des entrées exploitables (minute + nom) — le lobby ne passe que des buts. */
function sortedGoalLinesForScore(events: MatchGoalLine[] | undefined): MatchGoalLine[] {
  return (events ?? [])
    .filter((g) => typeof g.minute === "number" && (g.player_name ?? "").trim() !== "")
    .slice()
    .sort((a, b) => a.minute - b.minute);
}

export function MatchCard({
  match,
  goalEvents,
  mpgLayout = false,
  hasLineups,
}: {
  match: MatchRow;
  goalEvents?: MatchGoalLine[];
  mpgLayout?: boolean;
  hasLineups?: boolean;
}) {
  const href = `/match/${match.id}`;
  const isLive = isLobbyLiveStatus(match.status);
  const isFinished = match.status === "finished";

  const when = formatMatchDateTimeParis(match.start_time);
  const kickoffTime = formatMatchTime(match.start_time);
  const lineupsFlag = hasLineups ?? match.has_lineups;
  const goalsForScore = sortedGoalLinesForScore(goalEvents);

  const scoreBlockMpgLiveFinished = (
    <div className="flex shrink-0 flex-col items-center gap-1 px-1">
      <div
        className={`rounded-xl border px-4 py-2 shadow-inner ${
          isLive
            ? "border-red-500/25 bg-zinc-800/95"
            : "border-white/10 bg-zinc-800/95"
        }`}
      >
        <span className="text-base font-black tabular-nums text-white sm:text-lg">
          {match.home_score} — {match.away_score}
        </span>
      </div>
      {isLive && match.match_minute !== null && (
        <span className="text-[11px] font-black tabular-nums text-red-500">{match.match_minute}&apos;</span>
      )}
      {goalsForScore.length > 0 && (
        <p className="max-w-[10rem] text-center text-[9px] font-medium leading-tight text-zinc-500">
          {goalsForScore.map((g) => `${String(g.minute)}′ ${g.player_name}`).join(" · ")}
        </p>
      )}
    </div>
  );

  const scoreBlockClassic = (
    <div className="flex shrink-0 flex-col items-center gap-0.5 px-0.5">
      <span
        className={`rounded-lg px-2.5 py-1 text-sm font-black tabular-nums text-white sm:px-3 ${
          mpgLayout && isLive ? "bg-red-600 shadow-inner shadow-red-900/40" : "bg-zinc-800"
        }`}
      >
        {match.home_score} — {match.away_score}
      </span>
      {isLive && match.match_minute !== null && (
        <span
          className={`text-[10px] font-bold ${mpgLayout && isLive ? "text-red-100" : "text-green-400"}`}
        >
          {match.match_minute}&apos;
        </span>
      )}
      {goalsForScore.length > 0 && (
        <p className="max-w-[10rem] text-center text-[9px] font-medium leading-tight text-zinc-500">
          {goalsForScore.map((g) => `${String(g.minute)}′ ${g.player_name}`).join(" · ")}
        </p>
      )}
    </div>
  );

  const scoreBlock =
    isLive || isFinished ? (
      mpgLayout ? (
        scoreBlockMpgLiveFinished
      ) : (
        scoreBlockClassic
      )
    ) : (
      <span className="shrink-0 rounded-lg bg-zinc-800 px-2.5 py-1 text-xs font-black uppercase tracking-wider text-zinc-400 sm:px-3 sm:text-sm">
        vs
      </span>
    );

  const metaRowMpg =
    isLive ? null : isFinished ? (
      <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-600">
        {formatMatchStatus("finished")}
      </span>
    ) : lineupsFlag ? (
      <span className="inline-flex rounded-full border border-emerald-500/35 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-400">
        Compos dispos
      </span>
    ) : (
      <span className="text-xs font-medium tabular-nums tracking-wide text-zinc-500">{kickoffTime}</span>
    );

  const metaRowClassic = (
    <>
      {isLive ? (
        <LiveBadge status={match.status} />
      ) : isFinished ? (
        <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-600">
          {formatMatchStatus("finished")}
        </span>
      ) : (
        <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">{when}</span>
      )}
    </>
  );

  const showMetaRow = !mpgLayout || metaRowMpg != null;
  const teamsTopClass =
    mpgLayout && isLive && metaRowMpg == null ? "mt-0" : "mt-3";

  return (
    <Link
      href={href}
      className={`block w-full rounded-2xl border p-4 text-left shadow-md transition active:scale-[0.99] ${
        isLive
          ? "border-green-500/30 bg-zinc-900 hover:border-green-500/50"
          : "border-white/8 bg-zinc-900 hover:border-white/15"
      }`}
    >
      {showMetaRow && (
        <div className="flex min-h-[1.25rem] items-center justify-between gap-2">
          {mpgLayout ? metaRowMpg : metaRowClassic}
        </div>
      )}

      <div className={`flex items-center justify-between gap-2 sm:gap-3 ${teamsTopClass}`}>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <LobbyTeamLogo url={match.home_team_logo} mpgLayout={mpgLayout} />
          <p className="min-w-0 truncate text-base font-black leading-tight text-white">{match.team_home}</p>
        </div>
        {scoreBlock}
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
          <p className="min-w-0 truncate text-right text-base font-black leading-tight text-white">{match.team_away}</p>
          <LobbyTeamLogo url={match.away_team_logo} mpgLayout={mpgLayout} />
        </div>
      </div>

      <p
        className={`mt-3 text-xs font-semibold ${
          isLive ? "text-green-500/80" : "text-zinc-600"
        }`}
      >
        {isLive ? "Rejoindre le kop →" : isFinished ? "Voir le résumé →" : `Coup d'envoi : ${kickoffTime}`}
      </p>
    </Link>
  );
}
