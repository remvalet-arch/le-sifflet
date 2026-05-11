"use client";

import { useState } from "react";
import { Lock, User } from "lucide-react";
import Link from "next/link";
import type { SquadProno } from "./LiveRoom";
import type { MatchStatus } from "@/types/database";

type Props = {
  matchStatus: MatchStatus;
  startTime: string;
  squadPronos: SquadProno[];
  hasSquad?: boolean;
};

type ScorerEntry = { name: string; goals: number };
type ScorerAllocation = { home: ScorerEntry[]; away: ScorerEntry[] };

export function LeaguePronosList({
  matchStatus,
  startTime,
  squadPronos,
  hasSquad = true,
}: Props) {
  const [showAll, setShowAll] = useState(false);

  const hasStarted =
    matchStatus !== "upcoming" && new Date() >= new Date(startTime);

  if (!hasStarted) {
    return (
      <div className="mx-4 mt-6 flex flex-col items-center justify-center rounded-2xl border border-white/5 bg-zinc-900/50 p-8 text-center shadow-lg">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-zinc-800">
          <Lock className="h-6 w-6 text-zinc-500" />
        </div>
        <h3 className="mb-2 text-lg font-black tracking-tight text-white">
          Vestiaire Verrouillé
        </h3>
        <p className="max-w-xs text-sm text-zinc-400">
          Les pronos de tes amis seront dévoilés ici au coup d&apos;envoi pour
          éviter la triche. Suspense... 🤫
        </p>
      </div>
    );
  }

  const pronosByUser = new Map<
    string,
    {
      username: string;
      avatar_url: string | null;
      score: string | null;
      scorers: ScorerAllocation | null;
      points_earned: number;
    }
  >();

  for (const prono of squadPronos) {
    if (!pronosByUser.has(prono.user_id)) {
      pronosByUser.set(prono.user_id, {
        username: prono.profiles?.username ?? "Joueur",
        avatar_url: prono.profiles?.avatar_url ?? null,
        score: null,
        scorers: null,
        points_earned: 0,
      });
    }

    const userEntry = pronosByUser.get(prono.user_id)!;
    userEntry.points_earned += prono.points_earned;

    if (prono.prono_type === "exact_score") {
      userEntry.score = prono.prono_value;
    } else if (prono.prono_type === "scorer_allocation") {
      try {
        userEntry.scorers = JSON.parse(prono.prono_value);
      } catch {
        /* silent */
      }
    }
  }

  const userPronosList = Array.from(pronosByUser.values());

  if (userPronosList.length === 0) {
    if (!hasSquad) {
      return (
        <div className="mx-4 mt-6 flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-700 p-8 text-center gap-3">
          <span className="text-3xl">🏟️</span>
          <div>
            <p className="text-sm font-black text-white">
              Tes amis pronostiquent ici
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Rejoins ou crée une ligue pour comparer tes pronos avec tes amis.
            </p>
          </div>
          <Link
            href="/ligues"
            className="mt-1 rounded-xl bg-whistle px-5 py-2.5 text-xs font-black uppercase tracking-wide text-zinc-950 transition hover:bg-whistle/90 active:scale-95"
          >
            Rejoindre une ligue →
          </Link>
        </div>
      );
    }
    return (
      <div className="mx-4 mt-6 flex flex-col items-center justify-center rounded-2xl border border-white/5 bg-zinc-900/50 p-8 text-center">
        <p className="text-sm font-bold text-zinc-500">
          Aucun membre de tes ligues n&apos;a pronostiqué ce match.
        </p>
      </div>
    );
  }

  const VISIBLE_COUNT = 20;
  const visible = showAll
    ? userPronosList
    : userPronosList.slice(0, VISIBLE_COUNT);
  const hasMore = !showAll && userPronosList.length > VISIBLE_COUNT;

  return (
    <div className="mt-4 flex flex-col gap-1.5 px-4">
      <p className="mb-1 text-xs font-bold uppercase tracking-widest text-zinc-500">
        Les pronos de tes ligues
      </p>

      {visible.map((user, i) => (
        <div
          key={i}
          className="flex items-center gap-2.5 rounded-xl px-3 py-2 transition hover:bg-zinc-900/60"
        >
          <div className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-800 text-sm">
            {user.avatar_url ? (
              <span aria-hidden="true">{user.avatar_url}</span>
            ) : (
              <User className="h-3 w-3 text-zinc-500" aria-hidden="true" />
            )}
          </div>
          <span className="min-w-0 flex-1 truncate text-sm font-bold text-white">
            {user.username}
          </span>
          {user.score && (
            <span className="shrink-0 font-mono text-sm font-black tabular-nums text-amber-400">
              {user.score}
            </span>
          )}
          {user.points_earned > 0 && (
            <span className="shrink-0 text-[11px] text-zinc-500">
              +{user.points_earned}
            </span>
          )}
        </div>
      ))}

      {hasMore && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="mt-1 w-full py-2 text-xs font-bold text-zinc-500 transition hover:text-zinc-300"
        >
          Voir tous
        </button>
      )}
    </div>
  );
}
