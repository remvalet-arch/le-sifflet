import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LiveRoom } from "@/components/match/LiveRoom";

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

const STATUS_CONFIG = {
  live: {
    label: "En direct",
    className:
      "rounded-full bg-red-600/90 px-3 py-1 text-xs font-black uppercase tracking-wide text-white",
    dot: true,
  },
  upcoming: {
    label: "À venir",
    className:
      "rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-green-100",
    dot: false,
  },
  finished: {
    label: "Terminé",
    className:
      "rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-green-100/60",
    dot: false,
  },
} as const;

export default async function MatchPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: match, error }, { data: { user } }] = await Promise.all([
    supabase.from("matches").select("*").eq("id", id).maybeSingle(),
    supabase.auth.getUser(),
  ]);

  if (error || !match) notFound();
  if (!user) return null; // irréachable — (app) layout protège cette route

  const { data: profile } = await supabase
    .from("profiles")
    .select("sifflets_balance")
    .eq("id", user.id)
    .single();

  const siffletsBalance = profile?.sifflets_balance ?? 0;

  const cfg = STATUS_CONFIG[match.status];
  const when = new Date(match.start_time).toLocaleString("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
  });

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
      <Link
        href="/lobby"
        className="text-sm font-bold text-whistle underline-offset-2 hover:underline"
      >
        ← Terrain
      </Link>

      {/* Scoreboard */}
      <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-6 text-center shadow-xl">
        <div className="flex items-center justify-between gap-4">
          <span className="flex-1 text-left text-lg font-black leading-tight text-white sm:text-xl">
            {match.team_home}
          </span>
          <span className="shrink-0 text-sm font-bold text-green-100/60 uppercase tracking-widest">
            VS
          </span>
          <span className="flex-1 text-right text-lg font-black leading-tight text-white sm:text-xl">
            {match.team_away}
          </span>
        </div>

        <div className="mt-4 flex items-center justify-center gap-2">
          {cfg.dot && (
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
            </span>
          )}
          <span className={cfg.className}>{cfg.label}</span>
        </div>

        <p className="mt-2 text-xs text-green-100/50">{when}</p>
      </div>

      {/* Live Room — signalement communautaire */}
      {match.status === "live" ? (
        <LiveRoom match={match} siffletsBalance={siffletsBalance} userId={user.id} />
      ) : (
        <p className="mt-8 rounded-2xl border border-white/10 bg-black/20 p-6 text-center text-sm text-green-100/60">
          {match.status === "upcoming"
            ? "Le live s'ouvrira au coup d'envoi."
            : "Ce match est terminé."}
        </p>
      )}
    </main>
  );
}
