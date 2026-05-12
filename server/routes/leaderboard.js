import express from "express";
import { pool } from "../db.js";

const router = express.Router();

router.get("/", async (req, res) => {
    try {
        // Fetch the most recent tournament
        const tourneyRes = await pool.query("SELECT id, status, winner_id FROM tournaments ORDER BY created_at DESC LIMIT 1");
        
        if (tourneyRes.rows.length === 0) {
            return res.json({ tournament: null, leaderboard: [] });
        }

        const tournament = tourneyRes.rows[0];

        // Fetch participants FOR THIS TOURNAMENT ONLY — use tournament alias
        const playersResult = await pool.query(`
            SELECT u.id, COALESCE(p.alias, u.email) AS display_name, u.institution 
            FROM participants p
            JOIN users u ON p.user_id = u.id
            WHERE p.tournament_id = $1
        `, [tournament.id]);
        
        // Fetch Completed Matches FOR THIS TOURNAMENT ONLY
        const matchesResult = await pool.query(`
            SELECT m.*
            FROM matches m
            WHERE m.status = 'completed' AND m.tournament_id = $1
        `, [tournament.id]);

        const standings = {};

        // Initialize Standings from registered participants
        playersResult.rows.forEach(p => {
            standings[p.id] = {
                id: p.id,
                alias: p.display_name,
                institution: p.institution || 'N/A',
                pts: 0,
                gs: 0, // Goals Scored
                gc: 0  // Goals Conceded
            };
        });

        // Calculate Points using real match data
        matchesResult.rows.forEach(m => {
            const p1 = standings[m.player1_id];
            const p2 = standings[m.player2_id];

            if (p1 && p2) {
                // Goals Scored
                p1.gs += (m.score_player1 || 0);
                p2.gs += (m.score_player2 || 0);

                // Goals Conceded
                p1.gc += (m.score_player2 || 0);
                p2.gc += (m.score_player1 || 0);

                // Points: 3 for a win; disqualifications / no winner award 0 here
                if (m.winner_id === m.player1_id) {
                    p1.pts += 3;
                } else if (m.winner_id === m.player2_id) {
                    p2.pts += 3;
                }
            }
        });

        // Convert to Array and Sort: Pts DESC -> GS DESC -> GC ASC -> Alias Alphabetical
        const leaderboard = Object.values(standings).sort((a, b) => {
            if (b.pts !== a.pts) return b.pts - a.pts;  // Highest points first
            if (b.gs !== a.gs) return b.gs - a.gs;      // Then highest goals scored
            if (a.gc !== b.gc) return a.gc - b.gc;      // Then LOWEST goals conceded FIRST (therefore a - b)
            // Alphabetical fallback (essential for pre-game or matched standings)
            return a.alias.localeCompare(b.alias);
        });

        // Add Position Index
        leaderboard.forEach((p, index) => p.position = index + 1);

        // Send Structured Payload
        res.json({
            tournament,
            leaderboard
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
    }
});

export default router;
