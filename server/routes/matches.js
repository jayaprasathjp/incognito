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

export default router;
