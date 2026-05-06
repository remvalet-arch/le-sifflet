import { Lock, User } from "lucide-react";
import type { SquadProno } from "./LiveRoom";
import type { MatchStatus } from "@/types/database";

type Props = {
  matchStatus: MatchStatus;
  startTime: string;
  squadPronos: SquadProno[];
};

type ScorerEntry = { name: string; goals: number };
type ScorerAllocation = { home: ScorerEntry[]; away: ScorerEntry[] };

export function LeaguePronosList({
  matchStatus,
  startTime,
  squadPronos,
}: Props) {
  // Déterminer si les pronos sont dévoilés
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

  // Grouper les pronos par utilisateur
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
        // Ignorer silencieusement si le JSON est mal formé
      }
    }
  }

  const userPronosList = Array.from(pronosByUser.values());

  if (userPronosList.length === 0) {
    return (
      <div className="mx-4 mt-6 flex flex-col items-center justify-center rounded-2xl border border-white/5 bg-zinc-900/50 p-8 text-center">
        <p className="text-sm font-bold text-zinc-500">
          Aucun membre de tes ligues n&apos;a pronostiqué ce match.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 flex flex-col gap-3 px-4">
      <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">
        Les pronos de tes ligues
      </p>

      {userPronosList.map((user, i) => (
        <div
          key={i}
          className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-zinc-900/80 p-4 transition-colors hover:bg-zinc-800/80"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {user.avatar_url ? (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-lg shadow">
                  {user.avatar_url}
                </div>
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-zinc-400">
                  <User className="h-4 w-4" />
                </div>
              )}
              <span className="font-bold text-white">{user.username}</span>
            </div>
            {user.points_earned > 0 && (
              <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-xs font-black text-green-400">
                +{user.points_earned} pts
              </span>
            )}
          </div>

          <div className="flex flex-col gap-2 rounded-xl bg-zinc-950/50 p-3">
            <div className="flex flex-col items-center justify-center">
              <span className="text-xs font-bold uppercase text-zinc-500 mb-2">
                Score exact
              </span>
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800 text-lg font-black text-amber-400 shadow-inner">
                  {user.score ? user.score.split("-")[0] : "-"}
                </div>
                <span className="text-zinc-600 font-bold">-</span>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800 text-lg font-black text-amber-400 shadow-inner">
                  {user.score ? user.score.split("-")[1] : "-"}
                </div>
              </div>
            </div>

            {user.scorers &&
              (user.scorers.home.length > 0 ||
                user.scorers.away.length > 0) && (
                <div className="mt-1 border-t border-white/5 pt-2">
                  <span className="mb-2 block text-[10px] font-bold uppercase text-zinc-600">
                    Buteurs
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[...user.scorers.home, ...user.scorers.away].map(
                      (s, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 rounded border border-white/10 bg-zinc-800 px-1.5 py-0.5 text-[11px] font-medium text-zinc-300"
                        >
                          ⚽ {s.name} {s.goals > 1 ? `(x${s.goals})` : ""}
                        </span>
                      ),
                    )}
                  </div>
                </div>
              )}
          </div>
        </div>
      ))}
    </div>
  );
}
