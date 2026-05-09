import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { MODERATOR_THRESHOLD } from "@/lib/constants/permissions";

export const dynamic = "force-dynamic";

const ALLOWED_CRONS = [
  "j1-inactive",
  "j3-inactive",
  "j7-churn",
  "daily-digest",
  "weekly-recap",
] as const;

type CronId = (typeof ALLOWED_CRONS)[number];

/**
 * POST /api/admin/test-cron
 * Déclenche un cron manuellement en tant qu'admin (trust_score >= MODERATOR_THRESHOLD).
 * Body : { cron: CronId }
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return errorResponse("Non authentifié", 401);

  const { data: profile } = await supabase
    .from("profiles")
    .select("trust_score")
    .eq("id", user.id)
    .single();

  if (!profile || profile.trust_score < MODERATOR_THRESHOLD) {
    return errorResponse("Accès refusé", 403);
  }

  let body: { cron?: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON", 400);
  }

  const cronId = body.cron as CronId;
  if (!ALLOWED_CRONS.includes(cronId)) {
    return errorResponse("Cron inconnu", 400);
  }

  const secret = process.env.CRON_SECRET;
  if (!secret) return errorResponse("CRON_SECRET manquant", 500);

  // Build absolute URL to call the cron route
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://vartime.app";
  const cronUrl = `${baseUrl}/api/cron/${cronId}`;

  const cronRes = await fetch(cronUrl, {
    method: "GET",
    headers: { Authorization: `Bearer ${secret}` },
  });

  let cronData: unknown;
  try {
    cronData = await cronRes.json();
  } catch {
    cronData = null;
  }

  if (!cronRes.ok) {
    return errorResponse(`Le cron a répondu ${cronRes.status}`, 502);
  }

  return successResponse({
    cron: cronId,
    status: cronRes.status,
    result: cronData,
  });
}
