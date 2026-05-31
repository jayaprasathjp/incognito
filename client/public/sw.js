// INCØGNITØ Service Worker — Web Push Handler
// This file runs in the background even when the site tab is closed.

const CACHE_NAME = "incognito-sw-v1";

// ── Push event: show OS notification ────────────────────────────────────────
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "INCØGNITØ", body: event.data.text() };
  }

  const title = payload.title || "INCØGNITØ";
  const options = {
    body: payload.body || "",
    icon: payload.icon || "/web-icon.png",
    badge: payload.badge || "/web-icon.png",
    tag: payload.tag || "incognito-notification",
    data: payload.data || {},
    // Keep notification visible until user interacts
    requireInteraction: true,
    // Vibration pattern for mobile
    vibrate: [200, 100, 200],
    actions: [
      { action: "open", title: "View" },
      { action: "dismiss", title: "Dismiss" },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ── Notification click: focus or open the site ────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") return;

  const targetUrl =
    event.notification.data?.url
      ? (self.location.origin + event.notification.data.url)
      : self.location.origin;

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        // Focus existing tab if already open
        for (const client of windowClients) {
          if (client.url.startsWith(self.location.origin) && "focus" in client) {
            client.focus();
            client.navigate(targetUrl);
            return;
          }
        }
        // Otherwise open a new tab
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});

// ── Install & activate: keep SW lean (no caching needed here) ────────────
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
