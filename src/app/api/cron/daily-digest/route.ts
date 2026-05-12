import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { successResponse, errorResponse } from "@/lib/api-response";
import { sendPushToUsers } from "@/lib/push-sender";
import { sendEmail, emailDailyDigest } from "@/lib/email";
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

type UserRecap = {
  pronos_total: number;
  pronos_correct: number;
  pronos_exact: number;
  var_bets_total: number;
  var_bets_won: number;
  points_earned: number;
};

export async function GET(request: Request) {
  if (!verifyCronBearer(request)) return errorResponse("Non autorisé", 401);

  const admin = createAdminClient();

  // Yesterday UTC window
  const now = new Date();
  const yesterdayStart = new Date(now);
  yesterdayStart.setUTCDate(yesterdayStart.getUTCDate() - 1);
  yesterdayStart.setUTCHours(0, 0, 0, 0);
  const yesterdayEnd = new Date(yesterdayStart);
  yesterdayEnd.setUTCHours(23, 59, 59, 999);
  const recapDate = yesterdayStart.toISOString().slice(0, 10);

  const yStart = yesterdayStart.toISOString();
  const yEnd = yesterdayEnd.toISOString();

  // VAR bets: market events resolved yesterday
  const { data: resolvedEvents } = await admin
    .from("market_events")
    .select("id")
    .eq("status", "resolved")
    .gte("resolved_at", yStart)
    .lte("resolved_at", yEnd);

  const eventIds = (resolvedEvents ?? []).map((e) => e.id);

  // Pronos: matches that started AND finished yesterday (filter by match date,
  // not placed_at — pronos are placed days in advance)
  const { data: finishedMatches } = await admin
    .from("matches")
    .select("id")
    .eq("status", "finished")
    .gte("start_time", yStart)
    .lte("start_time", yEnd);

  const matchIds = (finishedMatches ?? []).map((m) => m.id);

  const [{ data: bets }, { data: pronos }] = await Promise.all([
    eventIds.length > 0
      ? admin
          .from("bets")
          .select("user_id, status, potential_reward")
          .in("event_id", eventIds)
          .in("status", ["won", "lost"])
      : {
          data: [] as {
            user_id: string;
            status: string;
            potential_reward: number | null;
          }[],
        },
    matchIds.length > 0
      ? admin
          .from("pronos")
          .select("user_id, status, points_earned, prono_type")
          .in("match_id", matchIds)
          .in("status", ["won", "lost"])
      : {
          data: [] as {
            user_id: string;
            status: string;
            points_earned: number;
            prono_type: string;
          }[],
        },
  ]);

  // Aggregate per-user stats
  const userRecaps = new Map<string, UserRecap>();

  function getOrCreate(uid: string): UserRecap {
    if (!userRecaps.has(uid)) {
      userRecaps.set(uid, {
        pronos_total: 0,
        pronos_correct: 0,
        pronos_exact: 0,
        var_bets_total: 0,
        var_bets_won: 0,
        points_earned: 0,
      });
    }
    return userRecaps.get(uid)!;
  }

  for (const b of bets ?? []) {
    const r = getOrCreate(b.user_id);
    r.var_bets_total += 1;
    if (b.status === "won") {
      r.var_bets_won += 1;
      r.points_earned += Math.round(b.potential_reward ?? 0);
    }
  }
  for (const p of pronos ?? []) {
    const r = getOrCreate(p.user_id);
    r.pronos_total += 1;
    if (p.status === "won") {
      r.pronos_correct += 1;
      r.points_earned += p.points_earned ?? 0;
      if (p.prono_type === "exact_score") r.pronos_exact += 1;
    }
  }

  const allActivityUserIds = [...userRecaps.keys()];

  if (allActivityUserIds.length === 0) {
    log.info("daily-digest", "No users with activity yesterday — skipping");
    return successResponse({ sent: 0, recaps: 0 });
  }

  // Fetch notif preferences + username
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, username, notif_daily_digest")
    .in("id", allActivityUserIds);

  const optedIn = new Set<string>();
  for (const p of profiles ?? []) {
    if (p.notif_daily_digest) optedIn.add(p.id);
  }

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  // Fetch emails for opted-in users
  const optedInIds = allActivityUserIds.filter((uid) => optedIn.has(uid));
  const emailMap = new Map<string, string>();
  await Promise.allSettled(
    optedInIds.map(async (uid) => {
      const { data } = await admin.auth.admin.getUserById(uid);
      if (data.user?.email) emailMap.set(uid, data.user.email);
    }),
  );

  // Insert recap rows (idempotent via ON CONFLICT DO NOTHING)
  const recapRows = allActivityUserIds.map((uid) => ({
    user_id: uid,
    recap_date: recapDate,
    ...userRecaps.get(uid)!,
  }));

  const { error: insertErr } = await admin
    .from("user_daily_recaps")
    .upsert(recapRows, {
      onConflict: "user_id,recap_date",
      ignoreDuplicates: true,
    });

  if (insertErr) {
    log.info("daily-digest", `Recap insert error: ${insertErr.message}`);
  }

  // Skip push for users who already opened the app and dismissed their recap today
  const { data: dismissedRows } = await admin
    .from("user_daily_recaps")
    .select("user_id")
    .in("user_id", allActivityUserIds)
    .eq("recap_date", recapDate)
    .not("dismissed_at", "is", null);

  const alreadyDismissed = new Set((dismissedRows ?? []).map((d) => d.user_id));

  // Send personalized digest pushes + emails to opted-in users
  let sent = 0;
  const digestTasks: Promise<void>[] = [];
  for (const uid of allActivityUserIds) {
    if (!optedIn.has(uid) || alreadyDismissed.has(uid)) continue;
    digestTasks.push(
      (async () => {
        const recap = userRecaps.get(uid)!;
        const earned = recap.points_earned;
        const profile = profileMap.get(uid);
        const username = profile?.username ?? "Arbitre";
        const bodyText =
          earned > 0
            ? `🏆 C'est l'heure du bilan ! Tu as gagné +${earned} Points hier. Découvre ton classement →`
            : `📊 C'est l'heure du bilan ! Retrouve tes résultats d'hier →`;

        await Promise.allSettled([
          sendPushToUsers([uid], {
            title: "📊 Bilan du jour — VAR TIME",
            body: bodyText,
            url: "/profile",
          }),
          emailMap.has(uid)
            ? sendEmail({
                to: emailMap.get(uid)!,
                subject: `📊 Ton bilan du ${recapDate} — VAR TIME`,
                html: emailDailyDigest(
                  username,
                  {
                    pronos_total: recap.pronos_total,
                    pronos_correct: recap.pronos_correct,
                    var_bets_total: recap.var_bets_total,
                    var_bets_won: recap.var_bets_won,
                    points_earned: recap.points_earned,
                  },
                  recapDate,
                ),
              })
            : Promise.resolve(),
        ]);
        sent++;
      })(),
    );
  }
  await Promise.allSettled(digestTasks);

  log.info(
    "daily-digest",
    `Generated ${recapRows.length} recaps, sent ${sent} pushes`,
  );
  return successResponse({ sent, recaps: recapRows.length });
}
