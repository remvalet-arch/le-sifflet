const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });
const ws = require("ws");

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
  realtime: { transport: ws }
});

async function run() {
  const { data: pronos, error } = await supabase
      .from("pronos")
      .select(`
        user_id,
        prono_type,
        prono_value,
        points_earned,
        profiles!inner(username, avatar_url)
      `)
      .limit(5);

  console.log("Error:", error);
  console.log("Pronos:", pronos);
}
run();
