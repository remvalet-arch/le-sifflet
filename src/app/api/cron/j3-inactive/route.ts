import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { successResponse, errorResponse } from "@/lib/api-response";
import { sendEmail, emailJ3Inactive } from "@/lib/email";
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
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  if (!verifyCronBearer(request)) return errorResponse("Non autorisé", 401);

  const admin = createAdminClient();

  const now = new Date();
  const windowEnd = new Date(now.getTime() - 71 * 60 * 60 * 1000);
  const windowStart = new Date(now.getTime() - 73 * 60 * 60 * 1000);

  const { data: candidates } = await admin
    .from("profiles")
    .select("id, username")
    .gte("created_at", windowStart.toISOString())
    .lte("created_at", windowEnd.toISOString());

  if (!candidates || candidates.length === 0) {
    return successResponse({ targeted: 0, sent: 0 });
  }

  const candidateIds = candidates.map((p) => p.id);

  const [{ data: activeProno }, { data: activeBet }] = await Promise.all([
    admin.from("pronos").select("user_id").in("user_id", candidateIds),
    admin.from("bets").select("user_id").in("user_id", candidateIds),
  ]);

  const activeIds = new Set([
    ...(activeProno ?? []).map((r) => r.user_id),
    ...(activeBet ?? []).map((r) => r.user_id),
  ]);

  const inactive = candidates.filter((c) => !activeIds.has(c.id));
  if (inactive.length === 0) {
    return successResponse({ targeted: 0, sent: 0 });
  }

  let sent = 0;
  await Promise.allSettled(
    inactive.map(async (profile) => {
      const { data: authUser } = await admin.auth.admin.getUserById(profile.id);
      const email = authUser?.user?.email;
      if (!email) return;
      try {
        await sendEmail({
          to: email,
          subject: "On a réservé ta place dans la ligue CDM 🏆",
          html: emailJ3Inactive(profile.username),
        });
        sent++;
      } catch (err) {
        log.error("cron-j3-inactive", "Email failed", {
          userId: profile.id,
          error: String(err),
        });
      }
    }),
  );

  log.info("cron-j3-inactive", "Emails sent", { sent, total: inactive.length });
  return successResponse({ targeted: inactive.length, sent });
}
