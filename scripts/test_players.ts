import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

async function run() {
  const { data, count, error } = await supabase
    .from("players")
    .select("player_name, team_name", { count: "exact" });
  console.log("Error:", error?.message);
  console.log("Total players in DB:", count);
  console.log("Players returned in query:", data?.length);

  const cremonese = data?.filter((p) =>
    p.team_name.toLowerCase().includes("cremonese"),
  );
  console.log("Cremonese players in returned data:", cremonese?.length);
}
run();
