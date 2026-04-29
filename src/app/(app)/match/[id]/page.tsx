import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("matches")
    .select("team_home, team_away")
    .eq("id", id)
    .maybeSingle();
  if (!data) {
    return { title: "Match" };
  }
  return { title: `${data.team_home} — ${data.team_away}` };
}

export default async function MatchPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: match, error } = await supabase
    .from("matches")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !match) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-2xl flex-1 px-4 py-8">
      <Link
        href="/lobby"
        className="text-sm font-bold text-whistle underline-offset-2 hover:underline"
      >
        ← Lobby
      </Link>
      <h1 className="mt-4 text-2xl font-black uppercase text-white">
        {match.team_home} — {match.team_away}
      </h1>
      <p className="mt-2 text-sm capitalize text-green-100/90">
        Statut : {match.status}
      </p>
      <p className="mt-8 rounded-2xl border border-white/10 bg-black/25 p-6 text-center text-green-100/85">
        Live room (signalements, marchés, votes) —{" "}
        <strong className="text-whistle">étape 3</strong>.
      </p>
    </main>
  );
}
