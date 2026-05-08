import { timingSafeEqual } from "node:crypto";
import { errorResponse, successResponse } from "@/lib/api-response";
import { sendPushToUsers } from "@/lib/push-sender";

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
 * POST /api/admin/test-push
 * Envoie un push de test à un user_id donné.
 * Auth : Authorization: Bearer <CRON_SECRET>
 */
export async function POST(request: Request) {
  if (!verifyCronBearer(request)) {
    return errorResponse("Unauthorized", 401);
  }

  let body: { userId?: string; title?: string; body?: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  const { userId, title, body: msgBody } = body;
  if (!userId) return errorResponse("userId requis", 400);

  const sent = await sendPushToUsers([userId], {
    title: title ?? "🔔 Push de test — VAR TIME",
    body: msgBody ?? "Le système de notifications fonctionne correctement.",
    url: "/lobby",
  });

  return successResponse({
    sent,
    userId,
    message:
      sent > 0
        ? "Push envoyé avec succès"
        : "Aucune subscription active pour cet utilisateur",
  });
}
