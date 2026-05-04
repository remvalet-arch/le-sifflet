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
    .select("player_name, team_name", { count: "exact" })
    .limit(10);
  console.log("Error:", error?.message);
  console.log("Total players in DB:", count);
  console.log("Sample players:", data);
}
run();
