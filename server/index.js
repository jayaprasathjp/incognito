import "dotenv/config";

import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.js";
import tournamentRoutes from "./routes/tournaments.js";
import matchRoutes from "./routes/matches.js";
import userRoutes from "./routes/users.js";
import leaderboardRoutes from "./routes/leaderboard.js";
import adminRoutes from "./routes/admin.js";
import paymentRoutes from "./routes/payment.js";
import pushRoutes from "./routes/push.js";
import { pool } from "./db.js";
import { expirePlayerDisputes } from "./utils/disputeHelpers.js";
import { ensurePushTable, sendPushToUsers } from "./utils/pushHelpers.js";
import { getMatchesNeedingReminder } from "./utils/roundDateHelpers.js";
import { createServer } from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

// Expose io to routes
app.locals.io = io;

io.on("connection", (socket) => {
  const token = socket.handshake.auth?.token;

  if (token) {
    try {
      const user = jwt.verify(token, process.env.JWT_SECRET || "default_secret");
      socket.data.user = user;
      socket.join(`user_${user.id}`);
    } catch (error) {
      console.log("Socket auth failed:", error.message);
    }
  }

  socket.on("join_match", (matchId) => {
    socket.join(`match_${matchId}`);
  });

  socket.on("join_user", (userId) => {
    if (socket.data.user?.id === Number(userId)) {
      socket.join(`user_${userId}`);
    }
  });
});

const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Debug Middleware
app.use((req, res, next) => {
  console.log(`Received Request: ${req.method} ${req.url}`);
  next();
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/tournaments", tournamentRoutes);
app.use("/api/matches", matchRoutes);
app.use("/api/user", userRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/push", pushRoutes);

// Basic Route
app.get("/", (req, res) => {
  res.send("Incognito API is running");
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Global Error Handler:', err);
  console.error('Stack:', err.stack);
  res.status(500).json({ error: "Global Server Error: " + err.message });
});

// Ensure push_subscriptions table + reminder columns exist at startup
const pushTableReady = ensurePushTable()
  .then(() => console.log("[Push] push_subscriptions table ready."))
  .catch((err) => console.error("[Push] Table init error:", err.message));

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// ── Dispute Expiry Cron (every 15 minutes) ───────────────────────────────────
async function runDisputeExpiry() {
  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN");
    const res = await client.query(
      `SELECT DISTINCT match_id FROM disputes
       WHERE status = 'pending'
         AND COALESCE(dispute_kind, 'player_claim') = 'player_claim'
         AND respond_by IS NOT NULL
         AND respond_by < NOW()`
    );
    if (res.rows.length > 0) {
      console.log(`[Dispute Cron] Expiring ${res.rows.length} dispute(s)...`);
      for (const row of res.rows) {
        await expirePlayerDisputes(client, row.match_id);
      }
    }
    await client.query("COMMIT");
  } catch (err) {
    if (client) {
      try { await client.query("ROLLBACK"); } catch (e) {}
    }
    console.error("[Dispute Cron] Error:", err.message);
  } finally {
    if (client) client.release();
  }
}

// Run once on startup, then every 15 minutes
runDisputeExpiry().catch(err => console.error("[Dispute Cron Startup Error]:", err.message));
setInterval(() => {
  runDisputeExpiry().catch(err => console.error("[Dispute Cron Interval Error]:", err.message));
}, 15 * 60 * 1000);


// ── Match Reminder Cron (every 15 minutes) ───────────────────────────────────
// Sends TWO reminders per match:
//   • 1-hour  reminder  → fires when 45–65 min remain  (flag: push_1h_sent)
//   • 15-min  reminder  → fires when 0–20 min remain   (flag: push_15m_sent)
async function runMatchReminders() {
  try {
    // ---- 1-hour window: match starts in 45 – 65 minutes ----
    const oneHourMatches = await getMatchesNeedingReminder(
      45 * 60 * 1000,   // 45 min from now
      65 * 60 * 1000    // 65 min from now
    );

    for (const m of oneHourMatches) {
      if (m.push_1h_sent) continue;

      const matchTimeLabel = m.match_time;
      await sendPushToUsers([m.player1_id, m.player2_id], {
        title: "⏰ Match in 1 Hour!",
        body: `Your match starts at ${matchTimeLabel}. Get ready and check in on time!`,
        icon: "/web-icon.png",
        badge: "/web-icon.png",
        tag: `match-1h-${m.id}`,
        data: { url: "/matches" },
      });

      await pool.query(
        "UPDATE matches SET push_1h_sent = TRUE WHERE id = $1",
        [m.id]
      );
      console.log(`[Push Cron] 1h reminder sent for match ${m.id}`);
    }

    // ---- 15-minute window: match starts in 0 – 20 minutes ----
    const fifteenMinMatches = await getMatchesNeedingReminder(
      0,                // right now
      20 * 60 * 1000    // 20 min from now
    );

    for (const m of fifteenMinMatches) {
      if (m.push_15m_sent) continue;

      const matchTimeLabel = m.match_time;
      await sendPushToUsers([m.player1_id, m.player2_id], {
        title: "🚨 Match Starting Soon!",
        body: `Your match is in ~15 minutes (${matchTimeLabel}). Check in NOW or you risk a walkover!`,
        icon: "/web-icon.png",
        badge: "/web-icon.png",
        tag: `match-15m-${m.id}`,
        data: { url: "/matches" },
      });

      await pool.query(
        "UPDATE matches SET push_15m_sent = TRUE WHERE id = $1",
        [m.id]
      );
      console.log(`[Push Cron] 15min reminder sent for match ${m.id}`);
    }
  } catch (err) {
    console.error("[Push Cron] Reminder error:", err.message);
  }
}

// Run once on startup (after table is ready), then every 15 minutes
pushTableReady.then(() => {
  runMatchReminders().catch(err => console.error("[Push Cron Startup Error]:", err.message));
});
setInterval(() => {
  runMatchReminders().catch(err => console.error("[Push Cron Interval Error]:", err.message));
}, 15 * 60 * 1000);


