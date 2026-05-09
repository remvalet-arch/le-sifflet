import { timingSafeEqual } from "node:crypto";
import { errorResponse, successResponse } from "@/lib/api-response";
import { createAdminClient } from "@/lib/supabase/admin";
import { log } from "@/lib/logger";

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
  return timingSafeEqual(a, b);
}

/**
 * POST /api/admin/invalidate-push-subscriptions
 * Supprime toutes les subscriptions push existantes (à utiliser si les VAPID keys ont changé).
 * Les utilisateurs devront réautoriser les notifications au prochain login.
 * Auth : Authorization: Bearer <CRON_SECRET>
 */
export async function POST(request: Request) {
  if (!verifyCronBearer(request)) {
    return errorResponse("Unauthorized", 401);
  }

  const admin = createAdminClient();

  const { count, error } = await admin
    .from("push_subscriptions")
    .delete({ count: "exact" })
    .neq("id", "00000000-0000-0000-0000-000000000000"); // delete all

  if (error) {
    log.error("admin-invalidate-push", "DB delete error", {
      error: error.message,
    });
    return errorResponse("Erreur lors de la suppression", 500);
  }

  log.info("admin-invalidate-push", "Subscriptions deleted", {
    count: count ?? 0,
  });
  return successResponse({
    deleted: count ?? 0,
    message: `${count ?? 0} subscriptions supprimées. Les utilisateurs devront réactiver les notifications.`,
  });
}
