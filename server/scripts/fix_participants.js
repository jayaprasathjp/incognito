import { pool } from "../db.js";
import dotenv from "dotenv";
dotenv.config();

async function fixParticipants() {
    try {
        console.log("--- FIXING PARTICIPANTS ---");
        
        // 1. Get latest tournament
        const tourneyRes = await pool.query("SELECT id FROM tournaments ORDER BY created_at DESC LIMIT 1");
        if (tourneyRes.rows.length === 0) return console.log("No tournament found");
        const tourneyId = tourneyRes.rows[0].id;
        console.log("Tourney ID:", tourneyId);

        // 2. Get unique players from matches
        const matchesRes = await pool.query("SELECT player1_id, player2_id FROM matches WHERE tournament_id = $1", [tourneyId]);
        
        const playerIds = new Set();
        matchesRes.rows.forEach(m => {
            if(m.player1_id) playerIds.add(m.player1_id);
            if(m.player2_id) playerIds.add(m.player2_id);
        });
        
        console.log(`Found ${playerIds.size} unique players in matches.`);

        // 3. Insert missing participants
        for (const userId of playerIds) {
            try {
                // Check if exists
                const check = await pool.query("SELECT * FROM participants WHERE tournament_id = $1 AND user_id = $2", [tourneyId, userId]);
                if (check.rows.length === 0) {
                    await pool.query(
                        "INSERT INTO participants (tournament_id, user_id, status) VALUES ($1, $2, 'approved')",
                        [tourneyId, userId]
                    );
                    console.log(`Restored participant: User ${userId}`);
                }
            } catch (err) {
                console.error(`Error adding user ${userId}:`, err.message);
            }
        }
        console.log("Fix complete.");

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
fixParticipants();
