import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { successResponse, errorResponse } from "@/lib/api-response";

export const dynamic = "force-dynamic";

function verifyCronBearer(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  if (!auth?.toLowerCase().startsWith("bearer ")) return false;
  const token = auth.slice(7).trim();
  const a = Buffer.from(token, "utf8");
  const b = Buffer.from(secret, "utf8");
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * POST /api/cron/reset-monthly-points
 *
 * Resets monthly_points_earned to 0 for all profiles.
 * Should be triggered on the 1st of each month at 00:01 UTC via cron-job.org.
 */
export async function POST(request: Request) {
  if (!verifyCronBearer(request)) {
    return errorResponse("Non autorisé", 401);
  }

  const admin = createAdminClient();
  const { error } = await admin.rpc("reset_monthly_points");

  if (error) {
    console.error("[reset-monthly-points] RPC error:", error);
    return errorResponse("Erreur lors du reset mensuel", 500);
  }

  return successResponse({ reset: true, timestamp: new Date().toISOString() });
}
