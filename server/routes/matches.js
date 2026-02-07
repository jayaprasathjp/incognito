import express from "express";
import { pool } from "../db.js";
import { authenticateToken, authorizeAdmin } from "../middleware/auth.js";

const router = express.Router();

// Get Matches for Current User
router.get("/my-fixtures", authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await pool.query(
            `SELECT m.*, 
                    p1.username as player1_name, 
                    p2.username as player2_name,
                    t.title as tournament_title
             FROM matches m
             JOIN tournaments t ON m.tournament_id = t.id
             LEFT JOIN users p1 ON m.player1_id = p1.id
             LEFT JOIN users p2 ON m.player2_id = p2.id
             WHERE m.player1_id = $1 OR m.player2_id = $1
             ORDER BY m.updated_at DESC`,
            [userId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
    }
});

// Get Matches for a Tournament
router.get("/:tournamentId", async (req, res) => {
    try {
        const { tournamentId } = req.params;
        const result = await pool.query(
            `SELECT m.*, 
                    p1.username as player1_name, 
                    p2.username as player2_name, 
                    w.username as winner_name
             FROM matches m
             LEFT JOIN users p1 ON m.player1_id = p1.id
             LEFT JOIN users p2 ON m.player2_id = p2.id
             LEFT JOIN users w ON m.winner_id = w.id
             WHERE m.tournament_id = $1
             ORDER BY m.round, m.match_order`,
            [tournamentId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
    }
});

// Update Match Result (Admin)
// Logic: If winner is set, we might need to advance them to next round?
// For MVP simplest approach: Admin sets winner, and manually or semi-automatically handles next round.
// Let's implement basic "Set Winner" first. Progression logic can be added later or separate endpoint.
// Update Match Result (Admin)
router.put("/:id", authenticateToken, authorizeAdmin, async (req, res) => {
    const { id } = req.params;
    const { winner_id } = req.body;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Verify match exists
        const matchResult = await client.query("SELECT * FROM matches WHERE id = $1", [id]);
        if (matchResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: "Match not found" });
        }
        
        const match = matchResult.rows[0];

        // Update match
        const updateResult = await client.query(
            "UPDATE matches SET winner_id = $1, status = 'completed' WHERE id = $2 RETURNING *",
            [winner_id, id]
        );
        
        // Progression Logic
        // Find partner match
        // Partner order: if my_order is odd(1), partner is even(2). If even(2), partner is odd(1).
        // Formula: Partner = (order % 2 !== 0) ? order + 1 : order - 1
        
        const currentOrder = match.match_order;
        const currentRound = match.round;
        const tournamentId = match.tournament_id;

        const partnerOrder = (currentOrder % 2 !== 0) ? currentOrder + 1 : currentOrder - 1;

        const partnerMatchRes = await client.query(
            "SELECT * FROM matches WHERE tournament_id = $1 AND round = $2 AND match_order = $3",
            [tournamentId, currentRound, partnerOrder]
        );

        // If partner match exists and has a winner, create next round match
        // If partner match doesn't exist (e.g. strict bye logic not implemented fully or final match), do nothing.
        // Actually, if we are in Final, partnerOrder calculation might still give something but query returns empty.
        
        if (partnerMatchRes.rows.length > 0) {
            const partnerMatch = partnerMatchRes.rows[0];
            if (partnerMatch.winner_id) {
                // Both finished. Create next match.
                // Next Round = current + 1
                // Next Order = ceil(current / 2)
                const nextRound = currentRound + 1;
                const nextOrder = Math.ceil(currentOrder / 2);

                const p1 = (currentOrder % 2 !== 0) ? winner_id : partnerMatch.winner_id;
                const p2 = (currentOrder % 2 !== 0) ? partnerMatch.winner_id : winner_id;

                // Check if next match already exists (idempotency)
                const nextMatchCheck = await client.query(
                    "SELECT * FROM matches WHERE tournament_id = $1 AND round = $2 AND match_order = $3",
                    [tournamentId, nextRound, nextOrder]
                );

                if (nextMatchCheck.rows.length === 0) {
                    await client.query(
                        "INSERT INTO matches (tournament_id, round, match_order, player1_id, player2_id, status) VALUES ($1, $2, $3, $4, $5, 'scheduled')",
                        [tournamentId, nextRound, nextOrder, p1, p2]
                    );
                }
            } else {
                // Partner not finished. Wait.
            }
        } else {
             // If no partner match found, it might be the final? Or odd number logic.
             // If we assume power of 2, every match except final has a partner.
             // If final, verify if this was indeed the final.
        }

        await client.query('COMMIT');
        res.json(updateResult.rows[0]);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(error);
        res.status(500).json({ error: "Server error" });
    } finally {
        client.release();
    }
});

export default router;
