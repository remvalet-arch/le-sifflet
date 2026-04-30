import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LiveRoom } from "@/components/match/LiveRoom";
import { Scoreboard } from "@/components/match/Scoreboard";
import { isMatchInProgress } from "@/lib/matches";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("matches")
    .select("team_home, team_away")
    .eq("id", id)
    .maybeSingle();
  if (!data) return { title: "Match" };
  return { title: `${data.team_home} — ${data.team_away}` };
}

export default async function MatchPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: match, error }, { data: { user } }] = await Promise.all([
    supabase.from("matches").select("*").eq("id", id).maybeSingle(),
    supabase.auth.getUser(),
  ]);

  if (error || !match) notFound();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("sifflets_balance, trust_score")
    .eq("id", user.id)
    .single();

  const siffletsBalance = profile?.sifflets_balance ?? 0;
  const isModerator = (profile?.trust_score ?? 0) > 150;

  const when = new Date(match.start_time).toLocaleString("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
  });

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
      <Link
        href="/lobby"
        className="inline-flex items-center gap-1.5 text-sm font-bold text-whistle transition-opacity hover:opacity-70"
      >
        ← Terrain
      </Link>

      {(isMatchInProgress(match.status) || (isModerator && match.status === "upcoming")) ? (
        <LiveRoom
          match={match}
          siffletsBalance={siffletsBalance}
          userId={user.id}
          isModerator={isModerator}
        />
      ) : (
        <>
          <div className="mt-4 rounded-2xl border border-white/10 bg-zinc-900/60 shadow-xl">
            <Scoreboard match={match} />
          </div>
          <p className="mt-3 text-center text-xs text-zinc-500">{when}</p>
          <p className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-6 text-center text-sm text-zinc-500">
            {match.status === "upcoming"
              ? "Le live s'ouvrira au coup d'envoi."
              : "Ce match est terminé."}
          </p>
        </>
      )}
    </main>
  );
}
