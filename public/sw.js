console.info("[SW] vartime.app — v3");
const CACHE_NAME = "vartime-offline-v3";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.add(OFFLINE_URL);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(OFFLINE_URL);
      })
    );
  }
});

// ── Web Push ──────────────────────────────────────────────────────────────────

self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { /* ignore */ }

  const title = data.title ?? "VAR Time 🟨";
  const options = {
    body: data.body ?? "Un événement se passe en ce moment !",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    // Merge url + extra_data into notification.data for notificationclick
    data: { url: data.url ?? "/lobby", ...(data.extra_data ?? {}) },
    requireInteraction: data.requireInteraction ?? false,
    silent: false,
  };

  // Optional fields (Android/desktop — iOS ignores gracefully)
  if (data.tag) options.tag = data.tag;
  if (data.vibrate) options.vibrate = data.vibrate;
  if (data.actions) options.actions = data.actions;

  // Smart Mute : si l'app est en foreground, l'UI Realtime gère le feedback
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: false })
      .then((clientList) => {
        const appVisible = clientList.some((c) => c.visibilityState === "visible");
        if (appVisible) {
          // Notify the app so it can track the suppression in PostHog
          clientList.forEach((c) =>
            c.postMessage({
              type: "NOTIF_SUPPRESSED_BY_SMART_MUTE",
              notif_type: data.extra_data?.type ?? data.type ?? "var_alert",
              reason: "app_visible",
              match_id: data.extra_data?.matchId ?? data.match_id ?? null,
            })
          );
          return;
        }
        return self.registration.showNotification(title, options);
      })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const action = event.action; // "bet_yes", "bet_no", or "" (direct tap)
  const notifData = event.notification.data ?? {};
  const url = notifData.url ?? "/lobby";
  const marketEventId = notifData.marketEventId;
  const type = notifData.type;

  // FK2: action-button quick-bet (Android/desktop only)
  if (type === "var_alert" && marketEventId && (action === "bet_yes" || action === "bet_no")) {
    const vote = action === "bet_yes" ? "oui" : "non";
    event.waitUntil(
      fetch("/api/var-bets/quick-bet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marketEventId, vote }),
        credentials: "include",
      })
        .then(async (res) => {
          const result = await res.json().catch(() => ({}));
          const ok = res.ok && result?.ok;
          const confirmTitle = ok
            ? (vote === "oui" ? "✅ Pari OUI posé !" : "❌ Pari NON posé !")
            : "⚠️ Pari non enregistré";
          const confirmBody = ok
            ? (result?.data?.message ?? "Pari enregistré. Attends le verdict !")
            : (result?.error ?? "Le marché est peut-être fermé.");
          return self.registration.showNotification(confirmTitle, {
            body: confirmBody,
            icon: "/icon-192.png",
            tag: "quick-bet-confirm",
            data: { url },
          });
        })
        .catch(() => {
          // Network error — fall back to opening the match page
          return self.clients.openWindow(url);
        })
    );
    return;
  }

  // Default: direct tap on notification → open/focus the app
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) return client.focus();
        }
        if (self.clients.openWindow) return self.clients.openWindow(url);
      })
  );
});
