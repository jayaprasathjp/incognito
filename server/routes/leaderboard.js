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
            SELECT u.id, COALESCE(p.alias, u.email) AS display_name, u.institution, p.status as participant_status 
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
                status: p.participant_status,
                pts: 0,
                gf: 0, // Goals For (Scored)
                ga: 0  // Goals Against (Conceded)
            };
        });

        // Calculate Points using real match data
        matchesResult.rows.forEach(m => {
            const p1 = standings[m.player1_id];
            const p2 = standings[m.player2_id];

            if (p1 && p2) {
                // Goals For
                p1.gf += (m.score_player1 || 0);
                p2.gf += (m.score_player2 || 0);

                // Goals Against
                p1.ga += (m.score_player2 || 0);
                p2.ga += (m.score_player1 || 0);

                // Points: 3 for a win; disqualifications / no winner award 0 here
                if (m.winner_id === m.player1_id) {
                    p1.pts += 3;
                } else if (m.winner_id === m.player2_id) {
                    p2.pts += 3;
                }
            }
        });

        // Compute Goal Difference and Sort: Status ('in' first) -> PTS DESC -> GD DESC -> GF DESC -> Alias ASC
        const leaderboard = Object.values(standings)
            .map(p => ({ ...p, gd: p.gf - p.ga }))
            .sort((a, b) => {
                // First prioritize 'in' over 'out'
                if (a.status === 'in' && b.status !== 'in') return -1;
                if (a.status !== 'in' && b.status === 'in') return 1;

                if (b.pts !== a.pts) return b.pts - a.pts;   // Highest points first
                if (b.gd  !== a.gd)  return b.gd  - a.gd;   // Then highest goal difference
                if (b.gf  !== a.gf)  return b.gf  - a.gf;   // Then highest goals for
                return a.alias.localeCompare(b.alias);        // Alphabetical fallback
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
