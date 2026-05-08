import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api-response";

export const dynamic = "force-dynamic";

/**
 * POST /api/push/subscribe
 * Enregistre une subscription Web Push pour l'utilisateur authentifié.
 * Remplace le Server Action (meilleure compatibilité iOS PWA).
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return errorResponse("Non authentifié", 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("JSON invalide", 400);
  }

  const b = body as Record<string, unknown>;
  const endpoint = typeof b.endpoint === "string" ? b.endpoint : null;
  const keysRaw = b.keys as Record<string, unknown> | undefined;
  const p256dh = typeof keysRaw?.p256dh === "string" ? keysRaw.p256dh : null;
  const auth = typeof keysRaw?.auth === "string" ? keysRaw.auth : null;

  if (!endpoint || !p256dh || !auth) {
    return errorResponse("endpoint et keys requis", 400);
  }

  const keys = { p256dh, auth };

  const { error } = await supabase.from("push_subscriptions").upsert(
    { user_id: user.id, endpoint, keys },
    { onConflict: "user_id,endpoint" },
  );

  if (error) {
    console.error("[push/subscribe] DB error:", error.message);
    return errorResponse(error.message, 500);
  }

  return successResponse({ saved: true });
}
