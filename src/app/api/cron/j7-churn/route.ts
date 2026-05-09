import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { successResponse, errorResponse } from "@/lib/api-response";
import { sendEmail, emailJ7Churn } from "@/lib/email";

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

  const tallyUrl =
    process.env.TALLY_FEEDBACK_URL ?? "https://tally.so/r/vartime-feedback";

  const admin = createAdminClient();

  const now = new Date();
  const windowEnd = new Date(now.getTime() - 167 * 60 * 60 * 1000);
  const windowStart = new Date(now.getTime() - 169 * 60 * 60 * 1000);

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
          subject: "Avant de partir, dis-nous ce qui t'a freiné 🙏",
          html: emailJ7Churn(profile.username, tallyUrl),
        });
        sent++;
      } catch (err) {
        console.error("[cron/j7-churn] Email failed for", profile.id, err);
      }
    }),
  );

  console.info(`[cron/j7-churn] Sent ${sent}/${inactive.length} emails`);
  return successResponse({ targeted: inactive.length, sent });
}
