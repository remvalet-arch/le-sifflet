import Image from "next/image";
import Link from "next/link";
import type { MatchRow } from "@/lib/matches";
import { formatMatchStatus, isLobbyLiveStatus } from "@/lib/matches";
import { LiveBadge } from "@/components/lobby/LiveBadge";
import {
  formatMatchDateTimeParis,
  formatMatchTime,
} from "@/lib/format-match-time";
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
function sortedGoalLinesForScore(
  events: MatchGoalLine[] | undefined,
): MatchGoalLine[] {
  return (events ?? [])
    .filter(
      (g) =>
        typeof g.minute === "number" && (g.player_name ?? "").trim() !== "",
    )
    .slice()
    .sort((a, b) => a.minute - b.minute);
}

/** Buteurs : scroll horizontal discret + masques pour ne pas déborder de la carte. */
function GoalsScrollLine({
  goals,
  fadeFromClass,
}: {
  goals: MatchGoalLine[];
  fadeFromClass: string;
}) {
  const text = goals
    .map((g) => `${String(g.minute)}′ ${g.player_name}`)
    .join(" · ");
  return (
    <div className="relative mt-1 w-full min-w-0 max-w-[13rem]">
      <div
        className={`pointer-events-none absolute inset-y-0 left-0 z-[1] w-4 bg-gradient-to-r ${fadeFromClass} to-transparent`}
        aria-hidden
      />
      <div
        className={`pointer-events-none absolute inset-y-0 right-0 z-[1] w-4 bg-gradient-to-l ${fadeFromClass} to-transparent`}
        aria-hidden
      />
      <div className="overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <p className="inline-block whitespace-nowrap px-2 text-[9px] font-medium leading-tight text-zinc-500">
          {text}
        </p>
      </div>
    </div>
  );
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

  /** Centre de la carte : score imposant + minute / statut — sans ligne buteurs (elle est en dessous de la grille). */
  const scoreCenterMpg = (
    <div className="flex flex-col items-center justify-center gap-1.5">
      <div
        className={`rounded-xl border px-4 py-2.5 shadow-inner ${
          isLive
            ? "border-red-500/25 bg-zinc-800/95"
            : "border-white/10 bg-zinc-800/95"
        }`}
      >
        <span className="text-lg font-black tabular-nums text-white sm:text-xl">
          {match.home_score} — {match.away_score}
        </span>
      </div>
      {isLive && match.match_minute !== null && (
        <span className="inline-flex min-w-[2.75rem] items-center justify-center rounded-lg bg-red-600 px-2.5 py-1 text-sm font-black tabular-nums text-white shadow-lg shadow-red-950/50 sm:text-base">
          {match.match_minute}&apos;
        </span>
      )}
    </div>
  );

  const scoreCenterClassic = (
    <div className="flex flex-col items-center justify-center gap-1">
      <span
        className={`rounded-lg px-3 py-1.5 text-base font-black tabular-nums text-white sm:px-4 sm:text-lg ${
          mpgLayout && isLive
            ? "bg-red-600 shadow-inner shadow-red-900/40"
            : "bg-zinc-800"
        }`}
      >
        {match.home_score} — {match.away_score}
      </span>
      {isLive && match.match_minute !== null && (
        <span
          className={`inline-flex min-w-[2.5rem] items-center justify-center rounded-md px-2 py-0.5 font-black tabular-nums ${
            mpgLayout && isLive
              ? "bg-red-500 text-sm text-white shadow-md shadow-red-950/40"
              : "bg-red-600 text-xs text-white shadow sm:text-sm"
          }`}
        >
          {match.match_minute}&apos;
        </span>
      )}
    </div>
  );

  const scoreCenterBlock =
    isLive || isFinished ? (
      mpgLayout ? (
        scoreCenterMpg
      ) : (
        scoreCenterClassic
      )
    ) : (
      <span className="shrink-0 rounded-lg bg-zinc-800 px-3 py-1.5 text-sm font-black uppercase tracking-wider text-zinc-400 sm:text-base">
        vs
      </span>
    );

  const metaRowMpg = isLive ? null : isFinished ? (
    <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-600">
      {formatMatchStatus("finished")}
    </span>
  ) : lineupsFlag ? (
    <span className="inline-flex rounded-full border border-emerald-500/35 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-400">
      Compos dispos
    </span>
  ) : (
    <span className="text-xs font-medium tabular-nums tracking-wide text-zinc-500">
      {kickoffTime}
    </span>
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
        <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">
          {when}
        </span>
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

      <div
        className={`grid w-full min-w-0 grid-cols-[1fr_auto_1fr] items-center gap-2 pt-2 ${teamsTopClass}`}
      >
        <div className="flex min-w-0 flex-col items-center justify-center gap-1.5 text-center">
          <div
            className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-zinc-900/80 shadow-sm ${
              mpgLayout ? "h-12 w-12" : "h-10 w-10"
            }`}
          >
            <LobbyTeamLogo url={match.home_team_logo} mpgLayout={mpgLayout} />
          </div>
          <p className="w-full text-xs font-bold leading-tight text-white line-clamp-2 break-words">
            {match.team_home}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-center justify-center px-3">
          {scoreCenterBlock}
        </div>
        <div className="flex min-w-0 flex-col items-center justify-center gap-1.5 text-center">
          <div
            className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-zinc-900/80 shadow-sm ${
              mpgLayout ? "h-12 w-12" : "h-10 w-10"
            }`}
          >
            <LobbyTeamLogo url={match.away_team_logo} mpgLayout={mpgLayout} />
          </div>
          <p className="w-full text-xs font-bold leading-tight text-white line-clamp-2 break-words">
            {match.team_away}
          </p>
        </div>
        {goalsForScore.length > 0 && (isLive || isFinished) && (
          <div className="col-span-3 mt-2 flex w-full min-w-0 justify-center">
            <GoalsScrollLine
              goals={goalsForScore}
              fadeFromClass="from-zinc-900"
            />
          </div>
        )}
      </div>

      <p
        className={`mt-3 text-xs font-semibold ${
          isLive ? "text-green-500/80" : "text-zinc-600"
        }`}
      >
        {isLive
          ? "Rejoindre le kop →"
          : isFinished
            ? "Voir le résumé →"
            : `Coup d'envoi : ${kickoffTime}`}
      </p>
    </Link>
  );
}
