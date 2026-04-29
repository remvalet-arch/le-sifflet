import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// Client service_role — bypass RLS. À utiliser uniquement côté serveur (Route Handlers, Server Actions).
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase admin env vars");
  return createClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
