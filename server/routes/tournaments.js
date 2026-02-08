import express from "express";
import { pool } from "../db.js";
import { authenticateToken, authorizeAdmin } from "../middleware/auth.js";
import { tryAutoMatch } from "../utils/matchmaking.js";

const router = express.Router();

// Get Current/Latest Tournament & User Status
router.get("/current", authenticateToken, async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM tournaments ORDER BY created_at DESC LIMIT 1");
        if (result.rows.length === 0) return res.json({ tournament: null });
        
        const tournament = result.rows[0];
        
        // Prize Pool (Global for now, or we can filter by date if needed)
        const prizeRes = await pool.query("SELECT SUM(amount) FROM payments WHERE status = 'completed'");
        const prizePool = parseInt(prizeRes.rows[0].sum) || 0;
        
        // Current Round
        let currentRound = 0;
        if (['active', 'paused', 'completed'].includes(tournament.status)) {
             const roundRes = await pool.query("SELECT MAX(round) FROM matches WHERE tournament_id = $1", [tournament.id]);
             currentRound = roundRes.rows[0].max || 1;
        }

        // Winner Info
        if (tournament.status === 'completed' && tournament.winner_id) {
            const winnerRes = await pool.query("SELECT username FROM users WHERE id = $1", [tournament.winner_id]);
            if (winnerRes.rows.length > 0) {
                tournament.winner_username = winnerRes.rows[0].username;
            }
        }

        // Check participation
        const partResult = await pool.query(
            "SELECT * FROM participants WHERE tournament_id = $1 AND user_id = $2",
            [tournament.id, req.user.id]
        );
        
        let currentMatch = null;
        if (partResult.rows.length > 0) {
             // Find active match for this user in this tournament
             // We look for matches where user is p1 or p2 AND status is 'scheduled' or 'pending_review'
             const matchRes = await pool.query(
                `SELECT m.*, 
                        op.username as opponent_name, 
                        op.id as opponent_id
                 FROM matches m
                 LEFT JOIN users op ON (CASE WHEN m.player1_id = $2 THEN m.player2_id ELSE m.player1_id END) = op.id
                 WHERE m.tournament_id = $1 
                 AND (m.player1_id = $2 OR m.player2_id = $2)
                 AND m.status IN ('scheduled', 'pending_review')
                 ORDER BY m.round DESC LIMIT 1`,
                [tournament.id, req.user.id]
             );
             if (matchRes.rows.length > 0) {
                 currentMatch = matchRes.rows[0];
             }
        }

        res.json({
            tournament: { ...tournament, prizePool, currentRound },
            participation: partResult.rows.length > 0 ? partResult.rows[0] : null,
            currentMatch
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
    }
});

// Get all tournaments (Public)
router.get("/", async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM tournaments ORDER BY created_at DESC");
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
    }
});

// Create Tournament (Admin)
router.post("/", authenticateToken, authorizeAdmin, async (req, res) => {
    const { title, description } = req.body;
    try {
        const result = await pool.query(
            "INSERT INTO tournaments (title, description, created_by) VALUES ($1, $2, $3) RETURNING *",
            [title, description, req.user.id]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
    }
});

// Join Tournament (Player)
router.post("/:id/join", authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        // Check if tournament is open
        const tournamentCheck = await pool.query("SELECT status FROM tournaments WHERE id = $1", [id]);
        if (tournamentCheck.rows.length === 0) return res.status(404).json({ error: "Tournament not found" });
        if (tournamentCheck.rows[0].status !== 'open') return res.status(400).json({ error: "Tournament is not open for registration" });

        // Add to participants (default status approved for MVP)
        await pool.query(
            "INSERT INTO participants (tournament_id, user_id, status) VALUES ($1, $2, 'approved')",
            [id, req.user.id]
        );

        // Try to auto-match
        // We need a transaction or just run it. Helper expects client, but pool can also work if we change helper or wrap in transaction here.
        // Helper takes 'client' object (with query method). Pool has query method too.
        await tryAutoMatch(pool, id, req.user.id);
        res.status(201).json({ message: "Join request sent" });
    } catch (error) {
        if (error.code === '23505') { // Unique violation
            return res.status(400).json({ error: "Already joined this tournament" });
        }
        console.error(error);
        res.status(500).json({ error: "Server error" });
    }
});

// Get participants (Admin or Public?) -> Let's make it public for now so players see who's in
router.get("/:id/participants", async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            `SELECT p.*, u.username 
             FROM participants p 
             JOIN users u ON p.user_id = u.id 
             WHERE p.tournament_id = $1`,
            [id]
        );
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
    }
});

// Approve/Reject Participant (Admin)
router.put("/:id/participants/:userId", authenticateToken, authorizeAdmin, async (req, res) => {
    const { id, userId } = req.params;
    const { status } = req.body; // 'approved' or 'rejected'

    if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
    }

    try {
        const result = await pool.query(
            "UPDATE participants SET status = $1 WHERE tournament_id = $2 AND user_id = $3 RETURNING *",
            [status, id, userId]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: "Participant not found" });
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
    }
});


// Start Tournament (Admin)
router.post("/:id/start", authenticateToken, authorizeAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        // 1. Check tournament status and participant count
        const tournamentRes = await pool.query("SELECT * FROM tournaments WHERE id = $1", [id]);
        if (tournamentRes.rows.length === 0) return res.status(404).json({ error: "Tournament not found" });
        if (tournamentRes.rows[0].status !== 'open') return res.status(400).json({ error: "Tournament already started or completed" });

        const participantsRes = await pool.query("SELECT user_id FROM participants WHERE tournament_id = $1 AND status = 'approved'", [id]);
        const participants = participantsRes.rows;

        if (participants.length < 2) return res.status(400).json({ error: "Need at least 2 approved participants to start" });

        // MVP: Don't strictly enforce power of 2, just handle byes if needed (but logic is complex)
        // ideally strictly enforce power of 2 for simplicity: 2, 4, 8, 16...
        // For now, let's just shuffle and pair. If odd, last one gets a bye (or we error).
        
        // Shuffle
        for (let i = participants.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [participants[i], participants[j]] = [participants[j], participants[i]];
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // 2. Update status to active
            await client.query("UPDATE tournaments SET status = 'active' WHERE id = $1", [id]);

            // 3. Create Matches
            let matchOrder = 1;
            for (let i = 0; i < participants.length; i += 2) {
                const p1 = participants[i].user_id;
                const p2 = participants[i + 1] ? participants[i + 1].user_id : null; // Handle odd number (bye) logic if we supported it

                if (p2) {
                    await client.query(
                        "INSERT INTO matches (tournament_id, round, match_order, player1_id, player2_id, status) VALUES ($1, 1, $2, $3, $4, 'scheduled')",
                        [id, matchOrder++, p1, p2]
                    );
                } else {
                    // Bye: Automatically advance p1 to round 2? Or just create a completed match?
                    // For MVP simplicity, let's just create a match with no p2 and mark p1 as winner immediately?
                    // Alternatively, error out if not even.
                   await client.query(
                        "INSERT INTO matches (tournament_id, round, match_order, player1_id, winner_id, status) VALUES ($1, 1, $2, $3, $3, 'completed')",
                        [id, matchOrder++, p1]
                    );
                }
            }

            await client.query('COMMIT');
            res.json({ message: "Tournament started", count: participants.length });
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
    }
});

export default router;
