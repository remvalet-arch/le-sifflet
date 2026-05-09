import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { successResponse, errorResponse } from "@/lib/api-response";
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
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  if (!verifyCronBearer(request)) return errorResponse("Non autorisé", 401);

  const admin = createAdminClient();

  // Profiles created 23-25h ago with zero pronos AND zero bets
  const now = new Date();
  const windowEnd = new Date(now.getTime() - 23 * 60 * 60 * 1000);
  const windowStart = new Date(now.getTime() - 25 * 60 * 60 * 1000);

  const { data: candidates } = await admin
    .from("profiles")
    .select("id")
    .gte("created_at", windowStart.toISOString())
    .lte("created_at", windowEnd.toISOString());

  if (!candidates || candidates.length === 0) {
    return successResponse({ targeted: 0, sent: 0 });
  }

  const candidateIds = candidates.map((p) => p.id);

  // Filter out users who already have pronos or bets
  const [{ data: activeProno }, { data: activeBet }] = await Promise.all([
    admin.from("pronos").select("user_id").in("user_id", candidateIds),
    admin.from("bets").select("user_id").in("user_id", candidateIds),
  ]);

  const activeIds = new Set([
    ...(activeProno ?? []).map((r) => r.user_id),
    ...(activeBet ?? []).map((r) => r.user_id),
  ]);

  const inactiveIds = candidateIds.filter((id) => !activeIds.has(id));

  if (inactiveIds.length === 0) {
    return successResponse({ targeted: 0, sent: 0 });
  }

  // La subscription push est le mécanisme de consentement pour ce nudge J+1 one-shot.
  // sendPushToUsers skippe silencieusement les users sans subscription active.
  await sendPushToUsers(inactiveIds, {
    title: "Tu es là pour parier ou pour regarder ? 👀",
    body: "Des matchs t'attendent sur VAR TIME. Lance ton premier prono →",
    url: "/pronos",
  });

  console.info(`[cron/j1-inactive] Pushed to ${inactiveIds.length} users`);
  return successResponse({ targeted: inactiveIds.length, sent: inactiveIds.length });
}
