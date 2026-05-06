import { createClient } from "@/lib/supabase/server";
import { MODERATOR_THRESHOLD } from "@/lib/constants/permissions";

export const metadata = { title: "Classement" };
export const revalidate = 300;

const MEDALS = ["🥇", "🥈", "🥉"];

export default async function LeaderboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: rows } = await supabase
    .from("profiles")
    .select("id, username, lifetime_points_earned, trust_score")
    .order("lifetime_points_earned", { ascending: false })
    .limit(50);

  const players = rows ?? [];
  const top3 = players.slice(0, 3);
  const rest = players.slice(3);
  const myRank = user ? players.findIndex((p) => p.id === user.id) : -1;
  const me = myRank >= 0 ? players[myRank] : null;

  // Podium order: 2nd, 1st, 3rd
  const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean);
  const podiumLabelPos = [1, 0, 2]; // maps podiumOrder index -> original rank

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6 pb-8">
      <h1 className="text-2xl font-black uppercase tracking-tight text-white">
        Classement
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        Top 50 des meilleurs joueurs.
      </p>

      {/* Podium */}
      {top3.length >= 3 && (
        <div className="mt-6 flex items-end justify-center gap-3">
          {podiumOrder.map((player, i) => {
            if (!player) return null;
            const rank = podiumLabelPos[i];
            const isMe = player.id === user?.id;
            const heights = ["h-24", "h-32", "h-20"];
            return (
              <div key={player.id} className="flex flex-col items-center gap-2">
                <div
                  className={`relative flex flex-col items-center gap-1 rounded-t-2xl px-4 ${
                    rank === 0
                      ? "bg-yellow-500/20 border border-yellow-500/30"
                      : "bg-zinc-800"
                  } ${heights[i]} w-28 justify-end pb-3`}
                >
                  <span className="text-2xl">{MEDALS[rank]}</span>
                  <p
                    className={`max-w-full truncate text-center text-xs font-black ${
                      isMe ? "text-green-400" : "text-white"
                    }`}
                  >
                    {player.username}
                    {player.trust_score >= MODERATOR_THRESHOLD && " 🛡️"}
                  </p>
                  <p className="text-[10px] font-bold text-zinc-400">
                    {player.lifetime_points_earned.toLocaleString("fr-FR")} pts
                  </p>
                </div>
                <span className="text-sm font-black text-zinc-500">
                  #{rank + 1}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* List */}
      {rest.length > 0 && (
        <div className="mt-4 flex flex-col gap-1.5">
          {rest.map((player, i) => {
            const rank = i + 4;
            const isMe = player.id === user?.id;
            return (
              <div
                key={player.id}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 ${
                  isMe
                    ? "border border-green-500/40 bg-green-500/10"
                    : "border border-white/6 bg-zinc-900"
                }`}
              >
                <span className="w-7 text-center text-sm font-black text-zinc-500">
                  #{rank}
                </span>
                <p
                  className={`flex-1 truncate text-sm font-bold ${
                    isMe ? "text-green-400" : "text-white"
                  }`}
                >
                  {player.username}
                  {player.trust_score >= MODERATOR_THRESHOLD && (
                    <span className="ml-1">🛡️</span>
                  )}
                  {isMe && (
                    <span className="ml-2 text-[10px] font-black uppercase text-green-500">
                      vous
                    </span>
                  )}
                </p>
                <span className="shrink-0 text-sm font-black text-zinc-400">
                  {player.lifetime_points_earned.toLocaleString("fr-FR")} pts
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Sticky self */}
      {me && myRank >= 3 && (
        <div className="mt-4 rounded-2xl border border-green-500/40 bg-green-500/10 px-4 py-3">
          <p className="text-center text-xs font-bold uppercase tracking-widest text-green-500/70">
            Votre position
          </p>
          <div className="mt-2 flex items-center gap-3">
            <span className="text-lg font-black text-green-400">
              #{myRank + 1}
            </span>
            <p className="flex-1 truncate font-bold text-white">
              {me.username}
            </p>
            <span className="font-black text-green-400">
              {me.lifetime_points_earned.toLocaleString("fr-FR")} pts
            </span>
          </div>
        </div>
      )}

      {players.length === 0 && (
        <p className="mt-8 text-center text-sm text-zinc-600">
          Aucun joueur pour l&apos;instant.
        </p>
      )}
    </main>
  );
}
