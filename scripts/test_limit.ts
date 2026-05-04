import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function run() {
  const { data: matches } = await supabase
    .from("matches")
    .select("id, home_team_id, away_team_id")
    .limit(10);

  if (!matches) return;
  const teamIds = Array.from(
    new Set(
      matches.flatMap((m) => [m.home_team_id, m.away_team_id]).filter(Boolean),
    ),
  );

  const { data: players, count } = await supabase
    .from("players")
    .select("player_name, team_id", { count: "exact" })
    .in("team_id", teamIds);

  console.log(
    `For ${teamIds.length} teams, fetched ${players?.length} players (count: ${count})`,
  );
}
run();
