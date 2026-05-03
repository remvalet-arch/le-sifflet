import Image from "next/image";
import Link from "next/link";
import type { MatchRow } from "@/lib/matches";
import { formatMatchStatus, isLobbyLiveStatus } from "@/lib/matches";
import { LiveBadge } from "@/components/lobby/LiveBadge";

const LOGO_HOSTS = new Set(["www.thesportsdb.com", "r2.thesportsdb.com"]);

function isNextImageRemoteLogo(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && LOGO_HOSTS.has(u.hostname);
  } catch {
    return false;
  }
}

/** Blason 32×32 — `Image` Next pour les domaines autorisés, sinon `<img>`. */
function LobbyTeamLogo({ url }: { url: string | null | undefined }) {
  const trimmed = (url ?? "").trim();
  const common =
    "h-8 w-8 shrink-0 rounded-md border border-white/10 bg-zinc-900/80 object-contain p-0.5";

  if (trimmed.startsWith("http") && isNextImageRemoteLogo(trimmed)) {
    return (
      <Image
        src={trimmed}
        alt=""
        width={32}
        height={32}
        className={common}
        sizes="32px"
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
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/10 bg-zinc-800/90 text-[10px] text-zinc-500"
      aria-hidden
    >
      ⚽
    </div>
  );
}

export function MatchCard({ match }: { match: MatchRow }) {
  const href = `/match/${match.id}`;
  const isLive = isLobbyLiveStatus(match.status);
  const isFinished = match.status === "finished";

  const when = new Date(match.start_time).toLocaleString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Link
      href={href}
      className={`block w-full rounded-2xl border p-4 text-left shadow-md transition active:scale-[0.99] ${
        isLive
          ? "border-green-500/30 bg-zinc-900 hover:border-green-500/50"
          : "border-white/8 bg-zinc-900 hover:border-white/15"
      }`}
    >
      {/* Status badge row */}
      <div className="flex items-center justify-between gap-2">
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
      </div>

      {/* Équipes + blasons + score / vs */}
      <div className="mt-3 flex items-center justify-between gap-2 sm:gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <LobbyTeamLogo url={match.home_team_logo} />
          <p className="min-w-0 truncate text-base font-black leading-tight text-white">{match.team_home}</p>
        </div>
        {isLive || isFinished ? (
          <div className="flex shrink-0 flex-col items-center gap-0.5 px-0.5">
            <span className="rounded-lg bg-zinc-800 px-2.5 py-1 text-sm font-black tabular-nums text-white sm:px-3">
              {match.home_score} — {match.away_score}
            </span>
            {isLive && match.match_minute !== null && (
              <span className="text-[10px] font-bold text-green-400">
                {match.match_minute}&apos;
              </span>
            )}
          </div>
        ) : (
          <span className="shrink-0 rounded-lg bg-zinc-800 px-2.5 py-1 text-xs font-black uppercase tracking-wider text-zinc-400 sm:px-3 sm:text-sm">
            vs
          </span>
        )}
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
          <p className="min-w-0 truncate text-right text-base font-black leading-tight text-white">{match.team_away}</p>
          <LobbyTeamLogo url={match.away_team_logo} />
        </div>
      </div>

      {/* Footer */}
      <p
        className={`mt-3 text-xs font-semibold ${
          isLive ? "text-green-500/80" : "text-zinc-600"
        }`}
      >
        {isLive ? "Rejoindre le kop →" : isFinished ? "Voir le résumé →" : `Coup d'envoi : ${when}`}
      </p>
    </Link>
  );
}
