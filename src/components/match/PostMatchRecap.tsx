"use client";

import type { SquadProno } from "./LiveRoom";

type Props = {
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  squadPronos: SquadProno[];
  currentUserId: string;
};

export function PostMatchRecap({
  homeTeam,
  awayTeam,
  homeScore,
  awayScore,
  squadPronos,
  currentUserId,
}: Props) {
  // Group by user_id: score prono + scorers
  const byUser = new Map<
    string,
    {
      username: string;
      avatar_url: string | null;
      points: number;
      prono: string | null;
    }
  >();

  for (const p of squadPronos) {
    const uid = p.user_id;
    const existing = byUser.get(uid);
    if (!existing) {
      byUser.set(uid, {
        username: p.profiles?.username ?? "Joueur",
        avatar_url: p.profiles?.avatar_url ?? null,
        points: p.points_earned ?? 0,
        prono: p.prono_type === "exact_score" ? p.prono_value : null,
      });
    } else {
      existing.points += p.points_earned ?? 0;
      if (p.prono_type === "exact_score") existing.prono = p.prono_value;
    }
  }

  const sorted = [...byUser.entries()].sort(
    (a, b) => b[1].points - a[1].points,
  );
  const myEntry = byUser.get(currentUserId);

  if (sorted.length === 0) return null;

  return (
    <div className="mb-4 rounded-2xl border border-white/8 bg-zinc-900 overflow-hidden">
      <div className="px-4 py-3 border-b border-white/5">
        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
          Récap · Ta ligue
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xl font-black text-white tabular-nums">
            {homeScore} – {awayScore}
          </span>
          <span className="text-xs text-zinc-500">
            {homeTeam} / {awayTeam}
          </span>
        </div>
        {myEntry && (
          <p
            className={`mt-1 text-sm font-black ${myEntry.points > 0 ? "text-green-400" : "text-zinc-500"}`}
          >
            {myEntry.points > 0
              ? `Tu as gagné +${myEntry.points.toLocaleString("fr-FR")} Pts`
              : "Pas de points cette fois"}
          </p>
        )}
      </div>
      <div className="divide-y divide-white/5">
        {sorted.map(([uid, entry], idx) => (
          <div
            key={uid}
            className={`flex items-center gap-3 px-4 py-2.5 ${uid === currentUserId ? "bg-white/3" : ""}`}
          >
            <span className="w-4 text-center text-[11px] font-black text-zinc-600">
              {idx + 1}
            </span>
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs">
              {entry.avatar_url?.startsWith("http") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={entry.avatar_url}
                  alt={entry.username}
                  className="h-7 w-7 rounded-full object-cover"
                />
              ) : (
                "🎽"
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p
                className={`text-xs font-bold truncate ${uid === currentUserId ? "text-white" : "text-zinc-300"}`}
              >
                {entry.username}
              </p>
              {entry.prono && (
                <p className="text-[10px] text-zinc-600">
                  Prédit : {entry.prono.replace(":", " – ")}
                </p>
              )}
            </div>
            <span
              className={`text-sm font-black tabular-nums ${entry.points > 0 ? "text-green-400" : "text-zinc-600"}`}
            >
              {entry.points > 0
                ? `+${entry.points.toLocaleString("fr-FR")}`
                : "—"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
