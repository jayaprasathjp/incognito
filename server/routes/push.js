import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import {
  saveSubscription,
  removeSubscription,
} from "../utils/pushHelpers.js";

const router = express.Router();

// ── Return the VAPID public key so the client can subscribe ─────────────────
router.get("/vapid-public-key", (req, res) => {
  const key = process.env.VAPID_PUBLIC_KEY;
  if (!key) {
    return res.status(500).json({ error: "Push notifications not configured on server." });
  }
  res.json({ publicKey: key });
});

// ── Save (subscribe) a push subscription ─────────────────────────────────────
router.post("/subscribe", authenticateToken, async (req, res) => {
  const { subscription } = req.body;

  if (
    !subscription ||
    !subscription.endpoint ||
    !subscription.keys?.p256dh ||
    !subscription.keys?.auth
  ) {
    return res.status(400).json({ error: "Invalid subscription object." });
  }

  try {
    await saveSubscription(req.user.id, subscription);
    res.json({ message: "Subscription saved." });
  } catch (err) {
    console.error("[Push] Subscribe error:", err.message);
    res.status(500).json({ error: "Failed to save subscription." });
  }
});

// ── Remove (unsubscribe) a push subscription ──────────────────────────────────
router.delete("/unsubscribe", authenticateToken, async (req, res) => {
  const { endpoint } = req.body;
  if (!endpoint) {
    return res.status(400).json({ error: "endpoint is required." });
  }

  try {
    await removeSubscription(endpoint);
    res.json({ message: "Subscription removed." });
  } catch (err) {
    console.error("[Push] Unsubscribe error:", err.message);
    res.status(500).json({ error: "Failed to remove subscription." });
  }
});

export default router;
