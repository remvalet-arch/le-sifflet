import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

async function run() {
  const { count: c1 } = await supabase
    .from("league_top_players")
    .select("*", { count: "exact", head: true });
  console.log("league_top_players count:", c1);
  const { count: c2 } = await supabase
    .from("teams")
    .select("*", { count: "exact", head: true });
  console.log("teams count:", c2);
  const { count: c3 } = await supabase
    .from("matches")
    .select("*", { count: "exact", head: true });
  console.log("matches count:", c3);
}
run();
