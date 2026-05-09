import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { RateLimitRoute } from "@/lib/constants/rate-limits";
import { RATE_LIMITS } from "@/lib/constants/rate-limits";

/**
 * Rate limiter backed by rate_limit_log for routes that have no natural
 * business table to count from (claim-daily-streak, claim-rsa).
 *
 * Returns true if the request should be blocked (rate limit exceeded).
 * Inserts a record when the request is allowed.
 */
export async function checkRateLimit(
  supabase: SupabaseClient<Database>,
  userId: string,
  route: RateLimitRoute,
): Promise<{ limited: boolean; retryAfter: number }> {
  const { windowMs, max } = RATE_LIMITS[route];
  const windowSecs = windowMs / 1000;
  const since = new Date(Date.now() - windowMs).toISOString();

  const { count } = await supabase
    .from("rate_limit_log")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("route", route)
    .gte("created_at", since);

  if ((count ?? 0) >= max) {
    return { limited: true, retryAfter: windowSecs };
  }

  await supabase.from("rate_limit_log").insert({ user_id: userId, route });

  return { limited: false, retryAfter: windowSecs };
}
