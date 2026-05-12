import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { successResponse, errorResponse } from "@/lib/api-response";
import { sendEmail, emailWeeklyRecap } from "@/lib/email";
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

  // Last 7 complete days (Mon–Sun)
  const now = new Date();
  const weekEnd = new Date(now);
  weekEnd.setUTCDate(weekEnd.getUTCDate() - 1);
  weekEnd.setUTCHours(23, 59, 59, 999);
  const weekStart = new Date(weekEnd);
  weekStart.setUTCDate(weekStart.getUTCDate() - 6);
  weekStart.setUTCHours(0, 0, 0, 0);

  const wStart = weekStart.toISOString().slice(0, 10);
  const wEnd = weekEnd.toISOString().slice(0, 10);

  const weekLabel = `${wStart} → ${wEnd}`;

  // Aggregate from user_daily_recaps for the 7-day window
  const { data: recaps } = await admin
    .from("user_daily_recaps")
    .select(
      "user_id, pronos_total, pronos_correct, var_bets_total, var_bets_won, points_earned, recap_date",
    )
    .gte("recap_date", wStart)
    .lte("recap_date", wEnd);

  if (!recaps || recaps.length === 0) {
    log.info("weekly-recap", "No recaps in window — skipping");
    return successResponse({ sent: 0 });
  }

  type WeeklyAgg = {
    points_earned: number;
    pronos_total: number;
    pronos_correct: number;
    var_bets_total: number;
    var_bets_won: number;
    active_days: number;
  };

  const userWeekly = new Map<string, WeeklyAgg>();
  for (const r of recaps) {
    const uid = r.user_id;
    if (!userWeekly.has(uid)) {
      userWeekly.set(uid, {
        points_earned: 0,
        pronos_total: 0,
        pronos_correct: 0,
        var_bets_total: 0,
        var_bets_won: 0,
        active_days: 0,
      });
    }
    const agg = userWeekly.get(uid)!;
    agg.points_earned += r.points_earned ?? 0;
    agg.pronos_total += r.pronos_total ?? 0;
    agg.pronos_correct += r.pronos_correct ?? 0;
    agg.var_bets_total += r.var_bets_total ?? 0;
    agg.var_bets_won += r.var_bets_won ?? 0;
    agg.active_days += 1;
  }

  const allUserIds = [...userWeekly.keys()];

  // Fetch notif prefs + username
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, username, notif_daily_digest")
    .in("id", allUserIds);

  const optedIn = new Set<string>();
  for (const p of profiles ?? []) {
    if (p.notif_daily_digest) optedIn.add(p.id);
  }

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  const optedInIds = allUserIds.filter((uid) => optedIn.has(uid));

  if (optedInIds.length === 0) {
    log.info("weekly-recap", "No opted-in users — skipping");
    return successResponse({ sent: 0 });
  }

  // Fetch emails
  const emailMap = new Map<string, string>();
  await Promise.allSettled(
    optedInIds.map(async (uid) => {
      const { data } = await admin.auth.admin.getUserById(uid);
      if (data.user?.email) emailMap.set(uid, data.user.email);
    }),
  );

  let sent = 0;
  await Promise.allSettled(
    optedInIds.map(async (uid) => {
      const email = emailMap.get(uid);
      if (!email) return;
      const agg = userWeekly.get(uid)!;
      const profile = profileMap.get(uid);
      const username = profile?.username ?? "Arbitre";

      await sendEmail({
        to: email,
        subject: `📊 Ton récap de la semaine — VAR TIME`,
        html: emailWeeklyRecap(username, agg, weekLabel),
      });
      sent++;
    }),
  );

  log.info("weekly-recap", `Sent ${sent} weekly recap emails`);
  return successResponse({ sent });
}
