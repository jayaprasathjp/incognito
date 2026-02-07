import express from "express";
import { pool } from "../db.js";

const router = express.Router();

router.get("/", async (req, res) => {
    try {
        // Fetch all Completed Matches
        const matchesResult = await pool.query(`
            SELECT m.*, 
                   u1.username as p1_name, u1.institution as p1_ins,
                   u2.username as p2_name, u2.institution as p2_ins
            FROM matches m
            LEFT JOIN users u1 ON m.player1_id = u1.id
            LEFT JOIN users u2 ON m.player2_id = u2.id
            WHERE m.status = 'completed'
        `);

        // Need to fetch ALL players to ensure those with 0 matches also show up?
        // For MVP, maybe just those in active matches or all 'player' role users?
        // Let's get all players involved in the tournament or just all players in DB.
        // Better: Get all users with role='player'
        const playersResult = await pool.query("SELECT id, username, institution FROM users WHERE role = 'player'");
        
        const standings = {};

        // Initialize Standings
        playersResult.rows.forEach(p => {
            standings[p.id] = {
                id: p.id,
                alias: p.username,
                institution: p.institution || 'N/A',
                pts: 0,
                gb: 0,
                gs: 0 // Goals Scored
            };
        });

        // Calculate Points
        matchesResult.rows.forEach(m => {
            const p1 = standings[m.player1_id];
            const p2 = standings[m.player2_id];

            if (p1 && p2) {
                // Goals Scored
                p1.gs += (m.score_player1 || 0);
                p2.gs += (m.score_player2 || 0);

                // Goal Difference (GB? usually GD but user used GB. Let's assume GB = Goal Balance/Difference)
                p1.gb += (m.score_player1 || 0) - (m.score_player2 || 0);
                p2.gb += (m.score_player2 || 0) - (m.score_player1 || 0);

                // Points
                if (m.winner_id === m.player1_id) {
                    p1.pts += 3;
                } else if (m.winner_id === m.player2_id) {
                    p2.pts += 3;
                } else {
                    // Draw?
                    p1.pts += 1;
                    p2.pts += 1;
                }
            }
        });

        // Convert to Array and Sort
        // Sorting Logic: Pts DESC, then GB DESC, then GS DESC
        const leaderboard = Object.values(standings).sort((a, b) => {
            if (b.pts !== a.pts) return b.pts - a.pts;
            if (b.gb !== a.gb) return b.gb - a.gb;
            return b.gs - a.gs;
        });

        // Add Position
        leaderboard.forEach((p, index) => p.position = index + 1);

        res.json(leaderboard);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
    }
});

export default router;
