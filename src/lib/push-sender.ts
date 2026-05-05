import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

let vapidConfigured = false;
function ensureVapid() {
  if (vapidConfigured) return;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const sub = process.env.VAPID_SUBJECT ?? "mailto:contact@lesifflet.app";
  if (!pub || !priv) return;
  webpush.setVapidDetails(sub, pub, priv);
  vapidConfigured = true;
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
};

/** Envoie un push à tous les abonnés d'un match (filtre smart_mute). */
export async function sendPushToMatchSubscribers(
  matchId: string,
  payload: PushPayload,
): Promise<number> {
  ensureVapid();
  if (!vapidConfigured) return 0;

  const admin = createAdminClient();

  const { data: matchSubs } = await admin
    .from("match_subscriptions")
    .select("user_id")
    .eq("match_id", matchId)
    .eq("smart_mute", false);

  if (!matchSubs?.length) return 0;
  const userIds = matchSubs.map((s) => s.user_id);
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
