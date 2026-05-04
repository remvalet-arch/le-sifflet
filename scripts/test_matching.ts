import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

function normalizeTeam(name: string): string {
  return name
    .replace(/\b(F\.C\.|FC|AFC|RFC|SC|AC|AS|OGC|RC)\b\.?\s*/gi, "")
    .trim()
    .toLowerCase();
}
function teamsMatch(a: string, b: string): boolean {
  const na = normalizeTeam(a);
  const nb = normalizeTeam(b);
  return na.includes(nb) || nb.includes(na);
}

async function run() {
  const { data: matches } = await supabase
    .from("matches")
    .select("team_home, team_away")
    .eq("status", "upcoming")
    .limit(5);
  const { data: players } = await supabase
    .from("players")
    .select("team_name")
    .limit(15000);

  if (!matches || !players) return console.log("Missing data");

  const uniquePlayerTeams = Array.from(
    new Set(players.map((p) => p.team_name)),
  );
  console.log("Some player teams:", uniquePlayerTeams.slice(0, 10));

  for (const m of matches) {
    const homePlayers = uniquePlayerTeams.filter((t) =>
      teamsMatch(t, m.team_home),
    );
    console.log(`Match ${m.team_home} matched with player teams:`, homePlayers);
  }
}
run();
