import webpush from "web-push";
import { pool } from "../db.js";

// ── Configure VAPID once ─────────────────────────────────────────────────────
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || "mailto:admin@playincognito.ng",
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// ── Ensure the table exists (idempotent) ─────────────────────────────────────
export async function ensurePushTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id         SERIAL PRIMARY KEY,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      endpoint   TEXT    NOT NULL UNIQUE,
      p256dh     TEXT    NOT NULL,
      auth       TEXT    NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_push_subs_user_id
      ON push_subscriptions(user_id);
  `);

  // Ensure the reminder-sent tracking columns exist on matches
  await pool.query(`
    ALTER TABLE matches
      ADD COLUMN IF NOT EXISTS push_1h_sent  BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE matches
      ADD COLUMN IF NOT EXISTS push_15m_sent BOOLEAN NOT NULL DEFAULT FALSE;
  `);
}

// ── Upsert a subscription for a user ────────────────────────────────────────
export async function saveSubscription(userId, subscription) {
  const { endpoint, keys } = subscription;
  const { p256dh, auth } = keys;
  await pool.query(
    `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (endpoint) DO UPDATE
       SET user_id = EXCLUDED.user_id,
           p256dh  = EXCLUDED.p256dh,
           auth    = EXCLUDED.auth`,
    [userId, endpoint, p256dh, auth]
  );
}

// ── Remove a subscription ────────────────────────────────────────────────────
export async function removeSubscription(endpoint) {
  await pool.query(
    "DELETE FROM push_subscriptions WHERE endpoint = $1",
    [endpoint]
  );
}

// ── Send a push to a single user (all their subscriptions) ──────────────────
export async function sendPushToUser(userId, payload) {
  const result = await pool.query(
    "SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1",
    [userId]
  );

  const dead = [];
  await Promise.allSettled(
    result.rows.map(async (row) => {
      const subscription = {
        endpoint: row.endpoint,
        keys: { p256dh: row.p256dh, auth: row.auth },
      };
      try {
        await webpush.sendNotification(
          subscription,
          typeof payload === "string" ? payload : JSON.stringify(payload)
        );
      } catch (err) {
        // 410 Gone = subscription expired/revoked by user → clean up
        if (err.statusCode === 410 || err.statusCode === 404) {
          dead.push(row.endpoint);
        } else {
          console.error("[Push] Failed to send to endpoint:", err.message);
        }
      }
    })
  );

  if (dead.length) {
    await pool.query(
      "DELETE FROM push_subscriptions WHERE endpoint = ANY($1::text[])",
      [dead]
    );
  }
}

// ── Send a push to multiple users ────────────────────────────────────────────
export async function sendPushToUsers(userIds, payload) {
  if (!userIds || userIds.length === 0) return;
  await Promise.allSettled(userIds.map((id) => sendPushToUser(id, payload)));
}
