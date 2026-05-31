import { api } from "./api";

const SW_PATH = "/sw.js";

/**
 * Convert a VAPID base64 public key to the Uint8Array format
 * required by pushManager.subscribe().
 */
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Register the service worker (idempotent — safe to call multiple times).
 * Returns the ServiceWorkerRegistration or null if not supported.
 */
async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return null;
  try {
    const registration = await navigator.serviceWorker.register(SW_PATH, {
      scope: "/",
    });
    return registration;
  } catch (err) {
    console.error("[Push] Service Worker registration failed:", err);
    return null;
  }
}

/**
 * Request notification permission and subscribe the browser to push.
 * Posts the subscription to the server.
 *
 * Returns: 'granted' | 'denied' | 'unsupported' | 'error'
 */
export async function requestPermissionAndSubscribe() {
  // Check browser support
  if (
    !("Notification" in window) ||
    !("PushManager" in window) ||
    !("serviceWorker" in navigator)
  ) {
    console.warn("[Push] Push not supported in this browser.");
    return "unsupported";
  }

  // Don't re-ask if already denied
  if (Notification.permission === "denied") return "denied";

  // Ask permission
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return "denied";

  try {
    // Get the VAPID public key — prefer env var, fallback to server fetch
    let vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey) {
      const data = await fetch("/api/push/vapid-public-key").then((r) =>
        r.json()
      );
      vapidPublicKey = data.publicKey;
    }

    const registration = await registerServiceWorker();
    if (!registration) return "error";

    // Wait for SW to be active
    await navigator.serviceWorker.ready;

    // Create the PushSubscription
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });

    // POST to server
    await api.post("/push/subscribe", { subscription: subscription.toJSON() });

    localStorage.setItem("push_subscribed", "true");
    console.log("[Push] Successfully subscribed.");
    return "granted";
  } catch (err) {
    console.error("[Push] Subscribe error:", err);
    return "error";
  }
}

/**
 * Unsubscribe from push notifications and notify the server.
 */
export async function unsubscribePush() {
  if (!("serviceWorker" in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await api.delete("/push/unsubscribe", {
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });
      await subscription.unsubscribe();
    }

    localStorage.removeItem("push_subscribed");
    console.log("[Push] Unsubscribed.");
  } catch (err) {
    console.error("[Push] Unsubscribe error:", err);
  }
}

/**
 * Check if the current browser is already subscribed.
 */
export async function isPushSubscribed() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window))
    return false;
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;
  } catch {
    return false;
  }
}

/**
 * Returns the current Notification permission status.
 * 'granted' | 'denied' | 'default' | 'unsupported'
 */
export function getNotificationPermission() {
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission;
}

// Register the SW on module import (idempotent)
registerServiceWorker();
