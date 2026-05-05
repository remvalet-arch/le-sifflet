const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });
const ws = require("ws");

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
  realtime: { transport: ws }
});

async function run() {
  const { data: squads } = await supabase.from("squads").select("id, name");
  for (const squad of squads) {
    const { data: members } = await supabase.from("squad_members").select("user_id").eq("squad_id", squad.id);
    const hasCafoutch = members.some(m => m.user_id === 'e65b9789-0500-4f77-bb0f-c7388c827e02');
    if (hasCafoutch) {
      console.log(`Squad: ${squad.name} (${squad.id}), members: ${members.length}`);
    }
  }
}
run();
