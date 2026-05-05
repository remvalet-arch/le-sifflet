const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });
const ws = require("ws");

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
  realtime: { transport: ws }
});

async function run() {
  const squadId = '1164d935-5df0-4269-8cea-254a529d60b5';
  
  const { data: members } = await supabase.from("squad_members").select("user_id").eq("squad_id", squadId);
  const memberIds = members.map(m => m.user_id);
  
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);

  const { data: weekPronos } = await supabase
    .from("pronos")
    .select("user_id, points_earned, matches!inner(start_time)")
    .in("user_id", memberIds)
    .gte("matches.start_time", monday.toISOString())
    .gt("points_earned", 0);

  console.log("Week pronos:", weekPronos);

  // also what were the pronos placed this week? (old logic)
  const { data: oldPronos } = await supabase
    .from("pronos")
    .select("user_id, points_earned, placed_at")
    .in("user_id", memberIds)
    .gte("placed_at", monday.toISOString())
    .gt("points_earned", 0);

  console.log("Old pronos logic:", oldPronos);
}
run();
