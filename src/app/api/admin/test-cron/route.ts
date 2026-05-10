import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { isAdminRole } from "@/lib/constants/permissions";

export const dynamic = "force-dynamic";

const ALLOWED_CRONS = [
  "j1-inactive",
  "j3-inactive",
  "j7-churn",
  "daily-digest",
  "weekly-recap",
  "solo-activation",
  "twitter-live",
  "community-listener",
  "personal-branding",
] as const;

type CronId = (typeof ALLOWED_CRONS)[number];

/**
 * POST /api/admin/test-cron
 * Déclenche un cron manuellement en tant qu'admin (rôle moderator ou founder).
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
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !isAdminRole(profile.role)) {
    return errorResponse("Accès réservé aux administrateurs", 403);
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
  const baseUrl = "https://vartime.app";
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
    const detail =
      cronData && typeof cronData === "object" && "error" in cronData
        ? (cronData as { error: string }).error
        : `status ${cronRes.status}`;
    return errorResponse(`Cron ${cronId}: ${detail}`, 502);
  }

  return successResponse({
    cron: cronId,
    status: cronRes.status,
    result: cronData,
  });
}
