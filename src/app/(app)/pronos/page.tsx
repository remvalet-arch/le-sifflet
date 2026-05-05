import { createClient } from "@/lib/supabase/server";
import { PronosticsHubClient } from "@/components/pronos/PronosticsHubClient";
import { LOBBY_TRACKED_LEAGUE_API_IDS } from "@/lib/constants/top-leagues";

export const metadata = { title: "Pronos" };

export default async function PronosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // eslint-disable-next-line react-hooks/purity
  const nowMs = Date.now();
  const sevenDaysLater = new Date(
    nowMs + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data: competitions } = await supabase
    .from("competitions")
    .select("id, name, badge_url, api_football_league_id")
    .in("api_football_league_id", LOBBY_TRACKED_LEAGUE_API_IDS as number[]);

  const competitionIds = (competitions ?? []).map((c) => c.id);

  const { data: matches } = await supabase
    .from("matches")
    .select(
      "id, team_home, team_away, home_team_id, away_team_id, home_team_logo, away_team_logo, start_time, competition_id, round_short, status, odds_home, odds_draw, odds_away",
    )
    .in("status", [
      "upcoming",
      "first_half",
      "half_time",
      "second_half",
      "paused",
    ] as const)
    .in("competition_id", competitionIds)
    .lte("start_time", sevenDaysLater)
    .order("start_time", { ascending: true })
    .limit(50);

  const matchIds = (matches ?? []).map((m) => m.id);
  const [{ data: existingPronos }, { data: stats }] =
    matchIds.length > 0
      ? await Promise.all([
          supabase
            .from("pronos")
            .select("match_id, prono_type, prono_value")
            .eq("user_id", user.id)
            .in("match_id", matchIds)
            .in("prono_type", ["exact_score", "scorer_allocation"]),
          supabase
            .from("v_match_pronos_stats")
            .select("*")
            .in("match_id", matchIds),
        ])
      : [{ data: [] }, { data: [] }];

  const statsByMatchId = new Map(stats?.map((s) => [s.match_id, s]));

  const enrichedMatches = (matches ?? []).map((m) => ({
    ...m,
    community_stats: statsByMatchId.get(m.id) ?? null,
  }));

  return (
    <main className="flex flex-col gap-4 px-4 py-4">
      <div className="flex items-baseline gap-2">
        <h1 className="text-lg font-black uppercase tracking-wide text-chalk">
          Pronos
        </h1>
        <span className="text-xs font-medium text-zinc-500">
          7 prochains jours
        </span>
      </div>
      <PronosticsHubClient
        matches={enrichedMatches}
        existingPronos={existingPronos ?? []}
        competitions={(competitions ?? []).map((c) => ({
          id: c.id,
          name: c.name,
          badge_url: c.badge_url,
        }))}
      />
    </main>
  );
}
