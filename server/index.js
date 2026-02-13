import "dotenv/config";

import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.js";
import tournamentRoutes from "./routes/tournaments.js";
import matchRoutes from "./routes/matches.js";
import userRoutes from "./routes/users.js";
import leaderboardRoutes from "./routes/leaderboard.js";
import adminRoutes from "./routes/admin.js";



const app = express();
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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
