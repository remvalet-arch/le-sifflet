"use client";

import { log } from "@/lib/logger";
import { track } from "@/lib/analytics";

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    output[i] = rawData.charCodeAt(i);
  }
  return output.buffer;
}

export type PushSubscribeResult = { ok: true } | { ok: false; reason: string };

/**
 * Demande la permission push, souscrit et enregistre la souscription en base.
 * À appeler après une action utilisateur (clic ou toast CTA).
 */
export async function trySubscribePush(): Promise<PushSubscribeResult> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return { ok: false, reason: "push_not_supported" };
  }

  if (!("Notification" in window)) {
    return { ok: false, reason: "push_not_supported" };
  }

  if (Notification.permission === "denied") {
    return { ok: false, reason: "permission_denied" };
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return { ok: false, reason: "permission_denied" };
  }

  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidKey) {
    log.error("Push", "NEXT_PUBLIC_VAPID_PUBLIC_KEY manquant");
    return { ok: false, reason: "no_vapid_key" };
  }

  let reg: ServiceWorkerRegistration;
  try {
    reg = await navigator.serviceWorker.ready;
  } catch (err) {
    log.error("Push", "Service worker non prêt", { error: String(err) });
    return { ok: false, reason: "sw_not_ready" };
  }

  let sub: PushSubscription;
  try {
    const existing = await reg.pushManager.getSubscription();
    sub =
      existing ??
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      }));
  } catch (err) {
    log.error("Push", "pushManager.subscribe() échoué", { error: String(err) });
    return {
      ok: false,
      reason: `subscribe_failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  const json = sub.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    return { ok: false, reason: "invalid_subscription_json" };
  }

  try {
    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: json.endpoint,
        keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      log.error("Push", "/api/push/subscribe échoué", { data });
      return { ok: false, reason: `db_error: ${data.error ?? res.status}` };
    }
  } catch (err) {
    log.error("Push", "fetch /api/push/subscribe échoué", {
      error: String(err),
    });
    return {
      ok: false,
      reason: `network_error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  track("push_opted_in", { permission_status: "granted" });
  return { ok: true };
}

/** Retourne true si l'utilisateur est déjà abonné aux notifications push. */
export async function isPushSubscribed(): Promise<boolean> {
  if (
    typeof window === "undefined" ||
    !("serviceWorker" in navigator) ||
    Notification.permission !== "granted"
  )
    return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    return sub !== null;
  } catch {
    return false;
  }
}
