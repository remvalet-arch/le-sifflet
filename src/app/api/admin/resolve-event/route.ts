import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { successResponse, errorResponse } from "@/lib/api-response";
import { resolveEvent } from "@/lib/resolve-event";
import { checkAndUnlockBadges } from "@/app/actions/badges";
import { sendPushToUsers } from "@/lib/push-sender";
import { MODERATOR_THRESHOLD } from "@/lib/constants/permissions";

const EVENT_LABEL: Record<string, string> = {
  penalty_check: "Penalty en discussion",
  penalty_outcome: "Résultat penalty",
  var_goal: "But sous VAR",
  red_card: "Carton rouge",
  injury_sub: "Blessure / Remplacement",
  free_kick: "Coup franc dangereux",
  corner: "Corner",
};

// Verdict labels per result
const OUI_VERDICT: Record<string, string> = {
  penalty_check: "PENALTY confirmé !",
  penalty_outcome: "PENALTY marqué !",
  var_goal: "BUT VALIDÉ !",
  red_card: "ROUGE confirmé !",
  injury_sub: "Remplacement confirmé",
  free_kick: "COUP FRANC !",
  corner: "Corner confirmé",
};
const NON_VERDICT: Record<string, string> = {
  penalty_check: "NON Penalty.",
  penalty_outcome: "Penalty raté.",
  var_goal: "BUT ANNULÉ.",
  red_card: "Carton annulé.",
  injury_sub: "Remplacement annulé.",
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
    .select("trust_score")
    .eq("id", user.id)
    .single();

  if (!profile || profile.trust_score < MODERATOR_THRESHOLD) {
    return errorResponse("Accès réservé aux modérateurs", 403);
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
  })();

  return successResponse({ resolved: true });
}
