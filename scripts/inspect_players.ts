import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function run() {
  const { data } = await supabase
    .from("players")
    .select("team_name, team_id")
    .limit(20);
  console.log("Sample players team IDs and names:", data);

  // Find teams that actually have players
  const { data: teamIdsWithPlayers } = await supabase
    .from("players")
    .select("team_id")
    .limit(100);
  if (!teamIdsWithPlayers) return;

  const uniqueIds = Array.from(
    new Set(teamIdsWithPlayers.map((p) => p.team_id).filter(Boolean)),
  );
  console.log(
    "\nUnique team_ids in players table (sample):",
    uniqueIds.slice(0, 5),
  );

  if (uniqueIds.length > 0) {
    const { data: teams } = await supabase
      .from("teams")
      .select("id, name")
      .in("id", uniqueIds);
    console.log("Teams for these IDs:", teams);
  }
}
run();
