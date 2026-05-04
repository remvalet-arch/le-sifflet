import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

async function run() {
  const {
    data: { users },
    error: authErr,
  } = await supabase.auth.admin.listUsers();
  if (!users?.[0]) return console.log("No user");
  const uid = users[0].id;

  // Need to use service_role or authenticate
}
run();
