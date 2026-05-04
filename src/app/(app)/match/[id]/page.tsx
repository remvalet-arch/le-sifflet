import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LiveRoom } from "@/components/match/LiveRoom";
import { MODERATOR_THRESHOLD } from "@/lib/constants/permissions";

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

  const [
    { data: match, error },
    {
      data: { user },
    },
  ] = await Promise.all([
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
  const isModerator = (profile?.trust_score ?? 0) >= MODERATOR_THRESHOLD;

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 bg-zinc-950 px-4 py-6">
      <Link
        href="/lobby"
        className="inline-flex items-center gap-1.5 text-sm font-bold text-whistle transition-opacity hover:opacity-70"
      >
        ← Terrain
      </Link>

      <LiveRoom
        match={match}
        siffletsBalance={siffletsBalance}
        userId={user.id}
        isModerator={isModerator}
      />
    </main>
  );
}
