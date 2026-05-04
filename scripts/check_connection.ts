import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

console.log("URL:", url.substring(0, 20) + "...");
console.log("Key length:", key.length);

const supabase = createClient(url, key);

async function run() {
  const { count, error } = await supabase
    .from("players")
    .select("*", { count: "exact", head: true });
  console.log("Players count from actual app URL:", count);
  console.log("Error:", error);
}
run();
