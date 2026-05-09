import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { successResponse, errorResponse } from "@/lib/api-response";
import { sendPushToUsers } from "@/lib/push-sender";
import { sendEmail, emailSquadActivation } from "@/lib/email";
import type { PublicSquad } from "@/lib/email";
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

  // Window: profiles created 71–73h ago
  const now = new Date();
  const windowEnd = new Date(now.getTime() - 71 * 60 * 60 * 1000);
  const windowStart = new Date(now.getTime() - 73 * 60 * 60 * 1000);

  // Profiles created in this window
  const { data: candidates } = await admin
    .from("profiles")
    .select("id, username")
    .gte("created_at", windowStart.toISOString())
    .lte("created_at", windowEnd.toISOString());

  if (!candidates || candidates.length === 0) {
    log.info("solo-activation", "No profiles in 71–73h window");
    return successResponse({ sent: 0 });
  }

  const candidateIds = candidates.map((p) => p.id);

  // Keep only users who have at least 1 prono or bet (active users)
  const [{ data: activePronos }, { data: activeBets }] = await Promise.all([
    admin.from("pronos").select("user_id").in("user_id", candidateIds),
    admin.from("bets").select("user_id").in("user_id", candidateIds),
  ]);

  const activeIds = new Set([
    ...(activePronos ?? []).map((p) => p.user_id),
    ...(activeBets ?? []).map((b) => b.user_id),
  ]);

  // Keep only users NOT already in a squad
  const { data: members } = await admin
    .from("squad_members")
    .select("user_id")
    .in("user_id", [...activeIds]);

  const inSquad = new Set((members ?? []).map((m) => m.user_id));

  const targets = candidates.filter(
    (p) => activeIds.has(p.id) && !inSquad.has(p.id),
  );

  if (targets.length === 0) {
    log.info("solo-activation", "No active solo users in window");
    return successResponse({ sent: 0 });
  }

  // Fetch top 3 public squads by member count
  const { data: publicSquads } = await admin
    .from("squads")
    .select("id, name")
    .eq("is_private", false);

  let topSquads: PublicSquad[] = [];
  if (publicSquads && publicSquads.length > 0) {
    const publicIds = publicSquads.map((s) => s.id);
    const { data: memberCounts } = await admin
      .from("squad_members")
      .select("squad_id")
      .in("squad_id", publicIds);

    const countMap = new Map<string, number>();
    for (const m of memberCounts ?? []) {
      countMap.set(m.squad_id, (countMap.get(m.squad_id) ?? 0) + 1);
    }

    topSquads = publicSquads
      .map((s) => ({
        id: s.id,
        name: s.name,
        memberCount: countMap.get(s.id) ?? 0,
      }))
      .sort((a, b) => b.memberCount - a.memberCount)
      .slice(0, 3);
  }

  // Fetch emails for targets
  const emailMap = new Map<string, string>();
  await Promise.allSettled(
    targets.map(async (p) => {
      const { data } = await admin.auth.admin.getUserById(p.id);
      if (data.user?.email) emailMap.set(p.id, data.user.email);
    }),
  );

  let sent = 0;
  await Promise.allSettled(
    targets.map(async (p) => {
      const email = emailMap.get(p.id);
      const username = p.username ?? "Arbitre";

      await Promise.allSettled([
        sendPushToUsers([p.id], {
          title: "🏟️ Joue avec tes potes !",
          body: "Crée une ligue ou rejoins-en une en 30 secondes. Les joueurs en ligue s'amusent 10x plus →",
          url: "/ligues",
        }),
        email
          ? sendEmail({
              to: email,
              subject: `🏆 ${username}, il te manque une ligue !`,
              html: emailSquadActivation(username, topSquads),
            })
          : Promise.resolve(),
      ]);
      sent++;
    }),
  );

  log.info("solo-activation", `Sent ${sent} squad activation nudges`);
  return successResponse({ sent });
}
