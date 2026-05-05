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
  
  const { data: profiles } = await supabase.from("profiles").select("id, username").in("id", memberIds);
  console.log("Profiles:", profiles);
}
run();
