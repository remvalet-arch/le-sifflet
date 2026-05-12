import type { Database } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendPushToUsers } from "@/lib/push-sender";
import { postSystemMessageToUserSquads } from "@/lib/squad-messages";
import { checkAndUnlockBadges } from "@/app/actions/badges";

const EVENT_LABEL: Record<string, string> = {
  penalty_check: "Penalty en discussion",
  penalty_outcome: "Résultat penalty",
  var_goal: "But sous VAR",
  red_card: "Carton rouge",
  free_kick: "Coup franc dangereux",
  corner: "Corner",
};

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

/**
 * Sends personalized push notifications to all users who bet on a VAR event,
 * unlocks badges, and posts squad messages for big wins.
 * Fire-and-forget — never throws.
 */
export async function notifyVarBetResults(
  admin: SupabaseClient<Database>,
  eventId: string,
  eventType: string,
  matchId: string,
  result: string,
): Promise<void> {
  const { data: bets } = await admin
    .from("bets")
    .select("user_id, status, potential_reward, amount_staked")
    .eq("event_id", eventId);

  const uniqueUserIds = [...new Set((bets ?? []).map((b) => b.user_id))];
  await Promise.all(uniqueUserIds.map((uid) => checkAndUnlockBadges(uid)));

  if (!bets?.length) return;

  const { data: prefs } = await admin
    .from("profiles")
    .select("id, notif_var_results")
    .in("id", uniqueUserIds);
  const optedOut = new Set(
    (prefs ?? []).reduce<string[]>((acc, p) => {
      if (!p.notif_var_results) acc.push(p.id);
      return acc;
    }, []),
  );

  const verdictLabel =
    result === "oui"
      ? (OUI_VERDICT[eventType] ?? "CONFIRMÉ !")
      : (NON_VERDICT[eventType] ?? "ANNULÉ.");
  const eventLabel = EVENT_LABEL[eventType] ?? "Événement VAR";

  const pushJobs: Promise<number>[] = [];
  for (const bet of bets) {
    if (optedOut.has(bet.user_id)) continue;
    const bodyText =
      bet.status === "won"
        ? `${verdictLabel} +${bet.potential_reward} 🪙 gagnés 🔥`
        : `${verdictLabel} ${bet.amount_staked} 🪙 perdus.`;
    pushJobs.push(
      sendPushToUsers([bet.user_id], {
        title: `⚡ VAR Résolue : ${eventLabel}`,
        body: bodyText,
        url: `/match/${matchId}`,
      }),
    );
  }
  await Promise.all(pushJobs);

  // Squad system messages for big wins (≥200 Sifflets)
  const bigWinners = bets.filter(
    (b) => b.status === "won" && (b.potential_reward ?? 0) >= 200,
  );
  if (bigWinners.length > 0) {
    const { data: profiles } = await admin
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
}
