import Link from "next/link";
import type { MatchRow } from "@/lib/matches";

export function MatchCard({ match }: { match: MatchRow }) {
  const href = `/match/${match.id}`;
  const isLive = match.status === "live";
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
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
            </span>
            <span className="text-[11px] font-black uppercase tracking-widest text-green-500">
              Live
            </span>
          </div>
        ) : isFinished ? (
          <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-600">
            Terminé
          </span>
        ) : (
          <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">
            {when}
          </span>
        )}
      </div>

      {/* Teams */}
      <div className="mt-3 flex items-center justify-between gap-4">
        <p className="min-w-0 flex-1 truncate text-lg font-black text-white">
          {match.team_home}
        </p>
        <span className="shrink-0 rounded-lg bg-zinc-800 px-3 py-1 text-sm font-black tabular-nums text-zinc-400">
          vs
        </span>
        <p className="min-w-0 flex-1 truncate text-right text-lg font-black text-white">
          {match.team_away}
        </p>
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
