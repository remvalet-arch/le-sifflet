import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { successResponse, errorResponse } from "@/lib/api-response";
import { resolveEvent } from "@/lib/resolve-event";
import { notifyVarBetResults } from "@/lib/var-notifications";
import { isAdminRole } from "@/lib/constants/permissions";
import { logAdminAction } from "@/lib/audit";
import { checkRateLimit } from "@/lib/db-rate-limiter";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return errorResponse("Non authentifié", 401);

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !isAdminRole(profile.role)) {
    return errorResponse("Accès réservé aux administrateurs", 403);
  }

  const { limited, retryAfter } = await checkRateLimit(
    supabase,
    user.id,
    "admin-resolve-event",
  );
  if (limited) {
    return errorResponse(
      `Trop de requêtes — réessaie dans ${retryAfter}s`,
      429,
    );
  }

  const body = (await request.json()) as {
    event_id?: string;
    result?: string;
  };

  if (!body.event_id || !body.result || body.result.trim() === "") {
    return errorResponse("Paramètres invalides", 400);
  }

  const adminClient = createAdminClient();

  const { data: eventRow } = await adminClient
    .from("market_events")
    .select("match_id, type")
    .eq("id", body.event_id)
    .single();

  try {
    await resolveEvent(body.event_id, body.result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erreur inconnue";
    if (msg.includes("event_not_open"))
      return errorResponse("Événement déjà résolu ou introuvable", 400);
    return errorResponse(msg);
  }

  // Personalized push + badges (fire-and-forget)
  if (eventRow) {
    void notifyVarBetResults(
      adminClient,
      body.event_id!,
      eventRow.type,
      eventRow.match_id,
      body.result!,
    );
  }

  void logAdminAction({
    actorUserId: user.id,
    actorRole: profile.role as "user" | "moderator" | "founder",
    actionType: "resolve_event",
    targetResourceType: "market_event",
    targetResourceId: body.event_id,
    metadata: { result: body.result },
    ipAddress:
      request.headers.get("x-forwarded-for")?.split(",")[0] ?? undefined,
    userAgent: request.headers.get("user-agent") ?? undefined,
  });

  return successResponse({ resolved: true });
}
