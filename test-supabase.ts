import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
config({ path: ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const { data, error } = await supabase
    .from("pronos")
    .select(`
      user_id,
      points_earned,
      matches!inner(start_time)
    `)
    .limit(1);
  console.log(error || data);
}
run();
