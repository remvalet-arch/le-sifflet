import type { MatchStatus } from "@/types/database";
import { formatMatchStatus, isLobbyLiveStatus } from "@/lib/matches";

type Props = {
  status: MatchStatus;
  className?: string;
};

/** Pastille + libellé période (lobby / fiches) — uniquement pour les statuts « en direct ». */
export function LiveBadge({ status, className = "" }: Props) {
  if (!isLobbyLiveStatus(status)) return null;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
      </span>
      <span className="text-[11px] font-black uppercase tracking-widest text-green-500">
        {formatMatchStatus(status)}
      </span>
    </div>
  );
}
