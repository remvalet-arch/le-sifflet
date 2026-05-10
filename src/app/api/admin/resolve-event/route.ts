import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { successResponse, errorResponse } from "@/lib/api-response";
import { resolveEvent } from "@/lib/resolve-event";
import { checkAndUnlockBadges } from "@/app/actions/badges";
import { sendPushToUsers } from "@/lib/push-sender";
import { postSystemMessageToUserSquads } from "@/lib/squad-messages";
import { isAdminRole } from "@/lib/constants/permissions";
import { logAdminAction } from "@/lib/audit";
import { checkRateLimit } from "@/lib/db-rate-limiter";

const EVENT_LABEL: Record<string, string> = {
  penalty_check: "Penalty en discussion",
  penalty_outcome: "Résultat penalty",
  var_goal: "But sous VAR",
  red_card: "Carton rouge",
  free_kick: "Coup franc dangereux",
  corner: "Corner",
};

// Verdict labels per result
const OUI_VERDICT: Record<string, string> = {
  penalty_check: "PENALTY confirmé !",
  penalty_outcome: "PENALTY marqué !",
  var_goal: "BUT VALIDÉ !",
  red_card: "ROUGE confirmé !",
  free_kick: "COUP FRANC !",
  corner: "Corner confirmé",
};
const NON_VERDICT: Record<string, string> = {
  penalty_check: "NON Penalty.",
  penalty_outcome: "Penalty raté.",
  var_goal: "BUT ANNULÉ.",
  red_card: "Carton annulé.",
  free_kick: "Coup franc refusé.",
  corner: "Corner annulé.",
};

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
  void (async () => {
    const { data: bets } = await adminClient
      .from("bets")
      .select("user_id, status, potential_reward, amount_staked")
      .eq("event_id", body.event_id!);

    const uniqueUserIds = [...new Set((bets ?? []).map((b) => b.user_id))];
    await Promise.all(uniqueUserIds.map((uid) => checkAndUnlockBadges(uid)));

    if (!eventRow || !bets?.length) return;

    // Fetch notif opt-outs for these users
    const { data: prefs } = await adminClient
      .from("profiles")
      .select("id, notif_var_results")
      .in("id", uniqueUserIds);
    const optedOut = new Set(
      (prefs ?? []).filter((p) => !p.notif_var_results).map((p) => p.id),
    );

    const verdictLabel =
      body.result === "oui"
        ? (OUI_VERDICT[eventRow.type] ?? "CONFIRMÉ !")
        : (NON_VERDICT[eventRow.type] ?? "ANNULÉ.");
    const eventLabel = EVENT_LABEL[eventRow.type] ?? "Événement VAR";

    await Promise.all(
      bets
        .filter((bet) => !optedOut.has(bet.user_id))
        .map((bet) => {
          const bodyText =
            bet.status === "won"
              ? `${verdictLabel} +${bet.potential_reward} 🪙 gagnés 🔥`
              : `${verdictLabel} ${bet.amount_staked} 🪙 perdus.`;
          return sendPushToUsers([bet.user_id], {
            title: `⚡ VAR Résolue — ${eventLabel}`,
            body: bodyText,
            url: `/match/${eventRow.match_id}`,
          });
        }),
    );

    // Squad system messages — "Gros gain" (≥200 Sifflets)
    const bigWinners = bets.filter(
      (b) => b.status === "won" && (b.potential_reward ?? 0) >= 200,
    );
    if (bigWinners.length > 0) {
      const { data: profiles } = await adminClient
        .from("profiles")
        .select("id, username")
        .in(
          "id",
          bigWinners.map((b) => b.user_id),
        );
      const usernameMap = new Map(
        (profiles ?? []).map((p) => [p.id, p.username ?? "Un arbitre"]),
      );
      const userScores = new Map(
        bigWinners.map((b) => [
          b.user_id,
          {
            score: b.potential_reward ?? 0,
            message: `🔥 **${usernameMap.get(b.user_id) ?? "Un arbitre"}** vient d'empocher +${b.potential_reward} 🪙 sur une VAR — folie ou génie ?`,
          },
        ]),
      );
      await postSystemMessageToUserSquads(userScores);
    }
  })();

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
