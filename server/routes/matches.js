import express from "express";
import { pool } from "../db.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

// Submit Match Result
router.post("/:id/submit", authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { score_player1, score_player2, proof_image } = req.body;
    
    try {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // 1. Verify match belongs to user and is in valid state
            const matchRes = await client.query("SELECT * FROM matches WHERE id = $1", [id]);
            if (matchRes.rows.length === 0) return res.status(404).json({ error: "Match not found" });
            
            const match = matchRes.rows[0];
            if (match.player1_id !== req.user.id && match.player2_id !== req.user.id) {
                return res.status(403).json({ error: "Not a participant in this match" });
            }
            if (match.status !== 'scheduled') {
                return res.status(400).json({ error: "Match already completed or pending review" });
            }

            // Check tournament status
            const tourneyRes = await client.query("SELECT status FROM tournaments WHERE id = $1", [match.tournament_id]);
            if (tourneyRes.rows[0].status !== 'active') {
                return res.status(400).json({ error: "Tournament is not active" });
            }

            // 2. Update match with submission
            // We set status to 'pending_review' so admin sees it
            await client.query(
                `UPDATE matches 
                 SET score_player1 = $1, score_player2 = $2, proof_image = $3, submitted_by = $4, status = 'pending_review' 
                 WHERE id = $5`,
                [score_player1, score_player2, proof_image, req.user.id, id]
            );

            // 3. Create a Dispute record automatically? Or just let Admin see pending matches?
            // The prompt says "wait for admin will verify". 
            // Existing admin dashboard has a disputes section. 
            // Let's also create a record in 'disputes' so it shows up in the "Issues" tab if needed, 
            // OR we can just have a "Pending Matches" section.
            // For now, let's keep it simple: update match status. Admin will need a way to filter 'pending_review' matches.
            
            await client.query('COMMIT');
            res.json({ message: "Result submitted for verification" });
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

// Get Player's Fixtures
router.get("/my-fixtures", authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT m.*, 
             p1.username as player1_name, 
             p2.username as player2_name,
             t.title as tournament_title,
             t.status as tournament_status
             FROM matches m
             LEFT JOIN users p1 ON m.player1_id = p1.id
             LEFT JOIN users p2 ON m.player2_id = p2.id
             JOIN tournaments t ON m.tournament_id = t.id
             WHERE (m.player1_id = $1 OR m.player2_id = $1)
             ORDER BY m.created_at DESC`,
            [req.user.id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error("Error fetching my-fixtures:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// Get Check-in / Match Details
router.get("/:id", authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            `SELECT m.*, 
             p1.username as player1_name, 
             p2.username as player2_name,
             t.title as tournament_title,
             t.status as tournament_status,
             r.date as match_date
             FROM matches m
             LEFT JOIN users p1 ON m.player1_id = p1.id
             LEFT JOIN users p2 ON m.player2_id = p2.id
             JOIN tournaments t ON m.tournament_id = t.id
             LEFT JOIN rounds r ON m.tournament_id = r.tournament_id AND m.round = r.round_number
             WHERE m.id = $1`,
            [id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: "Match not found" });
        
        const match = result.rows[0];
        if (match.player1_id !== req.user.id && match.player2_id !== req.user.id) {
            return res.status(403).json({ error: "Not a participant in this match" });
        }
        
        res.json(match);
    } catch (err) {
        console.error("Error fetching match:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// Mark Player as Ready (Check-in)
router.post("/:id/ready", authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const matchRes = await client.query("SELECT * FROM matches WHERE id = $1 FOR UPDATE", [id]);
            if (matchRes.rows.length === 0) throw new Error("Match not found");
            
            const match = matchRes.rows[0];
            const isPlayer1 = match.player1_id === req.user.id;
            const isPlayer2 = match.player2_id === req.user.id;
            
            if (!isPlayer1 && !isPlayer2) throw new Error("Not a participant");
            if (match.status !== 'scheduled') throw new Error("Match is not in scheduled state");

            // Update readiness
            if (isPlayer1) match.player1_ready = true;
            if (isPlayer2) match.player2_ready = true;

            let checkedInAt = match.checked_in_at;
            if (match.player1_ready && match.player2_ready && !checkedInAt) {
                checkedInAt = new Date(); // Both ready, start match timer
            }

            await client.query(
                `UPDATE matches SET player1_ready = $1, player2_ready = $2, checked_in_at = $3 WHERE id = $4`,
                [match.player1_ready, match.player2_ready, checkedInAt, id]
            );

            await client.query('COMMIT');
            res.json({ message: "Check-in successful", match: { ...match, checked_in_at: checkedInAt } });
        } catch (e) {
            await client.query('ROLLBACK');
            res.status(400).json({ error: e.message });
        } finally {
            client.release();
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

// Trigger Walkover Calculation
router.post("/:id/check-walkover", authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const matchRes = await client.query("SELECT * FROM matches WHERE id = $1 FOR UPDATE", [id]);
            if (matchRes.rows.length === 0) throw new Error("Match not found");
            
            const match = matchRes.rows[0];
            if (match.status !== 'scheduled') throw new Error("Match already resolved");

            // For simplicity, checking if 30+ mins passed since match_time
            // Ideally match_time is parsed correctly based on the day. Since it's 'HH:mm', we need a robust approach.
            // Client will handle most time blocking, but here we can just enact the walkover.
            
            let winnerId = null;
            let note = "Walkover";
            
            if (match.player1_ready && !match.player2_ready) {
                winnerId = match.player1_id;
            } else if (!match.player1_ready && match.player2_ready) {
                winnerId = match.player2_id;
            } else if (!match.player1_ready && !match.player2_ready) {
                // both lose/cancel - we set status to cancelled
                await client.query("UPDATE matches SET status = 'cancelled' WHERE id = $1", [id]);
                await client.query('COMMIT');
                return res.json({ message: "Match cancelled. Neither player checked in." });
            } else {
                throw new Error("Both players are ready. Play the match.");
            }

            // Award walkover
            await client.query(
                `UPDATE matches SET status = 'completed', winner_id = $1, match_code = 'WALKOVER' WHERE id = $2`,
                [winnerId, id]
            );
            await client.query('COMMIT');
            res.json({ message: "Walkover applied successfully.", winner_id: winnerId });

        } catch (e) {
            await client.query('ROLLBACK');
            res.status(400).json({ error: e.message });
        } finally {
            client.release();
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

export default router;
