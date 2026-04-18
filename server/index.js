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
import { pool } from "./db.js";
import { expirePlayerDisputes } from "./utils/disputeHelpers.js";
import { createServer } from "http";
import { Server } from "socket.io";

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
  socket.on("join_match", (matchId) => {
    socket.join(`match_${matchId}`);
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

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// ── Dispute Expiry Cron (every 15 minutes) ───────────────────────────────────
async function runDisputeExpiry() {
  const client = await pool.connect();
  try {
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
    await client.query("ROLLBACK");
    console.error("[Dispute Cron] Error:", err.message);
  } finally {
    client.release();
  }
}

// Run once on startup, then every 15 minutes
runDisputeExpiry();
setInterval(runDisputeExpiry, 15 * 60 * 1000);

