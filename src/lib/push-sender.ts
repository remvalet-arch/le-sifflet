import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

let vapidConfigured = false;
function ensureVapid() {
  if (vapidConfigured) return;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const sub = process.env.VAPID_SUBJECT ?? "mailto:contact@vartime.app";
  if (!pub || !priv) return;
  webpush.setVapidDetails(sub, pub, priv);
  vapidConfigured = true;
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  // FK2: action-button fields (Android/desktop only — iOS ignores gracefully)
  actions?: Array<{ action: string; title: string }>;
  tag?: string;
  requireInteraction?: boolean;
  vibrate?: number[];
  /** Extra data passed through notification.data (e.g. marketEventId) */
  extra_data?: Record<string, unknown>;
};

/** Envoie un push à tous les abonnés d'un match (filtre smart_mute + preferred_competitions). */
export async function sendPushToMatchSubscribers(
  matchId: string,
  payload: PushPayload,
): Promise<number> {
  ensureVapid();
  if (!vapidConfigured) return 0;

  const admin = createAdminClient();

  const [{ data: matchSubs }, { data: match }] = await Promise.all([
    admin
      .from("match_subscriptions")
      .select("user_id")
      .eq("match_id", matchId)
      .eq("smart_mute", false),
    admin
      .from("matches")
      .select("competition_id")
      .eq("id", matchId)
      .maybeSingle(),
  ]);

  if (!matchSubs?.length) return 0;

  const competitionId = match?.competition_id ?? null;

  let userIds = matchSubs.map((s) => s.user_id);

  // Filter by preferred_competitions when competition is known
  if (competitionId) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, preferred_competitions")
      .in("id", userIds);

    const profileMap = new Map(
      (profiles ?? []).map((p) => [p.id, p.preferred_competitions]),
    );

    userIds = userIds.filter((uid) => {
      const prefs = profileMap.get(uid);
      // Empty/null prefs = "all competitions" (no filter applied)
      if (!prefs || prefs.length === 0) return true;
      return prefs.includes(competitionId);
    });
  }

  if (userIds.length === 0) return 0;
  return sendPushToUsers(userIds, payload);
}

/** Envoie un push à une liste d'user_ids (dédupliqué, nettoie les 410). */
export async function sendPushToUsers(
  userIds: string[],
  payload: PushPayload,
): Promise<number> {
  ensureVapid();
  if (!vapidConfigured || userIds.length === 0) return 0;

  const admin = createAdminClient();
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("endpoint, keys, user_id")
    .in("user_id", [...new Set(userIds)]);

  if (!subs?.length) return 0;

  const message = JSON.stringify(payload);
  const expiredEndpoints: string[] = [];

  await Promise.allSettled(
    subs.map(async (sub) => {
      const keys = sub.keys as { p256dh: string; auth: string };
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys },
          message,
        );
      } catch (err: unknown) {
        if ((err as { statusCode?: number }).statusCode === 410)
          expiredEndpoints.push(sub.endpoint);
        else
          console.error(
            "Push notification failed for endpoint:",
            sub.endpoint,
            err,
          );
      }
    }),
  );

  if (expiredEndpoints.length > 0) {
    await admin
      .from("push_subscriptions")
      .delete()
      .in("endpoint", expiredEndpoints);
  }

  return subs.length - expiredEndpoints.length;
}
