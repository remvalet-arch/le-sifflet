import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

async function run() {
  const matchId = "858d4ebf-f58c-4a37-b4d2-3bfd68c92f58"; // We'll just grab any upcoming match

  const { data: matches } = await supabase
    .from("matches")
    .select("id, team_home, team_away, home_team_id, away_team_id")
    .eq("status", "upcoming")
    .limit(2);

  if (!matches || matches.length === 0)
    return console.log("No upcoming matches");

  for (const match of matches) {
    console.log(`\nMatch: ${match.team_home} vs ${match.team_away}`);
    console.log(`Home Team ID: ${match.home_team_id}`);

    // Check how many players have this exact team_id
    const { count: exactCount } = await supabase
      .from("players")
      .select("*", { count: "exact", head: true })
      .eq("team_id", match.home_team_id!);
    console.log(`Players with exact team_id: ${exactCount}`);

    // Check how many players match by name
    const { count: nameCount } = await supabase
      .from("players")
      .select("*", { count: "exact", head: true })
      .ilike("team_name", `%${match.team_home}%`);
    console.log(`Players matching team_name ilike: ${nameCount}`);
  }
}
run();
