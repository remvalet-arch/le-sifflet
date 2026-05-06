import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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

  const [matchResponse, authResponse] = await Promise.all([
    supabase
      .from("matches")
      .select(
        "*, home_team:teams!home_team_id(color_primary, color_secondary), away_team:teams!away_team_id(color_primary, color_secondary)",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase.auth.getUser(),
  ]);

  const { data: matchData, error } = matchResponse;
  const {
    data: { user },
  } = authResponse;

  if (error || !matchData) notFound();
  if (!user) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const match = matchData as any; // Bypass TS error on missing relationship

  const [{ data: profile }, { data: pairs }] = await Promise.all([
    supabase
      .from("profiles")
      .select("sifflets_balance, trust_score")
      .eq("id", user.id)
      .single(),
    supabase.rpc("squad_members_for_my_squads"),
  ]);

  const siffletsBalance = profile?.sifflets_balance ?? 0;
  const isModerator = (profile?.trust_score ?? 0) >= MODERATOR_THRESHOLD;

  // On inclut AUSSI l'utilisateur courant pour qu'il puisse voir son propre prono dans le vestiaire !
  const memberIds = [
    ...new Set([...(pairs ?? []).map((p) => p.user_id), user.id]),
  ];

  let squadPronos: {
    user_id: string;
    prono_type: "exact_score" | "scorer" | "scorer_allocation";
    prono_value: string;
    points_earned: number;
    profiles: { username: string; avatar_url: string | null } | null;
  }[] = [];

  if (memberIds.length > 0) {
    const adminSupabase = createAdminClient();

    const [{ data: pronosData, error: pronosErr }, { data: profilesData }] =
      await Promise.all([
        adminSupabase
          .from("pronos")
          .select("user_id, prono_type, prono_value, points_earned")
          .eq("match_id", id)
          .in("user_id", memberIds),
        adminSupabase
          .from("profiles")
          .select("id, username, avatar_url")
          .in("id", memberIds),
      ]);

    if (pronosErr) {
      console.error("Erreur récupération pronos vestiaire:", pronosErr);
    }

    const profilesMap = new Map((profilesData ?? []).map((p) => [p.id, p]));

    // 3. On fusionne les deux
    squadPronos = (pronosData ?? []).map((p) => ({
      user_id: p.user_id,
      prono_type: p.prono_type,
      prono_value: p.prono_value,
      points_earned: p.points_earned,
      profiles: profilesMap.get(p.user_id) ?? null,
    }));
  }

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
        squadPronos={squadPronos}
      />
    </main>
  );
}
