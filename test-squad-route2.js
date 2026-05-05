const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });
const ws = require("ws");

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
  realtime: { transport: ws }
});

async function run() {
  const { data: membersList } = await supabase.from("squad_members").select("squad_id").limit(10);
  if (!membersList || membersList.length === 0) return console.log("No members found");
  
  const squadId = membersList[0].squad_id;
  
  const { data: members } = await supabase.from("squad_members").select("user_id").eq("squad_id", squadId);
  const memberIds = members.map(m => m.user_id);
  
  console.log("Squad ID:", squadId);
  console.log("Member IDs:", memberIds);
  
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);

  const weeklyXpByUser = new Map();

  const { data: weekPronos, error: wErr } = await supabase
    .from("pronos")
    .select("user_id, points_earned, matches!inner(start_time)")
    .in("user_id", memberIds)
    .gte("matches.start_time", monday.toISOString())
    .gt("points_earned", 0);

  const { data: weekBets, error: bErr } = await supabase
    .from("bets")
    .select("user_id, potential_reward, amount_staked, placed_at")
    .in("user_id", memberIds)
    .gte("placed_at", monday.toISOString())
    .eq("status", "won");

  console.log("Week bets returned:", weekBets);

  for (const p of weekPronos ?? []) {
    weeklyXpByUser.set(p.user_id, (weeklyXpByUser.get(p.user_id) ?? 0) + p.points_earned);
  }

  for (const b of weekBets ?? []) {
    const netGain = b.potential_reward - b.amount_staked;
    if (netGain > 0) {
      weeklyXpByUser.set(b.user_id, (weeklyXpByUser.get(b.user_id) ?? 0) + netGain);
    }
  }

  console.log("Weekly points by user:");
  console.log(Object.fromEntries(weeklyXpByUser));
}
run();
