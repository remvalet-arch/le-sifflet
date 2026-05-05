const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });
const ws = require("ws");

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
  realtime: { transport: ws }
});

async function run() {
  const { data: profile } = await supabase.from("profiles").select("id, username, xp").eq("id", 'e65b9789-0500-4f77-bb0f-c7388c827e02');
  console.log("Cafoutch profile:", profile);
}
run();
