import Link from "next/link";
import type { MatchRow } from "@/lib/matches";

function statusLabel(status: MatchRow["status"]) {
  switch (status) {
    case "live":
      return "En direct";
    case "upcoming":
      return "À venir";
    case "finished":
      return "Terminé";
  }
}

export function MatchCard({ match }: { match: MatchRow }) {
  const href = `/match/${match.id}`;
  const when = new Date(match.start_time).toLocaleString("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  });

  const inner = (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-lg font-black text-white">
            {match.team_home} — {match.team_away}
          </p>
          <p className="mt-1 text-xs text-green-100/80">{when}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {match.status === "live" && (
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
            </span>
          )}
          <span
            className={
              match.status === "live"
                ? "rounded-full bg-red-600/90 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-white"
                : "rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-green-100"
            }
          >
            {statusLabel(match.status)}
          </span>
        </div>
      </div>
      <p className="mt-3 text-xs text-green-200/70">Ouvrir la feuille de match →</p>
    </>
  );

  const cardClass =
    "block w-full rounded-2xl border border-white/10 bg-black/25 p-4 text-left shadow-lg transition hover:border-whistle/40 hover:bg-black/35 active:scale-[0.99]";

  return (
    <Link href={href} className={cardClass}>
      {inner}
    </Link>
  );
}
