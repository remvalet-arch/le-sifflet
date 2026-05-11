import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import JoinSquadButton from "./JoinSquadButton";

export const metadata = { title: "Rejoindre une ligue — VAR TIME" };

export default async function JoinPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const supabase = await createClient();

  // Resolve squad from invite code (uses RPC so RLS doesn't block it)
  const { data: rows } = await supabase.rpc("squad_by_invite_code", {
    p_invite: code.toUpperCase(),
  });
  const squad = rows?.[0] ?? null;

  if (!squad) {
    return (
      <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-zinc-950 px-6">
        <div className="w-full max-w-sm text-center">
          <p className="text-6xl">🚫</p>
          <h1 className="mt-4 text-2xl font-black uppercase tracking-tight text-white">
            Lien invalide
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Ce code d&apos;invitation n&apos;existe pas ou a expiré.
          </p>
          <Link
            href="/ligues"
            className="mt-8 inline-flex h-12 items-center justify-center rounded-2xl bg-whistle px-8 font-black text-zinc-900 transition hover:bg-whistle/90 active:scale-95"
          >
            Voir mes ligues
          </Link>
        </div>
      </main>
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Not authenticated — show landing + login CTA
  if (!user) {
    return (
      <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-zinc-950 px-6">
        <div className="w-full max-w-sm">
          <div className="rounded-3xl border border-white/10 bg-zinc-900 p-8 text-center shadow-xl">
            <p className="text-5xl">⚽</p>
            <h1 className="mt-4 text-2xl font-black uppercase tracking-tight text-white">
              Tu es invité !
            </h1>
            <p className="mt-2 text-sm text-zinc-400">Rejoins la ligue</p>
            <p className="mt-1 text-xl font-black text-whistle">{squad.name}</p>
            <p className="mt-4 text-xs text-zinc-500">
              Connecte-toi pour rejoindre automatiquement la ligue.
            </p>
            <Link
              href={`/login?redirect=/join/${code}`}
              className="mt-6 flex h-12 items-center justify-center rounded-2xl bg-whistle font-black text-zinc-900 transition hover:bg-whistle/90 active:scale-95"
            >
              Se connecter → Rejoindre
            </Link>
          </div>
          <p className="mt-6 text-center text-[10px] text-zinc-600">
            VAR TIME — Pronostics foot en temps réel · Gratuit
          </p>
        </div>
      </main>
    );
  }

  // Check if already a member
  const { data: existing } = await supabase
    .from("squad_members")
    .select("user_id")
    .eq("squad_id", squad.id)
    .eq("user_id", user.id)
    .maybeSingle();

  // Count current members
  const { count: memberCount } = await supabase
    .from("squad_members")
    .select("*", { count: "exact", head: true })
    .eq("squad_id", squad.id);

  if (existing) {
    redirect(`/ligues/${squad.id}`);
  }

  // Authenticated, not yet a member → show join confirmation
  const { data: myProfile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .single();

  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-zinc-950 px-6">
      <div className="w-full max-w-sm">
        <div className="rounded-3xl border border-white/10 bg-zinc-900 p-8 text-center shadow-xl">
          <p className="text-5xl">🏟️</p>
          <p className="mt-4 text-xs font-black uppercase tracking-widest text-zinc-500">
            Invitation ligue privée
          </p>
          <h1 className="mt-2 text-2xl font-black uppercase tracking-tight text-white">
            {squad.name}
          </h1>
          <p className="mt-3 text-sm text-zinc-400">
            Bonjour{" "}
            <span className="font-bold text-white">
              {myProfile?.username ?? "arbitre"}
            </span>{" "}
            — rejoins ce vestiaire pour affronter tes potes !
          </p>
          {memberCount !== null && memberCount > 0 && (
            <p className="mt-2 text-xs text-zinc-500">
              {memberCount} joueur{memberCount > 1 ? "s" : ""} déjà dans la
              ligue
            </p>
          )}
          <JoinSquadButton
            inviteCode={code.toUpperCase()}
            squadId={squad.id}
            squadName={squad.name}
          />
          <Link
            href="/ligues"
            className="mt-3 block text-xs text-zinc-600 underline-offset-2 hover:underline"
          >
            Pas maintenant
          </Link>
        </div>
      </div>
    </main>
  );
}
