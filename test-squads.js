const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });
const ws = require("ws");

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
  realtime: { transport: ws }
});

async function run() {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);

  console.log("Monday:", monday.toISOString());

  const { data: bets, error } = await supabase
    .from("bets")
    .select("user_id, potential_reward, amount_staked, placed_at, status")
    .gte("placed_at", monday.toISOString())
    .eq("status", "won");

  console.log("Error?", error);
  console.log("Bets won since monday:", bets?.length);
  if (bets && bets.length > 0) {
      console.log(bets.slice(0, 2));
  }

  const { data: allBets } = await supabase.from("bets").select("placed_at, status").order("placed_at", {ascending: false}).limit(5);
  console.log("Recent bets:", allBets);
}
run();
