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

/**
 * GET /api/cron/prono-reminders
 *
 * Finds matches starting in 50–70 minutes, collects squad members who haven't
 * pronosticated, and sends a push notification to each.
 */
export async function GET(request: Request) {
  if (!verifyCronBearer(request)) {
    return errorResponse("Non autorisé", 401);
  }

  const admin = createAdminClient();
  const now = new Date();
  const in50min = new Date(now.getTime() + 50 * 60 * 1000).toISOString();
  const in70min = new Date(now.getTime() + 70 * 60 * 1000).toISOString();

  // Matches starting in the next 50-70 min window
  const { data: upcomingMatches } = await admin
    .from("matches")
    .select("id, team_home, team_away, competition_id")
    .eq("status", "upcoming")
    .gte("start_time", in50min)
    .lte("start_time", in70min);

  if (!upcomingMatches || upcomingMatches.length === 0) {
    return successResponse({ notified: 0 });
  }

  const matchIds = upcomingMatches.map((m) => m.id);

  // Members of squads that follow these competitions (via squad membership)
  const { data: allSquadMembers } = await admin
    .from("squad_members")
    .select("user_id");

  const allMemberIds = [
    ...new Set((allSquadMembers ?? []).map((m) => m.user_id)),
  ];
  if (allMemberIds.length === 0) return successResponse({ notified: 0 });

  // Who already has a prono for these matches?
  const { data: existingPronos } = await admin
    .from("pronos")
    .select("user_id, match_id")
    .in("match_id", matchIds)
    .in("user_id", allMemberIds);

  const pronoSet = new Set(
    (existingPronos ?? []).map((p) => `${p.user_id}:${p.match_id}`),
  );

  let totalNotified = 0;

  for (const match of upcomingMatches) {
    const usersWithoutProno = allMemberIds.filter(
      (uid) => !pronoSet.has(`${uid}:${match.id}`),
    );
    if (usersWithoutProno.length === 0) continue;

    await sendPushToUsers(usersWithoutProno, {
      title: `⏰ ${match.team_home} – ${match.team_away} dans 1h`,
      body: "Tu n'as pas encore pronostiqué — fonce !",
      url: "/pronos",
    });
    totalNotified += usersWithoutProno.length;
  }

  return successResponse({ notified: totalNotified });
}
